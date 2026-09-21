import { Module } from '@nestjs/common';
import { PromotionsModule } from '../promotions/promotions.module';
import { TelegramService } from './telegram.service';

@Module({
  imports: [PromotionsModule],
  providers: [TelegramService],
})
export class TelegramModule {}
