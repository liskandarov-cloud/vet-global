import { createHash, randomBytes } from 'crypto';

// Ссылка живёт час: письмо читают сразу, а дольше открытая ссылка — это
// окно для того, кто получит доступ к почте позже.
export const RESET_TTL_MS = 60 * 60 * 1000;

// Токен уходит только в письмо, в базе лежит его хэш. 32 случайных байта
// перебором не подбираются, поэтому соль не нужна — достаточно SHA-256.
export function hashResetToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function newResetToken(now = Date.now()): { raw: string; hash: string; expiresAt: Date } {
  const raw = randomBytes(32).toString('base64url');
  return { raw, hash: hashResetToken(raw), expiresAt: new Date(now + RESET_TTL_MS) };
}

export function isResetUsable(t: { expiresAt: Date; usedAt: Date | null }, now = Date.now()): boolean {
  return t.usedAt === null && t.expiresAt.getTime() > now;
}

// Токен входа выпущен до смены пароля — значит, он отозван. iat в секундах,
// поэтому сравниваем с секундой смены: вход в ту же секунду, что и смена,
// (повторный вход сразу после неё) остаётся действительным.
export function issuedBeforePasswordChange(iat: number | undefined, changedAt: Date | null): boolean {
  if (!changedAt) return false;
  if (typeof iat !== 'number') return true;
  return iat < Math.floor(changedAt.getTime() / 1000);
}
