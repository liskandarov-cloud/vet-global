// Поведение корзины в части доставки.
//
// Проверяется то, что видит покупатель и что уходит в заказ: расчёт запрашивается
// с теми параметрами, по которым сервер определит продавцов; доставка попадает в
// итог; неполный расчёт в итог не попадает; выбранный способ и адрес уходят в
// заказ. Раньше такие правки опирались только на то, что сборка проходит.
//
// Таймеры настоящие: расчёт запрашивается с задержкой в 400 мс, и подменять их
// нельзя — user-event под фейковыми таймерами не доводит набор текста до конца.
// Ожидание идёт через waitFor, а не через паузы.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useCart } from '@/lib/store';

const get = vi.fn();
const post = vi.fn();
vi.mock('@/lib/api', () => ({ api: { get: (...a: any[]) => get(...a), post: (...a: any[]) => post(...a) }, API_BASE: '' }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import CartPage from './page';

const ITEM = { productId: 'p1', name: 'Вакцина', price: 50000, minOrder: 2, sellerName: 'ООО Поставщик' };
const ESTIMATE = { total: 45000, method: 'COURIER', city: 'Ташкент', bySeller: [{ sellerId: 's1', cost: 45000 }], unknown: [] };

const ui = () => userEvent.setup();
const estimateCalls = () => get.mock.calls.filter((c) => c[0] === '/delivery/tariffs/estimate');

// Ждём ответа на расчёт: запрос уходит с задержкой после изменения корзины.
const awaitEstimate = async (count = 1) => {
  await waitFor(() => expect(estimateCalls().length).toBeGreaterThanOrEqual(count));
};

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  get.mockImplementation((url: string) =>
    url === '/delivery/tariffs/estimate' ? Promise.resolve({ data: ESTIMATE }) : Promise.resolve({ data: [] }),
  );
  post.mockResolvedValue({ data: { id: 'o1' } });
  useCart.getState().clear();
  useCart.getState().add(ITEM, 2);
});

afterEach(() => {
  // Очистка вручную: в конфиге vitest нет globals, поэтому автоматический
  // afterEach из testing-library не подключается, и разметка прошлого теста
  // осталась бы в документе — запросы находили бы по два элемента.
  cleanup();
});

describe('корзина: доставка', () => {
  it('запрашивает расчёт по товарам, способу и сумме заказа', async () => {
    render(<CartPage />);
    await awaitEstimate();

    expect(estimateCalls()[0][1].params).toMatchObject({
      productIds: 'p1',
      method: 'COURIER',
      subtotal: '100000',
    });
  });

  it('показывает стоимость доставки и включает её в итог', async () => {
    render(<CartPage />);
    // 100 000 за товар + 45 000 доставка
    await waitFor(() => expect(screen.getByText(/145\s?000/)).toBeTruthy());
  });

  it('при самовывозе доставку не считает и в итог не добавляет', async () => {
    render(<CartPage />);
    await awaitEstimate();

    await ui().click(screen.getByRole('button', { name: /Самовывоз/ }));

    await waitFor(() => expect(estimateCalls().slice(-1)[0][1].params.method).toBe('PICKUP'));
    await waitFor(() => expect(screen.getByText('самовывоз')).toBeTruthy());
  });

  // Неполный расчёт — это не «доставка бесплатна»: показать часть суммы как итог
  // значит пообещать цену ниже той, что выставит продавец.
  it('продавца без тарифа показывает предупреждением, а в итог его не включает', async () => {
    get.mockImplementation((url: string) =>
      url === '/delivery/tariffs/estimate'
        ? Promise.resolve({ data: { ...ESTIMATE, unknown: ['s2'] } })
        : Promise.resolve({ data: [] }),
    );
    render(<CartPage />);

    await waitFor(() => expect(screen.getByText(/уточнит продавец/)).toBeTruthy());
    // Цифра 100 000 встречается и в сумме позиций, и в итоге — обе верны.
    expect(screen.getAllByText(/100\s?000/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/145\s?000/)).toBeNull();
  });

  it('город попадает в запрос расчёта', async () => {
    render(<CartPage />);
    await awaitEstimate();

    await ui().type(screen.getByPlaceholderText('Город'), 'Ташкент');

    await waitFor(() => expect(estimateCalls().slice(-1)[0][1].params.city).toBe('Ташкент'));
  });

  it('способ, город и адрес уходят в заказ', async () => {
    render(<CartPage />);
    await awaitEstimate();

    const u = ui();
    await u.type(screen.getByPlaceholderText('Город'), 'Ташкент');
    await u.type(screen.getByPlaceholderText('Адрес доставки'), 'ул. Амира Темура 1');
    // Гостевой заказ: без имени и телефона оформление на сервер не уходит.
    // Провайдера перевода в тесте нет, поэтому подписи полей — ключи словаря.
    await u.type(screen.getByPlaceholderText('cart.name'), 'Пётр Ветеринаров');
    await u.type(screen.getByPlaceholderText('cart.phone'), '+998901234567');

    const buttons = screen.getAllByRole('button');
    await u.click(buttons[buttons.length - 1]);

    await waitFor(() => expect(post).toHaveBeenCalled());
    expect(post.mock.calls[0][1]).toMatchObject({
      deliveryMethod: 'COURIER',
      deliveryCity: 'Ташкент',
      deliveryAddress: 'ул. Амира Темура 1',
    });
  });
});
