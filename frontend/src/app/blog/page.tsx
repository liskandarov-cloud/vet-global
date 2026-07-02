'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  image?: string;
  createdAt: string;
}

export default function BlogPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/blog').then((r) => setPosts(r.data.posts)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-6 font-heading text-3xl font-extrabold">Блог и новости</h1>
      {loading ? (
        <div className="py-20 text-center text-ink-subtle">Загрузка…</div>
      ) : posts.length === 0 ? (
        <div className="py-20 text-center text-ink-subtle">Публикаций пока нет</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {posts.map((p) => (
            <Link key={p.id} href={`/blog/${p.slug}`} className="card overflow-hidden transition-shadow hover:shadow-lg">
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
