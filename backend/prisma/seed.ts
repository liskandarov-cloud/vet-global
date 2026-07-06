import { PrismaClient, UserRole, AnimalType, OrderStatus } from '@prisma/client';
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
  // Демо-дистрибьюторы (вымышленные компании; распространяют реальные мировые бренды).
  const SELLERS = [
    { email: 'seller@vetglobal.com', password: 'seller123', fullName: 'Иван Поставщиков', phone: '+998901112233', company: 'ООО «ВетФарм Импорт»', inn: '301234567', description: 'Импорт и дистрибуция ветпрепаратов и вакцин ведущих мировых брендов (Zoetis, MSD, Ceva, KRKA).', rating: 4.7, reviewsCount: 12 },
    { email: 'agrovet@vetglobal.com', password: 'seller123', fullName: 'Дилшод Рахимов', phone: '+998901112234', company: 'ООО «AgroVet Distribution»', inn: '302345678', description: 'Кормовые добавки, премиксы и ферменты для птицефабрик и КРС (Alltech, dsm-firmenich, Provimi).', rating: 4.5, reviewsCount: 8 },
    { email: 'biopharm@vetglobal.com', password: 'seller123', fullName: 'Санжар Юлдашев', phone: '+998901112235', company: 'ООО «BioPharm Central Asia»', inn: '303456789', description: 'Вакцины, диагностика и антибактериальные препараты (Boehringer Ingelheim, Hipra, IDEXX).', rating: 4.8, reviewsCount: 15 },
    { email: 'vetsnab@vetglobal.com', password: 'seller123', fullName: 'Азиз Каримов', phone: '+998901112236', company: 'ООО «ВетСнаб»', inn: '304567890', description: 'Ветеринарный инструмент, расходники и дезинфекция (Virbac, CID Lines, Kersia).', rating: 4.3, reviewsCount: 5 },
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
  const buyers: { id: string; name: string; phone: string; company: string }[] = [];
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
    buyers.push({ id: u.id, name: b.fullName, phone: b.phone, company: b.company });
  }
  console.log(`✓ demo buyers: ${buyers.length} (buyer@vetglobal.com / buyer123)`);

  // ── Demo products ──
  const vaccines = await prisma.category.findUnique({ where: { slug: 'vaccines' } });
  const antibiotics = await prisma.category.findUnique({ where: { slug: 'antibiotics' } });
  const vitamins = await prisma.category.findUnique({ where: { slug: 'vitamins' } });

  // Курированные royalty-free изображения по категориям (URL проверены на 200), с разнообразием.
  const CAT_IMAGES: Record<string, string[]> = {
    vaccines: ['1584362917165-526a968579e8', '1631549916768-4119b2e5f926', '1584308666744-24d5c474f2ae'],
    antibiotics: ['1471864190281-a93a3070b6de', '1607619056574-7b8d3ee536b2', '1589927986089-35812388d1f4'],
    vitamins: ['1550572017-edd951b55104', '1582719478250-c89cae4dc85b'],
    'feed-additives': ['1518977676601-b53f82aba655', '1560493676-04071c5f467b'],
    disinfectants: ['1576091160399-112ba8d25d1d', '1628771065518-0d82f1938462'],
    diagnostics: ['1579154204601-01588f351e67', '1576091160399-112ba8d25d1d'],
    other: ['1547908068-35ea7b47a21d', '1589927986089-35812388d1f4'],
  };
  const catImg = (slug: string, i = 0): string[] => {
    const arr = CAT_IMAGES[slug] ?? CAT_IMAGES.other;
    const id = arr[i % arr.length];
    return [`https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=80`];
  };

  const demoProducts = [
    {
      name: 'Вакцина против болезни Ньюкасла (штамм Ла-Сота)',
      nameUz: 'Nyukasl kasalligiga qarshi vaksina',
      description: 'Живая сухая вакцина для профилактической иммунизации птицы. Флакон 1000 доз.',
      categoryId: vaccines?.id,
      price: 85000,
      activeSubstance: 'Штамм La Sota',
      manufacturer: 'Ceva Santé Animale',
      form: 'Лиофилизат',
      animalType: AnimalType.POULTRY,
      minOrder: 10,
      isPromotion: true,
      promotionText: '-15% до конца месяца',
      images: catImg('vaccines', 0),
    },
    {
      name: 'Энрофлоксацин 10% раствор оральный',
      nameUz: 'Enrofloksatsin 10% eritma',
      description: 'Антибактериальный препарат широкого спектра для птицы и КРС. Канистра 1 л.',
      categoryId: antibiotics?.id,
      price: 120000,
      activeSubstance: 'Энрофлоксацин',
      manufacturer: 'KRKA',
      form: 'Раствор оральный',
      animalType: AnimalType.CATTLE,
      minOrder: 5,
      images: catImg('antibiotics', 0),
    },
    {
      name: 'Витаминный комплекс АД3Е',
      nameUz: 'AD3E vitamin kompleksi',
      description: 'Масляный раствор витаминов A, D3, E для всех видов животных. Флакон 100 мл.',
      categoryId: vitamins?.id,
      price: 45000,
      activeSubstance: 'Ретинол, Холекальциферол, Токоферол',
      manufacturer: 'Interchemie',
      form: 'Раствор для инъекций',
      animalType: AnimalType.OTHER,
      minOrder: 1,
      isNew: true,
      images: catImg('vitamins', 0),
    },
  ];

  let sIdx = 0; // round-robin seller assignment across the whole catalog
  for (const p of demoProducts) {
    if (!p.categoryId) continue;
    const exists = await prisma.product.findFirst({ where: { name: p.name } });
    if (exists) {
      // Обновляем реальный бренд и картинку у существующих товаров.
      await prisma.product.update({
        where: { id: exists.id },
        data: { manufacturer: p.manufacturer, images: p.images, description: p.description },
      });
    } else {
      await prisma.product.create({
        data: { ...p, categoryId: p.categoryId, sellerId: sellers[sIdx++ % sellers.length].id },
      });
    }
  }
  console.log(`✓ demo products seeded (real brands + images)`);

  // ── Extended catalog (all categories) for a lively storefront ──
  const catMap = Object.fromEntries(
    (await prisma.category.findMany()).map((c) => [c.slug, c.id] as const),
  );
  type P = [string, string, number, string | null, string, string, AnimalType, number, boolean, boolean];
  // Производители — реальные бренды-изготовители соответствующей продукции.
  const EXTRA: P[] = [
    ['Вакцина против болезни Гамборо', 'vaccines', 92000, 'Штамм Winterfield 2512', 'Boehringer Ingelheim', 'Лиофилизат', AnimalType.POULTRY, 10, false, true],
    ['Вакцина против болезни Марека', 'vaccines', 110000, 'Herpesvirus turkey', 'MSD Animal Health', 'Суспензия', AnimalType.POULTRY, 5, false, false],
    ['Вакцина против ящура КРС', 'vaccines', 145000, 'Инактивированный антиген', 'Hipra', 'Эмульсия', AnimalType.CATTLE, 5, true, false],
    ['Вакцина антирабическая', 'vaccines', 38000, 'Штамм RV-97', 'Zoetis', 'Раствор для инъекций', AnimalType.PETS, 1, false, true],
    ['Тилозин 200 инъекционный', 'antibiotics', 95000, 'Тилозина тартрат', 'Interchemie', 'Раствор для инъекций', AnimalType.CATTLE, 5, false, false],
    ['Амоксициллин 15% LA', 'antibiotics', 128000, 'Амоксициллин', 'KRKA', 'Суспензия', AnimalType.CATTLE, 4, true, false],
    ['Окситетрациклин 20%', 'antibiotics', 76000, 'Окситетрациклин', 'Bioveta', 'Раствор для инъекций', AnimalType.SMALL_RUMINANTS, 5, false, false],
    ['Флорфеникол 30%', 'antibiotics', 158000, 'Флорфеникол', 'Vetoquinol', 'Раствор оральный', AnimalType.POULTRY, 3, false, true],
    ['Тетравит', 'vitamins', 42000, 'A, D3, E, F', 'Nita-Farm', 'Раствор для инъекций', AnimalType.OTHER, 1, false, false],
    ['Витамин B-комплекс', 'vitamins', 35000, 'B1, B2, B6, B12', 'Interchemie', 'Раствор для инъекций', AnimalType.OTHER, 1, false, false],
    ['Кальфосет (Ca+P+Mg)', 'vitamins', 68000, 'Кальций, фосфор, магний', 'Vetoquinol', 'Раствор для инъекций', AnimalType.CATTLE, 2, true, false],
    ['Глутекс (дезинфектант)', 'disinfectants', 89000, 'Глутаровый альдегид', 'CID Lines', 'Концентрат', AnimalType.OTHER, 2, false, false],
    ['Йодовит', 'disinfectants', 54000, 'Йод, ПАВ', 'Virbac', 'Раствор', AnimalType.OTHER, 4, false, false],
    ['Дезосепт-форте', 'disinfectants', 120000, 'ЧАС, глутаральдегид', 'Kersia', 'Концентрат', AnimalType.OTHER, 2, false, true],
    ['Пробиотик для птицы', 'feed-additives', 64000, 'Bacillus subtilis', 'Alltech', 'Порошок', AnimalType.POULTRY, 5, false, false],
    ['Аминокислотный комплекс', 'feed-additives', 98000, 'Лизин, метионин', 'Evonik', 'Порошок', AnimalType.POULTRY, 5, true, false],
    ['Ферментный премикс', 'feed-additives', 72000, 'Ксиланаза, фитаза', 'dsm-firmenich', 'Гранулы', AnimalType.POULTRY, 10, false, false],
    ['Мел кормовой', 'feed-additives', 18000, 'Карбонат кальция', 'Provimi', 'Порошок', AnimalType.CATTLE, 20, false, false],
    ['Экспресс-тест на мастит', 'diagnostics', 47000, 'Индикаторный реагент', 'IDEXX', 'Набор', AnimalType.CATTLE, 5, false, true],
    ['Тест-полоски (кетоз)', 'diagnostics', 56000, 'BHB-реагент', 'IDEXX', 'Полоски', AnimalType.CATTLE, 3, false, false],
    ['Шприцы ветеринарные 20мл', 'other', 1200, null, 'Henke-Sass Wolf', 'Одноразовые', AnimalType.OTHER, 100, false, false],
    ['Перчатки смотровые (100шт)', 'other', 42000, null, 'Mercator Medical', 'Нитрил', AnimalType.OTHER, 5, false, false],
  ];

  let extra = 0;
  for (const [name, slug, price, sub, man, form, animal, mo, promo, isNewFlag] of EXTRA) {
    if (!catMap[slug]) continue;
    const images = catImg(slug, extra);
    const existing = await prisma.product.findFirst({ where: { name } });
    if (existing) {
      // Обновляем реальный бренд-производитель и картинку у уже засеянных товаров.
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          manufacturer: man,
          images,
          form,
          description: `${name}. Производитель: ${man}. Форма: ${form}.`,
          ...(sub ? { activeSubstance: sub } : {}),
        },
      });
    } else {
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
          images,
          isPromotion: promo,
          promotionText: promo ? 'Спец. цена' : null,
          isNew: isNewFlag,
          sellerId: sellers[sIdx++ % sellers.length].id,
          ...(sub ? { activeSubstance: sub } : {}),
        },
      });
    }
    extra++;
  }
  console.log(`✓ extended catalog: ${extra} products (real brands + images)`);

  // ── Мульти-поставщик: офферы (сравнение цен) ──
  // Базовый оффер продавца-владельца + конкурирующие офферы других продавцов
  // для части товаров, чтобы на карточке было видно сравнение цен.
  {
    const prods = await prisma.product.findMany({ orderBy: { createdAt: 'asc' } });
    let offerCount = 0;
    for (let i = 0; i < prods.length; i++) {
      const p = prods[i];
      const base = Number(p.price);
      // Владелец товара — первый оффер (цена = базовой).
      const ownerId = p.sellerId;
      // Ещё 1–2 продавца, отличных от владельца, дают свою цену (±5–15%).
      const others = sellers.map((s) => s.id).filter((id) => id !== ownerId);
      const competitorCount = i % 3 === 0 ? 2 : i % 3 === 1 ? 1 : 0;
      const chosen = [ownerId, ...others.slice(0, competitorCount)];

      for (let k = 0; k < chosen.length; k++) {
        const sellerId = chosen[k];
        // Владелец = base; конкуренты — дешевле/дороже детерминированно.
        const delta = k === 0 ? 0 : (k === 1 ? -0.07 : 0.05) + (i % 5) * 0.01;
        const price = Math.max(1, Math.round(base * (1 + delta)));
        // Объёмная цена для владельца (демо price breaks).
        const priceBreaks =
          k === 0
            ? [
                { minQty: (p.minOrder || 1) * 5, price: Math.round(price * 0.95) },
                { minQty: (p.minOrder || 1) * 20, price: Math.round(price * 0.9) },
              ]
            : undefined;
        await prisma.offer.upsert({
          where: { productId_sellerId: { productId: p.id, sellerId } },
          create: {
            productId: p.id,
            sellerId,
            price,
            inStock: true,
            stockQty: 50 + ((i * 7 + k * 13) % 450),
            minOrder: p.minOrder || 1,
            leadTimeDays: [1, 2, 3, 5, 7][(i + k) % 5],
            netTermDays: k === 0 ? [0, 0, 30, 60][i % 4] : 0,
            priceBreaks: priceBreaks as any,
            regNumber: `UZ-VET-${1000 + i}-${k}`,
            batchNumber: `L${2026}${String((i % 12) + 1).padStart(2, '0')}-${100 + k}`,
            // срок годности 12–30 мес. от «сейчас» (детерминированно от индекса).
            expiryDate: new Date(2027, (i % 12), 1 + (k % 27)),
            isRx: p.name.toLowerCase().includes('антибиотик') || i % 6 === 0,
            certVerified: k === 0,
          },
          update: {},
        });
        offerCount++;
      }

      // Пересчёт агрегатов товара.
      const agg = await prisma.offer.aggregate({
        where: { productId: p.id, isActive: true, inStock: true },
        _min: { price: true },
        _count: { _all: true },
      });
      await prisma.product.update({
        where: { id: p.id },
        data: { minPrice: agg._min.price ?? null, offersCount: agg._count._all },
      });
    }
    console.log(`✓ offers seeded: ${offerCount} (сравнение цен)`);
  }

  // ── Бренды (блок 4): из производителей товаров, часть — спонсируемые ──
  {
    const brandSlug = (s: string) =>
      s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'brand';
    const mans = await prisma.product.findMany({
      where: { manufacturer: { not: null } },
      distinct: ['manufacturer'],
      select: { manufacturer: true },
    });
    const names = mans.map((m) => m.manufacturer!).filter(Boolean);
    // Удаляем устаревшие бренды, которых больше нет среди производителей товаров.
    await prisma.brand.deleteMany({ where: { name: { notIn: names } } });
    // Спонсируемые — известные бренды (демо).
    const preferSponsored = ['Zoetis', 'MSD Animal Health', 'Ceva Santé Animale', 'Boehringer Ingelheim'];
    const sponsored = new Set(names.filter((n) => preferSponsored.includes(n)).slice(0, 3));
    const usedSlugs = new Set<string>();
    let bc = 0;
    for (const name of names) {
      let slug = brandSlug(name);
      while (usedSlugs.has(slug)) slug = `${slug}-${bc}`;
      usedSlugs.add(slug);
      const isSp = sponsored.has(name);
      await prisma.brand.upsert({
        where: { name },
        create: {
          name,
          slug,
          isSponsored: isSp,
          sponsorRank: isSp ? 10 : 0,
          description: `${name} — производитель ветеринарных препаратов и кормовых решений.`,
        },
        update: {},
      });
      bc++;
    }
    console.log(`✓ brands seeded: ${bc} (спонсируемых: ${sponsored.size})`);
  }

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

  // ── Demo blog posts (по материалам канала @vet_uz) ──
  const CYR: Record<string, string> = {
    а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
  };
  const slugify = (s: string) =>
    s.toLowerCase().split('').map((c) => CYR[c] ?? c).join('').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80);

  const adminForBlog = await prisma.user.findUnique({ where: { email: adminEmail } });
  const SRC = "\n\n_По материалам канала @vet_uz (Veterinariya va Qishloq Xo'jaligi)._";
  const POSTS = [
    { title: 'Стресс и иммунитет: невидимая связь и большие потери', excerpt: 'Как стресс-факторы повышают кортизол и подавляют иммунитет животных.', content: 'Стресс-факторы — транспортировка, жара, шум, смена рациона — активируют гипоталамо-гипофизарно-надпочечниковую систему, растёт кортизол, подавляющий иммунный ответ. Снижается активность макрофагов, замедляется выработка антител, ослабевает защита слизистых — растёт заболеваемость и падает эффективность вакцинации.' + SRC },
    { title: 'Системные проблемы в ветеринарном образовании', excerpt: 'О недостаточной научной обоснованности ряда дисциплин.', content: 'В ветеринарном образовании остаются системные проблемы: транслируемая информация нередко не имеет достаточной научной обоснованности, а подтверждённые исследованиями подходы иногда отвергаются. Итог — разрыв между тем, чему учат, и тем, что работает в поле.' + SRC },
    { title: 'Критическое мышление — новая базовая грамотность', excerpt: 'Ни диплом, ни стаж не спасут, если не умеешь думать.', content: 'Мир меняется быстрее, чем обновляются учебники. Умение проверять источники, считать и учиться самостоятельно становится ключевым навыком специалиста.' + SRC },
    { title: 'Реалии яичного бизнеса: не только «комбикорм и яйцо»', excerpt: 'Ежедневное управление рисками: биобезопасность, микроклимат, дисциплина.', content: 'На бумаге всё просто: комбикорм, курица, яйцо, прибыль. На деле — ночные аварии, брак, десятки решений каждый день. Яичное производство — это управление рисками: биобезопасность, микроклимат, стабильность кормления.' + SRC },
    { title: 'Обзор выставки AgroWorld Uzbekistan 2026', excerpt: 'Реальной ветеринарной фармы на рынке — по пальцам пересчитать.', content: 'Из года в год выставляются одни и те же компании. Среди зарубежных ~70% — оборудование, немного кормовых добавок, и совсем мало представителей реальной ветеринарной фармы. Рынку не хватает прозрачного доступа к качественным препаратам — эту задачу и решает VetGlobal.' + SRC },
    { title: 'Масштабная перестройка системы ветеринарии', excerpt: 'Комитет реорганизован в Агентство; создан Комитет по безопасности пищевой продукции.', content: 'Комитет ветеринарии и развития животноводства реорганизован в Агентство по развитию животноводства и пастбищного хозяйства. Параллельно создан новый Комитет по безопасности пищевой продукции — меняется контур регулирования отрасли.' + SRC },
  ];
  if (adminForBlog) {
    let bposts = 0;
    for (const p of POSTS) {
      const slug = slugify(p.title);
      if (!(await prisma.blogPost.findUnique({ where: { slug } }))) {
        await prisma.blogPost.create({
          data: { ...p, slug, authorId: adminForBlog.id, authorName: adminForBlog.fullName, published: true },
        });
        bposts++;
      }
    }
    console.log(`✓ demo blog posts: +${bposts}`);
  }

  // ── Historical demo orders (spread over ~6 months) to populate analytics ──
  const MARKER = 'seed-ord-0000';
  if (!(await prisma.order.findUnique({ where: { id: MARKER } }))) {
    const catalog = await prisma.product.findMany();
    const COMMISSION_PCT = 12;
    const EARN_PCT = 1;
    const ORDER_COUNT = 28;
    const base = Date.now();

    for (let k = 0; k < ORDER_COUNT; k++) {
      const buyer = buyers[k % buyers.length];
      // Spread across the last ~180 days, denser in recent weeks.
      const daysAgo = Math.floor((k * 175) / ORDER_COUNT) + (k % 5);
      const createdAt = new Date(base - daysAgo * 24 * 3600 * 1000);

      const itemCount = (k % 3) + 1;
      const items: { productId: string; productName: string; sellerId: string; quantity: number; price: number }[] = [];
      let subtotal = 0;
      for (let j = 0; j < itemCount; j++) {
        const p = catalog[(k * 3 + j) % catalog.length];
        const qty = (((k + j) % 3) + 1) * p.minOrder;
        const price = Number(p.price);
        items.push({ productId: p.id, productName: p.name, sellerId: p.sellerId, quantity: qty, price });
        subtotal += price * qty;
      }

      const commission = Math.round((subtotal * COMMISSION_PCT) / 100);
      const vetPointsEarned = Math.round((subtotal * EARN_PCT) / 100);
      const status =
        k % 7 === 0 ? OrderStatus.PENDING : k % 7 === 1 ? OrderStatus.SHIPPED : OrderStatus.DELIVERED;

      await prisma.order.create({
        data: {
          id: k === 0 ? MARKER : undefined,
          buyerId: buyer.id,
          buyerName: buyer.name,
          buyerPhone: buyer.phone,
          buyerCompany: buyer.company,
          status,
          subtotal,
          vetPointsUsed: 0,
          total: subtotal,
          vetPointsEarned,
          commission,
          createdAt,
          items: { create: items },
        },
      });
    }
    console.log(`✓ historical demo orders: ${ORDER_COUNT}`);
  } else {
    console.log('✓ historical demo orders already present');
  }
}

main()
  .then(() => console.log('Seed complete.'))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
