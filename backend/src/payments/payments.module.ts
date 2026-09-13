import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { OrdersModule } from '../orders/orders.module';
import { PaymeService } from './payme.service';
import { ClickService } from './click.service';
import { PaymentsController } from './payments.controller';

@Module({
  // Возврат кредитного лимита при оплате живёт в OrderReleaseService: та же
  // реализация, что и при отмене заказа.
  imports: [OrdersModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymeService, ClickService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
