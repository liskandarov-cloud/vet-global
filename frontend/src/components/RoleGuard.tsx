'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/store';
import { useI18n } from '@/lib/i18n';

const ROLE_NAMES: Record<string, [string, string]> = {
  BUYER: ['покупателя', 'xaridor'],
  SELLER: ['продавца', 'sotuvchi'],
  ADMIN: ['администратора', 'administrator'],
};

// Кабинет, соответствующий роли пользователя.
export const cabinetOf = (role?: string) =>
  role === 'ADMIN' ? '/admin' : role === 'SELLER' ? '/seller' : '/dashboard';

export function RoleGuard({ role, children }: { role: 'BUYER' | 'SELLER' | 'ADMIN'; children: ReactNode }) {
  const { user, ready } = useAuth();
  const { tt } = useI18n();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== role) {
      // На /login не отправляем: пользователь уже вошёл, повторный вход не поможет.
      // Уводим в его собственный кабинет и объясняем причину.
      const [ru, uz] = ROLE_NAMES[role] ?? ['другой роли', 'boshqa rol'];
      toast.error(tt(`Раздел доступен только в кабинете ${ru}`, `Boʻlim faqat ${uz} kabinetida mavjud`));
      router.replace(cabinetOf(user.role));
    }
  }, [ready, user, role, router, tt]);

  if (!ready || !user || user.role !== role) {
    return <div className="py-24 text-center text-ink-subtle">{tt('Загрузка…', 'Yuklanmoqda…')}</div>;
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
  icon?: LucideIcon;
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
