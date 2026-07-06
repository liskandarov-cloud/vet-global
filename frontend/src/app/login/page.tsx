'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth, useFavorites } from '@/lib/store';
import { useI18n } from '@/lib/i18n';

export default function LoginPage() {
  const { tt } = useI18n();
  const router = useRouter();
  const setSession = useAuth((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setSession(data.token, data.user);
      useFavorites.getState().load();
      const dest = data.user.role === 'ADMIN' ? '/admin' : data.user.role === 'SELLER' ? '/seller' : '/dashboard';
      router.push(dest);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? tt('Неверные данные', 'Notoʻgʻri maʼlumotlar'));
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
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-r from-teal-600 to-emerald-500 text-white"><ShieldCheck size={18} /></span>
          <h1 className="font-heading text-2xl font-extrabold">{tt('Вход в', 'Kirish —')} <span className="text-gradient">VetGlobal</span></h1>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="input" type="password" placeholder={tt('Пароль', 'Parol')} value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button className="btn-primary w-full" disabled={loading}>{loading ? '…' : tt('Войти', 'Kirish')}</button>
        </form>
        <p className="mt-4 text-center text-sm text-ink-muted">
          {tt('Нет аккаунта?', 'Hisob yoʻqmi?')} <Link href="/register" className="font-medium text-teal-700 hover:underline">{tt('Регистрация', 'Roʻyxatdan oʻtish')}</Link>
        </p>
        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-ink-subtle">
          {tt('Демо:', 'Demo:')} admin@vetglobal.com / admin123 · seller@vetglobal.com / seller123 · buyer@vetglobal.com / buyer123
        </p>
      </div>
      </div>
    </div>
  );
}
