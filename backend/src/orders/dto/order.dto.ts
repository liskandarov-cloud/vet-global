import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { DeliveryMethod, OrderStatus, PaymentTerm } from '@prisma/client';

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

  // Доставка. Стоимость НЕ принимается от клиента: она считается на сервере по
  // тарифам продавцов, иначе сумму заказа можно было бы занизить запросом.
  @IsOptional() @IsEnum(DeliveryMethod) deliveryMethod?: DeliveryMethod;
  @IsOptional() @IsString() deliveryCity?: string;
  @IsOptional() @IsString() deliveryAddress?: string;

  // Финансирование (блок 2)
  @IsOptional() @IsEnum(PaymentTerm) paymentTerm?: PaymentTerm;
  // Сроки ограничены: без верхней границы покупатель сам выбирал отсрочку на
  // 100 лет или рассрочку на тысячи платежей. Корзина предлагает net-30/60 и
  // 3/6/12 месяцев; границы с запасом, чтобы не мешать будущим вариантам.
  @IsOptional() @IsInt() @Min(1) @Max(180) netTermDays?: number; // для NET_TERMS
  @IsOptional() @IsInt() @Min(2) @Max(24) installments?: number; // для INSTALLMENT
}

export class UpdateStatusDto {
  @IsEnum(OrderStatus) status: OrderStatus;
}
