// Карточка товара: цена со скидкой и она же в корзине.
//
// Главный инвариант всей истории с акциями: то, что покупатель видит, должно
// попасть в корзину и совпасть с суммой заказа, которую независимо считает
// сервер. Процент акции приходит с бэкенда, цену считают обе стороны одним
// правилом, и именно стык этих двух расчётов проверяется здесь.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useCart } from '@/lib/store';
import type { Product } from '@/lib/types';
import { ProductCard } from './ProductCard';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const product = (over: Partial<Product> = {}): Product =>
  ({
    id: 'p1',
    name: 'Вакцина',
    description: '',
    categoryId: 'c1',
    price: 100000,
    inStock: true,
    minOrder: 2,
    rating: 0,
    reviewsCount: 0,
    images: [],
    ...over,
  }) as Product;

beforeEach(() => {
  useCart.getState().clear();
});

afterEach(() => {
  cleanup();
});

describe('карточка товара и акция', () => {
  it('без акции показывает обычную цену', () => {
    render(<ProductCard product={product()} />);
    expect(screen.getByText(/100\s?000/)).toBeTruthy();
    expect(screen.queryByText(/−/)).toBeNull();
  });

  it('с акцией показывает цену со скидкой, старую зачёркнутой и процент', () => {
    render(<ProductCard product={product({ promoPercent: 20 })} />);
    expect(screen.getByText(/80\s?000/)).toBeTruthy();
    expect(screen.getByText(/100\s?000/)).toBeTruthy();
    expect(screen.getByText('−20%')).toBeTruthy();
  });

  it('в корзину уходит цена со скидкой и минимальный заказ', async () => {
    render(<ProductCard product={product({ promoPercent: 20 })} />);
    await userEvent.setup().click(screen.getByRole('button', { name: /корзин|cart|savat/i }));

    const items = useCart.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].price).toBe(80000);
    expect(items[0].quantity).toBe(2);
    // Сумма корзины — та, что предъявит сервер: 2 × 80 000.
    expect(useCart.getState().subtotal()).toBe(160000);
  });

  // Минимум берётся из того же предложения, что и цена «от»: иначе покупатель
  // добавляет одну упаковку, а заказ требует три и отвечает отказом.
  it('минимальный заказ показывается по лучшему предложению', async () => {
    render(<ProductCard product={product({ minOrder: 1, offerMinOrder: 3, offersCount: 1, minPrice: 50000 })} />);
    expect(screen.getByText(/product\.minOrder: 3|Мин\. заказ: 3/)).toBeTruthy();

    await userEvent.setup().click(screen.getByRole('button', { name: /корзин|cart|savat/i }));
    expect(useCart.getState().items[0].quantity).toBe(3);
  });

  it('цена «от» по офферам тоже со скидкой', () => {
    render(<ProductCard product={product({ promoPercent: 10, offersCount: 1, minPrice: 90000 })} />);
    expect(screen.getByText(/81\s?000/)).toBeTruthy();
  });
});
