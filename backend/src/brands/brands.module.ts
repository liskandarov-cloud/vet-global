import { Module } from '@nestjs/common';
import { PromotionsModule } from '../promotions/promotions.module';
import { BrandsService } from './brands.service';
import { BrandsController } from './brands.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, PromotionsModule],
  controllers: [BrandsController],
  providers: [BrandsService],
  exports: [BrandsService],
})
export class BrandsModule {}
