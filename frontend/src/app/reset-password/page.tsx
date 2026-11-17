'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

function ResetForm() {
  const { tt } = useI18n();
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== repeat) {
      toast.error(tt('Пароли не совпадают', 'Parollar mos kelmadi'));
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      toast.success(tt('Пароль изменён. Войдите с новым паролем.', 'Parol oʻzgartirildi. Yangi parol bilan kiring.'));
      router.push('/login');
    } catch {
      toast.error(tt('Ссылка недействительна или устарела. Запросите новую.', 'Havola yaroqsiz yoki eskirgan. Yangisini soʻrang.'));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <p className="text-sm text-ink">
        {tt('В ссылке нет кода восстановления.', 'Havolada tiklash kodi yoʻq.')}{' '}
        <Link href="/forgot-password" className="font-medium text-teal-700 hover:underline">{tt('Запросить новую ссылку', 'Yangi havola soʻrash')}</Link>
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <input className="input" type="password" autoComplete="new-password" placeholder={tt('Новый пароль (мин. 8)', 'Yangi parol (min. 8)')} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
      <input className="input" type="password" autoComplete="new-password" placeholder={tt('Повторите пароль', 'Parolni takrorlang')} value={repeat} onChange={(e) => setRepeat(e.target.value)} required minLength={8} />
      <button className="btn-primary w-full" disabled={loading}>{loading ? '…' : tt('Сохранить пароль', 'Parolni saqlash')}</button>
    </form>
  );
}

export default function ResetPasswordPage() {
  const { tt } = useI18n();
  return (
    <div className="relative min-h-[80vh] bg-grid">
      <div className="absolute inset-0 bg-glow" />
      <div className="relative mx-auto max-w-md px-4 py-16">
        <div className="card animate-up p-8 shadow-glow">
          <div className="mb-6 flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-r from-teal-600 to-emerald-500 text-white"><KeyRound size={18} /></span>
            <h1 className="font-heading text-2xl font-extrabold">{tt('Новый пароль', 'Yangi parol')}</h1>
          </div>
          {/* useSearchParams требует Suspense, иначе страница не собирается статически. */}
          <Suspense fallback={null}>
            <ResetForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
