import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';
import { FilesController } from './files.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [StorageController, FilesController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
