import { parseCommerceML, priceUpdateFrom } from './price-item';

const ok = (item: Parameters<typeof priceUpdateFrom>[0]) => {
  const r = priceUpdateFrom(item);
  if ('error' in r) throw new Error(r.error);
  return r.update;
};
const err = (item: Parameters<typeof priceUpdateFrom>[0]) => {
  const r = priceUpdateFrom(item);
  return 'error' in r ? r.error : null;
};

describe('priceUpdateFrom', () => {
  it('цена числом и строкой в форматах 1С', () => {
    expect(ok({ externalId: 'a', price: 1500 }).price).toBe(1500);
    expect(ok({ externalId: 'a', price: '1 500,00' }).price).toBe(1500);
    expect(ok({ externalId: 'a', price: '1500.50' }).price).toBe(1500.5);
  });

  it('нулевую, отрицательную и нечисловую цену отклоняет', () => {
    expect(err({ externalId: 'a', price: 0 })).toMatch(/больше нуля/);
    expect(err({ externalId: 'a', price: -10 })).toMatch(/больше нуля/);
    expect(err({ externalId: 'a', price: 'abc' })).toMatch(/больше нуля/);
    expect(err({ externalId: 'a', price: Number.NaN })).toMatch(/больше нуля/);
    expect(err({ externalId: 'a', price: 1e12 })).toMatch(/больше допустимой/);
  });

  it('остаток задаёт наличие; отрицательный — это ноль, дробный — целые штуки', () => {
    expect(ok({ externalId: 'a', quantity: 5 })).toEqual({ stockQty: 5, inStock: true });
    expect(ok({ externalId: 'a', quantity: '10.000' })).toEqual({ stockQty: 10, inStock: true });
    expect(ok({ externalId: 'a', quantity: 0 })).toEqual({ stockQty: 0, inStock: false });
    expect(ok({ externalId: 'a', quantity: -3 })).toEqual({ stockQty: 0, inStock: false });
    expect(err({ externalId: 'a', quantity: 'много' })).toMatch(/остаток/);
  });

  it('наличие флагом — только если остатка нет', () => {
    expect(ok({ externalId: 'a', inStock: false })).toEqual({ inStock: false });
    expect(ok({ externalId: 'a', quantity: 2, inStock: false })).toEqual({ stockQty: 2, inStock: true });
  });

  it('пустая строка — «не менять», а не ошибка', () => {
    expect(ok({ externalId: 'a', price: '', quantity: '' })).toEqual({});
  });
});

describe('parseCommerceML', () => {
  it('отдаёт значения строками, чтобы формат числа разбирался одинаково', () => {
    const xml = `
      <ПакетПредложений><Предложения>
        <Предложение><Ид>SKU-1</Ид><Цены><Цена><ЦенаЗаЕдиницу>1 500,00</ЦенаЗаЕдиницу></Цена></Цены><Количество>12</Количество></Предложение>
        <Предложение><Ид> SKU-2 </Ид><Количество>0</Количество></Предложение>
        <Предложение><Цены/></Предложение>
      </Предложения></ПакетПредложений>`;
    const items = parseCommerceML(xml);
    expect(items).toEqual([
      { externalId: 'SKU-1', price: '1 500,00', quantity: '12' },
      { externalId: 'SKU-2', price: undefined, quantity: '0' },
    ]);
    expect(ok(items[0])).toEqual({ price: 1500, stockQty: 12, inStock: true });
  });
});
