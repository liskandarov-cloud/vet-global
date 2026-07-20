import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { PWARegister } from '@/components/PWARegister';

const SITE_URL = process.env.SITE_URL ?? 'https://vet-global.vercel.app';
const TITLE = 'VetGlobal — B2B-платформа ветеринарных решений';
const DESCRIPTION =
  'Оптовые закупки ветеринарных препаратов, вакцин, кормов и добавок напрямую от проверенных поставщиков. Прозрачно, удобно, безопасно.';

export const metadata: Metadata = {
  // metadataBase разворачивает относительные пути картинок в абсолютные —
  // без него превью ссылки остаётся без изображения.
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: '%s — VetGlobal' },
  description: DESCRIPTION,
  appleWebApp: { capable: true, title: 'VetGlobal', statusBarStyle: 'default' },
  icons: { icon: '/icon.svg', apple: '/icon-192.png' },
  // Рынок общается в Telegram: ссылка должна разворачиваться карточкой,
  // а не голым URL.
  openGraph: {
    type: 'website',
    siteName: 'VetGlobal',
    locale: 'ru_RU',
    url: SITE_URL,
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: '/icon-512.png', width: 512, height: 512, alt: 'VetGlobal' }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

export const viewport: Viewport = {
  themeColor: '#0d9488',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-background font-body text-ink antialiased">
        <Providers>
          <PWARegister />
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
