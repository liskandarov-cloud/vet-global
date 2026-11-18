import { Module } from '@nestjs/common';
import { ConsultingService } from './consulting.service';
import { ConsultingController } from './consulting.controller';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [AlertsModule],
  controllers: [ConsultingController],
  providers: [ConsultingService],
})
export class ConsultingModule {}
