'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sprout } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth, useFavorites } from '@/lib/store';
import { useI18n } from '@/lib/i18n';

export default function RegisterPage() {
  const { tt } = useI18n();
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
      useFavorites.getState().load();
      const dest = data.user.role === 'SELLER' ? '/seller' : '/dashboard';
      toast.success(tt('Аккаунт создан', 'Hisob yaratildi'));
      router.push(dest);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? tt('Ошибка регистрации', 'Roʻyxatdan oʻtishda xato'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[80vh] bg-grid">
      <div className="absolute inset-0 bg-glow" />
      <div className="relative mx-auto max-w-md px-4 py-16">
      <div className="card animate-up p-8 shadow-glow">
        <div className="mb-6 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-r from-teal-600 to-emerald-500 text-white"><Sprout size={18} /></span>
          <h1 className="font-heading text-2xl font-extrabold">{tt('Регистрация в', 'Roʻyxatdan oʻtish —')} <span className="text-gradient">VetGlobal</span></h1>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="flex overflow-hidden rounded-lg border border-slate-200">
            {[
              { v: 'BUYER', l: tt('Покупатель', 'Xaridor') },
              { v: 'SELLER', l: tt('Поставщик', 'Yetkazib beruvchi') },
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
          <input className="input" placeholder={tt('ФИО', 'FISH')} value={form.fullName} onChange={upd('fullName')} required />
          <input className="input" type="email" placeholder="Email" value={form.email} onChange={upd('email')} required />
          <input className="input" placeholder={tt('Телефон', 'Telefon')} value={form.phone} onChange={upd('phone')} required />
          <input className="input" placeholder={tt('Компания', 'Kompaniya')} value={form.company} onChange={upd('company')} />
          <input className="input" placeholder={tt('ИНН', 'INN')} value={form.inn} onChange={upd('inn')} />
          <input className="input" type="password" placeholder={tt('Пароль (мин. 6)', 'Parol (min. 6)')} value={form.password} onChange={upd('password')} required minLength={6} />
          <button className="btn-primary w-full" disabled={loading}>{loading ? '…' : tt('Создать аккаунт', 'Hisob yaratish')}</button>
        </form>
        <p className="mt-4 text-center text-sm text-ink-muted">
          {tt('Уже есть аккаунт?', 'Hisobingiz bormi?')} <Link href="/login" className="font-medium text-teal-700 hover:underline">{tt('Войти', 'Kirish')}</Link>
        </p>
      </div>
      </div>
    </div>
  );
}
