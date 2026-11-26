import type { Metadata } from 'next';
import { sectionMetadata } from '@/lib/section-meta';

// Метаданные раздела: страница клиентская, поэтому объявляем их в серверном
// layout рядом — иначе весь сайт отдаёт один заголовок главной.
export async function generateMetadata(props: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await props.params;
  return sectionMetadata(lang, '/blog', {
    ru: ['Блог и экспертиза', 'Материалы для ветврачей и закупщиков: чтение прайсов и фасовка вакцин, биобезопасность на фермах, протоколы и практика закупок.'],
    uz: ['Blog va ekspertiza', 'Veterinarlar va xaridorlar uchun materiallar: narxnomalarni oʻqish va vaksinalarni qadoqlash, fermalarda biologik xavfsizlik, xarid protokollari va amaliyoti.'],
  });
}

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
