import { serverFetch } from '@/lib/server-api';
import type { Product } from '@/lib/types';
import SupplierView, { type Seller } from './SupplierView';

// Серверная обёртка: поставщик и его товары приходят в HTML.
export default async function SupplierPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const [seller, list] = await Promise.all([
    serverFetch<Seller>(`/sellers/${id}`),
    serverFetch<{ products: Product[] }>(`/products?sellerId=${encodeURIComponent(id)}&limit=24`),
  ]);
  return <SupplierView initialSeller={seller} initialProducts={list?.products ?? []} />;
}
