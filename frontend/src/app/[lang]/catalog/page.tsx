import { serverFetch } from '@/lib/server-api';
import type { Product } from '@/lib/types';
import CatalogView, { CatalogPreview } from './CatalogView';

// Серверная обёртка каталога: первые товары приходят в HTML.
export default async function CatalogPage() {
  const data = await serverFetch<{ products: Product[] }>('/products?limit=24');
  return <CatalogView fallback={data?.products?.length ? <CatalogPreview products={data.products} /> : undefined} />;
}
