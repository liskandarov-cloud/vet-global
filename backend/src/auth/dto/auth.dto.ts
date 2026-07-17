import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';

// Роли, доступные при публичной регистрации. ADMIN сюда не входит:
// иначе любой, отправив {"role":"ADMIN"}, получал бы права администратора.
// Админа заводят через POST /api/maintenance/user (под другим админом).
export const SELF_SIGNUP_ROLES = [UserRole.BUYER, UserRole.SELLER] as const;

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
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
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
