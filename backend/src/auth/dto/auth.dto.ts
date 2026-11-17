import { Equals, IsEmail, IsIn, IsOptional, IsString, Length, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';
import { NormalizeEmail } from '../../common/email';

// Роли, доступные при публичной регистрации. ADMIN сюда не входит:
// иначе любой, отправив {"role":"ADMIN"}, получал бы права администратора.
// Админа заводят через POST /api/maintenance/user (под другим админом).
export const SELF_SIGNUP_ROLES = [UserRole.BUYER, UserRole.SELLER] as const;

export class RegisterDto {
  @NormalizeEmail()
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: 'Пароль должен быть не короче 8 символов' })
  password: string;

  @IsString()
  fullName: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  inn?: string;

  @IsIn(SELF_SIGNUP_ROLES as unknown as UserRole[], {
    message: 'role must be one of the following values: BUYER, SELLER',
  })
  role: UserRole;

  // Согласие с пользовательским соглашением и политикой ПДн обязательно:
  // без него обрабатывать персональные данные нельзя.
  @Equals(true, { message: 'Нужно принять пользовательское соглашение и политику конфиденциальности' })
  acceptTerms: boolean;
}

export class LoginDto {
  @NormalizeEmail()
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class ForgotPasswordDto {
  @NormalizeEmail()
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  // base64url от 32 байт — ровно 43 символа.
  @IsString()
  @Length(43, 43, { message: 'Ссылка недействительна или устарела. Запросите новую.' })
  token: string;

  @IsString()
  @MinLength(8, { message: 'Пароль должен быть не короче 8 символов' })
  password: string;
}
