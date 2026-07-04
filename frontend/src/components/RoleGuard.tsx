'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/store';

export function RoleGuard({ role, children }: { role: 'BUYER' | 'SELLER' | 'ADMIN'; children: ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && (!user || user.role !== role)) {
      router.replace('/login');
    }
  }, [ready, user, role, router]);

  if (!ready || !user || user.role !== role) {
    return <div className="py-24 text-center text-ink-subtle">Загрузка…</div>;
  }
  return <>{children}</>;
}

export function StatCard({
  label,
  value,
  accent,
  icon: Icon,
}: {
  label: string;
  value: string;
  accent?: boolean;
  icon?: React.ComponentType<{ size?: number }>;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
        accent ? 'border-teal-100 bg-gradient-to-br from-teal-50 to-emerald-50' : 'border-slate-100 bg-white'
      }`}
    >
      {Icon && (
        <span
          className={`absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-lg ${
            accent ? 'bg-white/70 text-teal-700' : 'bg-teal-50 text-teal-700'
          }`}
        >
          <Icon size={18} />
        </span>
      )}
      <div className="text-sm text-ink-subtle">{label}</div>
      <div className="mt-1 font-heading text-2xl font-bold">{value}</div>
    </div>
  );
}

export const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Новый',
  CONFIRMED: 'Подтверждён',
  PROCESSING: 'В обработке',
  SHIPPED: 'Отгружен',
  DELIVERED: 'Доставлен',
  CANCELLED: 'Отменён',
};
