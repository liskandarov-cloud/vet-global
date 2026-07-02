import { Module } from '@nestjs/common';
import { ConsultingService } from './consulting.service';
import { ConsultingController } from './consulting.controller';

@Module({
  controllers: [ConsultingController],
  providers: [ConsultingService],
})
export class ConsultingModule {}
