'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/store';

export default function LoginPage() {
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
      const dest = data.user.role === 'ADMIN' ? '/admin' : data.user.role === 'SELLER' ? '/seller' : '/dashboard';
      router.push(dest);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Неверные данные');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="card p-8">
        <h1 className="mb-6 font-heading text-2xl font-extrabold">Вход</h1>
        <form onSubmit={submit} className="space-y-4">
          <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="input" type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button className="btn-primary w-full" disabled={loading}>{loading ? '…' : 'Войти'}</button>
        </form>
        <p className="mt-4 text-center text-sm text-ink-muted">
          Нет аккаунта? <Link href="/register" className="font-medium text-teal-700 hover:underline">Регистрация</Link>
        </p>
        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-ink-subtle">
          Демо: admin@vetglobal.com / admin123 · seller@vetglobal.com / seller123 · buyer@vetglobal.com / buyer123
        </p>
      </div>
    </div>
  );
}
