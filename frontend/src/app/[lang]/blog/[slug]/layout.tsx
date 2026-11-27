import type { Metadata } from 'next';
import { serverFetch, SITE_URL } from '@/lib/server-api';
import { langAlternates } from '@/lib/seo';

// Метаданные статьи блога — серверный layout рядом с клиентской страницей.
// Блог существует ради поискового трафика, без этого все статьи выглядели
// в выдаче и в мессенджерах одинаково («VetHub — B2B-платформа»).

interface Post {
  title: string;
  titleUz?: string | null;
  excerpt?: string;
  excerptUz?: string | null;
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

export async function generateMetadata(
  props: {
    params: Promise<{ slug: string; lang: string }>;
  }
): Promise<Metadata> {
  const params = await props.params;
  const post = await serverFetch<Post>(`/blog/${params.slug}`);
  if (!post?.title) return {};
  const uz = params.lang === 'uz';

  const title = (uz && post.titleUz) || post.metaTitle || post.title;
  const description =
    (uz && post.excerptUz) ||
    post.metaDesc ||
    post.excerpt ||
    post.content?.replace(/\s+/g, ' ').slice(0, 160) ||
    'Экспертные материалы о ветеринарии и закупках на VetHub.';
  const image = absolute(post.image) ?? `${SITE_URL}/icon-512.png`;
  const alternates = langAlternates(params.lang, `/blog/${post.slug}`);
  const url = alternates.canonical;

  return {
    title,
    description,
    alternates,
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
