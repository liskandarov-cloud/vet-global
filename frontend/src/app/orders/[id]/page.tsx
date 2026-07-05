'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, FileText, CheckCircle2, Clock, Truck, Package, CreditCard,
  ShieldCheck, XCircle, MapPin, RefreshCw, CalendarClock,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth, useCart } from '@/lib/store';
import { formatMoney } from '@/lib/utils';

const TERM_RU: Record<string, string> = {
  PREPAY: 'Предоплата', NET_TERMS: 'Отсрочка', INSTALLMENT: 'Рассрочка',
};

const FLOW = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const;
const STATUS_RU: Record<string, string> = {
  PENDING: 'Новый', CONFIRMED: 'Подтверждён', PROCESSING: 'В обработке',
  SHIPPED: 'Отгружен', DELIVERED: 'Доставлен', CANCELLED: 'Отменён',
};
const SHIP_RU: Record<string, string> = {
  PENDING: 'Ожидает', ASSIGNED: 'Назначен', IN_TRANSIT: 'В пути', DELIVERED: 'Доставлено', RETURNED: 'Возврат',
};
const DIDOX_RU: Record<string, string> = { DRAFT: 'Черновик', SENT: 'Отправлен', SIGNED: 'Подписан', REJECTED: 'Отклонён' };
const PAY_RU: Record<string, string> = { PENDING: 'Ожидает', PAID: 'Оплачен', FAILED: 'Ошибка', CANCELLED: 'Отменён', REFUNDED: 'Возврат' };

function downloadBlob(data: BlobPart, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function OrderContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const addToCart = useCart((s) => s.add);
  const [order, setOrder] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);

  // Повторить заказ — вернуть позиции в корзину (с выбранным ранее оффером).
  const reorder = () => {
    order.items?.forEach((it: any) => {
      addToCart(
        {
          productId: it.productId,
          offerId: it.offerId ?? undefined,
          name: it.productName,
          price: Number(it.price),
          minOrder: 1,
        },
        it.quantity,
      );
    });
    toast.success('Позиции добавлены в корзину — проверьте актуальные цены');
    router.push('/cart');
  };

  const load = () =>
    api.get(`/orders/${id}`).then((r) => setOrder(r.data)).catch(() => setNotFound(true));
  useEffect(() => { if (id) load(); }, [id]);

  if (notFound) return <div className="py-24 text-center text-ink-subtle">Заказ не найден</div>;
  if (!order) return <div className="py-24 text-center text-ink-subtle">Загрузка…</div>;

  const cancelled = order.status === 'CANCELLED';
  const currentIdx = FLOW.indexOf(order.status);
  const payment = order.payments?.[order.payments.length - 1];

  const invoice = async () => {
    const { data } = await api.get(`/orders/${id}/invoice`, { responseType: 'blob' });
    downloadBlob(data, `invoice-${String(id).slice(0, 8)}.pdf`, 'application/pdf');
  };
  const pay = async (provider: string) => {
    try {
      const { data } = await api.post('/payments', { orderId: id, provider });
      if (data.mock) { await api.post(`/payments/${data.id}/mock-confirm`); toast.success('Оплата прошла (демо)'); load(); }
      else { window.open(data.paymentUrl, '_blank'); }
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Ошибка оплаты'); }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/dashboard" className="btn-ghost mb-4"><ArrowLeft size={16} /> Мои заказы</Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="eyebrow">Заказ</span>
          <h1 className="mt-2 section-title">#{String(id).slice(0, 8)}</h1>
          <p className="mt-1 text-sm text-ink-subtle">от {new Date(order.createdAt).toLocaleString('ru-RU')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-outline !py-1.5 text-sm" onClick={reorder}><RefreshCw size={15} /> Повторить заказ</button>
          <span className={`rounded-full px-4 py-1.5 text-sm font-semibold ${cancelled ? 'bg-red-100 text-red-600' : 'bg-teal-100 text-teal-700'}`}>
            {STATUS_RU[order.status]}
          </span>
        </div>
      </div>

      {/* Timeline */}
      {cancelled ? (
        <div className="card flex items-center gap-3 p-5 text-red-600"><XCircle size={20} /> Заказ отменён</div>
      ) : (
        <div className="card p-6">
          <div className="flex items-center justify-between">
            {FLOW.map((s, i) => {
              const done = i <= currentIdx;
              const Icon = [Clock, CheckCircle2, Package, Truck, ShieldCheck][i];
              return (
                <div key={s} className="flex flex-1 flex-col items-center text-center">
                  <div className="flex w-full items-center">
                    <div className={`h-0.5 flex-1 ${i === 0 ? 'opacity-0' : done ? 'bg-teal-500' : 'bg-slate-200'}`} />
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${done ? 'bg-gradient-to-r from-teal-600 to-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      <Icon size={16} />
                    </span>
                    <div className={`h-0.5 flex-1 ${i === FLOW.length - 1 ? 'opacity-0' : i < currentIdx ? 'bg-teal-500' : 'bg-slate-200'}`} />
                  </div>
                  <span className={`mt-2 text-xs ${done ? 'font-medium text-ink' : 'text-ink-subtle'}`}>{STATUS_RU[s]}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-[1.4fr_1fr]">
        {/* Items */}
        <div className="card p-5">
          <h2 className="mb-3 font-semibold">Позиции</h2>
          <div className="divide-y divide-line">
            {order.items?.map((it: any) => (
              <div key={it.id} className="flex items-center justify-between py-2 text-sm">
                <span>{it.productName} <span className="text-ink-subtle">× {it.quantity}</span></span>
                <span className="font-medium">{formatMoney(it.price * it.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
            <div className="flex justify-between"><span className="text-ink-muted">Сумма позиций</span><span>{formatMoney(order.subtotal)}</span></div>
            {order.vetPointsUsed > 0 && <div className="flex justify-between text-secondary"><span>VetPoints</span><span>-{formatMoney(order.vetPointsUsed)}</span></div>}
            <div className="flex justify-between border-t border-line pt-2 font-heading text-lg font-bold"><span>Итого</span><span className="text-gradient">{formatMoney(order.total)}</span></div>
          </div>
        </div>

        {/* Side: docs, payment, delivery */}
        <div className="space-y-4">
          {order.status === 'PENDING' && (
            <div className="card p-5">
              <h3 className="mb-2 font-semibold">Оплата</h3>
              <div className="flex gap-2">
                {['CLICK', 'PAYME', 'UZUM'].map((p) => (
                  <button key={p} className="btn-secondary flex-1 !px-2 !py-1.5 text-xs" onClick={() => pay(p)}>{p === 'CLICK' ? 'Click' : p === 'PAYME' ? 'Payme' : 'UZUM'}</button>
                ))}
              </div>
            </div>
          )}

          {payment && (
            <div className="card flex items-center justify-between p-4 text-sm">
              <span className="flex items-center gap-2 text-ink-muted"><CreditCard size={15} /> {payment.provider}</span>
              <span className={`rounded-md px-2 py-0.5 text-xs ${payment.status === 'PAID' ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700'}`}>{PAY_RU[payment.status]}</span>
            </div>
          )}

          {order.paymentTerm && order.paymentTerm !== 'PREPAY' && (
            <div className="card p-4 text-sm">
              <div className="mb-1 flex items-center gap-2 font-medium"><CalendarClock size={15} className="text-teal-700" /> {TERM_RU[order.paymentTerm]}</div>
              {order.dueDate && <div className="text-ink-muted">Оплатить до: <span className="font-medium text-ink">{new Date(order.dueDate).toLocaleDateString('ru-RU')}</span></div>}
              {Array.isArray(order.paymentSchedule) && order.paymentSchedule.length > 0 && (
                <div className="mt-2 space-y-1">
                  {order.paymentSchedule.map((p: any) => (
                    <div key={p.n} className="flex justify-between text-xs">
                      <span className="text-ink-subtle">Платёж {p.n} · {new Date(p.dueDate).toLocaleDateString('ru-RU')}</span>
                      <span className="font-medium">{formatMoney(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="card p-4 text-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2 font-medium"><FileText size={15} /> Счёт</span>
              <button className="btn-ghost !px-2 !py-1 text-xs text-teal-700" onClick={invoice}>Скачать PDF</button>
            </div>
            {order.invoice?.number && <div className="text-ink-subtle">№ {order.invoice.number}</div>}
            {order.invoice?.didoxStatus && (
              <div className="mt-1 flex items-center gap-1 text-ink-subtle">ЭДО (Didox): <span className="font-medium text-teal-700">{DIDOX_RU[order.invoice.didoxStatus] ?? order.invoice.didoxStatus}</span></div>
            )}
          </div>

          {order.shipment && (
            <div className="card p-4 text-sm">
              <div className="mb-1 flex items-center gap-2 font-medium"><Truck size={15} /> Доставка</div>
              <div className="text-ink-muted">Статус: <span className="font-medium text-ink">{SHIP_RU[order.shipment.status]}</span></div>
              {order.shipment.carrier && <div className="text-ink-muted">Перевозчик: {order.shipment.carrier}</div>}
              {order.shipment.trackingNumber && <div className="text-ink-muted">Трек: {order.shipment.trackingNumber}</div>}
              {(order.shipment.city || order.shipment.address) && (
                <div className="mt-1 flex items-start gap-1 text-ink-subtle"><MapPin size={13} className="mt-0.5 shrink-0" />{[order.shipment.city, order.shipment.address].filter(Boolean).join(', ')}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Any authenticated role may view; backend enforces per-order access.
export default function OrderPage() {
  const { user, ready } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (ready && !user) router.replace('/login');
  }, [ready, user, router]);

  if (!ready || !user) return <div className="py-24 text-center text-ink-subtle">Загрузка…</div>;
  return <OrderContent />;
}
