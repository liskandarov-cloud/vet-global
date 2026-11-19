// Сбой загрузки каталога — не «товаров нет».
//
// Ошибка API (спящий Render, обрыв связи) показывалась как пустой каталог:
// покупатель видел «Товары не найдены», хотя товары были. Теперь первый сбой
// повторяется сам, второй показывается с кнопкой повтора.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const get = vi.fn();
vi.mock('@/lib/api', () => ({ api: { get: (...a: unknown[]) => get(...a) }, API_BASE: '' }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));

import CatalogPage from './page';

const productCalls = () => get.mock.calls.filter((c) => c[0] === '/products');
// В тестах словарь не подгружен, и t() отдаёт ключ — принимаем обе формы.
const EMPTY = /^(Товары не найдены|catalog\.empty)$/;

let failProducts = true;
beforeEach(() => {
  failProducts = true;
  get.mockReset();
  get.mockImplementation((url: string) => {
    if (url === '/products') {
      return failProducts ? Promise.reject(new Error('timeout')) : Promise.resolve({ data: { products: [], total: 0 } });
    }
    return Promise.resolve({ data: url === '/products/facets' ? { manufacturers: [], forms: [] } : [] });
  });
});
afterEach(cleanup);

describe('каталог при сбое API', () => {
  it('сообщение и повтор вместо «Товары не найдены»', async () => {
    render(<CatalogPage />);

    // 250 мс задержки фильтра + 3 с до автоматического повтора. Ищем по
    // тексту: поиск по роли в jsdom медленный и под нагрузкой не успевал.
    await screen.findByText(/Не удалось загрузить каталог/, {}, { timeout: 12000 });
    expect(screen.queryByText(EMPTY)).toBeNull();
    expect(productCalls()).toHaveLength(2);

    failProducts = false;
    await userEvent.setup().click(screen.getByRole('button', { name: 'Повторить' }));
    await screen.findByText(EMPTY);
    expect(productCalls()).toHaveLength(3);
    expect(screen.queryByText(/Не удалось загрузить каталог/)).toBeNull();
  }, 25000);
});
