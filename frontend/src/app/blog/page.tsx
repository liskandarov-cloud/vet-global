'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

interface Post {
  id: string;
  title: string;
  titleUz?: string | null;
  slug: string;
  excerpt?: string;
  excerptUz?: string | null;
  image?: string;
  createdAt: string;
}

export default function BlogPage() {
  const { tt, lang } = useI18n();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/blog', { params: { limit: 50 } })
      .then((r) => setPosts(r.data?.posts ?? r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8">
        <span className="eyebrow">{tt('Экспертиза', 'Ekspertiza')}</span>
        <h1 className="mt-3 section-title">{tt('Блог и новости', 'Blog va yangiliklar')}</h1>
      </div>

      {loading ? (
        <div className="py-20 text-center text-ink-subtle">{tt('Загрузка…', 'Yuklanmoqda…')}</div>
      ) : posts.length === 0 ? (
        <div className="py-20 text-center text-ink-subtle">{tt('Публикаций пока нет', 'Hozircha eʼlonlar yoʻq')}</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {posts.map((p) => {
            // Узбекская версия, если переведена; иначе — русский оригинал.
            const title = (lang === 'uz' && p.titleUz) || p.title;
            const excerpt = (lang === 'uz' && p.excerptUz) || p.excerpt;
            return (
            <Link key={p.id} href={`/blog/${p.slug}`} className="card card-hover overflow-hidden">
              {p.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image} alt={title} className="aspect-video w-full object-cover" />
              )}
              <div className="p-5">
                <div className="text-xs text-ink-subtle">
                  {new Date(p.createdAt).toLocaleDateString(lang === 'uz' ? 'uz-UZ' : 'ru-RU')}
                </div>
                <h2 className="mt-1 font-heading text-lg font-bold">{title}</h2>
                {excerpt && <p className="mt-2 line-clamp-2 text-sm text-ink-muted">{excerpt}</p>}
              </div>
            </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
