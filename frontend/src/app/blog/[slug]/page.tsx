import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { serverFetch } from '@/lib/server-api';

interface Post {
  title: string;
  content: string;
  image?: string;
  createdAt: string;
  authorName: string;
  excerpt?: string;
  metaTitle?: string;
  metaDesc?: string;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await serverFetch<Post>(`/blog/${params.slug}`);
  if (!post) return { title: 'Статья — VetGlobal' };
  const title = post.metaTitle ?? post.title;
  const description = post.metaDesc ?? post.excerpt ?? post.content.slice(0, 160);
  return {
    title: `${title} — VetGlobal`,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      images: post.image ? [post.image] : [],
    },
  };
}

// Server-rendered article for SEO.
export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await serverFetch<Post>(`/blog/${params.slug}`);
  if (!post) notFound();

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
