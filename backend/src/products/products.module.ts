import { Module } from '@nestjs/common';
import { PromotionsModule } from '../promotions/promotions.module';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [AlertsModule, PromotionsModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
