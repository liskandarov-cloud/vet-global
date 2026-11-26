// Язык в адресе: русская версия — без префикса, узбекская — /uz/….
export const LANGS = ['ru', 'uz'] as const;
export type Lang = (typeof LANGS)[number];

// Путь без языкового префикса: «/uz/catalog» → «/catalog», «/uz» → «/».
export function stripLang(path: string): string {
  if (path === '/uz' || path === '/ru') return '/';
  if (path.startsWith('/uz/') || path.startsWith('/ru/')) return path.slice(3);
  return path;
}

// Тот же путь в другой языковой версии.
export function localizedPath(path: string, lang: Lang): string {
  const base = stripLang(path);
  return lang === 'uz' ? `/uz${base === '/' ? '' : base}` : base;
}
