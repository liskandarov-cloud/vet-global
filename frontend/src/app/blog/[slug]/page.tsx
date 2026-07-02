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
  metaTitle?: string;
  metaDesc?: string;
}

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);

  useEffect(() => {
    if (!slug) return;
    api.get(`/blog/${slug}`).then((r) => {
      setPost(r.data);
      // Client-side SEO: title/description (SSR metadata is a phase-2 follow-up).
      document.title = `${r.data.metaTitle ?? r.data.title} — VetGlobal`;
    });
  }, [slug]);

  if (!post) return <div className="py-24 text-center text-ink-subtle">Загрузка…</div>;

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
