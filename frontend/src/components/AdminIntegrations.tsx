'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

interface Integration {
  key: string;
  title: string;
  state: 'live' | 'demo' | 'off';
  missing: string[];
  how: string;
}

const STATE: Record<Integration['state'], { ru: string; uz: string; cls: string }> = {
  live: { ru: 'Работает', uz: 'Ishlaydi', cls: 'bg-teal-100 text-teal-700' },
  demo: { ru: 'Демо', uz: 'Demo', cls: 'bg-amber-100 text-amber-700' },
  off: { ru: 'Не подключено', uz: 'Ulanmagan', cls: 'bg-slate-100 text-ink-muted' },
};

// Ключи вставляются в Render → Environment; после сохранения сервис
// перезапускается и статус здесь меняется сам.
export function AdminIntegrations() {
  const { tt } = useI18n();
  const [list, setList] = useState<Integration[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .get('/maintenance/integrations')
      .then(({ data }) => setList(data))
      .catch(() => setError(true));
  }, []);

  if (error) return <p className="mt-6 text-sm text-red-600">{tt('Не удалось загрузить статус интеграций', 'Integratsiyalar holatini yuklab boʻlmadi')}</p>;
  if (!list) return <p className="mt-6 text-sm text-ink-muted">{tt('Загрузка…', 'Yuklanmoqda…')}</p>;

  return (
    <div className="mt-6 space-y-3">
      <p className="text-sm text-ink-muted">
        {tt(
          'Ключи вставляются в Render → vethub-api → Environment. Значения здесь не показываются — только каких не хватает.',
          'Kalitlar Render → vethub-api → Environment boʻlimiga kiritiladi. Qiymatlar bu yerda koʻrsatilmaydi — faqat qaysilari yetishmasligi.',
        )}
      </p>
      {list.map((it) => (
        <div key={it.key} className="card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-semibold">{it.title}</div>
            <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${STATE[it.state].cls}`}>{tt(STATE[it.state].ru, STATE[it.state].uz)}</span>
          </div>
          {it.state !== 'live' && it.missing.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {it.missing.map((k) => (
                <code key={k} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{k}</code>
              ))}
            </div>
          )}
          {it.state !== 'live' && <p className="mt-2 text-sm text-ink-muted">{it.how}</p>}
        </div>
      ))}
    </div>
  );
}
