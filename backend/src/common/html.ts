// Экранирование пользовательских строк (имя, компания) в HTML писем:
// без него «<a href=…>» в имени превращался бы в ссылку от имени VetHub.
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
