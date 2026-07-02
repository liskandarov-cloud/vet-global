import { PrismaClient, UserRole, AnimalType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const CATEGORIES = [
  { name: 'Вакцины', nameUz: 'Vaktsinalar', slug: 'vaccines', icon: 'Syringe' },
  { name: 'Антибиотики', nameUz: 'Antibiotiklar', slug: 'antibiotics', icon: 'Pill' },
  { name: 'Витамины', nameUz: 'Vitaminlar', slug: 'vitamins', icon: 'Sprout' },
  { name: 'Дезинфектанты', nameUz: 'Dezinfeksiya vositalari', slug: 'disinfectants', icon: 'SprayCan' },
  { name: 'Кормовые добавки', nameUz: "Ozuqa qo'shimchalari", slug: 'feed-additives', icon: 'Wheat' },
  { name: 'Диагностика', nameUz: 'Diagnostika', slug: 'diagnostics', icon: 'Microscope' },
  { name: 'Прочее', nameUz: 'Boshqalar', slug: 'other', icon: 'Package' },
];

async function main() {
  // ── Categories ──
  for (const c of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, nameUz: c.nameUz, icon: c.icon },
      create: c,
    });
  }
  console.log(`✓ categories: ${CATEGORIES.length}`);

  // ── Admin ──
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@vetglobal.com';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin123';
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 10),
      fullName: 'Administrator',
      phone: '+998901234567',
      role: UserRole.ADMIN,
      isVerified: true,
    },
  });
  console.log(`✓ admin: ${adminEmail} / ${adminPassword}`);

  // ── Demo seller ──
  const seller = await prisma.user.upsert({
    where: { email: 'seller@vetglobal.com' },
    update: {},
    create: {
      email: 'seller@vetglobal.com',
      passwordHash: await bcrypt.hash('seller123', 10),
      fullName: 'Иван Поставщиков',
      phone: '+998901112233',
      company: 'ООО «ВетФарм Импорт»',
      inn: '301234567',
      role: UserRole.SELLER,
      isVerified: true,
      description: 'Официальный импортёр ветеринарных препаратов и вакцин.',
      rating: 4.7,
      reviewsCount: 12,
    },
  });
  console.log('✓ demo seller: seller@vetglobal.com / seller123');

  // ── Demo buyer ──
  await prisma.user.upsert({
    where: { email: 'buyer@vetglobal.com' },
    update: {},
    create: {
      email: 'buyer@vetglobal.com',
      passwordHash: await bcrypt.hash('buyer123', 10),
      fullName: 'Пётр Закупщик',
      phone: '+998907778899',
      company: 'Птицефабрика «Заря»',
      inn: '305556677',
      role: UserRole.BUYER,
      isVerified: true,
      vetPointsBalance: 15000,
    },
  });
  console.log('✓ demo buyer: buyer@vetglobal.com / buyer123');

  // ── Demo products ──
  const vaccines = await prisma.category.findUnique({ where: { slug: 'vaccines' } });
  const antibiotics = await prisma.category.findUnique({ where: { slug: 'antibiotics' } });
  const vitamins = await prisma.category.findUnique({ where: { slug: 'vitamins' } });

  const demoProducts = [
    {
      name: 'Вакцина против болезни Ньюкасла (штамм Ла-Сота)',
      nameUz: 'Nyukasl kasalligiga qarshi vaksina',
      description: 'Живая сухая вакцина для профилактической иммунизации птицы. Флакон 1000 доз.',
      categoryId: vaccines?.id,
      price: 85000,
      activeSubstance: 'Штамм La Sota',
      manufacturer: 'BioVet',
      form: 'Лиофилизат',
      animalType: AnimalType.POULTRY,
      minOrder: 10,
      isPromotion: true,
      promotionText: '-15% до конца месяца',
    },
    {
      name: 'Энрофлоксацин 10% раствор оральный',
      nameUz: 'Enrofloksatsin 10% eritma',
      description: 'Антибактериальный препарат широкого спектра для птицы и КРС. Канистра 1 л.',
      categoryId: antibiotics?.id,
      price: 120000,
      activeSubstance: 'Энрофлоксацин',
      manufacturer: 'VetPharma',
      form: 'Раствор оральный',
      animalType: AnimalType.CATTLE,
      minOrder: 5,
    },
    {
      name: 'Витаминный комплекс АД3Е',
      nameUz: 'AD3E vitamin kompleksi',
      description: 'Масляный раствор витаминов A, D3, E для всех видов животных. Флакон 100 мл.',
      categoryId: vitamins?.id,
      price: 45000,
      activeSubstance: 'Ретинол, Холекальциферол, Токоферол',
      manufacturer: 'AgroVit',
      form: 'Раствор для инъекций',
      animalType: AnimalType.OTHER,
      minOrder: 1,
      isNew: true,
    },
  ];

  for (const p of demoProducts) {
    if (!p.categoryId) continue;
    const exists = await prisma.product.findFirst({ where: { name: p.name } });
    if (!exists) {
      await prisma.product.create({
        data: { ...p, categoryId: p.categoryId, sellerId: seller.id },
      });
    }
  }
  console.log(`✓ demo products seeded`);
}

main()
  .then(() => console.log('Seed complete.'))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
