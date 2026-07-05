import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApplyCreditDto {
  @ApiProperty({ description: 'Запрашиваемый кредитный лимит' })
  @IsNumber()
  @Min(1)
  requestedLimit!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  counterpartyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  purpose?: string;
}

export class DecideCreditDto {
  @ApiProperty({ description: 'true = одобрить, false = отклонить' })
  @IsBoolean()
  approve!: boolean;

  @ApiPropertyOptional({ description: 'Одобренный лимит (по умолчанию = запрошенному)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  approvedLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
