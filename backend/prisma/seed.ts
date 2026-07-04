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
      images: ['https://images.unsplash.com/photo-1584362917165-526a968579e8?auto=format&fit=crop&w=800&q=80'],
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
      images: ['https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=800&q=80'],
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
      images: ['https://images.unsplash.com/photo-1550572017-edd951b55104?auto=format&fit=crop&w=800&q=80'],
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

  // ── Extended catalog (all categories) for a lively storefront ──
  const catMap = Object.fromEntries(
    (await prisma.category.findMany()).map((c) => [c.slug, c.id] as const),
  );
  const imgOf = (slug: string) => {
    const m: Record<string, string> = {
      vaccines: '1584362917165-526a968579e8',
      antibiotics: '1471864190281-a93a3070b6de',
      vitamins: '1550572017-edd951b55104',
      'feed-additives': '1518977676601-b53f82aba655',
      disinfectants: '1471864190281-a93a3070b6de',
      diagnostics: '1550572017-edd951b55104',
      other: '1547908068-35ea7b47a21d',
    };
    return [`https://images.unsplash.com/photo-${m[slug] ?? '1547908068-35ea7b47a21d'}?auto=format&fit=crop&w=800&q=80`];
  };

  type P = [string, string, number, string | null, string, string, AnimalType, number, boolean, boolean];
  const EXTRA: P[] = [
    ['Вакцина против болезни Гамборо', 'vaccines', 92000, 'Штамм Winterfield 2512', 'BioVet', 'Лиофилизат', AnimalType.POULTRY, 10, false, true],
    ['Вакцина против болезни Марека', 'vaccines', 110000, 'Herpesvirus turkey', 'Biotech', 'Суспензия', AnimalType.POULTRY, 5, false, false],
    ['Вакцина против ящура КРС', 'vaccines', 145000, 'Инактивированный антиген', 'Nita-Farm', 'Эмульсия', AnimalType.CATTLE, 5, true, false],
    ['Вакцина антирабическая', 'vaccines', 38000, 'Штамм RV-97', 'InVet', 'Раствор для инъекций', AnimalType.PETS, 1, false, true],
    ['Тилозин 200 инъекционный', 'antibiotics', 95000, 'Тилозина тартрат', 'VIC', 'Раствор для инъекций', AnimalType.CATTLE, 5, false, false],
    ['Амоксициллин 15% LA', 'antibiotics', 128000, 'Амоксициллин', 'KRKA', 'Суспензия', AnimalType.CATTLE, 4, true, false],
    ['Окситетрациклин 20%', 'antibiotics', 76000, 'Окситетрациклин', 'VetPharma', 'Раствор для инъекций', AnimalType.SMALL_RUMINANTS, 5, false, false],
    ['Флорфеникол 30%', 'antibiotics', 158000, 'Флорфеникол', 'Invesa', 'Раствор оральный', AnimalType.POULTRY, 3, false, true],
    ['Тетравит', 'vitamins', 42000, 'A, D3, E, F', 'AgroVit', 'Раствор для инъекций', AnimalType.OTHER, 1, false, false],
    ['Витамин B-комплекс', 'vitamins', 35000, 'B1, B2, B6, B12', 'Nita-Farm', 'Раствор для инъекций', AnimalType.OTHER, 1, false, false],
    ['Кальфосет (Ca+P+Mg)', 'vitamins', 68000, 'Кальций, фосфор, магний', 'VIC', 'Раствор для инъекций', AnimalType.CATTLE, 2, true, false],
    ['Глутекс (дезинфектант)', 'disinfectants', 89000, 'Глутаровый альдегид', 'BioVet', 'Концентрат', AnimalType.OTHER, 2, false, false],
    ['Йодовит', 'disinfectants', 54000, 'Йод, ПАВ', 'AgroVit', 'Раствор', AnimalType.OTHER, 4, false, false],
    ['Дезосепт-форте', 'disinfectants', 120000, 'ЧАС, глутаральдегид', 'InVet', 'Концентрат', AnimalType.OTHER, 2, false, true],
    ['Пробиотик Ветом 1.1', 'feed-additives', 64000, 'Bacillus subtilis', 'Biotech', 'Порошок', AnimalType.POULTRY, 5, false, false],
    ['Аминокислотный комплекс', 'feed-additives', 98000, 'Лизин, метионин', 'VetPharma', 'Порошок', AnimalType.POULTRY, 5, true, false],
    ['Ферментный премикс', 'feed-additives', 72000, 'Ксиланаза, фитаза', 'AgroVit', 'Гранулы', AnimalType.POULTRY, 10, false, false],
    ['Мел кормовой', 'feed-additives', 18000, 'Карбонат кальция', 'VIC', 'Порошок', AnimalType.CATTLE, 20, false, false],
    ['Экспресс-тест на мастит', 'diagnostics', 47000, 'Индикаторный реагент', 'InVet', 'Набор', AnimalType.CATTLE, 5, false, true],
    ['Тест-полоски (кетоз)', 'diagnostics', 56000, 'BHB-реагент', 'Biotech', 'Полоски', AnimalType.CATTLE, 3, false, false],
    ['Шприцы ветеринарные 20мл', 'other', 1200, null, 'MedSupply', 'Одноразовые', AnimalType.OTHER, 100, false, false],
    ['Перчатки смотровые (100шт)', 'other', 42000, null, 'MedSupply', 'Нитрил', AnimalType.OTHER, 5, false, false],
  ];

  let extra = 0;
  for (const [name, slug, price, sub, man, form, animal, mo, promo, isNewFlag] of EXTRA) {
    if (!catMap[slug]) continue;
    if (await prisma.product.findFirst({ where: { name } })) continue;
    await prisma.product.create({
      data: {
        name,
        description: `${name}. Производитель: ${man}. Форма: ${form}.`,
        categoryId: catMap[slug],
        price,
        manufacturer: man,
        form,
        animalType: animal,
        minOrder: mo,
        inStock: true,
        images: imgOf(slug),
        isPromotion: promo,
        promotionText: promo ? 'Спец. цена' : null,
        isNew: isNewFlag,
        sellerId: seller.id,
        ...(sub ? { activeSubstance: sub } : {}),
      },
    });
    extra++;
  }
  console.log(`✓ extended catalog: +${extra} products`);
}

main()
  .then(() => console.log('Seed complete.'))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
