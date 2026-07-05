'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';

interface Post {
  title: string;
  content: string;
  image?: string;
  createdAt: string;
  authorName: string;
  excerpt?: string;
}

export default function BlogPostPage() {
  const params = useParams();
  const slug = Array.isArray(params?.slug) ? params.slug[0] : (params?.slug as string);
  const [post, setPost] = useState<Post | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'notfound'>('loading');

  useEffect(() => {
    if (!slug) return;
    api
      .get(`/blog/${slug}`)
      .then((r) => {
        setPost(r.data);
        setStatus('ready');
        if (r.data?.title) document.title = `${r.data.title} — VetGlobal`;
      })
      .catch(() => setStatus('notfound'));
  }, [slug]);

  if (status === 'loading') {
    return <div className="py-20 text-center text-ink-subtle">Загрузка…</div>;
  }
  if (status === 'notfound' || !post) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <div className="text-ink-subtle">Статья не найдена</div>
        <Link href="/blog" className="btn-ghost mt-4"><ArrowLeft size={16} /> Блог</Link>
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/blog" className="btn-ghost mb-4"><ArrowLeft size={16} /> Блог</Link>
      <h1 className="font-heading text-3xl font-extrabold">{post.title}</h1>
      <div className="mt-2 text-sm text-ink-subtle">
        {post.authorName} · {new Date(post.createdAt).toLocaleDateString('ru-RU')}
      </div>
      {post.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.image} alt={post.title} className="mt-6 w-full rounded-2xl" />
      )}
      <div className="prose mt-6 whitespace-pre-wrap text-ink-muted">{post.content}</div>
    </article>
  );
}
