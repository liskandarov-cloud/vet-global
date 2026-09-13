import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrderReleaseService } from './order-release.service';
import { OrdersController } from './orders.controller';
import { AlertsModule } from '../alerts/alerts.module';
import { DeliveryModule } from '../delivery/delivery.module';

@Module({
  imports: [AlertsModule, DeliveryModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderReleaseService],
  exports: [OrdersService, OrderReleaseService],
})
export class OrdersModule {}
