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

  // ── Demo sellers (products are distributed across them) ──
  const SELLERS = [
    { email: 'seller@vetglobal.com', password: 'seller123', fullName: 'Иван Поставщиков', phone: '+998901112233', company: 'ООО «ВетФарм Импорт»', inn: '301234567', description: 'Официальный импортёр ветеринарных препаратов и вакцин.', rating: 4.7, reviewsCount: 12 },
    { email: 'agrovet@vetglobal.com', password: 'seller123', fullName: 'Дилшод Рахимов', phone: '+998901112234', company: 'ООО «AgroVet Distribution»', inn: '302345678', description: 'Дистрибуция кормовых добавок и премиксов для птицефабрик и КРС.', rating: 4.5, reviewsCount: 8 },
    { email: 'biopharm@vetglobal.com', password: 'seller123', fullName: 'Санжар Юлдашев', phone: '+998901112235', company: 'ООО «BioPharm Central Asia»', inn: '303456789', description: 'Производитель вакцин и диагностических систем.', rating: 4.8, reviewsCount: 15 },
    { email: 'vetsnab@vetglobal.com', password: 'seller123', fullName: 'Азиз Каримов', phone: '+998901112236', company: 'ООО «ВетСнаб»', inn: '304567890', description: 'Ветеринарный инструмент, расходники и дезинфекция.', rating: 4.3, reviewsCount: 5 },
  ];
  const sellers: { id: string }[] = [];
  for (const s of SELLERS) {
    sellers.push(
      await prisma.user.upsert({
        where: { email: s.email },
        update: {},
        create: {
          email: s.email,
          passwordHash: await bcrypt.hash(s.password, 10),
          fullName: s.fullName,
          phone: s.phone,
          company: s.company,
          inn: s.inn,
          role: UserRole.SELLER,
          isVerified: true,
          description: s.description,
          rating: s.rating,
          reviewsCount: s.reviewsCount,
        },
      }),
    );
  }
  const seller = sellers[0];
  console.log(`✓ demo sellers: ${sellers.length} (seller@vetglobal.com / seller123)`);

  // ── Demo buyers ──
  const BUYERS = [
    { email: 'buyer@vetglobal.com', password: 'buyer123', fullName: 'Пётр Закупщик', phone: '+998907778899', company: 'Птицефабрика «Заря»', inn: '305556677', points: 15000 },
    { email: 'farm2@vetglobal.com', password: 'buyer123', fullName: 'Нодира Аминова', phone: '+998907778810', company: 'Ферма КРС «Нур»', inn: '306667788', points: 3200 },
    { email: 'clinic@vetglobal.com', password: 'buyer123', fullName: 'Ветклиника «Айболит»', phone: '+998907778820', company: 'ООО «Айболит»', inn: '307778899', points: 800 },
  ];
  const buyers: { id: string; name: string }[] = [];
  for (const b of BUYERS) {
    const u = await prisma.user.upsert({
      where: { email: b.email },
      update: {},
      create: {
        email: b.email,
        passwordHash: await bcrypt.hash(b.password, 10),
        fullName: b.fullName,
        phone: b.phone,
        company: b.company,
        inn: b.inn,
        role: UserRole.BUYER,
        isVerified: true,
        vetPointsBalance: b.points,
      },
    });
    buyers.push({ id: u.id, name: b.fullName });
  }
  console.log(`✓ demo buyers: ${buyers.length} (buyer@vetglobal.com / buyer123)`);

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

  let sIdx = 0; // round-robin seller assignment across the whole catalog
  for (const p of demoProducts) {
    if (!p.categoryId) continue;
    const exists = await prisma.product.findFirst({ where: { name: p.name } });
    if (!exists) {
      await prisma.product.create({
        data: { ...p, categoryId: p.categoryId, sellerId: sellers[sIdx++ % sellers.length].id },
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
        sellerId: sellers[sIdx++ % sellers.length].id,
        ...(sub ? { activeSubstance: sub } : {}),
      },
    });
    extra++;
  }
  console.log(`✓ extended catalog: +${extra} products`);

  // ── Demo reviews & recomputed ratings ──
  const COMMENTS = [
    'Отличное качество, берём регулярно.',
    'Быстрая поставка, товар полностью соответствует.',
    'Хорошая цена, рекомендуем коллегам.',
    'Всё пришло в срок, упаковка целая.',
    'Работаем с поставщиком давно, нареканий нет.',
    'Препарат эффективный, результатом довольны.',
  ];
  const RATINGS = [5, 4, 5, 5, 4, 3];
  const COUNTS = [3, 2, 1, 2, 0]; // varied per product (some without reviews)

  const allProducts = await prisma.product.findMany({ orderBy: { createdAt: 'asc' } });
  for (let i = 0; i < allProducts.length; i++) {
    const prod = allProducts[i];
    const count = Math.min(COUNTS[i % COUNTS.length], buyers.length);
    for (let j = 0; j < count; j++) {
      const buyer = buyers[j];
      const exists = await prisma.review.findUnique({
        where: { productId_buyerId: { productId: prod.id, buyerId: buyer.id } },
      });
      if (!exists) {
        await prisma.review.create({
          data: {
            productId: prod.id,
            buyerId: buyer.id,
            buyerName: buyer.name,
            rating: RATINGS[(i + j) % RATINGS.length],
            comment: COMMENTS[(i + j) % COMMENTS.length],
            isApproved: true,
          },
        });
      }
    }
    // Recompute product aggregate from approved reviews (idempotent).
    const approved = await prisma.review.findMany({ where: { productId: prod.id, isApproved: true } });
    if (approved.length) {
      const avg = approved.reduce((a, r) => a + r.rating, 0) / approved.length;
      await prisma.product.update({
        where: { id: prod.id },
        data: { rating: Math.round(avg * 10) / 10, reviewsCount: approved.length },
      });
    }
  }

  // Recompute seller ratings from their rated products.
  for (const s of sellers) {
    const sp = await prisma.product.findMany({ where: { sellerId: s.id, reviewsCount: { gt: 0 } } });
    if (sp.length) {
      const avg = sp.reduce((a, p) => a + Number(p.rating), 0) / sp.length;
      await prisma.user.update({ where: { id: s.id }, data: { rating: Math.round(avg * 10) / 10 } });
    }
  }
  console.log('✓ demo reviews & ratings');
}

main()
  .then(() => console.log('Seed complete.'))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
