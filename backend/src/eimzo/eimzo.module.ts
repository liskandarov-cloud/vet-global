import { Module } from '@nestjs/common';
import { EimzoService } from './eimzo.service';
import { EimzoController } from './eimzo.controller';

@Module({
  controllers: [EimzoController],
  providers: [EimzoService],
})
export class EimzoModule {}
