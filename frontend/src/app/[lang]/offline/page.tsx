'use client';

import { WifiOff } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export default function OfflinePage() {
  const { tt } = useI18n();
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <WifiOff size={44} className="mx-auto text-ink-subtle" />
      <h1 className="mt-4 font-heading text-2xl font-bold">{tt('Нет соединения', 'Aloqa yoʻq')}</h1>
      <p className="mt-2 text-ink-muted">
        {tt('Проверьте интернет и обновите страницу. Часть данных доступна офлайн.', 'Internetni tekshiring va sahifani yangilang. Baʼzi maʼlumotlar oflayn mavjud.')}
      </p>
    </div>
  );
}
