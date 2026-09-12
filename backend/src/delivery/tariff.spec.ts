import { DeliveryMethod } from '@prisma/client';
import { deliveryCostByTariff, pickTariff, type Tariff } from './tariff';

const { COURIER, TRANSPORT, PICKUP } = DeliveryMethod;

const tashkent: Tariff = { method: COURIER, city: 'Ташкент', cost: 45000 };
// Пустая строка — тариф по умолчанию для всех городов.
const anywhere: Tariff = { method: COURIER, city: '', cost: 120000 };
const transport: Tariff = { method: TRANSPORT, city: '', cost: 80000 };

describe('pickTariff — подбор тарифа', () => {
  it('точное совпадение города важнее тарифа по умолчанию', () => {
    // Порядок строк в данных не должен влиять на выбор.
    expect(pickTariff([anywhere, tashkent], COURIER, 'Ташкент')).toBe(tashkent);
    expect(pickTariff([tashkent, anywhere], COURIER, 'Ташкент')).toBe(tashkent);
  });

  it('для города без своего тарифа берётся тариф по умолчанию', () => {
    expect(pickTariff([tashkent, anywhere], COURIER, 'Самарканд')).toBe(anywhere);
  });

  it('город сравнивается без учёта регистра и пробелов', () => {
    // В прайсах и адресах пишут по-разному.
    expect(pickTariff([tashkent], COURIER, 'ташкент')).toBe(tashkent);
    expect(pickTariff([tashkent], COURIER, '  Ташкент  ')).toBe(tashkent);
  });

  it('способ доставки не смешивается', () => {
    expect(pickTariff([transport], COURIER, 'Ташкент')).toBeNull();
    expect(pickTariff([tashkent, transport], TRANSPORT, 'Ташкент')).toBe(transport);
  });

  it('отключённые тарифы не выбираются', () => {
    const off: Tariff = { ...tashkent, isActive: false };
    expect(pickTariff([off], COURIER, 'Ташкент')).toBeNull();
    expect(pickTariff([off, anywhere], COURIER, 'Ташкент')).toBe(anywhere);
  });

  it('пустой список даёт null', () => {
    expect(pickTariff([], COURIER, 'Ташкент')).toBeNull();
  });

  it('пустая строка и пробелы в городе тарифа — это тариф по умолчанию', () => {
    // Приведение делает сервис, но подбор не должен ломаться и на пробелах.
    const spaces: Tariff = { method: COURIER, city: '   ', cost: 99000 };
    expect(pickTariff([spaces], COURIER, 'Ташкент')).toBe(spaces);
  });
});

describe('deliveryCostByTariff — стоимость доставки', () => {
  it('самовывоз бесплатен и тарифа не требует', () => {
    expect(deliveryCostByTariff([], { method: PICKUP, city: 'Ташкент', orderSubtotal: 100 })).toBe(0);
  });

  it('берёт стоимость подходящего тарифа', () => {
    expect(
      deliveryCostByTariff([tashkent, anywhere], { method: COURIER, city: 'Ташкент', orderSubtotal: 100000 }),
    ).toBe(45000);
    expect(
      deliveryCostByTariff([tashkent, anywhere], { method: COURIER, city: 'Нукус', orderSubtotal: 100000 }),
    ).toBe(120000);
  });

  it('порог бесплатной доставки обнуляет стоимость', () => {
    const t: Tariff = { method: COURIER, city: 'Ташкент', cost: 45000, freeFrom: 5_000_000 };
    expect(deliveryCostByTariff([t], { method: COURIER, city: 'Ташкент', orderSubtotal: 4_999_999 })).toBe(45000);
    expect(deliveryCostByTariff([t], { method: COURIER, city: 'Ташкент', orderSubtotal: 5_000_000 })).toBe(0);
    expect(deliveryCostByTariff([t], { method: COURIER, city: 'Ташкент', orderSubtotal: 9_000_000 })).toBe(0);
  });

  it('порог сравнивается с суммой всего заказа, а не долей продавца', () => {
    // Решение владельца. Заказ на 6 млн от двух поставщиков по 3 млн: порог
    // 5 млн достигнут суммой заказа, и доставка бесплатна у каждого, хотя ни
    // один не набрал порога своими позициями.
    const t: Tariff = { method: COURIER, city: 'Ташкент', cost: 45000, freeFrom: 5_000_000 };
    expect(deliveryCostByTariff([t], { method: COURIER, city: 'Ташкент', orderSubtotal: 6_000_000 })).toBe(0);
  });

  it('без порога стоимость не обнуляется никогда', () => {
    expect(
      deliveryCostByTariff([tashkent], { method: COURIER, city: 'Ташкент', orderSubtotal: 999_999_999 }),
    ).toBe(45000);
  });

  it('нет подходящего тарифа — null, а не ноль', () => {
    // Ноль означал бы обещание бесплатной доставки. null значит «продавец
    // назначит при оформлении отправки» — прежнее поведение системы.
    expect(deliveryCostByTariff([], { method: COURIER, city: 'Ташкент', orderSubtotal: 100000 })).toBeNull();
    expect(
      deliveryCostByTariff([transport], { method: COURIER, city: 'Ташкент', orderSubtotal: 100000 }),
    ).toBeNull();
  });

  it('отрицательная стоимость в данных не уходит в минус', () => {
    const bad: Tariff = { method: COURIER, city: '', cost: -500 };
    expect(deliveryCostByTariff([bad], { method: COURIER, city: 'Ташкент', orderSubtotal: 100 })).toBe(0);
  });

  it('мусор в стоимости даёт ноль, а не NaN', () => {
    const bad: Tariff = { method: COURIER, city: '', cost: NaN };
    expect(deliveryCostByTariff([bad], { method: COURIER, city: 'Ташкент', orderSubtotal: 100 })).toBe(0);
  });
});
