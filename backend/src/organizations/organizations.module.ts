import { Module } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AlertsModule } from '../alerts/alerts.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  // Отклонение заказа возвращает занятое им через OrderReleaseService.
  imports: [PrismaModule, AlertsModule, OrdersModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
