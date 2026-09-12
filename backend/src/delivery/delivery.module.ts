import { Module } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { DeliveryController } from './delivery.controller';
import { TariffsController } from './tariffs.controller';
import { TariffsService } from './tariffs.service';

@Module({
  controllers: [DeliveryController, TariffsController],
  providers: [DeliveryService, TariffsService],
})
export class DeliveryModule {}
