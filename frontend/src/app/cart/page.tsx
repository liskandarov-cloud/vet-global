'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trash2, Minus, Plus, ShoppingBag, ShieldCheck, FileText, CreditCard, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useCart, useAuth, cartKey } from '@/lib/store';
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
  // Финансирование
  const [paymentTerm, setPaymentTerm] = useState<'PREPAY' | 'NET_TERMS' | 'INSTALLMENT'>('PREPAY');
  const [netTermDays, setNetTermDays] = useState(30);
  const [installments, setInstallments] = useState(3);
  const [credit, setCredit] = useState<{ available: number; creditLimit: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    api.get('/users/me/counterparties').then((r) => {
      setCounterparties(r.data);
      const def = r.data.find((c: any) => c.isDefault) ?? r.data[0];
      if (def) setCounterpartyId(def.id);
    }).catch(() => {});
    api.get('/financing/me').then((r) => setCredit(r.data)).catch(() => {});
  }, [user]);

  const sum = subtotal();
  const maxPoints = Math.min(user?.vetPointsBalance ?? 0, sum * 0.1);
  const pointsToUse = usePoints ? Math.floor(maxPoints) : 0;
  const total = sum - pointsToUse;
  const available = credit?.available ?? 0;
  const creditShort = paymentTerm !== 'PREPAY' && total > available;

  const checkout = async () => {
    if (!user && (!name || !phone)) {
      toast.error('Укажите имя и телефон');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/orders', {
        items: items.map((i) => ({ productId: i.productId, offerId: i.offerId, quantity: i.quantity })),
        buyerName: user ? undefined : name,
        buyerPhone: user ? undefined : phone,
        buyerCompany: user ? undefined : company,
        counterpartyId: user && counterpartyId ? counterpartyId : undefined,
        vetPointsUsed: pointsToUse,
        paymentTerm,
        netTermDays: paymentTerm === 'NET_TERMS' ? netTermDays : undefined,
        installments: paymentTerm === 'INSTALLMENT' ? installments : undefined,
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
          {items.map((i) => {
            const key = cartKey(i);
            return (
            <div key={key} className="card flex items-center gap-4 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={i.image} alt={i.name} className="h-20 w-20 rounded-lg object-cover" />
              <div className="flex-1">
                <div className="font-medium">{i.name}</div>
                {i.sellerName && <div className="text-xs text-teal-700">{i.sellerName}</div>}
                <div className="text-sm text-ink-subtle">{formatMoney(i.price)}</div>
              </div>
              <div className="flex items-center rounded-lg border border-slate-200">
                <button className="p-2" onClick={() => setQty(key, i.quantity - 1)}><Minus size={14} /></button>
                <input className="w-12 text-center outline-none" value={i.quantity} onChange={(e) => setQty(key, Number(e.target.value) || 1)} />
                <button className="p-2" onClick={() => setQty(key, i.quantity + 1)}><Plus size={14} /></button>
              </div>
              <div className="w-28 text-right font-semibold">{formatMoney(i.price * i.quantity)}</div>
              <button className="text-ink-subtle hover:text-red-500" onClick={() => remove(key)}><Trash2 size={18} /></button>
            </div>
            );
          })}
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

          {user && (
            <div className="border-t border-slate-100 pt-3">
              <div className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                <CreditCard size={15} className="text-teal-700" /> Условия оплаты
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {([
                  ['PREPAY', 'Предоплата'],
                  ['NET_TERMS', 'Отсрочка'],
                  ['INSTALLMENT', 'Рассрочка'],
                ] as const).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setPaymentTerm(val)}
                    className={`rounded-lg border px-2 py-2 font-medium transition-colors ${paymentTerm === val ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 text-ink-muted hover:border-teal-200'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {paymentTerm === 'NET_TERMS' && (
                <div className="mt-2 flex gap-1.5">
                  {[30, 60].map((d) => (
                    <button key={d} onClick={() => setNetTermDays(d)} className={`flex-1 rounded-md border px-2 py-1 text-xs ${netTermDays === d ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 text-ink-muted'}`}>net-{d}</button>
                  ))}
                </div>
              )}
              {paymentTerm === 'INSTALLMENT' && (
                <div className="mt-2 flex gap-1.5">
                  {[3, 6, 12].map((n) => (
                    <button key={n} onClick={() => setInstallments(n)} className={`flex-1 rounded-md border px-2 py-1 text-xs ${installments === n ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 text-ink-muted'}`}>{n} мес</button>
                  ))}
                </div>
              )}

              {paymentTerm !== 'PREPAY' && (
                <div className="mt-2 text-xs">
                  <div className="flex items-center gap-1 text-ink-subtle">
                    <CalendarClock size={12} /> Доступный лимит: <b className={creditShort ? 'text-red-500' : 'text-teal-700'}>{formatMoney(available)}</b>
                  </div>
                  {paymentTerm === 'INSTALLMENT' && !creditShort && (
                    <div className="mt-0.5 text-ink-subtle">≈ {formatMoney(Math.ceil(total / installments))} / мес × {installments}</div>
                  )}
                  {creditShort && (
                    <div className="mt-1 rounded-md bg-red-50 px-2 py-1 text-red-600">
                      Не хватает лимита. <Link href="/financing" className="font-medium underline">Оформить финансирование</Link>
                    </div>
                  )}
                </div>
              )}
            </div>
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
