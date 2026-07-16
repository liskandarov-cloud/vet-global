'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Search, X, ShieldCheck, Package } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

interface MyOffer {
  id: string;
  productId: string;
  price: number;
  inStock: boolean;
  stockQty?: number | null;
  minOrder: number;
  leadTimeDays?: number | null;
  netTermDays?: number | null;
  batchNumber?: string | null;
  expiryDate?: string | null;
  regNumber?: string | null;
  isRx: boolean;
  certVerified: boolean;
  priceUnit?: string | null;
  priceUnitQty?: number;
  packSize?: number;
  packUnit?: string | null;
  product?: { id: string; name: string; images?: string[] };
}

const EMPTY = {
  productId: '',
  price: 0,
  inStock: true,
  stockQty: 0,
  minOrder: 1,
  leadTimeDays: 3,
  netTermDays: 0,
  batchNumber: '',
  expiryDate: '',
  regNumber: '',
  isRx: false,
  // Фасовка: по умолчанию 1:1 — цена как есть за единицу заказа.
  priceUnit: '',
  priceUnitQty: 1,
  packSize: 1,
  packUnit: '',
};

export function SellerOffersPanel() {
  const { tt } = useI18n();
  const [offers, setOffers] = useState<MyOffer[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [productName, setProductName] = useState('');

  const load = () => api.get('/offers/mine').then((r) => setOffers(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const startEdit = (o: MyOffer) => {
    setEditing({
      id: o.id,
      productId: o.productId,
      price: o.price,
      inStock: o.inStock,
      stockQty: o.stockQty ?? 0,
      minOrder: o.minOrder,
      leadTimeDays: o.leadTimeDays ?? 0,
      netTermDays: o.netTermDays ?? 0,
      batchNumber: o.batchNumber ?? '',
      expiryDate: o.expiryDate ? o.expiryDate.slice(0, 10) : '',
      regNumber: o.regNumber ?? '',
      isRx: o.isRx,
      priceUnit: o.priceUnit ?? '',
      priceUnitQty: o.priceUnitQty ?? 1,
      packSize: o.packSize ?? 1,
      packUnit: o.packUnit ?? '',
    });
    setProductName(o.product?.name ?? '');
  };

  const del = async (id: string) => {
    if (!confirm(tt('Удалить оффер?', 'Taklif oʻchirilsinmi?'))) return;
    await api.delete(`/offers/${id}`);
    toast.success(tt('Удалено', 'Oʻchirildi'));
    load();
  };

  const save = async () => {
    if (!editing.productId) { toast.error(tt('Выберите товар', 'Mahsulotni tanlang')); return; }
    if (editing.price <= 0) { toast.error(tt('Укажите цену', 'Narxni kiriting')); return; }
    const payload = {
      productId: editing.productId,
      price: Number(editing.price),
      inStock: editing.inStock,
      stockQty: Number(editing.stockQty) || 0,
      minOrder: Number(editing.minOrder) || 1,
      leadTimeDays: Number(editing.leadTimeDays) || 0,
      netTermDays: Number(editing.netTermDays) || 0,
      batchNumber: editing.batchNumber || undefined,
      expiryDate: editing.expiryDate || undefined,
      regNumber: editing.regNumber || undefined,
      isRx: editing.isRx,
      priceUnit: editing.priceUnit || undefined,
      priceUnitQty: Number(editing.priceUnitQty) || 1,
      packSize: Number(editing.packSize) || 1,
      packUnit: editing.packUnit || undefined,
    };
    try {
      if (editing.id) await api.put(`/offers/${editing.id}`, payload);
      else await api.post('/offers', payload); // upsert по (product, seller)
      toast.success(tt('Сохранено', 'Saqlandi'));
      setEditing(null);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? tt('Ошибка', 'Xatolik'));
    }
  };

  return (
    <div className="mt-6">
      <p className="mb-3 text-sm text-ink-muted">
        {tt('Выставляйте свою цену на товары каталога — покупатели увидят вас в сравнении предложений.', 'Katalog mahsulotlariga oʻz narxingizni qoʻying — xaridorlar sizni takliflar solishtiruvida koʻradi.')}
      </p>
      <button className="btn-primary mb-4" onClick={() => { setEditing({ ...EMPTY }); setProductName(''); }}>
        <Plus size={16} /> {tt('Новый оффер', 'Yangi taklif')}
      </button>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-ink-subtle">
            <tr className="border-b border-slate-100">
              <th className="py-2">{tt('Товар', 'Mahsulot')}</th><th>{tt('Цена', 'Narx')}</th><th>{tt('Остаток', 'Qoldiq')}</th><th>{tt('Мин.', 'Min.')}</th><th>{tt('Срок', 'Muddat')}</th><th>{tt('Партия', 'Partiya')}</th><th></th>
            </tr>
          </thead>
          <tbody>
            {offers.length === 0 && (
              <tr><td colSpan={7} className="py-6 text-center text-ink-subtle">{tt('Офферов пока нет', 'Hozircha takliflar yoʻq')}</td></tr>
            )}
            {offers.map((o) => (
              <tr key={o.id} className="border-b border-slate-50">
                <td className="py-2">
                  {o.product?.name ?? o.productId}
                  {o.certVerified && <ShieldCheck size={13} className="ml-1 inline text-teal-700" />}
                  {o.isRx && <span className="ml-1 rounded bg-amber-50 px-1 text-[10px] text-amber-700">Rx</span>}
                </td>
                <td className="font-semibold">{formatMoney(o.price)}</td>
                <td>{o.inStock ? (o.stockQty ?? '—') : tt('нет', 'yoʻq')}</td>
                <td>{o.minOrder}</td>
                <td>{o.leadTimeDays != null ? `${o.leadTimeDays}д` : '—'}</td>
                <td className="text-xs text-ink-subtle">{o.batchNumber ?? '—'}</td>
                <td className="flex gap-2 py-2">
                  <button className="btn-ghost !px-2 !py-1" onClick={() => startEdit(o)}><Pencil size={15} /></button>
                  <button className="btn-ghost !px-2 !py-1 text-red-500" onClick={() => del(o.id)}><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <OfferEditor
          editing={editing}
          setEditing={setEditing}
          productName={productName}
          setProductName={setProductName}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
    </div>
  );
}

function OfferEditor({ editing, setEditing, productName, setProductName, onClose, onSave }: any) {
  const { tt } = useI18n();
  const [results, setResults] = useState<any[]>([]);
  const set = (k: string, v: any) => setEditing({ ...editing, [k]: v });

  const search = async (q: string) => {
    setProductName(q);
    if (q.trim().length < 2) { setResults([]); return; }
    try {
      const { data } = await api.get('/products', { params: { search: q, limit: 8 } });
      setResults(data.products);
    } catch { setResults([]); }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-heading text-lg font-bold">{editing.id ? tt('Редактировать оффер', 'Taklifni tahrirlash') : tt('Новый оффер', 'Yangi taklif')}</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        {/* Выбор товара (только при создании) */}
        {!editing.id && (
          <div className="relative mb-3">
            <label className="mb-1 block text-sm text-ink-muted">{tt('Товар каталога', 'Katalog mahsuloti')}</label>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3">
              <Search size={15} className="text-ink-subtle" />
              <input className="h-10 flex-1 outline-none" placeholder={tt('Найти товар по названию…', 'Mahsulotni nomi boʻyicha topish…')} value={productName} onChange={(e) => search(e.target.value)} />
            </div>
            {results.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                {results.map((p) => (
                  <button key={p.id} className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                    onClick={() => { set('productId', p.id); setProductName(p.name); setResults([]); }}>
                    {p.name} <span className="text-ink-subtle">· {p.manufacturer ?? ''}</span>
                  </button>
                ))}
              </div>
            )}
            {editing.productId && <div className="mt-1 text-xs text-teal-700">{tt('Выбрано', 'Tanlandi')}: {productName}</div>}
          </div>
        )}

        {/* Фасовка: для вакцин цена в прайсе за 1000 доз, а продаётся флакон на 3000/5000 доз. */}
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-800">
            <Package size={14} /> {tt('Фасовка (для вакцин и мерных товаров)', 'Qadoqlash (vaksinalar va oʻlchov mahsulotlari uchun)')}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={tt('Цена указана за', 'Narx koʻrsatilgan')}>
              <input className="input" placeholder={tt('напр. 1000 доз', 'masalan, 1000 doza')} value={editing.priceUnit} onChange={(e) => set('priceUnit', e.target.value)} />
            </Field>
            <Field label={tt('Это скольких единиц', 'Bu necha birlik')}>
              <input className="input" type="number" min={1} value={editing.priceUnitQty} onChange={(e) => set('priceUnitQty', e.target.value)} />
            </Field>
            <Field label={tt('Единица заказа', 'Buyurtma birligi')}>
              <input className="input" placeholder={tt('напр. флакон', 'masalan, flakon')} value={editing.packUnit} onChange={(e) => set('packUnit', e.target.value)} />
            </Field>
            <Field label={tt('Единиц в упаковке', 'Qadoqdagi birliklar')}>
              <input className="input" type="number" min={1} value={editing.packSize} onChange={(e) => set('packSize', e.target.value)} />
            </Field>
          </div>
          <div className="mt-2 text-xs text-amber-900">
            {Number(editing.priceUnitQty) > 1 || Number(editing.packSize) > 1 ? (
              <>
                {tt('Покупатель увидит', 'Xaridor koʻradi')}:{' '}
                <b>{formatMoney(Math.round((Number(editing.price) * (Number(editing.packSize) || 1)) / (Number(editing.priceUnitQty) || 1)))}</b>
                {editing.packUnit ? ` / ${editing.packUnit}` : ''} — {tt('заказ считается в этих единицах', 'buyurtma shu birliklarda hisoblanadi')}
              </>
            ) : (
              tt('Оставьте 1 и 1, если цена уже за единицу заказа (канистра, литр, упаковка).', 'Agar narx allaqachon buyurtma birligi uchun boʻlsa, 1 va 1 qoldiring.')
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={tt('Цена, сум', 'Narx, soʻm')}><input className="input" type="number" value={editing.price} onChange={(e) => set('price', e.target.value)} /></Field>
          <Field label={tt('Остаток, шт', 'Qoldiq, dona')}><input className="input" type="number" value={editing.stockQty} onChange={(e) => set('stockQty', e.target.value)} /></Field>
          <Field label={tt('Мин. заказ', 'Min. buyurtma')}><input className="input" type="number" value={editing.minOrder} onChange={(e) => set('minOrder', e.target.value)} /></Field>
          <Field label={tt('Срок поставки, дн', 'Yetkazib berish muddati, kun')}><input className="input" type="number" value={editing.leadTimeDays} onChange={(e) => set('leadTimeDays', e.target.value)} /></Field>
          <Field label={tt('Отсрочка, дн (net)', 'Kechiktirish, kun (net)')}><input className="input" type="number" value={editing.netTermDays} onChange={(e) => set('netTermDays', e.target.value)} /></Field>
          <Field label={tt('Срок годности', 'Yaroqlilik muddati')}><input className="input" type="date" value={editing.expiryDate} onChange={(e) => set('expiryDate', e.target.value)} /></Field>
          <Field label={tt('Партия №', 'Partiya №')}><input className="input" value={editing.batchNumber} onChange={(e) => set('batchNumber', e.target.value)} /></Field>
          <Field label={tt('Госреестр №', 'Davlat reestri №')}><input className="input" value={editing.regNumber} onChange={(e) => set('regNumber', e.target.value)} /></Field>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-teal-600" checked={editing.isRx} onChange={(e) => set('isRx', e.target.checked)} />
          {tt('Рецептурный отпуск (Rx)', 'Retsept boʻyicha (Rx)')}
        </label>
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-teal-600" checked={editing.inStock} onChange={(e) => set('inStock', e.target.checked)} />
          {tt('В наличии', 'Mavjud')}
        </label>

        <button className="btn-primary mt-4 w-full" onClick={onSave}>{tt('Сохранить', 'Saqlash')}</button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-ink-muted">{label}</label>
      {children}
    </div>
  );
}
