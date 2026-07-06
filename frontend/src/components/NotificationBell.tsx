'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, BellRing, BellOff } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/store';

interface Note { id: string; title: string; body: string; url?: string | null; read: boolean; createdAt: string }

function urlB64ToUint8(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'только что';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  return new Date(iso).toLocaleDateString('ru-RU');
}

export function NotificationBell() {
  const user = useAuth((s) => s.user);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Note[]>([]);
  const [unread, setUnread] = useState(0);
  const [pushOn, setPushOn] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const load = () => {
    api.get('/notifications').then((r) => { setItems(r.data.items ?? []); setUnread(r.data.unread ?? 0); }).catch(() => {});
  };

  useEffect(() => {
    if (!user) return;
    load();
    const t = setInterval(load, 60000);
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then((reg) => reg.pushManager.getSubscription()).then((s) => setPushOn(!!s)).catch(() => {});
    }
    return () => clearInterval(t);
  }, [user]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!user) return null;

  const openNote = async (n: Note) => {
    if (!n.read) { api.post(`/notifications/${n.id}/read`).catch(() => {}); setUnread((u) => Math.max(0, u - 1)); setItems((xs) => xs.map((x) => x.id === n.id ? { ...x, read: true } : x)); }
    setOpen(false);
    if (n.url) router.push(n.url);
  };
  const readAll = () => { api.post('/notifications/read-all').catch(() => {}); setUnread(0); setItems((xs) => xs.map((x) => ({ ...x, read: true }))); };

  const togglePush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) { toast.error('Браузер не поддерживает push'); return; }
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        await api.post('/push/unsubscribe', { endpoint: existing.endpoint }).catch(() => {});
        await existing.unsubscribe();
        setPushOn(false);
        toast.success('Push выключен');
      } else {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') { toast.error('Разрешение не выдано'); return; }
        const { data } = await api.get('/push/vapid-public-key');
        if (!data?.publicKey) { toast.error('Push недоступен'); return; }
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8(data.publicKey) as BufferSource });
        await api.post('/push/subscribe', sub.toJSON());
        setPushOn(true);
        toast.success('Push включён');
      }
    } catch { toast.error('Не удалось'); }
  };

  return (
    <div ref={boxRef} className="relative">
      <button onClick={() => { setOpen((o) => !o); if (!open) load(); }} className="btn-ghost relative !px-2" aria-label="Уведомления">
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <span className="font-medium">Уведомления</span>
            {unread > 0 && <button onClick={readAll} className="text-xs text-teal-700 hover:underline">Прочитать все</button>}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-ink-subtle">Уведомлений нет</div>
            ) : (
              items.map((n) => (
                <button key={n.id} onClick={() => openNote(n)} className={`block w-full border-b border-slate-50 px-4 py-2.5 text-left hover:bg-slate-50 ${!n.read ? 'bg-teal-50/40' : ''}`}>
                  <div className="flex items-start gap-2">
                    {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-teal-500" />}
                    <div className={n.read ? 'pl-4' : ''}>
                      <div className="text-sm font-medium">{n.title}</div>
                      <div className="text-xs text-ink-muted">{n.body}</div>
                      <div className="mt-0.5 text-[11px] text-ink-subtle">{timeAgo(n.createdAt)}</div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          <button onClick={togglePush} className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-sm hover:bg-slate-50">
            {pushOn ? <BellRing size={15} className="text-teal-700" /> : <BellOff size={15} className="text-ink-subtle" />}
            {pushOn ? 'Push-уведомления включены' : 'Включить push-уведомления'}
            {pushOn && <Check size={14} className="ml-auto text-teal-700" />}
          </button>
        </div>
      )}
    </div>
  );
}
