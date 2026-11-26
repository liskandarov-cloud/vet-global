import type { Metadata } from 'next';
import { sectionMetadata } from '@/lib/section-meta';

// Метаданные раздела: страница клиентская, поэтому объявляем их в серверном
// layout рядом — иначе весь сайт отдаёт один заголовок главной.
export async function generateMetadata(props: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await props.params;
  return sectionMetadata(lang, '/brands', {
    ru: ['Бренды-производители', 'Производители ветеринарных препаратов, представленные на платформе: Bioveta, Intracare, CID LINES, Cenavisa и другие.'],
    uz: ['Ishlab chiqaruvchi brendlar', 'Platformada taqdim etilgan veterinariya preparatlari ishlab chiqaruvchilari: Bioveta, Intracare, CID LINES, Cenavisa va boshqalar.'],
  });
}

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
