import { Module } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { DeliveryController } from './delivery.controller';
import { TariffsController } from './tariffs.controller';
import { TariffsService } from './tariffs.service';

@Module({
  controllers: [DeliveryController, TariffsController],
  providers: [DeliveryService, TariffsService],
  // Оформление заказа считает доставку тем же методом, что и корзина.
  exports: [TariffsService],
})
export class DeliveryModule {}
