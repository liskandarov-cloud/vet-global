import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { PWARegister } from '@/components/PWARegister';

export const metadata: Metadata = {
  title: 'VetGlobal — B2B-платформа ветеринарных решений',
  description:
    'Оптовые закупки ветеринарных препаратов, вакцин, кормов и добавок напрямую от проверенных поставщиков. Прозрачно, удобно, безопасно.',
  appleWebApp: { capable: true, title: 'VetGlobal', statusBarStyle: 'default' },
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
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
