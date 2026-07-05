import { Module } from '@nestjs/common';
import { FinancingService } from './financing.service';
import { FinancingController } from './financing.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FinancingController],
  providers: [FinancingService],
  exports: [FinancingService],
})
export class FinancingModule {}
