import { serverFetch } from '@/lib/server-api';
import ProductView from './ProductView';

// Серверная обёртка: товар запрашивается здесь (тот же запрос, что у
// метаданных в layout, — Next отдаёт его из кэша), страница приходит в HTML
// уже с содержимым.
export default async function ProductPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const initial = await serverFetch<Parameters<typeof ProductView>[0]['initial']>(`/products/${id}`);
  return <ProductView initial={initial} />;
}
