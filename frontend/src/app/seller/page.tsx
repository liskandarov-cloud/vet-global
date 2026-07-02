'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { RoleGuard, StatCard, STATUS_LABELS } from '@/components/RoleGuard';
import { Category, Product } from '@/lib/types';
import { formatMoney } from '@/lib/utils';

const EMPTY = {
  name: '', description: '', categoryId: '', price: 0, activeSubstance: '', manufacturer: '',
  form: '', animalType: '', inStock: true, minOrder: 1, images: [] as string[], certificates: [] as string[],
  isPromotion: false, promotionText: '',
};

function SellerContent() {
  const [tab, setTab] = useState<'products' | 'orders'>('products');
  const [stats, setStats] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<any | null>(null);

  const load = () => {
    api.get('/seller/stats').then((r) => setStats(r.data)).catch(() => {});
    api.get('/auth/me').then((me) =>
      api.get('/products', { params: { sellerId: me.data.id, limit: 100 } }).then((r) => setProducts(r.data.products)),
    );
    api.get('/orders').then((r) => setOrders(r.data));
    api.get('/categories').then((r) => setCategories(r.data));
  };
  useEffect(load, []);

  const del = async (id: string) => {
    if (!confirm('Удалить товар?')) return;
    await api.delete(`/products/${id}`);
    toast.success('Удалено');
    load();
  };

  const setStatus = async (id: string, status: string) => {
    await api.patch(`/orders/${id}/status`, { status });
    toast.success('Статус обновлён');
    load();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 font-heading text-3xl font-extrabold">Кабинет продавца</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Оборот" value={formatMoney(stats?.revenue ?? 0)} accent />
        <StatCard label="Товаров" value={String(stats?.productsCount ?? products.length)} />
        <StatCard label="Заказов" value={String(stats?.ordersCount ?? 0)} />
      </div>

      <div className="mt-8 flex gap-2 border-b border-slate-200">
        {[['products', 'Товары'], ['orders', 'Заказы']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k as any)}
            className={`px-4 py-2 font-medium ${tab === k ? 'border-b-2 border-teal-600 text-teal-700' : 'text-ink-muted'}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'products' && (
        <div className="mt-6">
          <button className="btn-primary mb-4" onClick={() => setEditing({ ...EMPTY })}><Plus size={16} /> Добавить товар</button>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-ink-subtle">
                <tr className="border-b border-slate-100"><th className="py-2">Название</th><th>Цена</th><th>Наличие</th><th></th></tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-slate-50">
                    <td className="py-2">{p.name}</td>
                    <td>{formatMoney(p.price)}</td>
                    <td>{p.inStock ? 'В наличии' : 'Под заказ'}</td>
                    <td className="flex gap-2 py-2">
                      <button className="btn-ghost !px-2 !py-1" onClick={() => setEditing({ ...EMPTY, ...p, animalType: p.animalType ?? '' })}><Pencil size={15} /></button>
                      <button className="btn-ghost !px-2 !py-1 text-red-500" onClick={() => del(p.id)}><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'orders' && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-ink-subtle">
              <tr className="border-b border-slate-100"><th className="py-2">№</th><th>Покупатель</th><th>Сумма</th><th>Статус</th></tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-slate-50">
                  <td className="py-2 font-mono text-xs">{o.id.slice(0, 8)}</td>
                  <td>{o.buyerName}<div className="text-xs text-ink-subtle">{o.buyerPhone}</div></td>
                  <td className="font-semibold">{formatMoney(o.total)}</td>
                  <td>
                    <select className="input !h-9 !w-auto" value={o.status} onChange={(e) => setStatus(o.id, e.target.value)}>
                      {Object.entries(STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && <div className="py-10 text-center text-ink-subtle">Заказов пока нет</div>}
        </div>
      )}

      {editing && (
        <ProductForm
          initial={editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

function ProductForm({ initial, categories, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>(initial);
  const [saving, setSaving] = useState(false);
  const imgInput = useRef<HTMLInputElement>(null);
  const certInput = useRef<HTMLInputElement>(null);

  const upd = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const upload = async (file: File, kind: 'image' | 'certificate') => {
    const fd = new FormData();
    fd.append('file', file);
    try {
      const { data } = await api.post(`/uploads?kind=${kind}`, fd);
      if (kind === 'image') upd('images', [...form.images, data.url]);
      else upd('certificates', [...form.certificates, data.url]);
      toast.success('Файл загружен');
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Ошибка загрузки');
    }
  };

  const save = async () => {
    if (!form.categoryId) return toast.error('Выберите категорию');
    setSaving(true);
    const payload = {
      name: form.name, nameUz: form.nameUz, description: form.description, descriptionUz: form.descriptionUz,
      categoryId: form.categoryId, price: Number(form.price), activeSubstance: form.activeSubstance || undefined,
      manufacturer: form.manufacturer || undefined, form: form.form || undefined,
      animalType: form.animalType || undefined, inStock: form.inStock, minOrder: Number(form.minOrder) || 1,
      images: form.images, certificates: form.certificates, isPromotion: form.isPromotion, promotionText: form.promotionText || undefined,
    };
    try {
      if (form.id) await api.put(`/products/${form.id}`, payload);
      else await api.post('/products', payload);
      toast.success('Сохранено');
      onSaved();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-heading text-xl font-bold">{form.id ? 'Редактировать' : 'Новый'} товар</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input className="input sm:col-span-2" placeholder="Название" value={form.name} onChange={(e) => upd('name', e.target.value)} />
          <textarea className="input !h-auto py-2 sm:col-span-2" rows={3} placeholder="Описание" value={form.description} onChange={(e) => upd('description', e.target.value)} />
          <select className="input" value={form.categoryId} onChange={(e) => upd('categoryId', e.target.value)}>
            <option value="">Категория…</option>
            {categories.map((c: Category) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input className="input" type="number" placeholder="Цена" value={form.price} onChange={(e) => upd('price', e.target.value)} />
          <input className="input" placeholder="Активное вещество" value={form.activeSubstance} onChange={(e) => upd('activeSubstance', e.target.value)} />
          <input className="input" placeholder="Производитель" value={form.manufacturer} onChange={(e) => upd('manufacturer', e.target.value)} />
          <input className="input" placeholder="Форма выпуска" value={form.form} onChange={(e) => upd('form', e.target.value)} />
          <select className="input" value={form.animalType} onChange={(e) => upd('animalType', e.target.value)}>
            <option value="">Животное…</option>
            {['POULTRY', 'CATTLE', 'SMALL_RUMINANTS', 'HORSES', 'PETS', 'OTHER'].map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <input className="input" type="number" placeholder="Мин. заказ" value={form.minOrder} onChange={(e) => upd('minOrder', e.target.value)} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.inStock} onChange={(e) => upd('inStock', e.target.checked)} className="h-4 w-4 accent-teal-600" /> В наличии</label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={() => imgInput.current?.click()}><Upload size={15} /> Фото ({form.images.length})</button>
          <input ref={imgInput} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], 'image')} />
          <button className="btn-secondary" onClick={() => certInput.current?.click()}><Upload size={15} /> Сертификат PDF ({form.certificates.length})</button>
          <input ref={certInput} type="file" accept="application/pdf" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], 'certificate')} />
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>Отмена</button>
          <button className="btn-primary" disabled={saving} onClick={save}>{saving ? '…' : 'Сохранить'}</button>
        </div>
      </div>
    </div>
  );
}

export default function SellerDashboard() {
  return <RoleGuard role="SELLER"><SellerContent /></RoleGuard>;
}
