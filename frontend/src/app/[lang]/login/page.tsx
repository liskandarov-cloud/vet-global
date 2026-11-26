'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { safeNext } from '@/lib/next-path';
import { ShieldCheck, Send } from 'lucide-react';
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
  const [tgCode, setTgCode] = useState<string | null>(null);

  const finish = (data: { token: string; user: { role: string } }) => {
    setSession(data.token, data.user as any);
    useFavorites.getState().load();
    const roleDest = data.user.role === 'ADMIN' ? '/admin' : data.user.role === 'SELLER' ? '/seller' : '/dashboard';
    // Покупателя возвращаем туда, откуда он пришёл входить (например, в корзину).
    router.push((data.user.role === 'BUYER' && safeNext(window.location.search)) || roleDest);
  };

  // Вход через Telegram (для аккаунтов с подключённым ботом): бот показывает
  // тот же код и спрашивает «это вы?», сайт ждёт подтверждения до 5 минут.
  // Окно открывается сразу — после ожидания ответа браузер счёл бы его всплывающим.
  const telegramLogin = async () => {
    const w = window.open('', '_blank');
    try {
      const { data } = await api.post('/auth/telegram');
      if (w) w.location.href = data.url; else window.open(data.url, '_blank');
      setTgCode(data.code);
      for (let i = 0; i < 150; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const r = await api.post('/auth/telegram/poll', { token: data.token });
        if (r.data.token) return finish(r.data);
      }
      toast.error(tt('Время вышло — попробуйте ещё раз', 'Vaqt tugadi — yana urinib koʻring'));
    } catch (e: any) {
      w?.close();
      toast.error(e?.response?.data?.message ?? tt('Не удалось войти через Telegram', 'Telegram orqali kirib boʻlmadi'));
    } finally {
      setTgCode(null);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      finish(data);
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
          <h1 className="font-heading text-2xl font-extrabold">{tt('Вход в', 'Kirish —')} <span className="text-gradient">VetHub</span></h1>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <input className="input" type="email" autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="input" type="password" autoComplete="current-password" placeholder={tt('Пароль', 'Parol')} value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button className="btn-primary w-full" disabled={loading}>{loading ? '…' : tt('Войти', 'Kirish')}</button>
        </form>
        <div className="my-4 flex items-center gap-3 text-xs text-ink-subtle"><span className="h-px flex-1 bg-slate-200" />{tt('или', 'yoki')}<span className="h-px flex-1 bg-slate-200" /></div>
        {tgCode ? (
          <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-center text-sm" role="status">
            {tt('Подтвердите вход в Telegram. Код:', 'Telegramda kirishni tasdiqlang. Kod:')} <b className="text-lg tracking-widest">{tgCode}</b>
          </div>
        ) : (
          <button type="button" className="btn-secondary w-full" onClick={telegramLogin}>
            <Send size={16} className="text-sky-600" /> {tt('Войти через Telegram', 'Telegram orqali kirish')}
          </button>
        )}
        <p className="mt-2 text-center text-xs text-ink-subtle">{tt('Для аккаунтов с подключённым Telegram', 'Telegram ulangan akkauntlar uchun')}</p>
        <p className="mt-3 text-right text-sm">
          <Link href="/forgot-password" className="text-teal-700 hover:underline">{tt('Забыли пароль?', 'Parolni unutdingizmi?')}</Link>
        </p>
        <p className="mt-4 text-center text-sm text-ink-muted">
          {tt('Нет аккаунта?', 'Hisob yoʻqmi?')} <Link href="/register" className="font-medium text-teal-700 hover:underline">{tt('Регистрация', 'Roʻyxatdan oʻtish')}</Link>
        </p>
      </div>
      </div>
    </div>
  );
}
