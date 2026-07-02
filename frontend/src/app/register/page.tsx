'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/store';

export default function RegisterPage() {
  const router = useRouter();
  const setSession = useAuth((s) => s.setSession);
  const [form, setForm] = useState({
    email: '', password: '', fullName: '', phone: '', company: '', inn: '', role: 'BUYER',
  });
  const [loading, setLoading] = useState(false);

  const upd = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      setSession(data.token, data.user);
      const dest = data.user.role === 'SELLER' ? '/seller' : '/dashboard';
      toast.success('Аккаунт создан');
      router.push(dest);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="card p-8">
        <h1 className="mb-6 font-heading text-2xl font-extrabold">Регистрация</h1>
        <form onSubmit={submit} className="space-y-4">
          <div className="flex overflow-hidden rounded-lg border border-slate-200">
            {[
              { v: 'BUYER', l: 'Покупатель' },
              { v: 'SELLER', l: 'Поставщик' },
            ].map((r) => (
              <button
                key={r.v}
                type="button"
                onClick={() => setForm((f) => ({ ...f, role: r.v }))}
                className={`flex-1 py-2 text-sm font-medium ${form.role === r.v ? 'bg-teal-600 text-white' : 'text-slate-600'}`}
              >
                {r.l}
              </button>
            ))}
          </div>
          <input className="input" placeholder="ФИО" value={form.fullName} onChange={upd('fullName')} required />
          <input className="input" type="email" placeholder="Email" value={form.email} onChange={upd('email')} required />
          <input className="input" placeholder="Телефон" value={form.phone} onChange={upd('phone')} required />
          <input className="input" placeholder="Компания" value={form.company} onChange={upd('company')} />
          <input className="input" placeholder="ИНН" value={form.inn} onChange={upd('inn')} />
          <input className="input" type="password" placeholder="Пароль (мин. 6)" value={form.password} onChange={upd('password')} required minLength={6} />
          <button className="btn-primary w-full" disabled={loading}>{loading ? '…' : 'Создать аккаунт'}</button>
        </form>
        <p className="mt-4 text-center text-sm text-ink-muted">
          Уже есть аккаунт? <Link href="/login" className="font-medium text-teal-700 hover:underline">Войти</Link>
        </p>
      </div>
    </div>
  );
}
