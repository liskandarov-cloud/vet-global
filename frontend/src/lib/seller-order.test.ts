import { describe, it, expect } from 'vitest';
import { ownInvoice, ownItems, ownShipment } from './seller-order';

const ME = 'seller-me';
const OTHER = 'seller-other';

describe('что в заказе принадлежит продавцу', () => {
  it('своя отправка, а не чужая', () => {
    const order = { shipments: [{ sellerId: OTHER, carrier: 'BTS' }, { sellerId: ME, carrier: 'UzPost' }] };
    expect(ownShipment(order, ME)?.carrier).toBe('UzPost');
  });

  it('свой счёт, а не чужой: это документ другого юрлица', () => {
    const order = { invoices: [{ sellerId: OTHER, number: 'VG-1-AAAA' }, { sellerId: ME, number: 'VG-1-BBBB' }] };
    expect(ownInvoice(order, ME)?.number).toBe('VG-1-BBBB');
  });

  // Записи, созданные до разделения по продавцам, продавца не указывают.
  // Без запасного варианта продавец не увидел бы собственный старый документ.
  it('старая запись без продавца достаётся как своя', () => {
    expect(ownInvoice({ invoices: [{ sellerId: '', number: 'VG-2026-OLD' }] }, ME)?.number).toBe('VG-2026-OLD');
    expect(ownShipment({ shipments: [{ sellerId: null, carrier: 'BTS' }] }, ME)?.carrier).toBe('BTS');
  });

  it('точное совпадение важнее записи без продавца', () => {
    const order = { invoices: [{ sellerId: '', number: 'старый' }, { sellerId: ME, number: 'мой' }] };
    expect(ownInvoice(order, ME)?.number).toBe('мой');
  });

  it('чужой записи не достаётся ничего', () => {
    expect(ownShipment({ shipments: [{ sellerId: OTHER }] }, ME)).toBeUndefined();
    expect(ownInvoice({ invoices: [{ sellerId: OTHER }] }, ME)).toBeUndefined();
  });

  it('пустой заказ ничего не ломает', () => {
    expect(ownShipment(undefined, ME)).toBeUndefined();
    expect(ownInvoice({ invoices: null }, ME)).toBeUndefined();
    expect(ownItems(null, ME)).toEqual([]);
  });

  it('позиции — только свои: чужие количества и цены продавца не касаются', () => {
    const order = {
      items: [
        { sellerId: ME, productName: 'Вакцина' },
        { sellerId: OTHER, productName: 'Перчатки' },
        { sellerId: ME, productName: 'Шприцы' },
      ],
    };
    expect(ownItems(order, ME).map((i) => i.productName)).toEqual(['Вакцина', 'Шприцы']);
  });
});
