// Куда вернуть после входа: ?next=/cart. Только путь внутри сайта — иначе
// ссылка «войти» уводила бы на чужой сайт (открытый редирект).
export function safeNext(search: string): string | null {
  const next = new URLSearchParams(search).get('next');
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return null;
  return next;
}
