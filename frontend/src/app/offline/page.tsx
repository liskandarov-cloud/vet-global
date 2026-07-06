import { WifiOff } from 'lucide-react';

export const metadata = { title: 'Нет соединения — VetGlobal' };

export default function OfflinePage() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <WifiOff size={44} className="mx-auto text-ink-subtle" />
      <h1 className="mt-4 font-heading text-2xl font-bold">Нет соединения</h1>
      <p className="mt-2 text-ink-muted">Проверьте интернет и обновите страницу. Часть данных доступна офлайн.</p>
    </div>
  );
}
