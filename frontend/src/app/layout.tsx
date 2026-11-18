import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { PWARegister } from '@/components/PWARegister';
import { EMAIL, PHONE } from '@/lib/contacts';

const SITE_URL = process.env.SITE_URL ?? 'https://vethub.uz';
const TITLE = 'VetHub — B2B-платформа ветеринарных решений';
const DESCRIPTION =
  'Оптовые закупки ветеринарных препаратов, вакцин, кормов и добавок напрямую от проверенных поставщиков. Прозрачно, удобно, безопасно.';

export const metadata: Metadata = {
  // metadataBase разворачивает относительные пути картинок в абсолютные —
  // без него превью ссылки остаётся без изображения.
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: '%s — VetHub' },
  description: DESCRIPTION,
  appleWebApp: { capable: true, title: 'VetHub', statusBarStyle: 'default' },
  icons: { icon: '/icon.svg', apple: '/icon-192.png' },
  // Рынок общается в Telegram: ссылка должна разворачиваться карточкой,
  // а не голым URL.
  openGraph: {
    type: 'website',
    siteName: 'VetHub',
    locale: 'ru_RU',
    url: SITE_URL,
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: '/icon-512.png', width: 512, height: 512, alt: 'VetHub' }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

const ORG_LD = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'VetHub',
  legalName: 'ООО «VetHub»',
  url: SITE_URL,
  logo: `${SITE_URL}/icon-512.png`,
  email: EMAIL,
  telephone: PHONE,
  address: { '@type': 'PostalAddress', addressLocality: 'Ташкент', addressCountry: 'UZ' },
  contactPoint: [{ '@type': 'ContactPoint', telephone: PHONE, email: EMAIL, contactType: 'customer service', availableLanguage: ['ru', 'uz'] }],
});

export const viewport: Viewport = {
  themeColor: '#0d9488',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-background font-body text-ink antialiased">
        {/* Карточка организации для поисковиков: телефон и почта в выдаче. */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ORG_LD }} />
        <Providers>
          <PWARegister />
          <div className="flex min-h-screen flex-col">
            {process.env.NEXT_PUBLIC_DEMO === 'true' && (
              <div role="note" className="bg-amber-100 px-4 py-1.5 text-center text-sm text-amber-900">
                Демо-стенд: компании, товары и цены вымышлены · Demo: kompaniyalar, tovarlar va narxlar toʻqima
              </div>
            )}
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
