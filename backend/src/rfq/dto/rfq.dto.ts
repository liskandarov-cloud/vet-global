import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RfqItemInput {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  unit?: string;
}

export class CreateRfqDto {
  @ApiProperty()
  @IsString()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ description: 'ISO-дата дедлайна' })
  @IsOptional()
  @IsString()
  deadline?: string;

  @ApiProperty({ type: [RfqItemInput] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RfqItemInput)
  items!: RfqItemInput[];
}

export class QuoteItemInput {
  @ApiProperty()
  @IsString()
  rfqItemId!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unitPrice!: number; // цена за единицу позиции
}

export class QuoteDto {
  // Единая сумма за весь запрос. Необязательна, если передан разбор по позициям
  // (items) — тогда итог считается на сервере как сумма строк.
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalPrice?: number;

  @ApiPropertyOptional({ type: [QuoteItemInput], description: 'Разбивка цены по позициям' })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuoteItemInput)
  items?: QuoteItemInput[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  leadTimeDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
