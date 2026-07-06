import { IsEmail, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateContractPriceDto {
  @ApiProperty()
  @IsString()
  offerId!: string;

  @ApiProperty({ description: 'Email покупателя' })
  @IsEmail()
  buyerEmail!: string;

  @ApiProperty({ description: 'Договорная цена за единицу' })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ description: 'ISO-дата окончания действия' })
  @IsOptional()
  @IsString()
  validUntil?: string;
}
