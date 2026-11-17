import { applyDecorators, SetMetadata, UseInterceptors } from '@nestjs/common';
import { AuditInterceptor } from './audit.interceptor';
import { AUDIT_KEY, AuditMeta } from './audit.meta';

// Админское действие попадает в журнал: кто, что, над чем и с какими
// параметрами (секреты вычищаются).
export const Audit = (action: string, targetType: string) =>
  applyDecorators(SetMetadata(AUDIT_KEY, { action, targetType } as AuditMeta), UseInterceptors(AuditInterceptor));
