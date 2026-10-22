import { resolveJwtSecret } from './jwt-secret';

describe('resolveJwtSecret', () => {
  it('отдаёт заданный секрет', () => {
    expect(resolveJwtSecret('s3cr3t', 'production')).toBe('s3cr3t');
    expect(resolveJwtSecret('  s3cr3t  ', 'production')).toBe('s3cr3t');
  });

  it('на проде без секрета останавливает запуск', () => {
    expect(() => resolveJwtSecret(undefined, 'production')).toThrow(/JWT_SECRET не задан/);
    expect(() => resolveJwtSecret('   ', 'production')).toThrow(/JWT_SECRET не задан/);
  });

  it('на проде не принимает публичное dev-значение', () => {
    expect(() => resolveJwtSecret('dev-secret', 'production')).toThrow(/dev-значением/);
  });

  it('локально без секрета поднимается на dev-значении', () => {
    expect(resolveJwtSecret(undefined, 'development')).toBe('dev-secret');
    expect(resolveJwtSecret(undefined, 'test')).toBe('dev-secret');
  });
});
