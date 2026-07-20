import type { Metadata } from 'next';

// Метаданные раздела: страница клиентская, поэтому объявляем их в серверном
// layout рядом — иначе весь сайт отдаёт один заголовок главной.
export const metadata: Metadata = {
  title: 'Блог и экспертиза',
  description: 'Материалы для ветврачей и закупщиков: чтение прайсов и фасовка вакцин, биобезопасность на фермах, протоколы и практика закупок.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'Блог и экспертиза — VetGlobal',
    description: 'Материалы для ветврачей и закупщиков: чтение прайсов и фасовка вакцин, биобезопасность на фермах, протоколы и практика закупок.',
    url: '/blog',
  },
};

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
