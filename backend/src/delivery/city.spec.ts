import { cityKey } from './city';
import { pickTariff } from './tariff';

describe('cityKey', () => {
  it('сводит написания областных центров к одному ключу', () => {
    for (const v of ['Ташкент', 'toshkent', 'Тошкент', 'Tashkent', ' г. Ташкент ', 'Toshkent shahri']) {
      expect(cityKey(v)).toBe('tashkent');
    }
    expect(cityKey("Farg'ona")).toBe('fergana');
    expect(cityKey('Fargʻona')).toBe('fergana');
    expect(cityKey('Фарғона')).toBe('fergana');
    expect(cityKey('Qarshi')).toBe(cityKey('Карши'));
  });

  it('прочие города сравниваются после нормализации', () => {
    expect(cityKey('Чирчик')).toBe(cityKey(' чирчик '));
    expect(cityKey('Чирчик')).not.toBe(cityKey('Ташкент'));
    expect(cityKey(null)).toBe('');
  });
});

describe('тариф по городу из узбекского интерфейса', () => {
  it('«Toshkent» получает тариф «Ташкент», а не тариф для остальных городов', () => {
    const tariffs = [
      { method: 'COURIER' as const, city: 'Ташкент', cost: 45000 },
      { method: 'COURIER' as const, city: '', cost: 120000 },
    ];
    expect(pickTariff(tariffs as any, 'COURIER' as any, 'Toshkent')?.cost).toBe(45000);
    expect(pickTariff(tariffs as any, 'COURIER' as any, 'Samarqand')?.cost).toBe(120000);
  });
});
