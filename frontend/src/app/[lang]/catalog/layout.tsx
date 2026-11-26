import type { Metadata } from 'next';
import { sectionMetadata } from '@/lib/section-meta';

// Метаданные раздела: страница клиентская, поэтому объявляем их в серверном
// layout рядом — иначе весь сайт отдаёт один заголовок главной.
export async function generateMetadata(props: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await props.params;
  return sectionMetadata(lang, '/catalog', {
    ru: ['Каталог ветпрепаратов', 'Ветеринарные препараты, вакцины, дезинфектанты и кормовые добавки оптом. Сравнение цен поставщиков, сертификаты и номера госреестра на каждую партию.'],
    uz: ['Veterinariya preparatlari katalogi', 'Veterinariya preparatlari, vaksinalar, dezinfeksiya vositalari va ozuqa qoʻshimchalari ulgurji. Yetkazib beruvchilar narxlarini solishtirish, har bir partiya uchun sertifikatlar va davlat reestri raqamlari.'],
  });
}

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
