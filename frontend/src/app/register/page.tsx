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
  const [accept, setAccept] = useState(false);

  const upd = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', { ...form, acceptTerms: accept });
      setSession(data.token, data.user);
      useFavorites.getState().load();
      const dest = data.user.role === 'SELLER' ? '/seller' : '/dashboard';
      toast.success(tt('Аккаунт создан', 'Hisob yaratildi'));
      router.push(dest);
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error((Array.isArray(msg) ? msg.join('. ') : msg) ?? tt('Ошибка регистрации', 'Roʻyxatdan oʻtishda xato'));
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
          <h1 className="font-heading text-2xl font-extrabold">{tt('Регистрация в', 'Roʻyxatdan oʻtish —')} <span className="text-gradient">VetHub</span></h1>
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
          <input className="input" placeholder={tt('ИНН (СТИР)', 'STIR')} value={form.inn} onChange={upd('inn')} />
          <input className="input" type="password" autoComplete="new-password" placeholder={tt('Пароль (мин. 8)', 'Parol (min. 8)')} value={form.password} onChange={upd('password')} required minLength={8} />
          <label className="flex items-start gap-2 text-sm leading-snug text-ink-muted">
            <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-teal-600" checked={accept} onChange={(e) => setAccept(e.target.checked)} required />
            <span>
              {tt('Принимаю', 'Men')}{' '}
              <Link href="/legal/terms" target="_blank" className="text-teal-700 underline">{tt('Пользовательское соглашение', 'Foydalanuvchi kelishuvi')}</Link>
              {form.role === 'SELLER' && (
                <>
                  {', '}
                  <Link href="/legal/sellers" target="_blank" className="text-teal-700 underline">{tt('Условия для продавцов', 'Sotuvchilar uchun shartlar')}</Link>
                </>
              )}
              {/* Узбекские аффиксы пишутся слитно со ссылкой: «kelishuvini», «siyosatiga». */}
              {tt(' и даю согласие на обработку персональных данных по ', 'ni qabul qilaman va shaxsga doir maʼlumotlarimni ')}
              <Link href="/legal/privacy" target="_blank" className="text-teal-700 underline">{tt('Политике конфиденциальности', 'Maxfiylik siyosati')}</Link>
              {tt('', 'ga muvofiq qayta ishlashga rozilik beraman')}
            </span>
          </label>
          <button className="btn-primary w-full" disabled={loading || !accept}>{loading ? '…' : tt('Создать аккаунт', 'Hisob yaratish')}</button>
        </form>
        <p className="mt-4 text-center text-sm text-ink-muted">
          {tt('Уже есть аккаунт?', 'Hisobingiz bormi?')} <Link href="/login" className="font-medium text-teal-700 hover:underline">{tt('Войти', 'Kirish')}</Link>
        </p>
      </div>
      </div>
    </div>
  );
}
