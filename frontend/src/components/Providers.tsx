'use client';

import { useEffect, ReactNode } from 'react';
import { Toaster } from 'sonner';
import { I18nProvider } from '@/lib/i18n';
import { useAuth, useFavorites } from '@/lib/store';
import { initTheme } from '@/lib/theme';

export function Providers({ children }: { children: ReactNode }) {
  const refresh = useAuth((s) => s.refresh);
  const loadFavorites = useFavorites((s) => s.load);
  useEffect(() => {
    initTheme();
    refresh();
    loadFavorites();
  }, [refresh, loadFavorites]);

  return (
    <I18nProvider>
      {children}
      <Toaster position="top-right" richColors />
    </I18nProvider>
  );
}
