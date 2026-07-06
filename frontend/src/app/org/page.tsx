'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, UserPlus, Trash2, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/store';
import { formatMoney } from '@/lib/utils';

const ROLE_RU: Record<string, string> = { OWNER: 'Владелец', MANAGER: 'Менеджер', PURCHASER: 'Закупщик' };

interface Member { id: string; userId: string; role: string; spendLimit: number; user: { id: string; fullName: string; email: string; phone: string } }
interface OrgData { org: { id: string; name: string; inn?: string } | null; myRole?: string; myLimit?: number; members?: Member[] }

export default function OrgPage() {
  const { user, ready } = useAuth();
  const [data, setData] = useState<OrgData | null>(null);
  const [approvals, setApprovals] = useState<any[]>([]);

  const load = () => {
    api.get('/org/me').then((r) => setData(r.data)).catch(() => {});
    api.get('/org/approvals').then((r) => setApprovals(r.data)).catch(() => setApprovals([]));
  };
  useEffect(() => { if (user) load(); }, [user]);

  if (ready && !user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <Building2 size={40} className="mx-auto text-ink-subtle" />
        <p className="mt-4 text-ink-muted">Войдите, чтобы управлять организацией.</p>
        <Link href="/login" className="btn-primary mt-6 inline-flex">Войти</Link>
      </div>
    );
  }

  if (!data) return <div className="py-24 text-center text-ink-subtle">Загрузка…</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6">
        <span className="eyebrow">B2B-закупки</span>
        <h1 className="mt-3 section-title">Организация</h1>
      </div>
      {data.org ? (
        <OrgManage data={data} approvals={approvals} reload={load} />
      ) : (
        <CreateOrg onCreated={load} />
      )}
    </div>
  );
}

function CreateOrg({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [inn, setInn] = useState('');
  const create = async () => {
    if (!name.trim()) { toast.error('Укажите название'); return; }
    try { await api.post('/org', { name, inn: inn || undefined }); toast.success('Организация создана'); onCreated(); }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Ошибка'); }
  };
  return (
    <div className="card max-w-md space-y-3 p-6">
      <p className="text-sm text-ink-muted">Создайте организацию, чтобы закупать вместе с командой: роли, лимиты трат и согласование заказов.</p>
      <input className="input" placeholder="Название организации" value={name} onChange={(e) => setName(e.target.value)} />
      <input className="input" placeholder="ИНН (необязательно)" value={inn} onChange={(e) => setInn(e.target.value)} />
      <button className="btn-primary w-full" onClick={create}>Создать организацию</button>
    </div>
  );
}

function OrgManage({ data, approvals, reload }: { data: OrgData; approvals: any[]; reload: () => void }) {
  const canManage = data.myRole === 'OWNER' || data.myRole === 'MANAGER';
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('PURCHASER');
  const [limit, setLimit] = useState(5_000_000);

  const invite = async () => {
    if (!email.trim()) { toast.error('Укажите email'); return; }
    try { await api.post('/org/members', { email, role, spendLimit: limit }); toast.success('Участник добавлен'); setEmail(''); reload(); }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Ошибка'); }
  };
  const updateMember = async (id: string, patch: any) => {
    try { await api.patch(`/org/members/${id}`, patch); reload(); }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Ошибка'); }
  };
  const removeMember = async (id: string) => {
    if (!confirm('Удалить участника?')) return;
    try { await api.delete(`/org/members/${id}`); reload(); }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Ошибка'); }
  };
  const decide = async (orderId: string, approve: boolean) => {
    try { await api.post(`/org/approvals/${orderId}`, { approve }); toast.success(approve ? 'Согласовано' : 'Отклонено'); reload(); }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Ошибка'); }
  };

  return (
    <div className="space-y-6">
      <div className="card flex items-center justify-between p-5">
        <div>
          <div className="flex items-center gap-2 font-heading text-xl font-bold"><Building2 size={20} className="text-teal-700" /> {data.org!.name}</div>
          {data.org!.inn && <div className="text-sm text-ink-subtle">ИНН {data.org!.inn}</div>}
        </div>
        <div className="text-right text-sm">
          <div className="text-ink-subtle">Ваша роль</div>
          <div className="font-medium">{ROLE_RU[data.myRole ?? '']}</div>
        </div>
      </div>

      {/* Очередь согласования */}
      {canManage && (
        <div>
          <h2 className="mb-2 font-heading text-lg font-bold">Согласование заказов {approvals.length > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">{approvals.length}</span>}</h2>
          {approvals.length === 0 ? (
            <div className="card p-4 text-sm text-ink-subtle">Нет заказов на согласовании</div>
          ) : (
            <div className="space-y-2">
              {approvals.map((a) => (
                <div key={a.id} className="card flex items-center justify-between p-4">
                  <div>
                    <div className="font-medium">{a.buyerName} · {formatMoney(a.total)}</div>
                    <div className="text-xs text-ink-subtle">{a.itemsCount} позиций · {new Date(a.createdAt).toLocaleDateString('ru-RU')}</div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-primary !px-3 !py-1.5 text-xs" onClick={() => decide(a.id, true)}><CheckCircle2 size={14} /> Согласовать</button>
                    <button className="btn-outline !px-3 !py-1.5 text-xs" onClick={() => decide(a.id, false)}><XCircle size={14} /> Отклонить</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Участники */}
      <div>
        <h2 className="mb-2 font-heading text-lg font-bold">Участники</h2>
        <div className="card divide-y divide-slate-100">
          {data.members?.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <div className="flex items-center gap-1 font-medium">{m.user.fullName}{m.role === 'OWNER' && <ShieldCheck size={14} className="text-teal-700" />}</div>
                <div className="text-xs text-ink-subtle">{m.user.email}</div>
              </div>
              {canManage && m.role !== 'OWNER' ? (
                <div className="flex items-center gap-2">
                  <select className="input !h-9 !w-auto text-sm" value={m.role} onChange={(e) => updateMember(m.id, { role: e.target.value })}>
                    <option value="PURCHASER">Закупщик</option>
                    <option value="MANAGER">Менеджер</option>
                    <option value="OWNER">Владелец</option>
                  </select>
                  {m.role === 'PURCHASER' && (
                    <input className="input !h-9 w-32 text-sm" type="number" defaultValue={m.spendLimit} title="Лимит без согласования"
                      onBlur={(e) => { const v = Number(e.target.value); if (v !== m.spendLimit) updateMember(m.id, { spendLimit: v }); }} />
                  )}
                  <button className="text-ink-subtle hover:text-red-500" onClick={() => removeMember(m.id)}><Trash2 size={16} /></button>
                </div>
              ) : (
                <div className="text-sm text-ink-subtle">
                  {ROLE_RU[m.role]}{m.role === 'PURCHASER' && ` · лимит ${formatMoney(m.spendLimit)}`}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Приглашение */}
      {canManage && (
        <div className="card space-y-3 p-5">
          <div className="flex items-center gap-2 font-medium"><UserPlus size={18} className="text-teal-700" /> Добавить участника</div>
          <p className="text-xs text-ink-subtle">Пользователь должен быть зарегистрирован на платформе.</p>
          <input className="input" placeholder="Email участника" value={email} onChange={(e) => setEmail(e.target.value)} />
          <div className="flex gap-2">
            <select className="input flex-1" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="PURCHASER">Закупщик</option>
              <option value="MANAGER">Менеджер</option>
            </select>
            {role === 'PURCHASER' && (
              <input className="input w-40" type="number" value={limit} onChange={(e) => setLimit(Number(e.target.value))} title="Лимит без согласования" />
            )}
          </div>
          <button className="btn-primary w-full" onClick={invite}>Пригласить</button>
        </div>
      )}
    </div>
  );
}
