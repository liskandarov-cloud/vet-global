import { OrdersModule } from '../orders/orders.module';
import { UsersModule } from '../users/users.module';
import { Module } from '@nestjs/common';
import { PromotionsModule } from '../promotions/promotions.module';
import { TelegramService } from './telegram.service';

@Module({
  imports: [PromotionsModule, UsersModule, OrdersModule],
  providers: [TelegramService],
})
export class TelegramModule {}
