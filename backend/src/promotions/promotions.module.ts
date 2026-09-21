import { Module } from '@nestjs/common';
import { PromotionsController } from './promotions.controller';
import { PromotionsService } from './promotions.service';

@Module({
  controllers: [PromotionsController],
  // Акция снижает цену, и эта цена должна быть одинаковой везде, где товар
  // показывается: каталог, избранное, страница бренда, бот.
  providers: [PromotionsService],
  exports: [PromotionsService],
})
export class PromotionsModule {}
