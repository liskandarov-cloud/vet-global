import { Module } from '@nestjs/common';
import { ImportService } from './import.service';
import { ImportController } from './import.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductsModule } from '../products/products.module';
import { OffersModule } from '../offers/offers.module';

@Module({
  imports: [PrismaModule, ProductsModule, OffersModule],
  controllers: [ImportController],
  providers: [ImportService],
})
export class ImportModule {}
