'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Upload, FileSpreadsheet, Download, FileDown, CheckCircle2, AlertTriangle, Loader2, ArrowLeft, Package,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Category } from '@/lib/types';

interface ImportField {
  key: string;
  label: string;
  labelUz: string;
  type: string;
  required?: boolean;
  hint?: string;
  hintUz?: string;
}

interface ParseResult {
  headers: string[];
  rows: string[][];
  totalRows: number;
  truncated: number;
  suggested: Record<string, number>;
  sheetName: string;
}

interface RowResult {
  row: number;
  name: string;
  action: 'created' | 'updated' | 'offer_only' | 'error';
  packPrice?: number;
  packUnit?: string | null;
  error?: string;
}

interface CommitResult {
  dryRun: boolean;
  total: number;
  created: number;
  updated: number;
  offersUpserted: number;
  failed: number;
  results: RowResult[];
}

const PREVIEW_ROWS = 5;

export function SellerImportPanel({ onDone }: { onDone?: () => void }) {
  const { tt, lang } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fields, setFields] = useState<ImportField[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [fileName, setFileName] = useState('');
  const [mapping, setMapping] = useState<Record<string, number>>({});
  const [defaultCategoryId, setDefaultCategoryId] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CommitResult | null>(null);

  useEffect(() => {
    api.get('/import/fields').then((r) => setFields(r.data)).catch(() => {});
    api.get('/categories').then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  const label = (f: ImportField) => (lang === 'uz' ? f.labelUz : f.label);
  const hint = (f: ImportField) => (lang === 'uz' ? f.hintUz : f.hint);

  const reset = () => {
    setParsed(null);
    setResult(null);
    setMapping({});
    setFileName('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const onFile = async (file: File) => {
    setBusy(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post<ParseResult>('/import/parse', fd);
      setParsed(data);
      setMapping(data.suggested ?? {});
      setFileName(file.name);
      const matched = Object.keys(data.suggested ?? {}).length;
      toast.success(
        `${tt('Распознано строк', 'Qatorlar aniqlandi')}: ${data.totalRows} · ${tt('колонок сопоставлено', 'ustun moslandi')}: ${matched}`,
      );
      if (data.truncated) {
        toast.warning(
          `${tt('Взяты первые 2000 строк, пропущено', 'Birinchi 2000 qator olindi, oʻtkazib yuborildi')}: ${data.truncated}`,
        );
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? tt('Не удалось прочитать файл', 'Faylni oʻqib boʻlmadi'));
    } finally {
      setBusy(false);
    }
  };

  const downloadFile = async (path: string, filename: string, errRu: string, errUz: string) => {
    try {
      const { data } = await api.get(path, { responseType: 'blob' });
      const url = URL.createObjectURL(data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(tt(errRu, errUz));
    }
  };

  const downloadTemplate = () =>
    downloadFile('/import/template', 'vetglobal-price-template.xlsx', 'Не удалось скачать шаблон', 'Shablonni yuklab boʻlmadi');

  const exportMine = () =>
    downloadFile('/import/export', 'vetglobal-my-price.xlsx', 'Не удалось выгрузить прайс', 'Narxnomani yuklab boʻlmadi');

  const run = async (dryRun: boolean) => {
    if (!parsed) return;
    setBusy(true);
    try {
      const { data } = await api.post<CommitResult>('/import/commit', {
        rows: parsed.rows,
        mapping,
        defaultCategoryId: defaultCategoryId || undefined,
        dryRun,
      });
      setResult(data);
      if (dryRun) {
        toast.success(
          data.failed
            ? `${tt('Проверка: ошибок', 'Tekshiruv: xatolar')} ${data.failed} ${tt('из', '/')} ${data.total}`
            : tt('Проверка пройдена — можно загружать', 'Tekshiruv oʻtdi — yuklash mumkin'),
        );
      } else {
        toast.success(
          `${tt('Загружено', 'Yuklandi')}: +${data.created} ${tt('новых', 'yangi')}, ${data.updated} ${tt('обновлено', 'yangilandi')}`,
        );
        onDone?.();
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? tt('Ошибка импорта', 'Import xatosi'));
    } finally {
      setBusy(false);
    }
  };

  const missingRequired = fields.filter((f) => f.required && mapping[f.key] == null);
  const needsCategory =
    mapping.categoryName == null && !defaultCategoryId;

  // ─────────────── Шаг 1: выбор файла ───────────────
  if (!parsed) {
    return (
      <div className="mt-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-heading text-lg font-bold">
              {tt('Импорт прайса из Excel', 'Excel’dan narxnoma importi')}
            </h3>
            <p className="mt-1 text-sm text-ink-muted">
              {tt(
                'Загрузите .xlsx или .csv — колонки сопоставятся автоматически, перед записью будет проверка.',
                '.xlsx yoki .csv yuklang — ustunlar avtomatik moslanadi, yozishdan oldin tekshiruv boʻladi.',
              )}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button className="btn-ghost" onClick={exportMine}>
              <FileDown size={16} /> {tt('Мой прайс', 'Mening narxnomam')}
            </button>
            <button className="btn-ghost" onClick={downloadTemplate}>
              <Download size={16} /> {tt('Шаблон', 'Shablon')}
            </button>
          </div>
        </div>

        <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 px-6 py-12 text-center transition hover:border-teal-400 hover:bg-teal-50/40">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
          {busy ? (
            <Loader2 size={28} className="animate-spin text-teal-600" />
          ) : (
            <FileSpreadsheet size={28} className="text-teal-600" />
          )}
          <div>
            <div className="font-semibold">
              {busy ? tt('Читаю файл…', 'Fayl oʻqilmoqda…') : tt('Выберите файл прайса', 'Narxnoma faylini tanlang')}
            </div>
            <div className="mt-1 text-xs text-ink-muted">.xlsx · .xls · .csv · {tt('до 10 МБ', '10 MB gacha')}</div>
          </div>
        </label>

        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-amber-800">
            <Package size={13} /> {tt('Вакцины и фасовка', 'Vaksinalar va qadoqlash')}
          </div>
          <p className="text-xs text-ink-muted">
            {tt(
              'Цену указывайте ровно как в прайсе (напр. 22 400 за 1000 доз) и добавьте колонки «Единица заказа» = флакон и «Размер упаковки» = 5000. Платформа сама посчитает цену флакона.',
              'Narxni narxnomadagidek kiriting (masalan 1000 doza uchun 22 400) va «Buyurtma birligi» = flakon hamda «Qadoq hajmi» = 5000 ustunlarini qoʻshing. Tizim flakon narxini oʻzi hisoblaydi.',
            )}
          </p>
        </div>
      </div>
    );
  }

  // ─────────────── Шаг 2/3: сопоставление + результат ───────────────
  return (
    <div className="mt-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <button className="btn-ghost !px-2 !py-1 mb-1 text-xs" onClick={reset}>
            <ArrowLeft size={13} /> {tt('Другой файл', 'Boshqa fayl')}
          </button>
          <h3 className="truncate font-heading text-lg font-bold">{fileName}</h3>
          <p className="text-sm text-ink-muted">
            {tt('Лист', 'Varaq')} «{parsed.sheetName}» · {parsed.totalRows} {tt('строк', 'qator')}
          </p>
        </div>
      </div>

      {/* Сопоставление колонок */}
      <div className="rounded-2xl border border-slate-200 p-4">
        <div className="mb-3 text-sm font-semibold">{tt('Сопоставление колонок', 'Ustunlarni moslash')}</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="mb-1 block text-xs text-ink-muted">
                {label(f)}
                {f.required && <span className="ml-1 text-red-500">*</span>}
                {mapping[f.key] != null && <CheckCircle2 size={11} className="ml-1 inline text-teal-700" />}
              </label>
              <select
                className="input"
                value={mapping[f.key] ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  setMapping((m) => {
                    const next = { ...m };
                    if (v === '') delete next[f.key];
                    else next[f.key] = Number(v);
                    return next;
                  });
                  setResult(null);
                }}
              >
                <option value="">— {tt('не импортировать', 'import qilinmasin')} —</option>
                {parsed.headers.map((h, i) => (
                  <option key={i} value={i}>{h}</option>
                ))}
              </select>
              {hint(f) && <p className="mt-1 text-[11px] leading-tight text-ink-muted">{hint(f)}</p>}
            </div>
          ))}
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4">
          <label className="mb-1 block text-xs text-ink-muted">
            {tt('Категория по умолчанию', 'Standart kategoriya')}
            {needsCategory && <span className="ml-1 text-red-500">*</span>}
          </label>
          <select
            className="input max-w-sm"
            value={defaultCategoryId}
            onChange={(e) => { setDefaultCategoryId(e.target.value); setResult(null); }}
          >
            <option value="">— {tt('не выбрана', 'tanlanmagan')} —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{lang === 'uz' ? c.nameUz : c.name}</option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-ink-muted">
            {tt(
              'Применяется к строкам, где колонка «Категория» не задана или не распознана.',
              '«Kategoriya» ustuni yoʻq yoki aniqlanmagan qatorlarga qoʻllanadi.',
            )}
          </p>
        </div>
      </div>

      {/* Предпросмотр исходных строк */}
      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full text-xs">
          <thead className="bg-slate-50">
            <tr>
              {parsed.headers.map((h, i) => (
                <th key={i} className="whitespace-nowrap px-3 py-2 text-left font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {parsed.rows.slice(0, PREVIEW_ROWS).map((r, ri) => (
              <tr key={ri} className="border-b border-slate-50">
                {parsed.headers.map((_, ci) => (
                  <td key={ci} className="max-w-[180px] truncate px-3 py-1.5 text-ink-muted">{r[ci] ?? ''}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {parsed.totalRows > PREVIEW_ROWS && (
          <div className="border-t border-slate-100 px-3 py-2 text-xs text-ink-muted">
            {tt('и ещё', 'yana')} {parsed.totalRows - PREVIEW_ROWS} {tt('строк', 'qator')}
          </div>
        )}
      </div>

      {/* Действия */}
      {missingRequired.length > 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50/60 px-3 py-2 text-xs text-red-700">
          <AlertTriangle size={13} />
          {tt('Не сопоставлены обязательные колонки', 'Majburiy ustunlar moslanmagan')}:{' '}
          {missingRequired.map(label).join(', ')}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="btn-ghost"
          disabled={busy || missingRequired.length > 0 || needsCategory}
          onClick={() => run(true)}
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}{' '}
          {tt('Проверить', 'Tekshirish')}
        </button>
        <button
          className="btn-primary"
          disabled={busy || missingRequired.length > 0 || needsCategory || !result?.dryRun}
          onClick={() => run(false)}
          title={!result?.dryRun ? tt('Сначала выполните проверку', 'Avval tekshiruvni bajaring') : ''}
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}{' '}
          {tt('Загрузить', 'Yuklash')}
        </button>
      </div>

      {/* Результат */}
      {result && (
        <div className="mt-4 rounded-2xl border border-slate-200 p-4">
          <div className="mb-3 text-sm font-semibold">
            {result.dryRun ? tt('Результат проверки', 'Tekshiruv natijasi') : tt('Импорт завершён', 'Import yakunlandi')}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [tt('Новых товаров', 'Yangi mahsulot'), result.created, 'text-teal-700'],
              [tt('Обновлено', 'Yangilandi'), result.updated, ''],
              [tt('Офферов', 'Takliflar'), result.offersUpserted, ''],
              [tt('Ошибок', 'Xatolar'), result.failed, result.failed ? 'text-red-600' : ''],
            ].map(([l, v, cls]) => (
              <div key={String(l)} className="rounded-lg bg-slate-50 px-3 py-2">
                <div className="text-xs text-ink-muted">{l}</div>
                <div className={`font-heading text-lg font-bold ${cls}`}>{v as number}</div>
              </div>
            ))}
          </div>

          <div className="mt-3 max-h-72 overflow-auto rounded-lg border border-slate-100">
            <table className="w-full text-xs">
              <tbody>
                {result.results.map((r) => (
                  <tr key={r.row} className="border-b border-slate-50">
                    <td className="w-10 px-2 py-1.5 text-ink-muted">{r.row}</td>
                    <td className="px-2 py-1.5 font-medium">{r.name || '—'}</td>
                    <td className="px-2 py-1.5">
                      {r.action === 'error' ? (
                        <span className="text-red-600">{r.error}</span>
                      ) : (
                        <span className="text-ink-muted">
                          {r.action === 'created' && tt('новый товар', 'yangi mahsulot')}
                          {r.action === 'updated' && tt('обновлён', 'yangilandi')}
                          {r.action === 'offer_only' && tt('оффер к существующей карточке', 'mavjud kartochkaga taklif')}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-right">
                      {r.packPrice != null && r.action !== 'error' && (
                        <span className="font-semibold">
                          {formatMoney(r.packPrice)}
                          {r.packUnit && <span className="font-normal text-ink-muted"> / {r.packUnit}</span>}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {result.dryRun && !result.failed && (
            <p className="mt-3 text-xs text-ink-muted">
              {tt(
                'Ничего не записано — это предварительный расчёт. Нажмите «Загрузить», чтобы применить.',
                'Hech narsa yozilmadi — bu dastlabki hisob. Qoʻllash uchun «Yuklash» tugmasini bosing.',
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
