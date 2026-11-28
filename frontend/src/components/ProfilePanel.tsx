'use client';

import { useEffect, useRef, useState } from 'react';
import { Save, User, KeyRound, FileText, Upload, Mail, Trash2, Store } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { openSellerDocument } from '@/lib/seller-docs';
import { useAuth } from '@/lib/store';
import { useI18n } from '@/lib/i18n';

// Профиль пользователя: имя/телефон/компания, просмотр e-mail, смена пароля.
// Для продавца дополнительно — загрузка лицензий (sellerDocument).
export function ProfilePanel({ role }: { role: 'BUYER' | 'SELLER' }) {
  const { tt } = useI18n();
  const { refresh, user, setSession, logout } = useAuth();
  const router = useRouter();
  const [delPwd, setDelPwd] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [me, setMe] = useState<any>(null);
  const [form, setForm] = useState({ fullName: '', phone: '', company: '', inn: '' });
  const [saving, setSaving] = useState(false);
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [changingPwd, setChangingPwd] = useState(false);
  const [docs, setDocs] = useState<any[]>([]);
  // Витрина поставщика: то, что покупатель видит на /suppliers/:id.
  const [shop, setShop] = useState({ description: '', descriptionUz: '', logoUrl: '' });
  const [savingShop, setSavingShop] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const licenseRef = useRef<HTMLInputElement>(null);

  const load = () => {
    api.get('/auth/me').then((r) => {
      setMe(r.data);
      setForm({ fullName: r.data.fullName ?? '', phone: r.data.phone ?? '', company: r.data.company ?? '', inn: r.data.inn ?? '' });
      if (role === 'SELLER') {
        api.get(`/sellers/${r.data.id}`).then((s) => setShop({ description: s.data.description ?? '', descriptionUz: s.data.descriptionUz ?? '', logoUrl: s.data.logoUrl ?? '' })).catch(() => {});
      }
    }).catch(() => {});
    if (role === 'SELLER') api.get('/sellers/me/documents').then((r) => setDocs(r.data)).catch(() => {});
  };
  useEffect(load, [role]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await api.patch('/users/me', form);
      toast.success(tt('Профиль сохранён', 'Profil saqlandi'));
      refresh();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? tt('Ошибка', 'Xatolik'));
    } finally { setSaving(false); }
  };

  const saveShop = async () => {
    setSavingShop(true);
    try {
      await api.patch('/users/me', shop);
      toast.success(tt('Витрина сохранена', 'Vitrina saqlandi'));
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? tt('Ошибка', 'Xatolik'));
    } finally { setSavingShop(false); }
  };

  const uploadLogo = async (file?: File) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const { data } = await api.post('/uploads?kind=image', fd);
      setShop((s) => ({ ...s, logoUrl: data.url }));
      toast.success(tt('Логотип загружен — нажмите «Сохранить витрину»', 'Logotip yuklandi — «Vitrinani saqlash» tugmasini bosing'));
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? tt('Не удалось загрузить', 'Yuklab boʻlmadi'));
    }
  };

  const changePassword = async () => {
    if (pwd.newPassword !== pwd.confirm) { toast.error(tt('Пароли не совпадают', 'Parollar mos emas')); return; }
    if (pwd.newPassword.length < 8) { toast.error(tt('Пароль слишком короткий (мин. 8)', 'Parol juda qisqa (min. 8)')); return; }
    setChangingPwd(true);
    try {
      await api.patch('/users/me/password', { currentPassword: pwd.currentPassword, newPassword: pwd.newPassword });
      // Смена пароля отзывает все прежние входы, включая этот, — входим заново,
      // чтобы пользователя не выбросило на следующем же запросе.
      if (user?.email) {
        const { data } = await api.post('/auth/login', { email: user.email, password: pwd.newPassword });
        setSession(data.token, data.user);
      }
      toast.success(tt('Пароль изменён. На других устройствах нужно войти заново.', 'Parol oʻzgartirildi. Boshqa qurilmalarda qayta kirish kerak.'));
      setPwd({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? tt('Ошибка', 'Xatolik'));
    } finally { setChangingPwd(false); }
  };

  // Удаление аккаунта: персональные данные стираются, заказы и платежи
  // остаются обезличенными — их хранение требует закон.
  const deleteAccount = async () => {
    if (!window.confirm(tt(
      'Удалить аккаунт? Имя, телефон, почта и реквизиты будут стёрты, войти в аккаунт будет нельзя. Это необратимо.',
      'Hisobni oʻchirasizmi? Ism, telefon, pochta va rekvizitlar oʻchiriladi, hisobga kirib boʻlmaydi. Buni qaytarib boʻlmaydi.',
    ))) return;
    setDeleting(true);
    try {
      await api.post('/users/me/delete', { password: delPwd });
      logout();
      toast.success(tt('Аккаунт удалён', 'Hisob oʻchirildi'));
      router.push('/');
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? tt('Ошибка', 'Xatolik'));
    } finally {
      setDeleting(false);
    }
  };

  const uploadLicense = async (file: File) => {
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/uploads?kind=license', fd);
      await api.post('/sellers/me/documents', { title: file.name, fileUrl: data.url });
      toast.success(tt('Лицензия загружена', 'Litsenziya yuklandi'));
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? tt('Ошибка загрузки', 'Yuklash xatosi'));
    }
  };

  if (!me) return <div className="mt-6 py-10 text-center text-ink-subtle">{tt('Загрузка…', 'Yuklanmoqda…')}</div>;

  return (
    <div className="mt-6 max-w-xl space-y-8">
      {/* Данные профиля */}
      <div>
        <div className="mb-3 flex items-center gap-2 font-medium"><User size={16} className="text-teal-700" /> {tt('Данные профиля', 'Profil maʼlumotlari')}</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-ink-muted">{role === 'SELLER' ? tt('Контактное лицо', 'Aloqa shaxsi') : tt('Имя', 'Ism')}</label>
            <input className="input" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-ink-muted">{tt('Компания', 'Kompaniya')}</label>
            <input className="input" value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-muted">{tt('Телефон', 'Telefon')}</label>
            <input className="input" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-muted">{tt('ИНН (СТИР)', 'STIR')}</label>
            <input className="input" value={form.inn} onChange={(e) => setForm((f) => ({ ...f, inn: e.target.value }))} />
          </div>
        </div>
        {/* E-mail — только просмотр: это логин, менять его отдельно и с подтверждением */}
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-ink-muted dark:bg-slate-900">
          <Mail size={15} /> {me.email}
          <span className="ml-auto text-xs text-ink-subtle">{tt('логин — не меняется здесь', 'login — bu yerda oʻzgarmaydi')}</span>
        </div>
        <button className="btn-primary mt-4" disabled={saving} onClick={saveProfile}>
          <Save size={16} /> {saving ? '…' : tt('Сохранить', 'Saqlash')}
        </button>
      </div>

      {/* Витрина поставщика — только продавец */}
      {role === 'SELLER' && (
        <div className="border-t border-slate-100 pt-6 dark:border-slate-800">
          <div className="mb-1 flex items-center gap-2 font-medium"><Store size={16} className="text-teal-700" /> {tt('Витрина поставщика', 'Yetkazib beruvchi vitrinasi')}</div>
          <p className="mb-3 text-xs text-ink-subtle">
            {tt('Это видят покупатели на странице компании.', 'Buni xaridorlar kompaniya sahifasida koʻradi.')}{' '}
            {me?.id && <a href={`/suppliers/${me.id}`} target="_blank" rel="noreferrer" className="text-teal-700 hover:underline">{tt('Открыть страницу', 'Sahifani ochish')}</a>}
          </p>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {shop.logoUrl ? <img src={shop.logoUrl} alt="" className="h-full w-full object-contain" /> : <Store size={22} className="text-ink-subtle" />}
            </div>
            <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadLogo(e.target.files?.[0])} />
            <button className="btn-ghost text-sm" onClick={() => logoRef.current?.click()}>{shop.logoUrl ? tt('Заменить логотип', 'Logotipni almashtirish') : tt('Загрузить логотип', 'Logotip yuklash')}</button>
          </div>
          <label className="mb-1 mt-4 block text-xs text-ink-muted">{tt('О компании (русский)', 'Kompaniya haqida (rus tilida)')}</label>
          <textarea className="input !h-auto py-2" rows={5} value={shop.description} onChange={(e) => setShop((s) => ({ ...s, description: e.target.value }))}
            placeholder={tt('Что поставляете, какие бренды, склад, доставка, контакты', 'Nimalar yetkazasiz, brendlar, ombor, yetkazib berish, kontaktlar')} />
          <label className="mb-1 mt-3 block text-xs text-ink-muted">{tt('О компании (узбекский, латиница)', 'Kompaniya haqida (oʻzbek tilida, lotin)')}</label>
          <textarea className="input !h-auto py-2" rows={5} value={shop.descriptionUz} onChange={(e) => setShop((s) => ({ ...s, descriptionUz: e.target.value }))} />
          <button className="btn-primary mt-4" disabled={savingShop} onClick={saveShop}>
            <Save size={16} /> {savingShop ? '…' : tt('Сохранить витрину', 'Vitrinani saqlash')}
          </button>
        </div>
      )}

      {/* Лицензии — только продавец */}
      {role === 'SELLER' && (
        <div className="border-t border-slate-100 pt-6 dark:border-slate-800">
          <div className="mb-1 flex items-center gap-2 font-medium"><FileText size={16} className="text-teal-700" /> {tt('Лицензии и документы', 'Litsenziyalar va hujjatlar')}</div>
          <p className="mb-3 text-xs text-ink-subtle">{tt('Лицензия на ветпрепараты, сертификаты — для проверки платформой.', 'Veterinariya preparatlariga litsenziya, sertifikatlar — platforma tekshiruvi uchun.')}</p>
          {docs.length > 0 && (
            <div className="mb-3 space-y-1.5">
              {docs.map((d) => (
                <button key={d.id} type="button" onClick={() => openSellerDocument(d)} className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:border-teal-200 dark:border-slate-800">
                  <FileText size={14} className="text-teal-700" /> {d.title}
                  <span className={`ml-auto text-xs ${d.isApproved ? 'text-teal-700' : 'text-amber-600'}`}>
                    {d.isApproved ? tt('Проверен', 'Tasdiqlangan') : tt('На проверке', 'Tekshiruvda')}
                  </span>
                </button>
              ))}
            </div>
          )}
          <button className="btn-secondary" onClick={() => licenseRef.current?.click()}><Upload size={15} /> {tt('Загрузить документ (PDF или фото)', 'Hujjat yuklash (PDF yoki foto)')}</button>
          <input ref={licenseRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" hidden onChange={(e) => e.target.files?.[0] && uploadLicense(e.target.files[0])} />
        </div>
      )}

      {/* Смена пароля */}
      <div className="border-t border-slate-100 pt-6 dark:border-slate-800">
        <div className="mb-3 flex items-center gap-2 font-medium"><KeyRound size={16} className="text-teal-700" /> {tt('Смена пароля', 'Parolni oʻzgartirish')}</div>
        <div className="grid gap-3 sm:max-w-sm">
          <input className="input" type="password" placeholder={tt('Текущий пароль', 'Joriy parol')} value={pwd.currentPassword} onChange={(e) => setPwd((p) => ({ ...p, currentPassword: e.target.value }))} />
          <input className="input" type="password" placeholder={tt('Новый пароль', 'Yangi parol')} value={pwd.newPassword} onChange={(e) => setPwd((p) => ({ ...p, newPassword: e.target.value }))} />
          <input className="input" type="password" placeholder={tt('Повторите новый пароль', 'Yangi parolni takrorlang')} value={pwd.confirm} onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))} />
        </div>
        <button className="btn-secondary mt-3" disabled={changingPwd || !pwd.currentPassword || !pwd.newPassword} onClick={changePassword}>
          <KeyRound size={15} /> {changingPwd ? '…' : tt('Изменить пароль', 'Parolni oʻzgartirish')}
        </button>
      </div>

      {/* Удаление аккаунта */}
      {user?.role !== 'ADMIN' && (
        <div className="border-t border-slate-100 pt-6 dark:border-slate-800">
          <div className="mb-1 flex items-center gap-2 font-medium text-red-700"><Trash2 size={16} /> {tt('Удаление аккаунта', 'Hisobni oʻchirish')}</div>
          <p className="mb-3 max-w-xl text-sm text-ink-muted">
            {tt(
              'Имя, телефон, почта, реквизиты и избранное будут стёрты, вход закроется. Заказы и платежи останутся в обезличенном виде — их хранение требует закон. Если есть незавершённые заказы или задолженность, сначала завершите их.',
              'Ism, telefon, pochta, rekvizitlar va saralanganlar oʻchiriladi, kirish yopiladi. Buyurtmalar va toʻlovlar shaxssizlashtirilgan holda qoladi — ularni saqlashni qonun talab qiladi. Tugallanmagan buyurtmalar yoki qarz boʻlsa, avval ularni yakunlang.',
            )}
          </p>
          <div className="flex flex-wrap gap-2 sm:max-w-md">
            <input className="input flex-1" type="password" autoComplete="current-password" placeholder={tt('Пароль для подтверждения', 'Tasdiqlash uchun parol')} value={delPwd} onChange={(e) => setDelPwd(e.target.value)} />
            <button className="btn-secondary !border-red-200 !text-red-700" disabled={deleting || !delPwd} onClick={deleteAccount}>
              <Trash2 size={15} /> {deleting ? '…' : tt('Удалить аккаунт', 'Hisobni oʻchirish')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
