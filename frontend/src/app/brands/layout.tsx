import type { Metadata } from 'next';

// Метаданные раздела: страница клиентская, поэтому объявляем их в серверном
// layout рядом — иначе весь сайт отдаёт один заголовок главной.
export const metadata: Metadata = {
  title: 'Бренды-производители',
  description: 'Производители ветеринарных препаратов, представленные на платформе: Bioveta, Intracare, CID LINES, Cenavisa и другие.',
  alternates: { canonical: '/brands' },
  openGraph: {
    title: 'Бренды-производители — VetGlobal',
    description: 'Производители ветеринарных препаратов, представленные на платформе: Bioveta, Intracare, CID LINES, Cenavisa и другие.',
    url: '/brands',
  },
};

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
