export type Theme = 'light' | 'dark';

export function applyTheme(t: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', t === 'dark');
}

// Reads theme from ?theme= query param (deep-link) or localStorage; applies it.
export function initTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const q = new URLSearchParams(window.location.search).get('theme');
  let t = localStorage.getItem('vg_theme') as Theme | null;
  if (q === 'dark' || q === 'light') {
    t = q;
    localStorage.setItem('vg_theme', q);
  }
  t = t ?? 'light';
  applyTheme(t);
  return t;
}

export function setTheme(t: Theme) {
  if (typeof window !== 'undefined') localStorage.setItem('vg_theme', t);
  applyTheme(t);
}
