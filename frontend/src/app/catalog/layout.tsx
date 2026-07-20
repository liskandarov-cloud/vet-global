import type { Metadata } from 'next';

// Метаданные раздела: страница клиентская, поэтому объявляем их в серверном
// layout рядом — иначе весь сайт отдаёт один заголовок главной.
export const metadata: Metadata = {
  title: 'Каталог ветпрепаратов',
  description: 'Ветеринарные препараты, вакцины, дезинфектанты и кормовые добавки оптом. Сравнение цен поставщиков, сертификаты и номера госреестра на каждую партию.',
  alternates: { canonical: '/catalog' },
  openGraph: {
    title: 'Каталог ветпрепаратов — VetGlobal',
    description: 'Ветеринарные препараты, вакцины, дезинфектанты и кормовые добавки оптом. Сравнение цен поставщиков, сертификаты и номера госреестра на каждую партию.',
    url: '/catalog',
  },
};

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
