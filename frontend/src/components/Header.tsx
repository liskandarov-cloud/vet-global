'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingCart, ShieldCheck, LogOut, LayoutDashboard, Sprout } from 'lucide-react';
import { useAuth, useCart } from '@/lib/store';
import { useI18n, Lang } from '@/lib/i18n';

export function Header() {
  const { t, lang, setLang } = useI18n();
  const { user, logout } = useAuth();
  const count = useCart((s) => s.count());
  const router = useRouter();

  const dashboardHref =
    user?.role === 'ADMIN' ? '/admin' : user?.role === 'SELLER' ? '/seller' : '/dashboard';

  return (
    <header className="sticky top-0 z-40 border-b border-white/20 bg-white/80 shadow-sm backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-r from-teal-600 to-emerald-500 text-white">
            <Sprout size={20} />
          </span>
          <span className="font-heading text-xl font-extrabold tracking-tight">VetGlobal</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link href="/catalog" className="btn-ghost">{t('nav.catalog')}</Link>
          <Link href="/promotions" className="btn-ghost">{t('nav.promotions')}</Link>
          <Link href="/suppliers" className="btn-ghost">{t('nav.suppliers')}</Link>
          <Link href="/blog" className="btn-ghost">{t('nav.blog')}</Link>
        </nav>

        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-slate-200 text-sm">
            {(['ru', 'uz'] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-2.5 py-1 uppercase ${lang === l ? 'bg-teal-600 text-white' : 'text-slate-600'}`}
              >
                {l}
              </button>
            ))}
          </div>

          <Link href="/cart" className="relative btn-ghost" aria-label={t('nav.cart')}>
            <ShoppingCart size={20} />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-secondary text-xs text-white">
                {count}
              </span>
            )}
          </Link>

          {user ? (
            <>
              <Link href={dashboardHref} className="btn-secondary hidden sm:inline-flex">
                <LayoutDashboard size={16} />
                {t('nav.dashboard')}
              </Link>
              <button
                onClick={() => {
                  logout();
                  router.push('/');
                }}
                className="btn-ghost"
                aria-label={t('nav.logout')}
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <Link href="/login" className="btn-primary">
              <ShieldCheck size={16} />
              {t('nav.login')}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
