'use client';

import { useEffect, useRef, useState } from 'react';
import { Save, User, KeyRound, FileText, Upload, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/store';
import { useI18n } from '@/lib/i18n';

// Профиль пользователя: имя/телефон/компания, просмотр e-mail, смена пароля.
// Для продавца дополнительно — загрузка лицензий (sellerDocument).
export function ProfilePanel({ role }: { role: 'BUYER' | 'SELLER' }) {
  const { tt } = useI18n();
  const { refresh } = useAuth();
  const [me, setMe] = useState<any>(null);
  const [form, setForm] = useState({ fullName: '', phone: '', company: '', inn: '' });
  const [saving, setSaving] = useState(false);
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [changingPwd, setChangingPwd] = useState(false);
  const [docs, setDocs] = useState<any[]>([]);
  const licenseRef = useRef<HTMLInputElement>(null);

  const load = () => {
    api.get('/auth/me').then((r) => {
      setMe(r.data);
      setForm({ fullName: r.data.fullName ?? '', phone: r.data.phone ?? '', company: r.data.company ?? '', inn: r.data.inn ?? '' });
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

  const changePassword = async () => {
    if (pwd.newPassword !== pwd.confirm) { toast.error(tt('Пароли не совпадают', 'Parollar mos emas')); return; }
    if (pwd.newPassword.length < 6) { toast.error(tt('Пароль слишком короткий (мин. 6)', 'Parol juda qisqa (min. 6)')); return; }
    setChangingPwd(true);
    try {
      await api.patch('/users/me/password', { currentPassword: pwd.currentPassword, newPassword: pwd.newPassword });
      toast.success(tt('Пароль изменён', 'Parol oʻzgartirildi'));
      setPwd({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? tt('Ошибка', 'Xatolik'));
    } finally { setChangingPwd(false); }
  };

  const uploadLicense = async (file: File) => {
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/uploads?kind=certificate', fd);
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

      {/* Лицензии — только продавец */}
      {role === 'SELLER' && (
        <div className="border-t border-slate-100 pt-6 dark:border-slate-800">
          <div className="mb-1 flex items-center gap-2 font-medium"><FileText size={16} className="text-teal-700" /> {tt('Лицензии и документы', 'Litsenziyalar va hujjatlar')}</div>
          <p className="mb-3 text-xs text-ink-subtle">{tt('Лицензия на ветпрепараты, сертификаты — для проверки платформой.', 'Veterinariya preparatlariga litsenziya, sertifikatlar — platforma tekshiruvi uchun.')}</p>
          {docs.length > 0 && (
            <div className="mb-3 space-y-1.5">
              {docs.map((d) => (
                <a key={d.id} href={d.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:border-teal-200 dark:border-slate-800">
                  <FileText size={14} className="text-teal-700" /> {d.title}
                </a>
              ))}
            </div>
          )}
          <button className="btn-secondary" onClick={() => licenseRef.current?.click()}><Upload size={15} /> {tt('Загрузить документ (PDF)', 'Hujjat yuklash (PDF)')}</button>
          <input ref={licenseRef} type="file" accept="application/pdf" hidden onChange={(e) => e.target.files?.[0] && uploadLicense(e.target.files[0])} />
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
    </div>
  );
}
