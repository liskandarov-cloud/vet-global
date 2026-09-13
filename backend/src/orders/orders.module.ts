import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { AlertsModule } from '../alerts/alerts.module';
import { DeliveryModule } from '../delivery/delivery.module';

@Module({
  imports: [AlertsModule, DeliveryModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
