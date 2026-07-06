'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/store';

function urlB64ToUint8(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function PushToggle() {
  const user = useAuth((s) => s.user);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const ok = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
    setSupported(ok);
    if (!ok || !user) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((s) => setSubscribed(!!s))
      .catch(() => {});
  }, [user]);

  if (!user || !supported) return null;

  const toggle = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        await api.post('/push/unsubscribe', { endpoint: existing.endpoint }).catch(() => {});
        await existing.unsubscribe();
        setSubscribed(false);
        toast.success('Уведомления выключены');
      } else {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') { toast.error('Разрешение на уведомления не выдано'); return; }
        const { data } = await api.get('/push/vapid-public-key');
        if (!data?.publicKey) { toast.error('Push сейчас недоступен'); return; }
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlB64ToUint8(data.publicKey) as BufferSource,
        });
        await api.post('/push/subscribe', sub.toJSON());
        setSubscribed(true);
        toast.success('Уведомления включены');
      }
    } catch {
      toast.error('Не удалось изменить настройку уведомлений');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-label={subscribed ? 'Уведомления включены' : 'Включить уведомления'}
      title={subscribed ? 'Push-уведомления включены' : 'Включить push-уведомления'}
      className={`btn-ghost !px-2 ${subscribed ? 'text-teal-700' : 'text-slate-500'}`}
    >
      {subscribed ? <Bell size={18} /> : <BellOff size={18} />}
    </button>
  );
}
