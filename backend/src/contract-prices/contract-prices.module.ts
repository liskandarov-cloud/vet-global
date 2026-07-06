import { Module } from '@nestjs/common';
import { ContractPricesService } from './contract-prices.service';
import { ContractPricesController } from './contract-prices.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ContractPricesController],
  providers: [ContractPricesService],
  exports: [ContractPricesService],
})
export class ContractPricesModule {}
