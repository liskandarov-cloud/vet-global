import { redact } from './redact';

describe('redact', () => {
  it('скрывает пароли, токены и ключи на любой глубине', () => {
    expect(
      redact({ email: 'a@b.uz', password: 'x', nested: { syncApiKey: 'k', newPassword: 'y', token: 't' }, role: 'ADMIN' }),
    ).toEqual({
      email: 'a@b.uz',
      password: '[скрыто]',
      nested: { syncApiKey: '[скрыто]', newPassword: '[скрыто]', token: '[скрыто]' },
      role: 'ADMIN',
    });
  });

  it('примитивы и пустые значения не трогает', () => {
    expect(redact(null)).toBeNull();
    expect(redact('text')).toBe('text');
    expect(redact({ isBanned: true, limit: 5 })).toEqual({ isBanned: true, limit: 5 });
  });
});
