import type { Metadata } from 'next';
import { sectionMetadata } from '@/lib/section-meta';

// Метаданные раздела: страница клиентская, поэтому объявляем их в серверном
// layout рядом — иначе весь сайт отдаёт один заголовок главной.
export async function generateMetadata(props: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await props.params;
  return sectionMetadata(lang, '/suppliers', {
    ru: ['Проверенные поставщики', 'Дистрибьюторы ветеринарных препаратов на VetHub: верификация платформой, рейтинги и условия поставки.'],
    uz: ['Tekshirilgan yetkazib beruvchilar', 'VetHub dagi veterinariya preparatlari distribyutorlari: platforma tomonidan tekshiruv, reytinglar va yetkazib berish shartlari.'],
  });
}

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
