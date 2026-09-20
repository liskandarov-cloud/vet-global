import { offerFieldsFromRow } from './offer-fields';

describe('поля оффера из строки прайса', () => {
  it('в оффер идёт только то, что есть в файле', () => {
    const { provided } = offerFieldsFromRow({}, 45000);
    expect(provided).toEqual({ price: 45000 });
  });

  // Это и терялось: прайс из одних цен затирал регистрационные сведения,
  // которые для ветпрепаратов обязательны.
  it('отсутствующие колонки не стирают срок годности, серию и регистрацию', () => {
    const { provided } = offerFieldsFromRow({ priceUnit: 'шт' }, 45000);
    expect('expiryDate' in provided).toBe(false);
    expect('batchNumber' in provided).toBe(false);
    expect('regNumber' in provided).toBe(false);
    expect('minOrder' in provided).toBe(false);
  });

  it('пустая ячейка означает «не знаю», а не «очисти»', () => {
    const { provided } = offerFieldsFromRow({ batchNumber: '', expiryDate: '   '.trim() }, 45000);
    expect('batchNumber' in provided).toBe(false);
    expect('expiryDate' in provided).toBe(false);
  });

  it('заданные значения применяются', () => {
    const { provided } = offerFieldsFromRow(
      { priceUnit: '1000 доз', packSize: '5', minOrder: '2', batchNumber: 'A-17', regNumber: 'UZ-123' },
      45000,
    );
    expect(provided).toMatchObject({
      price: 45000,
      priceUnit: '1000 доз',
      packSize: 5,
      minOrder: 2,
      batchNumber: 'A-17',
      regNumber: 'UZ-123',
    });
  });

  // Ноль в остатке — это «нет на складе». Импорт раньше всегда ставил
  // «в наличии», и покупатель мог заказать то, чего у продавца нет.
  it('остаток задаёт наличие', () => {
    expect(offerFieldsFromRow({ stockQty: '0' }, 1).provided).toMatchObject({ stockQty: 0, inStock: false });
    expect(offerFieldsFromRow({ stockQty: '12' }, 1).provided).toMatchObject({ stockQty: 12, inStock: true });
  });

  it('без колонки остатка наличие не трогается', () => {
    const { provided } = offerFieldsFromRow({ priceUnit: 'шт' }, 1);
    expect('inStock' in provided).toBe(false);
    expect('stockQty' in provided).toBe(false);
  });

  it('разделители тысяч и запятая в цене за единицу разбираются', () => {
    expect(offerFieldsFromRow({ packSize: '1 000' }, 1).provided.packSize).toBe(1000);
    expect(offerFieldsFromRow({ minOrder: '2,5' }, 1).provided.minOrder).toBe(2.5);
  });

  it('невозможная дата в прайсе не подставляет правдоподобную', () => {
    expect('expiryDate' in offerFieldsFromRow({ expiryDate: '13.13.2026' }, 1).provided).toBe(false);
    expect(offerFieldsFromRow({ expiryDate: '31.12.2027' }, 1).provided.expiryDate).toBeInstanceOf(Date);
  });

  it('рецептурность понимает «да» и «нет»', () => {
    expect(offerFieldsFromRow({ isRx: 'да' }, 1).provided.isRx).toBe(true);
    expect(offerFieldsFromRow({ isRx: 'нет' }, 1).provided.isRx).toBe(false);
    expect('isRx' in offerFieldsFromRow({}, 1).provided).toBe(false);
  });

  it('новый оффер получает значения по умолчанию, существующий — нет', () => {
    const { defaults } = offerFieldsFromRow({}, 1);
    expect(defaults).toMatchObject({ minOrder: 1, packSize: 1, priceUnitQty: 1, isRx: false, inStock: true });
  });
});
