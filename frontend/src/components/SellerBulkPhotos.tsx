'use client';

import { useMemo, useState } from 'react';
import { ImagePlus, X, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { Product } from '@/lib/types';

// Массовая загрузка фото: выбираешь пачку файлов, каждый привязывается к товару
// по имени файла (например «эстрофан-2-мл.jpg» → «Эстрофан 2 мл»), спорные — руками.

interface Row {
  file: File;
  productId: string; // '' = не привязан
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-zа-я0-9]+/gi, ' ')
    .trim();

function matchProduct(fileName: string, products: Product[]): string {
  const f = norm(fileName);
  if (!f) return '';
  // Точное совпадение → вхождение названия в имя файла → наоборот.
  for (const p of products) if (norm(p.name) === f) return p.id;
  for (const p of products) {
    const n = norm(p.name);
    if (n && (f.includes(n) || n.includes(f))) return p.id;
  }
  // По словам: все слова имени файла встречаются в названии.
  const words = f.split(' ').filter((w) => w.length >= 3);
  if (words.length) {
    for (const p of products) {
      const n = norm(p.name);
      if (words.every((w) => n.includes(w))) return p.id;
    }
  }
  return '';
}

export function SellerBulkPhotos({
  products,
  onClose,
  onSaved,
}: {
  products: Product[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { tt } = useI18n();
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const next: Row[] = Array.from(files).map((file) => ({
      file,
      productId: matchProduct(file.name, products),
      status: 'pending',
    }));
    setRows((r) => [...r, ...next]);
    const matched = next.filter((r) => r.productId).length;
    toast.success(
      `${tt('Файлов добавлено', 'Fayllar qoʻshildi')}: ${next.length} · ${tt('привязано автоматически', 'avtomatik bogʻlandi')}: ${matched}`,
    );
  };

  const unmatched = useMemo(() => rows.filter((r) => !r.productId).length, [rows]);

  const uploadAll = async () => {
    setBusy(true);
    // Группируем по товару, чтобы PUT был один на товар, а не на файл.
    const byProduct = new Map<string, number[]>();
    rows.forEach((r, i) => {
      if (!r.productId || r.status === 'done') return;
      byProduct.set(r.productId, [...(byProduct.get(r.productId) ?? []), i]);
    });

    let okCount = 0;
    for (const [productId, idxs] of byProduct) {
      const product = products.find((p) => p.id === productId);
      if (!product) continue;
      const urls: string[] = [];

      for (const i of idxs) {
        setRows((rs) => rs.map((r, j) => (j === i ? { ...r, status: 'uploading' } : r)));
        try {
          const fd = new FormData();
          fd.append('file', rows[i].file);
          const { data } = await api.post('/uploads?kind=image', fd);
          urls.push(data.url);
          okCount++;
          setRows((rs) => rs.map((r, j) => (j === i ? { ...r, status: 'done' } : r)));
        } catch (e: any) {
          const msg = e?.response?.data?.message ?? tt('Ошибка загрузки', 'Yuklash xatosi');
          setRows((rs) => rs.map((r, j) => (j === i ? { ...r, status: 'error', error: msg } : r)));
        }
      }

      if (urls.length) {
        try {
          await api.put(`/products/${productId}`, {
            name: product.name,
            description: product.description,
            categoryId: product.categoryId,
            price: Number(product.price),
            images: [...(product.images ?? []), ...urls],
          });
        } catch (e: any) {
          toast.error(
            `${product.name}: ${e?.response?.data?.message ?? tt('не удалось сохранить фото', 'fotoni saqlab boʻlmadi')}`,
          );
        }
      }
    }

    setBusy(false);
    toast.success(`${tt('Готово — фото привязаны', 'Tayyor — fotolar bogʻlandi')} (${okCount})`);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-heading text-xl font-bold">{tt('Фото пачкой', 'Fotolar toʻplami')}</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 px-6 py-8 text-center transition hover:border-teal-400 hover:bg-teal-50/40">
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
          />
          <ImagePlus size={24} className="text-teal-600" />
          <div className="text-sm font-semibold">{tt('Выберите фото (можно много)', 'Fotolarni tanlang (koʻp boʻlishi mumkin)')}</div>
          <div className="text-xs text-ink-muted">
            {tt('Привязка — по имени файла: «эстрофан-2-мл.jpg» → «Эстрофан 2 мл»', 'Bogʻlash fayl nomi boʻyicha: «estrofan-2-ml.jpg» → «Estrofan 2 ml»')}
          </div>
        </label>

        {rows.length > 0 && (
          <>
            <div className="mt-4 max-h-80 overflow-y-auto rounded-lg border border-slate-100">
              <table className="w-full text-xs">
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="max-w-[160px] truncate px-2 py-1.5 font-medium">{r.file.name}</td>
                      <td className="px-2 py-1.5">
                        <select
                          className="input !h-8 !py-0 text-xs"
                          value={r.productId}
                          disabled={r.status === 'done' || busy}
                          onChange={(e) =>
                            setRows((rs) => rs.map((x, j) => (j === i ? { ...x, productId: e.target.value } : x)))
                          }
                        >
                          <option value="">— {tt('не привязан', 'bogʻlanmagan')} —</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="w-8 px-2 py-1.5 text-center">
                        {r.status === 'uploading' && <Loader2 size={13} className="inline animate-spin text-teal-600" />}
                        {r.status === 'done' && <CheckCircle2 size={13} className="inline text-teal-600" />}
                        {r.status === 'error' && (
                          <span title={r.error}><AlertTriangle size={13} className="inline text-red-500" /></span>
                        )}
                      </td>
                      <td className="w-8 px-1 py-1.5 text-center">
                        {r.status !== 'done' && !busy && (
                          <button onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}>
                            <X size={13} className="text-ink-muted" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {unmatched > 0 && (
              <p className="mt-2 text-xs text-amber-700">
                {tt('Без привязки', 'Bogʻlanmagan')}: {unmatched} — {tt('выберите товар вручную или файл будет пропущен', 'mahsulotni qoʻlda tanlang, aks holda fayl oʻtkazib yuboriladi')}
              </p>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button className="btn-secondary" onClick={onClose} disabled={busy}>{tt('Закрыть', 'Yopish')}</button>
              <button
                className="btn-primary"
                disabled={busy || rows.every((r) => !r.productId || r.status === 'done')}
                onClick={uploadAll}
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}{' '}
                {tt('Загрузить', 'Yuklash')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
