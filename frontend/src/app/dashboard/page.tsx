'use client';

import { useEffect, useState } from 'react';
import { Download, FileText, RotateCcw, CreditCard, Gift, Wallet, Package } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth, useCart } from '@/lib/store';
import { RoleGuard, StatCard, STATUS_LABELS } from '@/components/RoleGuard';
import { formatMoney } from '@/lib/utils';

interface Order {
  id: string;
  createdAt: string;
  status: string;
  total: number;
  subtotal: number;
  items: { productId: string; productName: string; quantity: number; price: number }[];
}
interface Tx { id: string; amount: number; type: string; description: string; createdAt: string }

function downloadBlob(data: BlobPart, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function BuyerContent() {
  const { user } = useAuth();
  const addToCart = useCart((s) => s.add);
  const [orders, setOrders] = useState<Order[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [stats, setStats] = useState<{ totalSpent: number; ordersCount: number } | null>(null);

  const load = () => {
    api.get('/orders').then((r) => setOrders(r.data));
    api.get('/vetpoints/transactions').then((r) => setTxs(r.data));
    api.get('/buyer/stats').then((r) => setStats(r.data)).catch(() => {});
  };
  useEffect(load, []);

  const repeat = (o: Order) => {
    o.items.forEach((it) =>
      addToCart({ productId: it.productId, name: it.productName, price: it.price, minOrder: 1 }, it.quantity),
    );
    toast.success('Товары добавлены в корзину');
  };

  const invoice = async (id: string) => {
    const { data } = await api.get(`/orders/${id}/invoice`, { responseType: 'blob' });
    downloadBlob(data, `invoice-${id.slice(0, 8)}.pdf`, 'application/pdf');
  };

  const pay = async (orderId: string, provider: string) => {
    try {
      const { data } = await api.post('/payments', { orderId, provider });
      if (data.mock) {
        await api.post(`/payments/${data.id}/mock-confirm`);
        toast.success('Оплата прошла (демо)');
        load();
      } else {
        window.open(data.paymentUrl, '_blank');
        toast.info('Открыта страница оплаты');
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Ошибка оплаты');
    }
  };

  const exportExcel = async () => {
    const { data } = await api.get('/orders/export', { responseType: 'blob' });
    downloadBlob(data, 'orders.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6">
        <span className="eyebrow">Кабинет</span>
        <h1 className="mt-3 section-title">Покупатель</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Баланс VetPoints" value={formatMoney(user?.vetPointsBalance ?? 0)} accent icon={Gift} />
        <StatCard label="Потрачено" value={formatMoney(stats?.totalSpent ?? 0)} icon={Wallet} />
        <StatCard label="Заказов" value={String(stats?.ordersCount ?? orders.length)} icon={Package} />
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-heading text-xl font-bold">Мои заказы</h2>
        <button className="btn-secondary" onClick={exportExcel}><Download size={16} /> Excel</button>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-ink-subtle">
            <tr className="border-b border-slate-100">
              <th className="py-2">№</th><th>Дата</th><th>Статус</th><th>Сумма</th><th></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-slate-50">
                <td className="py-2 font-mono text-xs">{o.id.slice(0, 8)}</td>
                <td>{new Date(o.createdAt).toLocaleDateString('ru-RU')}</td>
                <td><span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs">{STATUS_LABELS[o.status]}</span></td>
                <td className="font-semibold">{formatMoney(o.total)}</td>
                <td className="flex items-center gap-2 py-2">
                  {o.status === 'PENDING' && (
                    <PayControl onPay={(provider) => pay(o.id, provider)} />
                  )}
                  <button className="btn-ghost !px-2 !py-1" onClick={() => repeat(o)} title="Повторить"><RotateCcw size={15} /></button>
                  <button className="btn-ghost !px-2 !py-1" onClick={() => invoice(o.id)} title="Счёт PDF"><FileText size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && <div className="py-10 text-center text-ink-subtle">Заказов пока нет</div>}
      </div>

      <h2 className="mt-10 font-heading text-xl font-bold">История VetPoints</h2>
      <div className="mt-3 space-y-2">
        {txs.map((t) => (
          <div key={t.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-2 text-sm">
            <span>{t.description}</span>
            <span className={t.amount >= 0 ? 'font-semibold text-teal-700' : 'font-semibold text-secondary'}>
              {t.amount >= 0 ? '+' : ''}{formatMoney(t.amount)}
            </span>
          </div>
        ))}
        {txs.length === 0 && <div className="py-6 text-center text-ink-subtle">Пока нет операций</div>}
      </div>
    </div>
  );
}

function PayControl({ onPay }: { onPay: (provider: string) => void }) {
  const [provider, setProvider] = useState('CLICK');
  return (
    <span className="inline-flex items-center gap-1">
      <select className="input !h-8 !w-auto !px-1 text-xs" value={provider} onChange={(e) => setProvider(e.target.value)}>
        <option value="CLICK">Click</option>
        <option value="PAYME">Payme</option>
        <option value="UZUM">UZUM</option>
      </select>
      <button className="btn-primary !px-2 !py-1 text-xs" onClick={() => onPay(provider)} title="Оплатить">
        <CreditCard size={14} /> Оплатить
      </button>
    </span>
  );
}

export default function BuyerDashboard() {
  return <RoleGuard role="BUYER"><BuyerContent /></RoleGuard>;
}
