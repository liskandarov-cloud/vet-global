import type { Metadata } from 'next';
import { serverFetch, SITE_URL } from '@/lib/server-api';

// Метаданные статьи блога — серверный layout рядом с клиентской страницей.
// Блог существует ради поискового трафика, без этого все статьи выглядели
// в выдаче и в мессенджерах одинаково («VetGlobal — B2B-платформа»).

interface Post {
  title: string;
  excerpt?: string;
  content?: string;
  image?: string;
  slug: string;
  createdAt?: string;
  updatedAt?: string;
  authorName?: string;
  metaTitle?: string;
  metaDesc?: string;
}

function absolute(url?: string): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const post = await serverFetch<Post>(`/blog/${params.slug}`);
  if (!post?.title) return {};

  const title = post.metaTitle || post.title;
  const description =
    post.metaDesc ||
    post.excerpt ||
    post.content?.replace(/\s+/g, ' ').slice(0, 160) ||
    'Экспертные материалы о ветеринарии и закупках на VetGlobal.';
  const image = absolute(post.image) ?? `${SITE_URL}/icon-512.png`;
  const url = `${SITE_URL}/blog/${post.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      title,
      description,
      url,
      images: [{ url: image, alt: title }],
      publishedTime: post.createdAt,
      modifiedTime: post.updatedAt,
      authors: post.authorName ? [post.authorName] : undefined,
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export default function BlogPostLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
