'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, Upload, X, TrendingUp, Package, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { RoleGuard, StatCard, STATUS_LABELS } from '@/components/RoleGuard';
import { TopProductsBar, WeeklyBars } from '@/components/Charts';
import { Category, Product } from '@/lib/types';
import { formatMoney } from '@/lib/utils';
import { signWithEimzo } from '@/lib/eimzo';

const EMPTY = {
  name: '', description: '', categoryId: '', price: 0, activeSubstance: '', manufacturer: '',
  form: '', animalType: '', inStock: true, minOrder: 1, images: [] as string[], certificates: [] as string[],
  isPromotion: false, promotionText: '', externalId: '',
};

const DIDOX_LABELS: Record<string, string> = {
  DRAFT: 'Черновик', SENT: 'Отправлен', SIGNED: 'Подписан', REJECTED: 'Отклонён',
};
const SHIP_LABELS: Record<string, string> = {
  PENDING: 'Ожидает', ASSIGNED: 'Назначен', IN_TRANSIT: 'В пути', DELIVERED: 'Доставлено', RETURNED: 'Возврат',
};
const SHIP_METHODS: Record<string, string> = { COURIER: 'Курьер', PICKUP: 'Самовывоз', TRANSPORT: 'Транспортная компания' };

function SellerContent() {
  const [tab, setTab] = useState<'products' | 'orders' | 'promotions'>('products');
  const [stats, setStats] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [deliveryOrder, setDeliveryOrder] = useState<any | null>(null);
  const [editingPromo, setEditingPromo] = useState<any | null>(null);

  const load = () => {
    api.get('/seller/stats').then((r) => setStats(r.data)).catch(() => {});
    api.get('/auth/me').then((me) =>
      api.get('/products', { params: { sellerId: me.data.id, limit: 100 } }).then((r) => setProducts(r.data.products)),
    );
    api.get('/orders').then((r) => setOrders(r.data));
    api.get('/categories').then((r) => setCategories(r.data));
    api.get('/promotions/mine').then((r) => setPromotions(r.data)).catch(() => {});
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

  const sendDidox = async (id: string) => {
    try {
      const { data } = await api.post(`/didox/send/${id}`);
      toast.success(`Отправлено в Didox (${data.mode}): ${DIDOX_LABELS[data.didoxStatus] ?? data.didoxStatus}`);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Ошибка ЭДО');
    }
  };
  const syncDidox = async (id: string) => {
    const { data } = await api.get(`/didox/status/${id}`);
    toast.success(`Статус Didox: ${DIDOX_LABELS[data.didoxStatus] ?? data.didoxStatus ?? '—'}`);
    load();
  };
  const signEimzo = async (id: string) => {
    try {
      const { data } = await api.get(`/eimzo/prepare/${id}`);
      const pkcs7 = await signWithEimzo(data.documentBase64);
      await api.post(`/eimzo/sign/${id}`, { pkcs7 });
      toast.success('Документ подписан ЭЦП (E-imzo)');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Ошибка подписания');
    }
  };

  const delPromo = async (id: string) => {
    if (!confirm('Удалить акцию?')) return;
    await api.delete(`/promotions/${id}`);
    toast.success('Удалено');
    load();
  };
  const togglePromo = async (p: any) => {
    await api.patch(`/promotions/${p.id}`, { title: p.title, isActive: !p.isActive });
    load();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6">
        <span className="eyebrow">Кабинет</span>
        <h1 className="mt-3 section-title">Продавец</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Оборот" value={formatMoney(stats?.revenue ?? 0)} accent icon={TrendingUp} />
        <StatCard label="Товаров" value={String(stats?.productsCount ?? products.length)} icon={Package} />
        <StatCard label="Заказов" value={String(stats?.ordersCount ?? 0)} icon={ShoppingCart} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <TopProductsBar data={stats?.topProducts ?? []} />
        <WeeklyBars data={stats?.ordersByWeek ?? []} />
      </div>

      <div className="mt-8 flex gap-2 overflow-x-auto border-b border-slate-200">
        {[['products', 'Товары'], ['orders', 'Заказы'], ['promotions', `Акции${promotions.length ? ` (${promotions.length})` : ''}`]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k as any)}
            className={`whitespace-nowrap px-4 py-2 font-medium ${tab === k ? 'border-b-2 border-teal-600 text-teal-700' : 'text-ink-muted'}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'products' && (
        <div className="mt-6">
          <SyncPanel />
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
              <tr className="border-b border-slate-100"><th className="py-2">№</th><th>Покупатель</th><th>Сумма</th><th>Статус</th><th>ЭДО (Didox)</th><th>Доставка</th></tr>
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
                  <td>
                    {o.invoice?.didoxStatus ? (
                      <span className="inline-flex items-center gap-2">
                        <span className={`rounded-md px-2 py-0.5 text-xs ${o.invoice.didoxStatus === 'SIGNED' ? 'bg-teal-100 text-teal-700' : o.invoice.didoxStatus === 'REJECTED' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
                          {DIDOX_LABELS[o.invoice.didoxStatus] ?? o.invoice.didoxStatus}
                        </span>
                        {o.invoice.didoxStatus === 'SENT' && (
                          <button className="btn-ghost !px-2 !py-1 text-xs text-teal-700" onClick={() => signEimzo(o.id)}>Подписать ЭЦП</button>
                        )}
                        <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => syncDidox(o.id)}>Обновить</button>
                      </span>
                    ) : (
                      <button className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => sendDidox(o.id)}>Отправить в ЭДО</button>
                    )}
                  </td>
                  <td>
                    {o.shipment ? (
                      <button className="inline-flex items-center gap-1" onClick={() => setDeliveryOrder(o)}>
                        <span className={`rounded-md px-2 py-0.5 text-xs ${o.shipment.status === 'DELIVERED' ? 'bg-teal-100 text-teal-700' : o.shipment.status === 'RETURNED' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
                          {SHIP_LABELS[o.shipment.status] ?? o.shipment.status}
                        </span>
                      </button>
                    ) : (
                      <button className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => setDeliveryOrder(o)}>Оформить</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && <div className="py-10 text-center text-ink-subtle">Заказов пока нет</div>}
        </div>
      )}

      {tab === 'promotions' && (
        <div className="mt-6">
          <button className="btn-primary mb-4" onClick={() => setEditingPromo({ title: '', description: '', productId: '', discountPercent: 10, endsAt: '', isActive: true })}>
            <Plus size={16} /> Новая акция
          </button>
          <div className="grid gap-3 md:grid-cols-2">
            {promotions.map((p) => (
              <div key={p.id} className="card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold">{p.title} <span className="text-secondary">-{p.discountPercent}%</span></div>
                    {p.description && <p className="text-sm text-ink-muted">{p.description}</p>}
                    {p.endsAt && <div className="text-xs text-ink-subtle">до {new Date(p.endsAt).toLocaleDateString('ru-RU')}</div>}
                  </div>
                  <div className="flex gap-1">
                    <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => togglePromo(p)}>{p.isActive ? 'Выкл' : 'Вкл'}</button>
                    <button className="btn-ghost !px-2 !py-1 text-red-500" onClick={() => delPromo(p.id)}><Trash2 size={14} /></button>
                  </div>
                </div>
                <span className={`mt-2 inline-block rounded-md px-2 py-0.5 text-xs ${p.isActive ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-ink-subtle'}`}>{p.isActive ? 'Активна' : 'Отключена'}</span>
              </div>
            ))}
          </div>
          {promotions.length === 0 && <div className="py-10 text-center text-ink-subtle">Акций пока нет</div>}
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

      {deliveryOrder && (
        <DeliveryForm
          order={deliveryOrder}
          onClose={() => setDeliveryOrder(null)}
          onSaved={() => { setDeliveryOrder(null); load(); }}
        />
      )}

      {editingPromo && (
        <PromotionForm
          initial={editingPromo}
          products={products}
          onClose={() => setEditingPromo(null)}
          onSaved={() => { setEditingPromo(null); load(); }}
        />
      )}
    </div>
  );
}

function PromotionForm({ initial, products, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>(initial);
  const [saving, setSaving] = useState(false);
  const upd = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.title) return toast.error('Укажите название акции');
    setSaving(true);
    const payload = {
      title: form.title,
      description: form.description || undefined,
      productId: form.productId || undefined,
      discountPercent: Number(form.discountPercent) || 0,
      endsAt: form.endsAt || undefined,
      isActive: form.isActive,
    };
    try {
      if (form.id) await api.patch(`/promotions/${form.id}`, payload);
      else await api.post('/promotions', payload);
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
      <div className="my-8 w-full max-w-md rounded-2xl bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-heading text-lg font-bold">{form.id ? 'Редактировать' : 'Новая'} акция</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="space-y-3">
          <input className="input" placeholder="Название акции" value={form.title} onChange={(e) => upd('title', e.target.value)} />
          <textarea className="input !h-auto py-2" rows={2} placeholder="Описание" value={form.description} onChange={(e) => upd('description', e.target.value)} />
          <select className="input" value={form.productId} onChange={(e) => upd('productId', e.target.value)}>
            <option value="">Все товары (общая акция)</option>
            {products.map((p: Product) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input className="input" type="number" placeholder="Скидка %" value={form.discountPercent} onChange={(e) => upd('discountPercent', e.target.value)} />
            <input className="input" type="date" value={form.endsAt ? String(form.endsAt).slice(0, 10) : ''} onChange={(e) => upd('endsAt', e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isActive} onChange={(e) => upd('isActive', e.target.checked)} className="h-4 w-4 accent-teal-600" />
            Активна
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>Отмена</button>
          <button className="btn-primary" disabled={saving} onClick={save}>{saving ? '…' : 'Сохранить'}</button>
        </div>
      </div>
    </div>
  );
}

function SyncPanel() {
  const [key, setKey] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { api.get('/sync/key').then((r) => setKey(r.data.syncApiKey)).finally(() => setLoaded(true)); }, []);
  const gen = async () => {
    const { data } = await api.post('/sync/key');
    setKey(data.syncApiKey);
    toast.success('Ключ сгенерирован');
  };
  if (!loaded) return null;
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';
  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
      <div className="mb-1 font-semibold">Синхронизация 1С / ERP</div>
      <p className="text-ink-muted">Обновляйте цены и остатки автоматически. Укажите «Код в 1С» у товаров и отправляйте прайс на:</p>
      <code className="mt-1 block break-all rounded bg-white px-2 py-1 text-xs">POST {apiBase}/sync/price · заголовок X-Sync-Key</code>
      <div className="mt-2 flex items-center gap-2">
        {key ? (
          <input className="input !h-9 flex-1 font-mono text-xs" readOnly value={key} onFocus={(e) => e.target.select()} />
        ) : (
          <span className="text-ink-subtle">Ключ ещё не создан</span>
        )}
        <button className="btn-secondary !py-1.5 text-xs" onClick={gen}>{key ? 'Обновить ключ' : 'Создать ключ'}</button>
      </div>
    </div>
  );
}

function DeliveryForm({ order, onClose, onSaved }: any) {
  const s = order.shipment ?? {};
  const [form, setForm] = useState<any>({
    method: s.method ?? 'COURIER', status: s.status ?? 'PENDING',
    city: s.city ?? '', address: s.address ?? '',
    recipientName: s.recipientName ?? order.buyerName ?? '', recipientPhone: s.recipientPhone ?? order.buyerPhone ?? '',
    cost: s.cost ?? 0, carrier: s.carrier ?? '', trackingNumber: s.trackingNumber ?? '',
    estimatedDate: s.estimatedDate ? String(s.estimatedDate).slice(0, 10) : '',
  });
  const [saving, setSaving] = useState(false);
  const upd = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await api.post(`/orders/${order.id}/shipment`, {
        ...form, cost: Number(form.cost) || 0,
        estimatedDate: form.estimatedDate || undefined,
      });
      toast.success('Доставка сохранена');
      onSaved();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-lg rounded-2xl bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-heading text-xl font-bold">Доставка заказа #{order.id.slice(0, 8)}</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <select className="input" value={form.method} onChange={(e) => upd('method', e.target.value)}>
            {Object.entries(SHIP_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className="input" value={form.status} onChange={(e) => upd('status', e.target.value)}>
            {Object.entries(SHIP_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input className="input" placeholder="Город" value={form.city} onChange={(e) => upd('city', e.target.value)} />
          <input className="input" placeholder="Адрес" value={form.address} onChange={(e) => upd('address', e.target.value)} />
          <input className="input" placeholder="Получатель" value={form.recipientName} onChange={(e) => upd('recipientName', e.target.value)} />
          <input className="input" placeholder="Телефон получателя" value={form.recipientPhone} onChange={(e) => upd('recipientPhone', e.target.value)} />
          <input className="input" placeholder="Перевозчик / ТК" value={form.carrier} onChange={(e) => upd('carrier', e.target.value)} />
          <input className="input" placeholder="Трек-номер" value={form.trackingNumber} onChange={(e) => upd('trackingNumber', e.target.value)} />
          <input className="input" type="number" placeholder="Стоимость доставки" value={form.cost} onChange={(e) => upd('cost', e.target.value)} />
          <input className="input" type="date" value={form.estimatedDate} onChange={(e) => upd('estimatedDate', e.target.value)} />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>Отмена</button>
          <button className="btn-primary" disabled={saving} onClick={save}>{saving ? '…' : 'Сохранить'}</button>
        </div>
      </div>
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
      externalId: form.externalId || undefined,
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
          <input className="input" placeholder="Код в 1С (externalId)" value={form.externalId} onChange={(e) => upd('externalId', e.target.value)} />
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
