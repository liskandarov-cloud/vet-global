import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymeService } from './payme.service';
import { ClickService } from './click.service';
import { PaymentsController } from './payments.controller';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymeService, ClickService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
