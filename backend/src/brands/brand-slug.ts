import { PrismaService } from '../prisma/prisma.service';
import { cyrToLat } from '../products/search-variants';

// Адрес страницы бренда — латиницей и без страны в скобках:
// «НПЦ БелАгроГен (Беларусь)» → npts-belagrogen, «АВИВАК» → avivak
// (раньше кириллица выпадала и получалось brand-6).
export function brandSlug(name: string): string {
  return (
    cyrToLat(name.replace(/\([^)]*\)/g, ' '))
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'brand'
  );
}

// Один бренд на производителя без учёта регистра: «CID LINES» и «CID Lines» —
// один бренд (страница бренда и счётчики сравнивают так же). true — создан.
export async function ensureBrand(prisma: PrismaService, manufacturer?: string | null): Promise<boolean> {
  const name = manufacturer?.trim();
  if (!name) return false;
  if (await prisma.brand.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } })) return false;
  const base = brandSlug(name);
  const taken = await prisma.brand.findUnique({ where: { slug: base } });
  return prisma.brand
    .create({ data: { name, slug: taken ? `${base}-${Date.now().toString(36).slice(-4)}` : base } })
    .then(
      () => true,
      () => false,
    );
}
