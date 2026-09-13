import { buildFactura, type FacturaOrder } from './factura';

const order = (over: Partial<FacturaOrder> = {}): FacturaOrder => ({
  createdAt: new Date('2026-09-13T10:00:00Z'),
  buyerName: 'Пётр Ветеринаров',
  buyerCompany: 'ООО «Ферма»',
  deliveryCost: 0,
  items: [{ productName: 'Вакцина', quantity: 2, price: 50000 }],
  counterparty: null,
  buyer: null,
  ...over,
});

const seller = { inn: '301234567', company: 'ООО «ВетФарм»' };

describe('счёт-фактура для ЭДО', () => {
  it('итог равен сумме строк', () => {
    const f = buildFactura(order(), seller, 'VG-2026-AAAA');
    expect(f.items).toHaveLength(1);
    expect(f.total).toBe(100000);
    expect(f.total).toBe(f.items.reduce((s, it) => s + it.total, 0));
  });

  // Это и расходилось: итог брался из суммы заказа (с доставкой), а строки
  // были только товарные — документ не сходился сам с собой.
  it('доставка идёт отдельной строкой и входит в итог', () => {
    const f = buildFactura(order({ deliveryCost: 45000 }), seller, 'VG-2026-AAAA');
    expect(f.items).toHaveLength(2);
    expect(f.items[1]).toEqual({ name: 'Доставка', quantity: 1, price: 45000, total: 45000 });
    expect(f.total).toBe(145000);
    expect(f.total).toBe(f.items.reduce((s, it) => s + it.total, 0));
  });

  it('без доставки лишней строки не появляется', () => {
    expect(buildFactura(order({ deliveryCost: 0 }), seller, 'VG-2026-AAAA').items).toHaveLength(1);
  });

  it('ИНН покупателя берётся из реквизитов контрагента', () => {
    const f = buildFactura(
      order({ counterparty: { name: 'ООО «Агро»', inn: '309876543' } }),
      seller,
      'VG-2026-AAAA',
    );
    expect(f.buyer.tin).toBe('309876543');
    expect(f.buyer.name).toBe('ООО «Агро»');
  });

  it('без контрагента ИНН берётся из профиля покупателя', () => {
    const f = buildFactura(order({ buyer: { inn: '305555555' } }), seller, 'VG-2026-AAAA');
    expect(f.buyer.tin).toBe('305555555');
    expect(f.buyer.name).toBe('ООО «Ферма»');
  });

  it('гостевой заказ без ИНН отдаёт null, а не undefined', () => {
    const f = buildFactura(order({ buyerCompany: null }), seller, 'VG-2026-AAAA');
    expect(f.buyer.tin).toBeNull();
    expect(f.buyer.name).toBe('Пётр Ветеринаров');
  });

  it('продавец без реквизитов не ломает сборку', () => {
    const f = buildFactura(order(), null, 'VG-2026-AAAA');
    expect(f.seller).toEqual({ tin: null, name: null });
  });

  it('номер и дата документа берутся как есть', () => {
    const f = buildFactura(order(), seller, 'VG-2026-BBBB');
    expect(f.facturaNo).toBe('VG-2026-BBBB');
    expect(f.facturaDate).toBe('2026-09-13');
  });

  it('копейки в строках не накапливают погрешность', () => {
    const f = buildFactura(
      order({ items: [{ productName: 'А', quantity: 3, price: 0.1 }], deliveryCost: 0.2 }),
      seller,
      'VG-2026-AAAA',
    );
    expect(f.total).toBe(0.5);
  });
});
