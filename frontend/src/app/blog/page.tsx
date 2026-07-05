import Link from 'next/link';
import type { Metadata } from 'next';
import { serverFetch } from '@/lib/server-api';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Блог и новости — VetGlobal',
  description:
    'Экспертные статьи и отраслевые новости ветеринарии и животноводства: здоровье животных, биобезопасность, кормление, рынок.',
};

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  image?: string;
  createdAt: string;
}

// Server-rendered for SEO (SRS: SSR-оптимизация блога).
export default async function BlogPage() {
  const data = await serverFetch<{ posts: Post[] }>('/blog?limit=50');
  const posts = data?.posts ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8">
        <span className="eyebrow">Экспертиза</span>
        <h1 className="mt-3 section-title">Блог и новости</h1>
      </div>

      {posts.length === 0 ? (
        <div className="py-20 text-center text-ink-subtle">Публикаций пока нет</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {posts.map((p) => (
            <Link key={p.id} href={`/blog/${p.slug}`} className="card card-hover overflow-hidden">
              {p.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image} alt={p.title} className="aspect-video w-full object-cover" />
              )}
              <div className="p-5">
                <div className="text-xs text-ink-subtle">{new Date(p.createdAt).toLocaleDateString('ru-RU')}</div>
                <h2 className="mt-1 font-heading text-lg font-bold">{p.title}</h2>
                {p.excerpt && <p className="mt-2 line-clamp-2 text-sm text-ink-muted">{p.excerpt}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
