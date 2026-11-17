'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

interface Entry {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
  admin: { email: string; fullName: string };
}

// Подписи действий; неизвестное действие показывается как есть.
const LABELS: Record<string, [string, string]> = {
  'user.verify': ['Проверка продавца', 'Sotuvchini tekshirish'],
  'user.ban': ['Блокировка', 'Bloklash'],
  'user.delete': ['Удаление пользователя', 'Foydalanuvchini oʻchirish'],
  'user.provision': ['Учётная запись (сервис)', 'Hisob (servis)'],
  'offer.verify': ['Проверка сертификата', 'Sertifikatni tekshirish'],
  'financing.decide': ['Решение по кредиту', 'Kredit boʻyicha qaror'],
  'brand.sponsor': ['Спонсорство бренда', 'Brend homiyligi'],
  'review.approve': ['Отзыв одобрен', 'Sharh tasdiqlandi'],
  'review.delete': ['Отзыв удалён', 'Sharh oʻchirildi'],
  'order.delete': ['Заказ удалён', 'Buyurtma oʻchirildi'],
  'maintenance.reset': ['Сброс данных', 'Maʼlumotlarni tiklash'],
  'maintenance.syncBrands': ['Синхронизация брендов', 'Brendlarni sinxronlash'],
  'lead.update': ['Заявка', 'Ariza'],
  'consult.update': ['Консультация', 'Konsultatsiya'],
  'blog.create': ['Статья создана', 'Maqola yaratildi'],
  'blog.update': ['Статья изменена', 'Maqola oʻzgartirildi'],
  'blog.delete': ['Статья удалена', 'Maqola oʻchirildi'],
  'category.create': ['Категория создана', 'Kategoriya yaratildi'],
};

const PAGE = 50;

export function AdminAuditLog() {
  const { tt } = useI18n();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(true);

  // Состояние меняется только в обработчике ответа — как в остальных
  // разделах админки.
  const apply = useCallback((before: string | undefined, page: Entry[]) => {
    setEntries((prev) => (before ? [...prev, ...page] : page));
    setMore(page.length === PAGE);
  }, []);
  const fail = useCallback(() => toast.error(tt('Не удалось загрузить журнал', 'Jurnalni yuklab boʻlmadi')), [tt]);

  useEffect(() => {
    api
      .get('/admin/audit', { params: { limit: PAGE } })
      .then(({ data }) => apply(undefined, data.entries))
      .catch(fail)
      .finally(() => setLoading(false));
  }, [apply, fail]);

  const loadMore = () => {
    const before = entries[entries.length - 1].createdAt;
    setLoading(true);
    api
      .get('/admin/audit', { params: { limit: PAGE, before } })
      .then(({ data }) => apply(before, data.entries))
      .catch(fail)
      .finally(() => setLoading(false));
  };

  return (
    <div className="mt-6">
      <p className="mb-4 text-sm text-ink-muted">
        {tt(
          'Действия администраторов, которые затрагивают других: проверка и блокировка продавцов, решения по кредитам, модерация. Пароли и ключи в параметрах скрыты.',
          'Boshqalarga taʼsir qiluvchi administrator harakatlari: sotuvchilarni tekshirish va bloklash, kredit qarorlari, moderatsiya. Parol va kalitlar yashirilgan.',
        )}
      </p>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-ink-muted">
            <tr>
              <th className="p-3">{tt('Когда', 'Qachon')}</th>
              <th className="p-3">{tt('Администратор', 'Administrator')}</th>
              <th className="p-3">{tt('Действие', 'Harakat')}</th>
              <th className="p-3">{tt('Объект', 'Obyekt')}</th>
              <th className="p-3">{tt('Параметры', 'Parametrlar')}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => {
              const label = LABELS[e.action];
              return (
                <tr key={e.id} className="border-t border-slate-100 align-top">
                  <td className="whitespace-nowrap p-3">{new Date(e.createdAt).toLocaleString('ru-RU')}</td>
                  <td className="p-3">{e.admin.fullName}<div className="text-xs text-ink-subtle">{e.admin.email}</div></td>
                  <td className="p-3">{label ? tt(label[0], label[1]) : e.action}</td>
                  <td className="p-3">{e.targetType}<div className="font-mono text-xs text-ink-subtle">{e.targetId ? e.targetId.slice(0, 8) : '—'}</div></td>
                  <td className="max-w-xs break-words p-3 font-mono text-xs text-ink-muted">
                    {e.details && Object.keys(e.details).length ? JSON.stringify(e.details) : '—'}
                  </td>
                </tr>
              );
            })}
            {!entries.length && !loading && (
              <tr><td colSpan={5} className="p-6 text-center text-ink-muted">{tt('Записей пока нет', 'Hozircha yozuvlar yoʻq')}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {more && entries.length > 0 && (
        <button className="btn-secondary mt-4" disabled={loading} onClick={loadMore}>
          {loading ? '…' : tt('Показать ещё', 'Yana koʻrsatish')}
        </button>
      )}
    </div>
  );
}
