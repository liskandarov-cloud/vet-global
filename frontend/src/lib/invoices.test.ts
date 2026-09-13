import { describe, it, expect, vi } from 'vitest';
import { downloadInvoices, invoiceFileName, invoiceSellerIds } from './invoices';

const order = (sellerIds: (string | null)[]) => ({
  id: 'a1b2c3d4-0000-0000-0000-000000000000',
  items: sellerIds.map((sellerId) => ({ sellerId })),
});

describe('продавцы заказа', () => {
  it('не повторяет продавца, у которого несколько позиций', () => {
    expect(invoiceSellerIds(order(['s1', 's1', 's2']))).toEqual(['s1', 's2']);
  });

  it('позиции без продавца (тендер) не создают пустого счёта', () => {
    expect(invoiceSellerIds(order([null, 's1']))).toEqual(['s1']);
  });

  it('порядок устойчив — имена файлов не меняются между нажатиями', () => {
    expect(invoiceSellerIds(order(['s2', 's1']))).toEqual(invoiceSellerIds(order(['s1', 's2'])));
  });
});

describe('скачивание счетов', () => {
  it('один поставщик — один файл без указания продавца', async () => {
    const fetchPdf = vi.fn().mockResolvedValue('pdf');
    const save = vi.fn();
    const count = await downloadInvoices(order(['s1']), fetchPdf, save);
    expect(count).toBe(1);
    expect(fetchPdf).toHaveBeenCalledWith('a1b2c3d4-0000-0000-0000-000000000000');
    expect(save).toHaveBeenCalledWith('pdf', 'invoice-a1b2c3d4.pdf');
  });

  it('несколько поставщиков — по файлу на каждого', async () => {
    const fetchPdf = vi.fn().mockResolvedValue('pdf');
    const save = vi.fn();
    const count = await downloadInvoices(order(['s2', 's1']), fetchPdf, save);
    expect(count).toBe(2);
    expect(fetchPdf).toHaveBeenNthCalledWith(1, 'a1b2c3d4-0000-0000-0000-000000000000', 's1');
    expect(fetchPdf).toHaveBeenNthCalledWith(2, 'a1b2c3d4-0000-0000-0000-000000000000', 's2');
    expect(save.mock.calls.map((c) => c[1])).toEqual(['invoice-a1b2c3d4-s1.pdf', 'invoice-a1b2c3d4-s2.pdf']);
  });

  it('имя файла различает продавцов', () => {
    expect(invoiceFileName('a1b2c3d4', 's1')).not.toBe(invoiceFileName('a1b2c3d4', 's2'));
  });
});
