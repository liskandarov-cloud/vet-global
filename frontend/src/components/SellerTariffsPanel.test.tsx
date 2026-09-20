// Панель тарифов доставки в кабинете продавца.
//
// От неё зависит, увидит ли покупатель стоимость доставки в корзине: без тарифа
// расчёт невозможен, и в заказ доставка попадёт только после ручного
// согласования. Панель новая и проверялась только тем, что страница собирается.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const get = vi.fn();
const post = vi.fn();
const del = vi.fn();
vi.mock('@/lib/api', () => ({
  api: {
    get: (...a: any[]) => get(...a),
    post: (...a: any[]) => post(...a),
    delete: (...a: any[]) => del(...a),
  },
}));
const toastError = vi.fn();
vi.mock('sonner', () => ({ toast: { error: (...a: any[]) => toastError(...a), success: vi.fn() } }));

import { SellerTariffsPanel } from './SellerTariffsPanel';

const tariff = (over: Record<string, unknown> = {}) => ({
  id: 't1',
  method: 'COURIER',
  city: 'Ташкент',
  cost: 45000,
  freeFrom: 5000000,
  isActive: true,
  ...over,
});

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  del.mockReset();
  toastError.mockReset();
  get.mockResolvedValue({ data: [] });
  post.mockResolvedValue({ data: {} });
  del.mockResolvedValue({ data: {} });
  vi.stubGlobal('confirm', () => true);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('тарифы доставки продавца', () => {
  it('показывает заведённые тарифы с порогом бесплатной доставки', async () => {
    get.mockResolvedValue({ data: [tariff(), tariff({ id: 't2', city: '', cost: 120000, freeFrom: null })] });
    render(<SellerTariffsPanel />);

    await waitFor(() => expect(screen.getByText('Ташкент')).toBeTruthy());
    expect(screen.getByText(/45\s?000/)).toBeTruthy();
    expect(screen.getByText(/5\s?000\s?000/)).toBeTruthy();
    // Тариф без города — это «все города», и так он и должен читаться.
    expect(screen.getByText('все города')).toBeTruthy();
  });

  // Без тарифа без города доставка в остальные города не считается вовсе, и
  // покупатель видит «уточняется» вместо цифры.
  it('предупреждает, когда нет тарифа на все города', async () => {
    get.mockResolvedValue({ data: [tariff()] });
    render(<SellerTariffsPanel />);

    await waitFor(() => expect(screen.getByText(/Нет тарифа без города/)).toBeTruthy());
  });

  it('не предупреждает, когда тариф на все города есть', async () => {
    get.mockResolvedValue({ data: [tariff({ city: '' })] });
    render(<SellerTariffsPanel />);

    await waitFor(() => expect(screen.getByText('все города')).toBeTruthy());
    expect(screen.queryByText(/Нет тарифа без города/)).toBeNull();
  });

  it('сохраняет тариф с городом, стоимостью и порогом', async () => {
    render(<SellerTariffsPanel />);
    const u = userEvent.setup();

    await u.type(screen.getByPlaceholderText(/пусто — все города/), 'Самарканд');
    await u.type(screen.getByPlaceholderText('45000'), '120000');
    await u.type(screen.getByPlaceholderText('необязательно'), '3000000');
    await u.click(screen.getByRole('button', { name: /Сохранить тариф/ }));

    await waitFor(() => expect(post).toHaveBeenCalled());
    expect(post.mock.calls[0][1]).toEqual({
      method: 'COURIER',
      city: 'Самарканд',
      cost: 120000,
      freeFrom: 3000000,
    });
  });

  it('пустой порог означает, что бесплатной доставки нет', async () => {
    render(<SellerTariffsPanel />);
    const u = userEvent.setup();

    await u.type(screen.getByPlaceholderText('45000'), '90000');
    await u.click(screen.getByRole('button', { name: /Сохранить тариф/ }));

    await waitFor(() => expect(post).toHaveBeenCalled());
    expect(post.mock.calls[0][1].freeFrom).toBeUndefined();
    // Пустой город — тариф по умолчанию, а не город с пустым названием.
    expect(post.mock.calls[0][1].city).toBeUndefined();
  });

  // Пустое поле — не ноль: Number('') даёт 0, и пустая форма сохраняла тариф
  // с нулевой стоимостью, то есть обещание бесплатной доставки.
  it('без стоимости тариф не отправляется', async () => {
    render(<SellerTariffsPanel />);
    await userEvent.setup().click(screen.getByRole('button', { name: /Сохранить тариф/ }));

    expect(post).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalled();
  });

  it('явный ноль — законная бесплатная доставка', async () => {
    render(<SellerTariffsPanel />);
    const u = userEvent.setup();
    await u.type(screen.getByPlaceholderText('45000'), '0');
    await u.click(screen.getByRole('button', { name: /Сохранить тариф/ }));

    await waitFor(() => expect(post).toHaveBeenCalled());
    expect(post.mock.calls[0][1].cost).toBe(0);
  });

  it('удаляет тариф и перечитывает список', async () => {
    get.mockResolvedValue({ data: [tariff()] });
    render(<SellerTariffsPanel />);

    await waitFor(() => expect(screen.getByText('Ташкент')).toBeTruthy());
    await userEvent.setup().click(screen.getByTitle('Удалить'));

    await waitFor(() => expect(del).toHaveBeenCalledWith('/delivery/tariffs/t1'));
  });
});
