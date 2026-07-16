import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class PriceBreakDto {
  @ApiProperty({ description: 'Минимальное количество для этой цены' })
  @IsInt()
  @Min(1)
  minQty!: number;

  @ApiProperty({ description: 'Цена за единицу при этом объёме' })
  @IsNumber()
  @Min(0)
  price!: number;
}

export class CreateOfferDto {
  @ApiProperty()
  @IsString()
  productId!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  inStock?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  stockQty?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  minOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  leadTimeDays?: number;

  // ── Фасовка ──
  @ApiPropertyOptional({ description: 'За что указана цена: «1000 доз», «1 л»' })
  @IsOptional()
  @IsString()
  priceUnit?: string;

  @ApiPropertyOptional({ description: 'Числовой размер единицы цены (1000 для «за 1000 доз»)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  priceUnitQty?: number;

  @ApiPropertyOptional({ description: 'Сколько базовых единиц в упаковке (доз во флаконе)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  packSize?: number;

  @ApiPropertyOptional({ description: 'Единица заказа: «флакон», «канистра», «шт»' })
  @IsOptional()
  @IsString()
  packUnit?: string;

  // Блок 2 — оптовые механики
  @ApiPropertyOptional({ type: [PriceBreakDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceBreakDto)
  priceBreaks?: PriceBreakDto[];

  @ApiPropertyOptional({ description: 'Отсрочка платежа в днях (net-30/60)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  netTermDays?: number;

  // Блок 3 — доверие / анти-фальсификат
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  batchNumber?: string;

  @ApiPropertyOptional({ description: 'ISO-дата срока годности' })
  @IsOptional()
  @IsString()
  expiryDate?: string;

  @ApiPropertyOptional({ description: 'Рег. номер в госреестре ветпрепаратов' })
  @IsOptional()
  @IsString()
  regNumber?: string;

  @ApiPropertyOptional({ description: 'Рецептурный отпуск (Rx)' })
  @IsOptional()
  @IsBoolean()
  isRx?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certificates?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalId?: string;
}

export class UpdateOfferDto extends PartialType(CreateOfferDto) {}
