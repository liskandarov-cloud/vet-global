// Источник API для connect-src: адрес вшивается в сборку, а CSP должна
// пускать браузер только туда.
function apiOrigin() {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? 'https://api.vethub.uz/api').origin;
  } catch {
    return 'https://api.vethub.uz';
  }
}

// Политика загрузки ресурсов. Только для боевой сборки: в разработке Next
// исполняет код через eval, и строгая политика ломала бы горячую перезагрузку.
//
// script-src с 'unsafe-inline': App Router вставляет встроенные скрипты
// гидратации; без nonce (а nonce требует middleware на каждый запрос) их
// иначе не пропустить. Политика всё равно запрещает скрипты с чужих доменов,
// плагины, подмену base и встраивание сайта в чужие страницы.
// wss://127.0.0.1:64443 — локальная служба E-IMZO для подписи ЭДО.
function contentSecurityPolicy() {
  return [
    "default-src 'self'",
    // static.cloudflareinsights.com — статистика посещений Cloudflare Web
    // Analytics (без cookie), её скрипт Cloudflare вставляет сам.
    "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    `connect-src 'self' ${apiOrigin()} wss://127.0.0.1:64443 https://cloudflareinsights.com`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "frame-src 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // Только для сайта на https: самостоятельная установка по http иначе
    // переписывала бы свои же запросы к API на несуществующий https.
    ...(isHttpsSite ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
}

const isProd = process.env.NODE_ENV === 'production';
const isHttpsSite = String(process.env.SITE_URL ?? '').startsWith('https://');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Не сообщаем наружу, на чём работает сайт.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          ...(isProd
            ? [
                { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
                { key: 'Content-Security-Policy', value: contentSecurityPolicy() },
              ]
            : []),
        ],
      },
    ];
  },
  // standalone включается только явным флагом — его собирает Dockerfile.prod
  // для self-host. Прежнее условие «всё, что не Vercel» ломало сборку под
  // Cloudflare: адаптеру нужен обычный вывод, а не standalone-сервер.
  output: process.env.BUILD_STANDALONE ? 'standalone' : undefined,
  // Один адрес сайта: www уводим на основной домен, иначе вход, корзина и
  // канонические ссылки жили бы на двух адресах.
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.vethub.uz' }],
        destination: 'https://vethub.uz/:path*',
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'images.pexels.com' },
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: '**' },
    ],
  },
};

module.exports = nextConfig;
