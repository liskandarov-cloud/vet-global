import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() company?: string;
  @IsOptional() @IsString() inn?: string;
  @IsOptional() @IsString() description?: string; // о поставщике
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsString() bankName?: string;
  @IsOptional() @IsString() bankAccount?: string;
  @IsOptional() @IsString() bankMfo?: string;
  @IsOptional() @IsBoolean() vatPayer?: boolean;
}

export class CounterpartyDto {
  @IsString() name: string;
  @IsString() inn: string;
  @IsOptional() @IsString() mfo?: string;
  @IsOptional() @IsString() bankAccount?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class SellerDocumentDto {
  @IsString() title: string;
  @IsString() fileUrl: string;
}
