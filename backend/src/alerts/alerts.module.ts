import { Global, Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PushModule } from '../push/push.module';

// Глобальный, как почта: уведомляют почти все модули.
@Global()
@Module({
  imports: [PrismaModule, PushModule],
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
