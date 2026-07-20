import type { Metadata } from 'next';

// Метаданные раздела: страница клиентская, поэтому объявляем их в серверном
// layout рядом — иначе весь сайт отдаёт один заголовок главной.
export const metadata: Metadata = {
  title: 'Проверенные поставщики',
  description: 'Дистрибьюторы ветеринарных препаратов на VetGlobal: верификация платформой, рейтинги и условия поставки.',
  alternates: { canonical: '/suppliers' },
  openGraph: {
    title: 'Проверенные поставщики — VetGlobal',
    description: 'Дистрибьюторы ветеринарных препаратов на VetGlobal: верификация платформой, рейтинги и условия поставки.',
    url: '/suppliers',
  },
};

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
