// Заголовки защиты для ответов API.
//
// API отдаёт JSON и файлы, страниц у него нет, поэтому политика строгая:
// ничего не загружать, ни во что не встраиваться. Исключения — файлы (PDF
// сертификатов открывается в браузере, картинки встраиваются витриной) и
// Swagger, который включается на время интеграции.
export function securityHeaders(path: string): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    // Год; браузер перестаёт пробовать http даже по старым ссылкам.
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Frame-Options': 'DENY',
  };
  const isFile = path.startsWith('/api/files');
  const isDocs = path.startsWith('/api/docs');
  if (!isFile && !isDocs) headers['Content-Security-Policy'] = "default-src 'none'; frame-ancestors 'none'";
  return headers;
}
