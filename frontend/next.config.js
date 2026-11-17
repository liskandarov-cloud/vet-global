/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
