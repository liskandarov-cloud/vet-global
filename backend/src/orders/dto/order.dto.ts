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
import { OrderStatus, PaymentTerm } from '@prisma/client';

export class OrderItemInput {
  @IsString() productId: string;
  @IsOptional() @IsString() offerId?: string; // выбранный оффер продавца (мульти-поставщик)
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

  // Финансирование (блок 2)
  @IsOptional() @IsEnum(PaymentTerm) paymentTerm?: PaymentTerm;
  @IsOptional() @IsInt() @Min(1) netTermDays?: number; // для NET_TERMS
  @IsOptional() @IsInt() @Min(2) installments?: number; // для INSTALLMENT
}

export class UpdateStatusDto {
  @IsEnum(OrderStatus) status: OrderStatus;
}
