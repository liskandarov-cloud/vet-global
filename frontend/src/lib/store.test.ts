import { beforeEach, describe, expect, it } from 'vitest';
import { cartKey, useCart, type CartItem } from './store';

// Товар без оффера — легаси-путь, когда у товара нет предложений продавцов.
const product = (over: Partial<CartItem> = {}): Omit<CartItem, 'quantity'> => ({
  productId: 'p1',
  name: 'Тетравит',
  price: 42000,
  minOrder: 1,
  ...over,
});

beforeEach(() => {
  useCart.setState({ items: [] });
  localStorage.clear();
});

describe('cartKey — идентичность позиции корзины', () => {
  it('с оффером считается по офферу', () => {
    expect(cartKey({ productId: 'p1', offerId: 'o7' })).toBe('o7');
  });

  it('без оффера — по товару', () => {
    expect(cartKey({ productId: 'p1' })).toBe('p1');
  });

  it('один товар от разных продавцов — разные позиции', () => {
    // Ядро мульти-поставщика: одно наименование у двух продавцов не должно
    // слипаться в одну строку, иначе покупатель потеряет выбор поставщика.
    expect(cartKey({ productId: 'p1', offerId: 'o1' })).not.toBe(
      cartKey({ productId: 'p1', offerId: 'o2' }),
    );
  });
});

describe('useCart.add — добавление', () => {
  it('новая позиция берёт количество из минимального заказа', () => {
    useCart.getState().add(product({ minOrder: 5 }));
    expect(useCart.getState().items).toHaveLength(1);
    expect(useCart.getState().items[0].quantity).toBe(5);
  });

  it('явное количество перебивает минимальный заказ', () => {
    useCart.getState().add(product({ minOrder: 5 }), 12);
    expect(useCart.getState().items[0].quantity).toBe(12);
  });

  it('повторное добавление накапливает количество, а не дублирует строку', () => {
    useCart.getState().add(product({ minOrder: 2 }));
    useCart.getState().add(product({ minOrder: 2 }));
    expect(useCart.getState().items).toHaveLength(1);
    expect(useCart.getState().items[0].quantity).toBe(4);
  });

  it('один товар от двух продавцов даёт две строки', () => {
    useCart.getState().add(product({ offerId: 'o1', price: 42000 }));
    useCart.getState().add(product({ offerId: 'o2', price: 39000 }));
    expect(useCart.getState().items).toHaveLength(2);
    expect(useCart.getState().subtotal()).toBe(42000 + 39000);
  });

  it('без минимального заказа количество по умолчанию единица', () => {
    useCart.getState().add(product({ minOrder: 0 }));
    expect(useCart.getState().items[0].quantity).toBe(1);
  });
});

describe('useCart.setQty — изменение количества', () => {
  it('поднимает до минимального заказа, если просят меньше', () => {
    // Иначе сервер отобьёт оформление в самом конце, после ввода всех данных.
    useCart.getState().add(product({ minOrder: 10 }));
    useCart.getState().setQty('p1', 3);
    expect(useCart.getState().items[0].quantity).toBe(10);
  });

  it('количество выше минимума сохраняется как есть', () => {
    useCart.getState().add(product({ minOrder: 10 }));
    useCart.getState().setQty('p1', 25);
    expect(useCart.getState().items[0].quantity).toBe(25);
  });

  it('ноль и отрицательное поднимаются до минимума', () => {
    useCart.getState().add(product({ minOrder: 4 }));
    useCart.getState().setQty('p1', 0);
    expect(useCart.getState().items[0].quantity).toBe(4);
    useCart.getState().setQty('p1', -7);
    expect(useCart.getState().items[0].quantity).toBe(4);
  });

  it('меняет только указанную позицию', () => {
    useCart.getState().add(product({ offerId: 'o1' }));
    useCart.getState().add(product({ offerId: 'o2' }));
    useCart.getState().setQty('o1', 9);
    const byKey = Object.fromEntries(useCart.getState().items.map((i) => [cartKey(i), i.quantity]));
    expect(byKey.o1).toBe(9);
    expect(byKey.o2).toBe(1);
  });
});

describe('useCart — удаление и очистка', () => {
  it('remove убирает одну позицию', () => {
    useCart.getState().add(product({ offerId: 'o1' }));
    useCart.getState().add(product({ offerId: 'o2' }));
    useCart.getState().remove('o1');
    expect(useCart.getState().items.map((i) => cartKey(i))).toEqual(['o2']);
  });

  it('clear опустошает корзину', () => {
    useCart.getState().add(product());
    useCart.getState().clear();
    expect(useCart.getState().items).toHaveLength(0);
    expect(useCart.getState().subtotal()).toBe(0);
    expect(useCart.getState().count()).toBe(0);
  });
});

describe('useCart — суммы', () => {
  it('subtotal умножает цену на количество по каждой позиции', () => {
    useCart.getState().add(product({ offerId: 'o1', price: 42000 }), 3);
    useCart.getState().add(product({ offerId: 'o2', price: 10000 }), 2);
    expect(useCart.getState().subtotal()).toBe(42000 * 3 + 10000 * 2);
  });

  it('count складывает количества, а не число строк', () => {
    useCart.getState().add(product({ offerId: 'o1' }), 3);
    useCart.getState().add(product({ offerId: 'o2' }), 2);
    expect(useCart.getState().count()).toBe(5);
  });

  it('пустая корзина даёт нули', () => {
    expect(useCart.getState().subtotal()).toBe(0);
    expect(useCart.getState().count()).toBe(0);
  });
});
