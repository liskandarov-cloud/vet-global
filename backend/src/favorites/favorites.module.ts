import { Module } from '@nestjs/common';
import { PromotionsModule } from '../promotions/promotions.module';
import { FavoritesController } from './favorites.controller';

@Module({
  imports: [PromotionsModule],
  controllers: [FavoritesController],
})
export class FavoritesModule {}
