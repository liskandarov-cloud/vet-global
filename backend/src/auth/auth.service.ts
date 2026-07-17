import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto, SELF_SIGNUP_ROLES } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
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

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
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

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return this.publicUser(user);
  }
}
