import type { Metadata, Viewport } from 'next';
import '../globals.css';
import { notFound } from 'next/navigation';
import { LANGS, type Lang } from '@/lib/lang-path';
import { Providers } from '@/components/Providers';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { PWARegister } from '@/components/PWARegister';
import { EMAIL, PHONE, TG_BOT, TG_CHANNEL } from '@/lib/contacts';

const SITE_URL = process.env.SITE_URL ?? 'https://vethub.uz';
const TEXT = {
  ru: {
    title: 'VetHub — B2B-платформа ветеринарных решений',
    description: 'Оптовые закупки ветеринарных препаратов, вакцин, кормов и добавок напрямую от проверенных поставщиков. Прозрачно, удобно, безопасно.',
    locale: 'ru_RU',
  },
  uz: {
    title: 'VetHub — veterinariya yechimlari B2B platformasi',
    description: 'Veterinariya preparatlari, vaksinalar, ozuqa va qoʻshimchalarni tekshirilgan yetkazib beruvchilardan ulgurji xarid qilish. Shaffof, qulay, xavfsiz.',
    locale: 'uz_UZ',
  },
};

// Язык задаёт адрес: /… — русская версия, /uz/… — узбекская. Раньше язык
// хранился в браузере, и поисковики видели только русскую версию.
export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}
export const dynamicParams = false;

export async function generateMetadata(props: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await props.params;
  const { title: TITLE, description: DESCRIPTION, locale } = TEXT[lang === 'uz' ? 'uz' : 'ru'];
  return {
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
    locale,
    url: lang === 'uz' ? `${SITE_URL}/uz` : SITE_URL,
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: '/icon-512.png', width: 512, height: 512, alt: 'VetHub' }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
  };
}

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
  sameAs: [`https://t.me/${TG_CHANNEL}`, `https://t.me/${TG_BOT}`],
});

const SITE_LD = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'VetHub',
  url: SITE_URL,
  inLanguage: ['ru', 'uz'],
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/catalog?search={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
});

export const viewport: Viewport = {
  themeColor: '#0d9488',
};

export default async function RootLayout(props: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await props.params;
  if (!(LANGS as readonly string[]).includes(lang)) notFound();
  const children = props.children;
  return (
    <html lang={lang}>
      <body className="min-h-screen bg-background font-body text-ink antialiased">
        {/* Карточка организации для поисковиков: телефон и почта в выдаче. */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ORG_LD }} />
        {/* Сайт с поиском: Google может показать строку поиска по VetHub в выдаче. */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: SITE_LD }} />
        <Providers lang={lang as Lang}>
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
