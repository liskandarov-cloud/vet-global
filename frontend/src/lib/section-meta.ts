import type { Metadata } from 'next';

// Метаданные раздела на языке страницы. Без canonical: layout раздела действует
// и на вложенные страницы (поставщик, статья), и общий canonical объявлял бы их
// копиями списка, а узбекскую версию — копией русской. Языковые версии
// связаны через карту сайта (hreflang).
export function sectionMetadata(lang: string, path: string, t: { ru: [string, string]; uz: [string, string] }): Metadata {
  const [title, description] = lang === 'uz' ? t.uz : t.ru;
  return {
    title,
    description,
    openGraph: { title: `${title} — VetHub`, description, url: `${lang === 'uz' ? '/uz' : ''}${path}` },
  };
}
