import { serverFetch } from '@/lib/server-api';
import type { Product } from '@/lib/types';
import type { Metadata } from 'next';
import SupplierView, { type Seller } from './SupplierView';
import { absoluteUrl, langAlternates } from '@/lib/seo';

// Заголовок и описание — компании, а не общие раздела «Поставщики».
export async function generateMetadata(props: { params: Promise<{ id: string; lang: string }> }): Promise<Metadata> {
  const { id, lang } = await props.params;
  const s = await serverFetch<Seller & { fullName?: string; description?: string | null; logoUrl?: string | null }>(`/sellers/${id}`);
  const name = s?.company || s?.fullName;
  if (!name) return {};
  const uz = lang === 'uz';
  const description =
    s.description?.replace(/\s+/g, ' ').slice(0, 160) ||
    (uz ? `${name} — VetHub dagi veterinariya preparatlari yetkazib beruvchisi.` : `${name} — поставщик ветеринарных препаратов на VetHub.`);
  const alternates = langAlternates(lang, `/suppliers/${id}`);
  const image = absoluteUrl(s.logoUrl);
  return {
    title: uz ? `${name} — yetkazib beruvchi` : `${name} — поставщик`,
    description,
    alternates,
    openGraph: { title: `${name} — VetHub`, description, url: alternates.canonical, ...(image ? { images: [{ url: image, alt: name }] } : {}) },
  };
}

// Серверная обёртка: поставщик и его товары приходят в HTML.
export default async function SupplierPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const [seller, list] = await Promise.all([
    serverFetch<Seller>(`/sellers/${id}`),
    serverFetch<{ products: Product[] }>(`/products?sellerId=${encodeURIComponent(id)}&limit=24`),
  ]);
  return <SupplierView initialSeller={seller} initialProducts={list?.products ?? []} />;
}
