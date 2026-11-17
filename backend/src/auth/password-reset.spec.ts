import {
  RESET_TTL_MS,
  hashResetToken,
  isResetUsable,
  issuedBeforePasswordChange,
  newResetToken,
} from './password-reset';

describe('password reset tokens', () => {
  it('хранит хэш, а не сам токен; хэш детерминирован', () => {
    const t = newResetToken(0);
    expect(t.hash).not.toBe(t.raw);
    expect(t.hash).toBe(hashResetToken(t.raw));
    expect(t.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(t.expiresAt.getTime()).toBe(RESET_TTL_MS);
  });

  it('каждый токен уникален и пригоден для URL', () => {
    const a = newResetToken();
    const b = newResetToken();
    expect(a.raw).not.toBe(b.raw);
    expect(a.raw).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('использованный или просроченный токен непригоден', () => {
    const exp = new Date(1000);
    expect(isResetUsable({ expiresAt: exp, usedAt: null }, 999)).toBe(true);
    expect(isResetUsable({ expiresAt: exp, usedAt: null }, 1000)).toBe(false);
    expect(isResetUsable({ expiresAt: exp, usedAt: new Date(500) }, 600)).toBe(false);
  });
});

describe('issuedBeforePasswordChange', () => {
  const changed = new Date('2026-11-17T12:00:00.700Z'); // секунда 12:00:00
  const sec = Math.floor(changed.getTime() / 1000);

  it('пароль не менялся — токен действителен', () => {
    expect(issuedBeforePasswordChange(sec - 100, null)).toBe(false);
  });

  it('токен старше смены пароля отозван', () => {
    expect(issuedBeforePasswordChange(sec - 1, changed)).toBe(true);
  });

  it('вход в секунду смены и позже действителен', () => {
    expect(issuedBeforePasswordChange(sec, changed)).toBe(false);
    expect(issuedBeforePasswordChange(sec + 5, changed)).toBe(false);
  });

  it('токен без iat при сменённом пароле не принимается', () => {
    expect(issuedBeforePasswordChange(undefined, changed)).toBe(true);
  });
});
