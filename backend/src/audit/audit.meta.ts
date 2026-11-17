export const AUDIT_KEY = 'audit';

export interface AuditMeta {
  action: string; // «user.verify», «financing.decide» — глагол после точки
  targetType: string; // модель, над которой действие: User, Offer, …
}
