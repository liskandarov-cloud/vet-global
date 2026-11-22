'use client';

import { useState } from 'react';
import Link from 'next/link';
import { KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

export default function ForgotPasswordPage() {
  const { tt } = useI18n();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (e: any) {
      const status = e?.response?.status;
      toast.error(
        status === 429
          ? tt('Слишком много запросов. Попробуйте через 15 минут.', 'Juda koʻp soʻrov. 15 daqiqadan soʻng urinib koʻring.')
          : tt('Не удалось отправить запрос. Проверьте адрес.', 'Soʻrovni yuborib boʻlmadi. Manzilni tekshiring.'),
      );
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
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-r from-teal-600 to-emerald-500 text-white"><KeyRound size={18} /></span>
            <h1 className="font-heading text-2xl font-extrabold">{tt('Восстановление пароля', 'Parolni tiklash')}</h1>
          </div>
          {sent ? (
            <p className="text-sm leading-relaxed text-ink" role="status">
              {tt(
                'Если этот адрес зарегистрирован, мы отправили ссылку для смены пароля на почту, а если подключён Telegram — и в @vethubuz_bot. Ссылка действует 1 час. Проверьте также папку «Спам».',
                'Agar bu manzil roʻyxatdan oʻtgan boʻlsa, parolni almashtirish havolasini pochtaga, Telegram ulangan boʻlsa — @vethubuz_bot ga ham yubordik. Havola 1 soat amal qiladi. «Spam» jildini ham tekshiring.',
              )}
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <p className="text-sm text-ink-muted">
                {tt('Укажите почту, с которой вы регистрировались.', 'Roʻyxatdan oʻtgan elektron pochtangizni kiriting.')}
              </p>
              <input className="input" type="email" placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <button className="btn-primary w-full" disabled={loading}>{loading ? '…' : tt('Отправить ссылку', 'Havolani yuborish')}</button>
            </form>
          )}
          <p className="mt-4 text-center text-sm text-ink-muted">
            <Link href="/login" className="font-medium text-teal-700 hover:underline">{tt('Вернуться ко входу', 'Kirishga qaytish')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
