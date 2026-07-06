'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Theme, setTheme } from '@/lib/theme';
import { useI18n } from '@/lib/i18n';

export function ThemeToggle() {
  const { tt } = useI18n();
  const [theme, setLocal] = useState<Theme>('light');

  useEffect(() => {
    setLocal(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    setLocal(next);
  };

  return (
    <button onClick={toggle} className="btn-ghost" aria-label={tt('Тема', 'Mavzu')}>
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
