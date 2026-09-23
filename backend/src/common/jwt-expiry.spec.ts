import { parseJwtExpiry } from './jwt-expiry';

describe('срок жизни токена', () => {
  it('число означает секунды', () => {
    expect(parseJwtExpiry('3600')).toBe(3600);
  });

  it('строка с единицей приводится к каноническому виду', () => {
    expect(parseJwtExpiry('7d')).toBe('7d');
    expect(parseJwtExpiry('30 M')).toBe('30m');
    expect(parseJwtExpiry(' 12h ')).toBe('12h');
  });

  it('пустое значение заменяется умолчанием', () => {
    expect(parseJwtExpiry(undefined)).toBe('7d');
    expect(parseJwtExpiry('')).toBe('7d');
    expect(parseJwtExpiry('   ')).toBe('7d');
  });

  // Раньше такое значение уходило в библиотеку как есть и роняло первый же
  // вход, а не запуск: на проде это выглядело как «сайт не пускает».
  it('непонятное значение останавливает запуск', () => {
    expect(() => parseJwtExpiry('7дней')).toThrow(/JWT_EXPIRES_IN/);
    expect(() => parseJwtExpiry('неделя')).toThrow(/JWT_EXPIRES_IN/);
    expect(() => parseJwtExpiry('7 dd')).toThrow(/JWT_EXPIRES_IN/);
  });

  it('нулевой и отрицательный срок не принимаются', () => {
    expect(() => parseJwtExpiry('0')).toThrow(/больше нуля/);
    expect(() => parseJwtExpiry('0d')).toThrow(/JWT_EXPIRES_IN/);
    expect(() => parseJwtExpiry('-5')).toThrow(/JWT_EXPIRES_IN/);
  });
});
