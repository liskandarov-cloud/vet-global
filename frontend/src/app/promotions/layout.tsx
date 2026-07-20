import type { Metadata } from 'next';

// Метаданные раздела: страница клиентская, поэтому объявляем их в серверном
// layout рядом — иначе весь сайт отдаёт один заголовок главной.
export const metadata: Metadata = {
  title: 'Акции и спецпредложения',
  description: 'Действующие скидки и специальные условия от поставщиков ветеринарных препаратов.',
  alternates: { canonical: '/promotions' },
  openGraph: {
    title: 'Акции и спецпредложения — VetGlobal',
    description: 'Действующие скидки и специальные условия от поставщиков ветеринарных препаратов.',
    url: '/promotions',
  },
};

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
