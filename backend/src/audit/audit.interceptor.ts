import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';
import { AUDIT_KEY, AuditMeta } from './audit.meta';

// Пишет в журнал после успешного ответа: неудавшееся действие ничего не
// изменило, и записывать его как совершённое было бы неправдой.
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.get<AuditMeta>(AUDIT_KEY, ctx.getHandler());
    const req = ctx.switchToHttp().getRequest();
    return next.handle().pipe(
      tap((result: any) => {
        if (!meta || !req.user?.id) return;
        void this.audit.record({
          adminId: req.user.id,
          action: meta.action,
          targetType: meta.targetType,
          // Цель — из пути; у создающих действий её id есть только в ответе.
          targetId: req.params?.id ?? result?.id ?? null,
          details: { ...(req.query ?? {}), ...(req.body ?? {}) },
        });
      }),
    );
  }
}
