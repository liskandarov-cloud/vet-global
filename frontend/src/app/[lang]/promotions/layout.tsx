import type { Metadata } from 'next';
import { sectionMetadata } from '@/lib/section-meta';

// Метаданные раздела: страница клиентская, поэтому объявляем их в серверном
// layout рядом — иначе весь сайт отдаёт один заголовок главной.
export async function generateMetadata(props: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await props.params;
  return sectionMetadata(lang, '/promotions', {
    ru: ['Акции и спецпредложения', 'Действующие скидки и специальные условия от поставщиков ветеринарных препаратов.'],
    uz: ['Aksiyalar va maxsus takliflar', 'Veterinariya preparatlari yetkazib beruvchilaridan amaldagi chegirmalar va maxsus shartlar.'],
  });
}

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
