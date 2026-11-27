import type { Metadata } from 'next';
import { serverFetch } from '@/lib/server-api';
import { absoluteUrl, langAlternates } from '@/lib/seo';

interface Brand {
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
}

// Страница бренда: заголовок — название производителя, а не общий раздела.
export async function generateMetadata(props: { params: Promise<{ slug: string; lang: string }> }): Promise<Metadata> {
  const { slug, lang } = await props.params;
  const b = await serverFetch<Brand>(`/brands/${encodeURIComponent(slug)}`);
  if (!b?.name) return {};
  const uz = lang === 'uz';
  const description =
    (!uz && b.description) ||
    (uz ? `${b.name} veterinariya preparatlari — VetHub da yetkazib beruvchilar narxlari bilan.` : `Препараты ${b.name} — с ценами поставщиков на VetHub.`);
  const alternates = langAlternates(lang, `/brands/${b.slug}`);
  const image = absoluteUrl(b.logoUrl);
  return {
    title: uz ? `${b.name} — brend` : `${b.name} — бренд`,
    description,
    alternates,
    openGraph: { title: `${b.name} — VetHub`, description, url: alternates.canonical, ...(image ? { images: [{ url: image, alt: b.name }] } : {}) },
  };
}

export default function BrandLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
