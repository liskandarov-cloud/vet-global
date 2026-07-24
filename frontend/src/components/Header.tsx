'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShoppingCart, ShieldCheck, LogOut, LayoutDashboard, Sprout, Menu, X, ChevronDown } from 'lucide-react';
import { useAuth, useCart, useFavorites } from '@/lib/store';
import { useI18n, Lang } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './ThemeToggle';
import { SearchBox } from './SearchBox';
import { NotificationBell } from './NotificationBell';

export function Header() {
  const { t, tt, lang, setLang } = useI18n();
  const { user, logout } = useAuth();
  const clearFav = useFavorites((s) => s.clear);
  const count = useCart((s) => s.count());
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const dashboardHref =
    user?.role === 'ADMIN' ? '/admin' : user?.role === 'SELLER' ? '/seller' : '/dashboard';

  const primaryNav = [
    { href: '/catalog', label: t('nav.catalog') },
    { href: '/promotions', label: t('nav.promotions') },
    { href: '/suppliers', label: t('nav.suppliers') },
    { href: '/brands', label: tt('Бренды', 'Brendlar') },
    { href: '/blog', label: t('nav.blog') },
  ];
  // B2B-инструменты сгруппированы в выпадающее меню, чтобы не раздувать хедер.
  // roles — кому пункт реально доступен на бэкенде; undefined = всем.
  // Показывать пункт, который вернёт 403, значит вести пользователя в пустую страницу.
  const b2bNavAll = [
    { href: '/rfq', label: tt('Запрос цен (RFQ)', 'Narx soʻrovi (RFQ)'), roles: ['BUYER', 'SELLER', 'ADMIN'] },
    { href: '/org', label: tt('Организация', 'Tashkilot'), roles: ['BUYER', 'ADMIN'] },
    { href: '/subscriptions', label: tt('Подписки', 'Obunalar'), roles: ['BUYER', 'ADMIN'] },
    { href: '/financing', label: tt('Финансирование', 'Moliyalashtirish'), roles: ['BUYER', 'ADMIN'] },
    { href: '/market', label: tt('Аналитика рынка', 'Bozor tahlili'), roles: ['SELLER', 'ADMIN'] },
    { href: '/consult', label: tt('Консультация', 'Konsultatsiya') },
  ];
  const b2bNav = b2bNavAll.filter((n) => !n.roles || (user && n.roles.includes(user.role)));
  const nav = [...primaryNav, ...b2bNav]; // плоский список для мобильного меню

  return (
    <header className="sticky top-0 z-40 glass shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 lg:mr-4">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-r from-teal-600 to-emerald-500 text-white shadow-md shadow-teal-900/20">
            <Sprout size={20} />
          </span>
          <span className="font-heading text-xl font-extrabold tracking-tight">VetGlobal</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {primaryNav.map((n) => (
            <Link key={n.href} href={n.href}
              className={cn('rounded-lg px-2 py-2 text-sm font-medium transition-colors xl:px-3',
                pathname === n.href ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-teal-50 hover:text-teal-700')}>
              {n.label}
            </Link>
          ))}
          {/* B2B-закупки — выпадающее меню (hover) */}
          <div className="group relative">
            <button className={cn('flex items-center gap-1 rounded-lg px-2 py-2 text-sm font-medium transition-colors xl:px-3',
              b2bNav.some((n) => n.href === pathname) ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-teal-50 hover:text-teal-700')}>
              {tt('B2B-закупки', 'B2B xaridlar')}
              <ChevronDown size={14} />
            </button>
            <div className="absolute left-0 top-full hidden min-w-[210px] pt-2 group-hover:block">
              <div className="rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                {b2bNav.map((n) => (
                  <Link key={n.href} href={n.href}
                    className={cn('block rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      pathname === n.href ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-teal-50 hover:text-teal-700')}>
                    {n.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </nav>

        <div className="flex items-center gap-2">
          <SearchBox className="hidden min-w-0 shrink xl:block xl:w-32 2xl:w-56" />
          <div className="hidden overflow-hidden rounded-lg border border-slate-200 text-sm lg:flex">
            {(['ru', 'uz'] as Lang[]).map((l) => (
              <button key={l} onClick={() => setLang(l)}
                className={cn('px-2.5 py-1 uppercase transition-colors', lang === l ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-50')}>
                {l}
              </button>
            ))}
          </div>

          <NotificationBell />
          <ThemeToggle />

          <Link href="/cart" className="relative btn-ghost !px-2 lg:!px-4" aria-label={t('nav.cart')}>
            <ShoppingCart size={20} />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-secondary text-xs text-white">{count}</span>
            )}
          </Link>

          {user ? (
            <>
              <Link href={dashboardHref} className="btn-secondary hidden !px-3 lg:inline-flex xl:!px-5" aria-label={t('nav.dashboard')}>
                <LayoutDashboard size={16} /><span className="hidden xl:inline">{t('nav.dashboard')}</span>
              </Link>
              <button onClick={() => { logout(); clearFav(); router.push('/'); }} className="btn-ghost hidden !px-2 lg:inline-flex lg:!px-4" aria-label={t('nav.logout')}><LogOut size={18} /></button>
            </>
          ) : (
            <Link href="/login" className="btn-primary hidden !px-3 lg:inline-flex xl:!px-5" aria-label={t('nav.login')}>
              <ShieldCheck size={16} /><span className="hidden xl:inline">{t('nav.login')}</span>
            </Link>
          )}

          <button className="btn-ghost !px-2 lg:hidden" onClick={() => setOpen((o) => !o)} aria-label="menu">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-slate-100 bg-white/95 px-4 py-3 lg:hidden">
          <SearchBox className="mb-3" />
          <nav className="flex flex-col gap-1">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
                className={cn('rounded-lg px-3 py-2 font-medium', pathname === n.href ? 'bg-teal-50 text-teal-700' : 'text-slate-700')}>
                {n.label}
              </Link>
            ))}
            <div className="mt-2 flex items-center gap-2">
              {!user && <Link href="/login" onClick={() => setOpen(false)} className="btn-primary flex-1"><ShieldCheck size={16} />{t('nav.login')}</Link>}
              {user && <Link href={dashboardHref} onClick={() => setOpen(false)} className="btn-secondary flex-1"><LayoutDashboard size={16} />{t('nav.dashboard')}</Link>}
              {user && (
                <button
                  onClick={() => { setOpen(false); logout(); clearFav(); router.push('/'); }}
                  className="btn-ghost"
                  aria-label={t('nav.logout')}
                ><LogOut size={16} /></button>
              )}
              <div className="flex overflow-hidden rounded-lg border border-slate-200 text-sm">
                {(['ru', 'uz'] as Lang[]).map((l) => (
                  <button key={l} onClick={() => setLang(l)} className={cn('px-3 py-2 uppercase', lang === l ? 'bg-teal-600 text-white' : 'text-slate-600')}>{l}</button>
                ))}
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
