import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class OrderItemInput {
  @IsString() productId: string;
  @IsInt() @Min(1) quantity: number;
}

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemInput)
  items: OrderItemInput[];

  // Guest checkout — required only when unauthenticated.
  @IsOptional() @IsString() buyerName?: string;
  @IsOptional() @IsString() buyerPhone?: string;
  @IsOptional() @IsString() buyerCompany?: string;

  @IsOptional() @IsString() counterpartyId?: string;
  @IsOptional() @IsNumber() @Min(0) vetPointsUsed?: number;
}

export class UpdateStatusDto {
  @IsEnum(OrderStatus) status: OrderStatus;
}
