import { Module } from '@nestjs/common';
import { PromotionsModule } from '../promotions/promotions.module';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { StockAlertsService } from './stock-alerts.service';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [AlertsModule, PromotionsModule],
  controllers: [ProductsController],
  providers: [ProductsService, StockAlertsService],
  exports: [ProductsService, StockAlertsService],
})
export class ProductsModule {}
