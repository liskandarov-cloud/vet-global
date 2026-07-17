'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

interface Post {
  title: string;
  titleUz?: string | null;
  content: string;
  contentUz?: string | null;
  image?: string;
  createdAt: string;
  authorName: string;
  excerpt?: string;
  excerptUz?: string | null;
}

export default function BlogPostPage() {
  const { tt, lang } = useI18n();
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
      })
      .catch(() => setStatus('notfound'));
  }, [slug]);

  // Узбекская версия статьи, если переведена; иначе — русский оригинал.
  const title = (lang === 'uz' && post?.titleUz) || post?.title || '';
  const content = (lang === 'uz' && post?.contentUz) || post?.content || '';

  useEffect(() => {
    if (title) document.title = `${title} — VetGlobal`;
  }, [title]);

  if (status === 'loading') {
    return <div className="py-20 text-center text-ink-subtle">{tt('Загрузка…', 'Yuklanmoqda…')}</div>;
  }
  if (status === 'notfound' || !post) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <div className="text-ink-subtle">{tt('Статья не найдена', 'Maqola topilmadi')}</div>
        <Link href="/blog" className="btn-ghost mt-4"><ArrowLeft size={16} /> {tt('Блог', 'Blog')}</Link>
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/blog" className="btn-ghost mb-4"><ArrowLeft size={16} /> {tt('Блог', 'Blog')}</Link>
      <h1 className="font-heading text-3xl font-extrabold">{title}</h1>
      <div className="mt-2 text-sm text-ink-subtle">
        {post.authorName} · {new Date(post.createdAt).toLocaleDateString(lang === 'uz' ? 'uz-UZ' : 'ru-RU')}
      </div>
      {post.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.image} alt={title} className="mt-6 w-full rounded-2xl" />
      )}
      <div className="prose mt-6 whitespace-pre-wrap text-ink-muted">{content}</div>
    </article>
  );
}
