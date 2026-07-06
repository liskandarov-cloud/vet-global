import { IsEmail, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrgRole } from '@prisma/client';

export class CreateOrgDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  inn?: string;
}

export class InviteMemberDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ enum: OrgRole })
  @IsOptional()
  @IsEnum(OrgRole)
  role?: OrgRole;

  @ApiPropertyOptional({ description: 'Лимит заказа без согласования' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  spendLimit?: number;
}

export class UpdateMemberDto {
  @ApiPropertyOptional({ enum: OrgRole })
  @IsOptional()
  @IsEnum(OrgRole)
  role?: OrgRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  spendLimit?: number;
}
