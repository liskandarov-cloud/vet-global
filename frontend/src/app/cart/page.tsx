'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trash2, Minus, Plus, ShoppingBag, ShieldCheck, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useCart, useAuth } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { formatMoney } from '@/lib/utils';

export default function CartPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { items, setQty, remove, clear, subtotal } = useCart();
  const { user, refresh } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [usePoints, setUsePoints] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [counterparties, setCounterparties] = useState<any[]>([]);
  const [counterpartyId, setCounterpartyId] = useState('');

  useEffect(() => {
    if (!user) return;
    api.get('/users/me/counterparties').then((r) => {
      setCounterparties(r.data);
      const def = r.data.find((c: any) => c.isDefault) ?? r.data[0];
      if (def) setCounterpartyId(def.id);
    }).catch(() => {});
  }, [user]);

  const sum = subtotal();
  const maxPoints = Math.min(user?.vetPointsBalance ?? 0, sum * 0.1);
  const pointsToUse = usePoints ? Math.floor(maxPoints) : 0;
  const total = sum - pointsToUse;

  const checkout = async () => {
    if (!user && (!name || !phone)) {
      toast.error('Укажите имя и телефон');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/orders', {
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        buyerName: user ? undefined : name,
        buyerPhone: user ? undefined : phone,
        buyerCompany: user ? undefined : company,
        counterpartyId: user && counterpartyId ? counterpartyId : undefined,
        vetPointsUsed: pointsToUse,
      });
      clear();
      if (user) refresh();
      toast.success(t('cart.orderPlaced'));
      router.push(user ? '/dashboard' : '/');
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Ошибка оформления');
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <ShoppingBag size={48} className="mx-auto text-ink-subtle" />
        <p className="mt-4 text-lg text-ink-muted">{t('cart.empty')}</p>
        <Link href="/catalog" className="btn-primary mt-6 inline-flex">{t('nav.catalog')}</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6">
        <span className="eyebrow">Оформление</span>
        <h1 className="mt-3 section-title">{t('cart.title')}</h1>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Items */}
        <div className="space-y-3">
          {items.map((i) => (
            <div key={i.productId} className="card flex items-center gap-4 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={i.image} alt={i.name} className="h-20 w-20 rounded-lg object-cover" />
              <div className="flex-1">
                <div className="font-medium">{i.name}</div>
                <div className="text-sm text-ink-subtle">{formatMoney(i.price)}</div>
              </div>
              <div className="flex items-center rounded-lg border border-slate-200">
                <button className="p-2" onClick={() => setQty(i.productId, i.quantity - 1)}><Minus size={14} /></button>
                <input className="w-12 text-center outline-none" value={i.quantity} onChange={(e) => setQty(i.productId, Number(e.target.value) || 1)} />
                <button className="p-2" onClick={() => setQty(i.productId, i.quantity + 1)}><Plus size={14} /></button>
              </div>
              <div className="w-28 text-right font-semibold">{formatMoney(i.price * i.quantity)}</div>
              <button className="text-ink-subtle hover:text-red-500" onClick={() => remove(i.productId)}><Trash2 size={18} /></button>
            </div>
          ))}
        </div>

        {/* Summary / checkout */}
        <div className="card h-max space-y-4 p-5 shadow-soft lg:sticky lg:top-20">
          {!user && (
            <div className="space-y-3">
              <input className="input" placeholder={t('cart.name')} value={name} onChange={(e) => setName(e.target.value)} />
              <input className="input" placeholder={t('cart.phone')} value={phone} onChange={(e) => setPhone(e.target.value)} />
              <input className="input" placeholder={t('cart.company')} value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
          )}

          {user && counterparties.length > 0 && (
            <div>
              <label className="mb-1 block text-sm font-medium">Контрагент (юрлицо)</label>
              <select className="input" value={counterpartyId} onChange={(e) => setCounterpartyId(e.target.value)}>
                {counterparties.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} · ИНН {c.inn}</option>
                ))}
              </select>
              <Link href="/dashboard" className="mt-1 inline-block text-xs text-teal-700 hover:underline">Управлять реквизитами</Link>
            </div>
          )}

          {user && maxPoints >= 1 && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={usePoints} onChange={(e) => setUsePoints(e.target.checked)} className="h-4 w-4 accent-teal-600" />
              {t('cart.usePoints')} (до {formatMoney(maxPoints)})
            </label>
          )}

          <div className="space-y-2 border-t border-slate-100 pt-3 text-sm">
            <div className="flex justify-between"><span className="text-ink-muted">{t('cart.subtotal')}</span><span>{formatMoney(sum)}</span></div>
            {pointsToUse > 0 && (
              <div className="flex justify-between text-secondary"><span>VetPoints</span><span>-{formatMoney(pointsToUse)}</span></div>
            )}
            <div className="flex items-baseline justify-between border-t border-slate-100 pt-2 font-heading font-bold">
              <span className="text-lg">Итого</span><span className="text-2xl text-gradient">{formatMoney(total)}</span>
            </div>
          </div>

          <button className="btn-primary w-full" disabled={submitting} onClick={checkout}>
            {submitting ? '…' : t('cart.checkout')}
          </button>
          <div className="flex items-center justify-center gap-4 text-xs text-ink-subtle">
            <span className="flex items-center gap-1"><ShieldCheck size={13} className="text-teal-700" /> Безопасно</span>
            <span className="flex items-center gap-1"><FileText size={13} className="text-teal-700" /> Счёт PDF</span>
          </div>
        </div>
      </div>
    </div>
  );
}
