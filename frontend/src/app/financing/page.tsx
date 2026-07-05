'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CreditCard, Wallet, CheckCircle2, XCircle, Clock, Landmark } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/store';
import { formatMoney } from '@/lib/utils';

interface CreditApp {
  id: string;
  requestedLimit: number;
  approvedLimit: number | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  bankName?: string;
  purpose?: string;
  decisionNote?: string;
  createdAt: string;
  buyer?: { fullName: string; company?: string; phone?: string; email?: string };
}

const STATUS: Record<string, { label: string; cls: string; Icon: any }> = {
  PENDING: { label: 'На рассмотрении', cls: 'text-amber-600 bg-amber-50', Icon: Clock },
  APPROVED: { label: 'Одобрено', cls: 'text-teal-700 bg-teal-50', Icon: CheckCircle2 },
  REJECTED: { label: 'Отклонено', cls: 'text-red-600 bg-red-50', Icon: XCircle },
};

export default function FinancingPage() {
  const { user, ready } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  if (ready && !user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <Wallet size={40} className="mx-auto text-ink-subtle" />
        <p className="mt-4 text-ink-muted">Войдите, чтобы оформить финансирование закупок.</p>
        <Link href="/login" className="btn-primary mt-6 inline-flex">Войти</Link>
      </div>
    );
  }

  return isAdmin ? <AdminFinancing /> : <BuyerFinancing />;
}

function BuyerFinancing() {
  const { refresh } = useAuth();
  const [data, setData] = useState<{ creditLimit: number; creditUsed: number; available: number; bankName: string; applications: CreditApp[] } | null>(null);
  const [requested, setRequested] = useState(10_000_000);
  const [purpose, setPurpose] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () => api.get('/financing/me').then((r) => setData(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const apply = async () => {
    if (requested < 1) return;
    setSubmitting(true);
    try {
      await api.post('/financing/apply', { requestedLimit: requested, purpose });
      toast.success('Заявка обработана');
      setPurpose('');
      load();
      refresh();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Ошибка');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6">
        <span className="eyebrow">Финансирование</span>
        <h1 className="mt-3 section-title">Кредитная линия закупок</h1>
        <p className="mt-2 text-ink-muted">Отсрочка платежа и рассрочка на закупки. Оформляется онлайн, решение — мгновенно.</p>
      </div>

      {/* Лимит */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <div className="text-xs text-ink-subtle">Одобренный лимит</div>
          <div className="mt-1 font-heading text-2xl font-bold">{formatMoney(data?.creditLimit ?? 0)}</div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-ink-subtle">Использовано</div>
          <div className="mt-1 font-heading text-2xl font-bold text-amber-600">{formatMoney(data?.creditUsed ?? 0)}</div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-ink-subtle">Доступно</div>
          <div className="mt-1 font-heading text-2xl font-bold text-teal-700">{formatMoney(data?.available ?? 0)}</div>
        </div>
      </div>

      {/* Заявка */}
      <div className="card mt-6 space-y-3 p-5">
        <div className="flex items-center gap-2 font-medium"><CreditCard size={18} className="text-teal-700" /> Новая заявка на лимит</div>
        <div>
          <label className="mb-1 block text-sm text-ink-muted">Запрашиваемый лимит, сум</label>
          <input type="number" className="input" value={requested} min={1000000} step={1000000} onChange={(e) => setRequested(Number(e.target.value))} />
          <div className="mt-2 flex gap-1.5">
            {[10_000_000, 30_000_000, 50_000_000, 100_000_000].map((v) => (
              <button key={v} onClick={() => setRequested(v)} className={`rounded-md border px-2 py-1 text-xs ${requested === v ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 text-ink-muted'}`}>{formatMoney(v)}</button>
            ))}
          </div>
        </div>
        <textarea className="input" rows={2} placeholder="Цель финансирования (необязательно)" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
        <button className="btn-primary w-full" disabled={submitting} onClick={apply}>{submitting ? '…' : 'Подать заявку'}</button>
        {data?.bankName && <div className="flex items-center justify-center gap-1 text-xs text-ink-subtle"><Landmark size={12} /> Партнёр: {data.bankName}</div>}
      </div>

      {/* История */}
      {data?.applications && data.applications.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 font-heading text-lg font-bold">История заявок</h2>
          <div className="space-y-2">
            {data.applications.map((a) => <AppRow key={a.id} a={a} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function AppRow({ a }: { a: CreditApp }) {
  const s = STATUS[a.status];
  return (
    <div className="card flex items-center justify-between p-4">
      <div>
        <div className="font-medium">{formatMoney(a.requestedLimit)}</div>
        <div className="text-xs text-ink-subtle">{new Date(a.createdAt).toLocaleDateString('ru-RU')}{a.purpose ? ` · ${a.purpose}` : ''}</div>
        {a.decisionNote && <div className="text-xs text-ink-subtle">{a.decisionNote}</div>}
      </div>
      <div className="text-right">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}><s.Icon size={12} /> {s.label}</span>
        {a.approvedLimit != null && <div className="mt-1 text-sm font-semibold text-teal-700">{formatMoney(a.approvedLimit)}</div>}
      </div>
    </div>
  );
}

function AdminFinancing() {
  const [apps, setApps] = useState<CreditApp[]>([]);
  const load = () => api.get('/financing').then((r) => setApps(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const decide = async (id: string, approve: boolean) => {
    try {
      await api.post(`/financing/${id}/decide`, { approve });
      toast.success(approve ? 'Одобрено' : 'Отклонено');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Ошибка');
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6">
        <span className="eyebrow">Админ · Финансирование</span>
        <h1 className="mt-3 section-title">Заявки на кредитный лимит</h1>
      </div>
      {apps.length === 0 ? (
        <div className="py-16 text-center text-ink-subtle">Заявок нет</div>
      ) : (
        <div className="space-y-2">
          {apps.map((a) => {
            const s = STATUS[a.status];
            return (
              <div key={a.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-[180px]">
                  <div className="font-medium">{a.buyer?.company ?? a.buyer?.fullName}</div>
                  <div className="text-xs text-ink-subtle">{a.buyer?.phone} · {a.buyer?.email}</div>
                  {a.purpose && <div className="text-xs text-ink-subtle">Цель: {a.purpose}</div>}
                </div>
                <div className="text-sm">Запрос: <b>{formatMoney(a.requestedLimit)}</b></div>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}><s.Icon size={12} /> {s.label}</span>
                {a.status === 'PENDING' ? (
                  <div className="flex gap-2">
                    <button className="btn-primary !px-3 !py-1.5 text-xs" onClick={() => decide(a.id, true)}>Одобрить</button>
                    <button className="btn-outline !px-3 !py-1.5 text-xs" onClick={() => decide(a.id, false)}>Отклонить</button>
                  </div>
                ) : (
                  a.approvedLimit != null && <div className="text-sm font-semibold text-teal-700">{formatMoney(a.approvedLimit)}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
