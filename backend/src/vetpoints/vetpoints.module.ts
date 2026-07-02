import { Module } from '@nestjs/common';
import { VetpointsController } from './vetpoints.controller';

@Module({
  controllers: [VetpointsController],
})
export class VetpointsModule {}
