import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { normalizeEmail } from './email';
import { LoginDto, RegisterDto } from '../auth/dto/auth.dto';

describe('normalizeEmail', () => {
  it('приводит к нижнему регистру и срезает пробелы', () => {
    expect(normalizeEmail('  Farm@Mail.UZ ')).toBe('farm@mail.uz');
  });

  it('не трогает то, что не строка', () => {
    expect(normalizeEmail(undefined)).toBeUndefined();
    expect(normalizeEmail(42)).toBe(42);
  });
});

// Нормализация должна стоять на каждом DTO, по которому ищут пользователя:
// пропущенный декоратор вернул бы ровно ту ошибку, которую мы исправляем.
// DTO приглашения в организацию проверяется в e2e: он тянет @nestjs/swagger,
// а тот поставляется ES-модулем, который юнит-раннер не загружает.
describe('DTO с почтой нормализуют её до проверки', () => {
  it.each([
    ['вход', LoginDto, { email: ' Buyer@VetHub.uz ', password: 'x' }],
    [
      'регистрация',
      RegisterDto,
      { email: ' Buyer@VetHub.uz ', password: 'secret1', fullName: 'B', phone: '+998', role: 'BUYER' },
    ],
  ])('%s', (_name, cls, plain) => {
    const dto = plainToInstance(cls as any, plain) as unknown as { email: string };
    expect(dto.email).toBe('buyer@vethub.uz');
    expect(validateSync(dto as object)).toEqual([]);
  });
});
