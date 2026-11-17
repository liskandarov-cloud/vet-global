import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { frontendUrl } from '../common/frontend-url';
import { escapeHtml } from '../common/html';
import { TERMS_VERSION } from '../common/terms';
import { RegisterDto, LoginDto, SELF_SIGNUP_ROLES } from './dto/auth.dto';
import { hashResetToken, isResetUsable, newResetToken } from './password-reset';

const RESET_INVALID = 'Ссылка недействительна или устарела. Запросите новую.';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
  ) {}

  private sign(userId: string, role: string) {
    return this.jwt.sign({ sub: userId, role });
  }

  private publicUser(u: any) {
    return {
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      phone: u.phone,
      company: u.company,
      role: u.role,
      isVerified: u.isVerified,
      vetPointsBalance: Number(u.vetPointsBalance ?? 0),
    };
  }

  async register(dto: RegisterDto) {
    // Второй рубеж после DTO: привилегированную роль через публичную
    // регистрацию не выдаём ни при каких обстоятельствах.
    if (!SELF_SIGNUP_ROLES.includes(dto.role as (typeof SELF_SIGNUP_ROLES)[number])) {
      throw new BadRequestException('role must be one of the following values: BUYER, SELLER');
    }

    // Почта уже приведена к нижнему регистру в DTO, а старые записи — миграцией.
    // Поиск всё равно без учёта регистра: миграция оставляет как есть адреса,
    // у которых уже есть двойник другим регистром, и третьего им не нужно.
    const existing = await this.prisma.user.findFirst({
      where: { email: { equals: dto.email, mode: 'insensitive' } },
    });
    if (existing) {
      throw new BadRequestException('Email already registered');
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash: await bcrypt.hash(dto.password, 10),
        fullName: dto.fullName,
        phone: dto.phone,
        company: dto.company,
        inn: dto.inn,
        role: dto.role,
        // Buyers are auto-verified; sellers require admin verification.
        isVerified: dto.role === UserRole.BUYER,
        termsAcceptedAt: new Date(),
        termsVersion: TERMS_VERSION,
      },
    });

    return {
      token: this.sign(user.id, user.role),
      user: this.publicUser(user),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.isBanned) {
      throw new UnauthorizedException('Account is banned');
    }
    return {
      token: this.sign(user.id, user.role),
      user: this.publicUser(user),
    };
  }

  // Ответ одинаковый, есть такой адрес или нет: иначе форма сброса стала бы
  // способом проверить, кто зарегистрирован на площадке. Письмо отправляется
  // без ожидания по той же причине — время ответа не должно выдавать адрес.
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && !user.isBanned) {
      const t = newResetToken();
      // Новая ссылка отменяет прежние неиспользованные.
      await this.prisma.$transaction([
        this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
        this.prisma.passwordResetToken.create({
          data: { userId: user.id, tokenHash: t.hash, expiresAt: t.expiresAt },
        }),
      ]);
      const link = `${frontendUrl()}/reset-password?token=${t.raw}`;
      void this.mail.send({
        to: user.email,
        subject: 'VetHub — восстановление пароля',
        html: resetEmailHtml(user.fullName, link),
      });
    }
    return { ok: true };
  }

  async resetPassword(token: string, password: string) {
    const rec = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashResetToken(token) },
      include: { user: true },
    });
    if (!rec || !isResetUsable(rec) || rec.user.isBanned) {
      throw new BadRequestException(RESET_INVALID);
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      // Ссылку погашаем условным обновлением: из двух одновременных запросов
      // с одной ссылкой пароль сменит только один.
      const claimed = await tx.passwordResetToken.updateMany({
        where: { id: rec.id, usedAt: null },
        data: { usedAt: now },
      });
      if (claimed.count !== 1) throw new BadRequestException(RESET_INVALID);
      // passwordChangedAt отзывает все выданные раньше токены входа —
      // в том числе у того, кто мог завладеть аккаунтом.
      await tx.user.update({
        where: { id: rec.userId },
        data: { passwordHash, passwordChangedAt: now },
      });
      await tx.passwordResetToken.deleteMany({ where: { userId: rec.userId, id: { not: rec.id } } });
    });
    return { ok: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return this.publicUser(user);
  }
}

function resetEmailHtml(fullName: string, link: string): string {
  return `
<p>Здравствуйте, ${escapeHtml(fullName)}!</p>
<p>Кто-то запросил восстановление пароля для вашего аккаунта на VetHub. Чтобы задать новый пароль, перейдите по ссылке — она действует 1 час и срабатывает один раз:</p>
<p><a href="${link}">Задать новый пароль</a></p>
<p>Если это были не вы, просто проигнорируйте письмо: пароль останется прежним.</p>
<hr>
<p>Assalomu alaykum! VetHub hisobingiz parolini tiklash so‘raldi. Yangi parol o‘rnatish uchun havolaga o‘ting (1 soat amal qiladi, bir marta ishlaydi):</p>
<p><a href="${link}">Yangi parol o‘rnatish</a></p>
<p>Agar bu siz bo‘lmasangiz, xatga e’tibor bermang.</p>
`;
}
