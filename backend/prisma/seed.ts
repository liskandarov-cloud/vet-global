import {
  PrismaClient, UserRole, AnimalType, OrderStatus,
  LeadSource, LeadStatus, ConsultStatus, VetPointsType,
  DeliveryMethod, ShipmentStatus, PaymentProvider, PaymentStatus,
  OrgRole, ApprovalStatus, PaymentTerm,
} from '@prisma/client';
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
    { email: 'zoovet@vetglobal.com', password: 'seller123', fullName: 'Бахтиёр Усмонов', phone: '+998901112237', company: 'ООО «ZooVet Import»', inn: '305678901', description: 'Импорт вакцин и биопрепаратов для птицеводства (Ceva, MSD, Boehringer).', rating: 4.6, reviewsCount: 9 },
    { email: 'agroline@vetglobal.com', password: 'seller123', fullName: 'Феруза Хакимова', phone: '+998901112238', company: 'ООО «AgroLine Central Asia»', inn: '306789012', description: 'Кормовые добавки, ферменты и премиксы (Evonik, Adisseo, dsm-firmenich).', rating: 4.4, reviewsCount: 7 },
    { email: 'medvet@vetglobal.com', password: 'seller123', fullName: 'Рустам Абдуллаев', phone: '+998901112239', company: 'ООО «MedVet Farm»', inn: '307890123', description: 'Антибактериальные и противопаразитарные препараты (KRKA, Interchemie, Bioveta).', rating: 4.5, reviewsCount: 11 },
    { email: 'vitapharm@vetglobal.com', password: 'seller123', fullName: 'Гульнора Юсупова', phone: '+998901112240', company: 'ООО «VitaPharm Uz»', inn: '308901234', description: 'Витамины, минеральные комплексы и тонизирующие препараты (Nita-Farm, Vetoquinol).', rating: 4.2, reviewsCount: 6 },
    { email: 'diagnostika@vetglobal.com', password: 'seller123', fullName: 'Шухрат Тошматов', phone: '+998901112241', company: 'ООО «DiagnoLab»', inn: '309012345', description: 'Диагностические тест-системы и лабораторное оборудование (IDEXX, Zoetis).', rating: 4.7, reviewsCount: 8 },
    { email: 'fermaservis@vetglobal.com', password: 'seller123', fullName: 'Дилноза Раупова', phone: '+998901112242', company: 'ООО «Ferma Servis»', inn: '310123456', description: 'Всё для животноводческих ферм: инструмент, бирки, расходники (Allflex, HSW).', rating: 4.1, reviewsCount: 4 },
    { email: 'globalvet@vetglobal.com', password: 'seller123', fullName: 'Отабек Собиров', phone: '+998901112243', company: 'ООО «GlobalVet Distribution»', inn: '311234567', description: 'Мультибрендовый дистрибьютор ветпрепаратов и кормов по всему Узбекистану.', rating: 4.8, reviewsCount: 14 },
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

  // Реальные тематические изображения (Wikimedia Commons, CC), захостены во фронте
  // /public/products/*. Каждое проверено вручную на релевантность.
  const CAT_IMAGES: Record<string, string[]> = {
    vaccines: ['/products/vaccine.jpg', '/products/vaccine2.jpg'],
    antibiotics: ['/products/tablets.jpg', '/products/vaccine2.jpg'],
    vitamins: ['/products/vaccine.jpg', '/products/cattle.jpg'],
    'feed-additives': ['/products/feed.jpg', '/products/cattle.jpg'],
    disinfectants: ['/products/disinfectant.jpg', '/products/disinfectant2.jpg'],
    diagnostics: ['/products/lab.jpg', '/products/tablets.jpg'],
    other: ['/products/lab.jpg', '/products/disinfectant.jpg'],
  };
  const catImg = (slug: string, i = 0): string[] => {
    const arr = CAT_IMAGES[slug] ?? CAT_IMAGES.other;
    return [arr[i % arr.length]];
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

    // ── Расширенный ассортимент (полное наполнение) ──
    ['Вакцина против инфекционного бронхита кур', 'vaccines', 98000, 'Штамм H120', 'Boehringer Ingelheim', 'Лиофилизат', AnimalType.POULTRY, 10, false, false],
    ['Вакцина против оспы птиц', 'vaccines', 61000, 'Аттенуированный вирус', 'Ceva Santé Animale', 'Лиофилизат', AnimalType.POULTRY, 10, false, false],
    ['Вакцина против бешенства (Nobivac Rabies)', 'vaccines', 42000, 'Инактивированный вирус', 'MSD Animal Health', 'Суспензия', AnimalType.PETS, 1, false, false],
    ['Вакцина против бруцеллёза КРС', 'vaccines', 88000, 'Штамм RB-51', 'Zoetis', 'Лиофилизат', AnimalType.CATTLE, 5, false, false],
    ['Вакцина комплексная для собак (DHPPi)', 'vaccines', 55000, 'Мультивалентная', 'Virbac', 'Лиофилизат', AnimalType.PETS, 1, false, true],
    ['Цефтиофур 5% суспензия', 'antibiotics', 165000, 'Цефтиофур', 'Zoetis', 'Суспензия', AnimalType.CATTLE, 3, false, false],
    ['Гентамицин 4% инъекционный', 'antibiotics', 58000, 'Гентамицин', 'Interchemie', 'Раствор для инъекций', AnimalType.SMALL_RUMINANTS, 5, false, false],
    ['Доксициклин 20% порошок', 'antibiotics', 84000, 'Доксициклин', 'KRKA', 'Порошок оральный', AnimalType.POULTRY, 5, true, false],
    ['Сульфадиметоксин + триметоприм', 'antibiotics', 69000, 'Сульфаниламид', 'Bioveta', 'Раствор оральный', AnimalType.POULTRY, 5, false, false],
    ['Тилмикозин 30% инъекционный', 'antibiotics', 142000, 'Тилмикозин', 'Elanco', 'Раствор для инъекций', AnimalType.CATTLE, 3, false, true],
    ['Селенит натрия + витамин E', 'vitamins', 39000, 'Селен, токоферол', 'Nita-Farm', 'Раствор для инъекций', AnimalType.CATTLE, 2, false, false],
    ['Бутофан тонизирующий', 'vitamins', 47000, 'Бутафосфан, B12', 'Vetoquinol', 'Раствор для инъекций', AnimalType.OTHER, 2, false, false],
    ['Мультивитамин для птицы (водораств.)', 'vitamins', 52000, 'A,D3,E,K,группа B', 'Interchemie', 'Порошок', AnimalType.POULTRY, 5, true, false],
    ['Железодекстран для поросят', 'vitamins', 44000, 'Железа декстран', 'Bioveta', 'Раствор для инъекций', AnimalType.OTHER, 3, false, false],
    ['Токсин-байндер (микосорб)', 'feed-additives', 96000, 'Глюкоманнан', 'Alltech', 'Порошок', AnimalType.POULTRY, 10, false, false],
    ['Пробиотик для КРС', 'feed-additives', 78000, 'Lactobacillus', 'dsm-firmenich', 'Порошок', AnimalType.CATTLE, 5, false, false],
    ['Метионин кормовой', 'feed-additives', 88000, 'DL-метионин', 'Evonik', 'Гранулы', AnimalType.POULTRY, 20, false, false],
    ['Фитаза (фермент) 5000 FTU', 'feed-additives', 112000, 'Фитаза', 'dsm-firmenich', 'Гранулы', AnimalType.POULTRY, 10, true, false],
    ['Монокальцийфосфат кормовой', 'feed-additives', 26000, 'MCP', 'Provimi', 'Гранулы', AnimalType.CATTLE, 25, false, false],
    ['Виркон S (окислитель)', 'disinfectants', 138000, 'Пероксисульфат калия', 'CID Lines', 'Порошок', AnimalType.OTHER, 2, false, true],
    ['Хлоргексидин 5% концентрат', 'disinfectants', 46000, 'Хлоргексидина биглюконат', 'Virbac', 'Концентрат', AnimalType.OTHER, 4, false, false],
    ['Кальция гипохлорит', 'disinfectants', 32000, 'Гипохлорит кальция', 'Kersia', 'Порошок', AnimalType.OTHER, 5, false, false],
    ['Тест-набор ИФА на лейкоз КРС', 'diagnostics', 320000, 'ELISA антитела', 'IDEXX', 'Набор', AnimalType.CATTLE, 1, false, false],
    ['Экспресс-тест на стельность КРС', 'diagnostics', 78000, 'PAG-реагент', 'IDEXX', 'Набор', AnimalType.CATTLE, 2, false, true],
    ['Иглы инъекционные (уп. 100 шт)', 'other', 24000, null, 'Henke-Sass Wolf', 'Одноразовые', AnimalType.OTHER, 20, false, false],
    ['Шприц-дозатор автоматический 2 мл', 'other', 185000, null, 'Henke-Sass Wolf', 'Многоразовый', AnimalType.OTHER, 2, false, false],
    ['Бирки ушные для КРС (уп. 100 шт)', 'other', 96000, null, 'Allflex', 'Пластик', AnimalType.CATTLE, 5, false, false],
    ['Перчатки ректальные (уп. 50 шт)', 'other', 38000, null, 'Mercator Medical', 'Полиэтилен', AnimalType.CATTLE, 10, false, false],
  ];

  // Миграция переименованных товаров + схлопывание дубликатов.
  await prisma.product.updateMany({
    where: { name: 'Пробиотик Ветом 1.1' },
    data: { name: 'Пробиотик для птицы' },
  });
  {
    const dups = await prisma.product.findMany({
      where: { name: 'Пробиотик для птицы' },
      orderBy: { createdAt: 'asc' },
    });
    // Удаляем лишние дубли, если на них нет позиций заказов (офферы удалятся каскадно).
    for (const d of dups.slice(1)) {
      const used = await prisma.orderItem.count({ where: { productId: d.id } });
      if (used === 0) await prisma.product.delete({ where: { id: d.id } });
    }
    // Гарантируем корректное фото/бренд у оставшихся одноимённых.
    await prisma.product.updateMany({
      where: { name: 'Пробиотик для птицы' },
      data: { images: ['/products/feed.jpg'], manufacturer: 'Alltech' },
    });
  }

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
  const BLOG_IMG = [
    '/products/cattle.jpg', '/products/lab.jpg', '/products/vaccine2.jpg',
    '/products/feed.jpg', '/products/disinfectant.jpg', '/products/vaccine.jpg',
  ];
  if (adminForBlog) {
    let bposts = 0;
    for (let i = 0; i < POSTS.length; i++) {
      const p = POSTS[i];
      const slug = slugify(p.title);
      const image = BLOG_IMG[i % BLOG_IMG.length];
      const existing = await prisma.blogPost.findUnique({ where: { slug } });
      if (existing) {
        await prisma.blogPost.update({ where: { slug }, data: { image } }); // добавить обложку
      } else {
        await prisma.blogPost.create({
          data: { ...p, image, slug, authorId: adminForBlog.id, authorName: adminForBlog.fullName, published: true },
        });
        bposts++;
      }
    }
    console.log(`✓ demo blog posts: +${bposts} (с обложками)`);
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

  // ═══════════ ДЕМО-НАПОЛНЕНИЕ ДЛЯ ПРЕЗЕНТАЦИИ (идемпотентно) ═══════════
  {
    const buyerMain = await prisma.user.findUnique({ where: { email: 'buyer@vetglobal.com' } });
    const farm2 = await prisma.user.findUnique({ where: { email: 'farm2@vetglobal.com' } });
    const clinic = await prisma.user.findUnique({ where: { email: 'clinic@vetglobal.com' } });
    const sellerMain = await prisma.user.findUnique({ where: { email: 'seller@vetglobal.com' } });
    const allProducts = await prisma.product.findMany({ orderBy: { createdAt: 'asc' } });
    const allSellers = await prisma.user.findMany({ where: { role: UserRole.SELLER } });

    if (buyerMain) {
      // Сертификаты на офферы и товары (анти-фальсификат).
      await prisma.offer.updateMany({ data: { certificates: ['/products/certificate.pdf'] } });
      await prisma.product.updateMany({ data: { certificates: ['/products/certificate.pdf'] } });
      const someOffers = await prisma.offer.findMany({ take: 45 });
      for (let i = 0; i < someOffers.length; i++) {
        if (i % 3 !== 0) await prisma.offer.update({ where: { id: someOffers[i].id }, data: { certVerified: true } });
      }

      // Финансирование: одобренный лимит + заявки.
      await prisma.user.update({ where: { id: buyerMain.id }, data: { creditLimit: 50_000_000, creditUsed: 14_500_000 } });
      if ((await prisma.creditApplication.count({ where: { buyerId: buyerMain.id } })) === 0) {
        await prisma.creditApplication.create({ data: { buyerId: buyerMain.id, requestedLimit: 50_000_000, approvedLimit: 50_000_000, status: 'APPROVED', bankName: 'Банк-партнёр VetGlobal', purpose: 'Пополнение оборотных средств на закупку вакцин', decidedAt: new Date() } });
        await prisma.creditApplication.create({ data: { buyerId: buyerMain.id, requestedLimit: 30_000_000, status: 'PENDING', bankName: 'Банк-партнёр VetGlobal', purpose: 'Сезонная закупка кормовых добавок' } });
      }

      // Контрагенты (юрлица).
      if ((await prisma.counterparty.count({ where: { userId: buyerMain.id } })) === 0) {
        await prisma.counterparty.create({ data: { userId: buyerMain.id, name: 'Птицефабрика «Заря»', inn: '305556677', mfo: '00842', bankAccount: '20208000900000000001', address: 'Ташкентская обл., Кибрайский р-н', isDefault: true } });
        await prisma.counterparty.create({ data: { userId: buyerMain.id, name: 'ООО «Заря-Агро»', inn: '305556688', mfo: '00842', bankAccount: '20208000900000000002', address: 'г. Ташкент, Юнусабадский р-н' } });
      }

      // VetPoints — история операций.
      if ((await prisma.vetPointsTransaction.count({ where: { userId: buyerMain.id } })) === 0) {
        const orders5 = await prisma.order.findMany({ where: { buyerId: buyerMain.id }, take: 5, orderBy: { createdAt: 'desc' } });
        for (const o of orders5) {
          const earned = Number(o.vetPointsEarned);
          if (earned > 0) await prisma.vetPointsTransaction.create({ data: { userId: buyerMain.id, amount: earned, type: VetPointsType.EARNED, description: `Начислено за заказ #${o.id.slice(0, 8)}`, orderId: o.id, createdAt: o.createdAt } });
        }
        await prisma.vetPointsTransaction.create({ data: { userId: buyerMain.id, amount: -5000, type: VetPointsType.SPENT, description: 'Оплата части заказа баллами' } });
      }

      // Избранное.
      if ((await prisma.favorite.count({ where: { userId: buyerMain.id } })) === 0) {
        for (const p of allProducts.slice(0, 5)) {
          await prisma.favorite.create({ data: { userId: buyerMain.id, productId: p.id } }).catch(() => undefined);
        }
      }

      // Подписки (автопополнение).
      if ((await prisma.subscription.count({ where: { buyerId: buyerMain.id } })) < 3) {
        for (const p of allProducts.slice(2, 4)) {
          const off = await prisma.offer.findFirst({ where: { productId: p.id } });
          await prisma.subscription.create({ data: { buyerId: buyerMain.id, productId: p.id, offerId: off?.id ?? null, quantity: Math.max(p.minOrder, 5), intervalDays: 30, nextRunAt: new Date(Date.now() + 20 * 86400000) } }).catch(() => undefined);
        }
      }

      // Обогащение заказов: доставка / оплата / счёт / условия оплаты.
      const myOrders = await prisma.order.findMany({ where: { buyerId: buyerMain.id, status: { not: OrderStatus.CANCELLED } }, orderBy: { createdAt: 'desc' }, take: 6 });
      if (myOrders[0] && !(await prisma.shipment.findUnique({ where: { orderId: myOrders[0].id } }))) {
        const o = myOrders[0];
        await prisma.order.update({ where: { id: o.id }, data: { paymentTerm: PaymentTerm.NET_TERMS, netTermDays: 30, dueDate: new Date(Date.now() + 20 * 86400000) } });
        await prisma.shipment.create({ data: { orderId: o.id, method: DeliveryMethod.TRANSPORT, status: ShipmentStatus.IN_TRANSIT, city: 'Ташкент', address: 'Юнусабадский р-н, ул. Амира Темура 15', recipientName: o.buyerName, recipientPhone: o.buyerPhone, cost: 120000, carrier: 'BTS Express', trackingNumber: 'BTS-2026-004417', estimatedDate: new Date(Date.now() + 3 * 86400000) } });
        await prisma.payment.create({ data: { orderId: o.id, provider: PaymentProvider.PAYME, amount: o.total, status: PaymentStatus.PAID, providerTransId: 'pm_demo_' + o.id.slice(0, 6) } });
        await prisma.invoice.upsert({ where: { orderId: o.id }, create: { orderId: o.id, number: `VG-2026-${o.id.slice(0, 6).toUpperCase()}`, amount: o.total, didoxStatus: 'SIGNED', didoxId: 'dx_' + o.id.slice(0, 8), signedAt: new Date() }, update: { didoxStatus: 'SIGNED', signedAt: new Date() } });
      }
      if (myOrders[1] && !(await prisma.shipment.findUnique({ where: { orderId: myOrders[1].id } }))) {
        const o = myOrders[1];
        const total = Number(o.total); const n = 3; const per = Math.round(total / n);
        const schedule = Array.from({ length: n }, (_, i) => ({ n: i + 1, dueDate: new Date(Date.now() + (i + 1) * 30 * 86400000).toISOString(), amount: i === n - 1 ? total - per * (n - 1) : per }));
        await prisma.order.update({ where: { id: o.id }, data: { paymentTerm: PaymentTerm.INSTALLMENT, installments: n, paymentSchedule: schedule as any, dueDate: new Date(schedule[n - 1].dueDate) } });
        await prisma.shipment.create({ data: { orderId: o.id, method: DeliveryMethod.COURIER, status: ShipmentStatus.DELIVERED, city: 'Ташкент', recipientName: o.buyerName, recipientPhone: o.buyerPhone, cost: 45000, carrier: 'Собственная доставка', trackingNumber: 'VG-DLV-1188' } });
        await prisma.payment.create({ data: { orderId: o.id, provider: PaymentProvider.CLICK, amount: o.total, status: PaymentStatus.PAID, providerTransId: 'ck_demo_' + o.id.slice(0, 6) } });
      }
      if (myOrders[2] && !(await prisma.payment.findFirst({ where: { orderId: myOrders[2].id } }))) {
        const o = myOrders[2];
        await prisma.payment.create({ data: { orderId: o.id, provider: PaymentProvider.UZUM, amount: o.total, status: PaymentStatus.PAID, providerTransId: 'uz_demo_' + o.id.slice(0, 6) } });
        await prisma.invoice.upsert({ where: { orderId: o.id }, create: { orderId: o.id, number: `VG-2026-${o.id.slice(0, 6).toUpperCase()}`, amount: o.total, didoxStatus: 'SIGNED', signedAt: new Date() }, update: {} });
      }

      // Организация: команда + согласование.
      const membership = await prisma.orgMembership.findFirst({ where: { userId: buyerMain.id } });
      let orgId = membership?.orgId;
      if (!orgId) {
        const org = await prisma.organization.create({ data: { name: 'Агрохолдинг «Нурли Ер»', inn: '305556677', members: { create: { userId: buyerMain.id, role: OrgRole.OWNER, spendLimit: 0 } } } });
        orgId = org.id;
      }
      if (orgId) {
        if (farm2 && !(await prisma.orgMembership.findFirst({ where: { userId: farm2.id } }))) {
          await prisma.orgMembership.create({ data: { orgId, userId: farm2.id, role: OrgRole.PURCHASER, spendLimit: 3_000_000 } });
        }
        if (clinic && !(await prisma.orgMembership.findFirst({ where: { userId: clinic.id } }))) {
          await prisma.orgMembership.create({ data: { orgId, userId: clinic.id, role: OrgRole.MANAGER, spendLimit: 0 } });
        }
        if (farm2 && !(await prisma.order.findFirst({ where: { orgId, approvalStatus: ApprovalStatus.PENDING } }))) {
          const p = allProducts[4];
          const off = await prisma.offer.findFirst({ where: { productId: p.id }, orderBy: { price: 'asc' } });
          const price = off ? Number(off.price) : Number(p.price);
          const qty = Math.max(p.minOrder, 10);
          await prisma.order.create({ data: {
            buyerId: farm2.id, buyerName: farm2.fullName, buyerPhone: farm2.phone, buyerCompany: farm2.company,
            orgId, approvalStatus: ApprovalStatus.PENDING, status: OrderStatus.PENDING,
            subtotal: price * qty, total: price * qty, commission: Math.round(price * qty * 0.12), vetPointsEarned: Math.round(price * qty * 0.01),
            items: { create: [{ productId: p.id, offerId: off?.id ?? null, productName: p.name, sellerId: off?.sellerId ?? p.sellerId, quantity: qty, price }] },
          } });
        }
      }

      // RFQ (запросы цен) с котировками.
      if ((await prisma.rfq.count({ where: { buyerId: buyerMain.id } })) === 0) {
        const rfqOpen = await prisma.rfq.create({ data: {
          buyerId: buyerMain.id, title: 'Вакцины для птицефабрики на Q3', note: 'Требуется поставка на 3 месяца, оплата по факту.', status: 'OPEN',
          items: { create: [{ name: 'Вакцина против болезни Ньюкасла, 1000 доз', quantity: 200 }, { name: 'Вакцина против Гамборо, 1000 доз', quantity: 150 }] },
        } });
        const q1 = allSellers[0], q2 = allSellers[1], q3 = allSellers[4] ?? allSellers[2];
        if (q1) await prisma.rfqQuote.create({ data: { rfqId: rfqOpen.id, sellerId: q1.id, totalPrice: 18_500_000, leadTimeDays: 7, note: 'Склад в Ташкенте, отгрузка сразу.' } });
        if (q2) await prisma.rfqQuote.create({ data: { rfqId: rfqOpen.id, sellerId: q2.id, totalPrice: 17_900_000, leadTimeDays: 10, note: 'Лучшая цена, срок 10 дней.' } });
        if (q3 && q3.id !== q1?.id && q3.id !== q2?.id) await prisma.rfqQuote.create({ data: { rfqId: rfqOpen.id, sellerId: q3.id, totalPrice: 19_200_000, leadTimeDays: 5, note: 'Быстрая поставка.' } });
        const rfqAwarded = await prisma.rfq.create({ data: {
          buyerId: buyerMain.id, title: 'Кормовые добавки для КРС', note: 'Закрыт — выбран поставщик.', status: 'AWARDED',
          items: { create: [{ name: 'Токсин-байндер, 25 кг', quantity: 40 }] },
        } });
        if (q1) await prisma.rfqQuote.create({ data: { rfqId: rfqAwarded.id, sellerId: q1.id, totalPrice: 9_600_000, leadTimeDays: 6, isAwarded: true } });
        if (q2) await prisma.rfqQuote.create({ data: { rfqId: rfqAwarded.id, sellerId: q2.id, totalPrice: 10_100_000, leadTimeDays: 4 } });
      }
    }

    // Лиды (CRM).
    if ((await prisma.lead.count()) === 0) {
      await prisma.lead.create({ data: { source: LeadSource.TELEGRAM, fullName: 'Азизбек Норматов', phone: '+998901234567', productName: 'Вакцина против болезни Ньюкасла', quantity: 100, message: 'Заявка из Telegram-бота', status: LeadStatus.NEW } });
      await prisma.lead.create({ data: { source: LeadSource.WEB, fullName: 'Дилшод Каримов', phone: '+998907654321', productName: 'Энрофлоксацин 10%', message: 'Интересует опт, нужна цена', status: LeadStatus.CONTACTED } });
      await prisma.lead.create({ data: { source: LeadSource.TELEGRAM, fullName: 'Мадина Юлдашева', phone: '+998901112299', message: 'Нужна консультация по вакцинации КРС', status: LeadStatus.NEW } });
    }

    // Консультации.
    if ((await prisma.consultRequest.count()) === 0) {
      await prisma.consultRequest.create({ data: { fullName: 'Ойбек Расулов', phone: '+998901239988', topic: 'Схема вакцинации бройлеров', animalType: AnimalType.POULTRY, message: 'Подскажите схему вакцинации для бройлеров на 45 дней.', status: ConsultStatus.NEW } });
      await prisma.consultRequest.create({ data: { fullName: 'Нилуфар Азимова', phone: '+998901237766', topic: 'Мастит у КРС', animalType: AnimalType.CATTLE, message: 'Как лечить субклинический мастит в стаде?', status: ConsultStatus.ANSWERED, answer: 'Рекомендуем противомаститные препараты по результатам теста. Свяжемся детально.', answeredBy: 'Ветконсультант VetGlobal' } });
    }

    // Отзыв на модерации.
    if (buyerMain && (await prisma.review.count({ where: { isApproved: false } })) === 0) {
      const rp = allProducts[7];
      const exists = await prisma.review.findUnique({ where: { productId_buyerId: { productId: rp.id, buyerId: buyerMain.id } } }).catch(() => null);
      if (!exists) await prisma.review.create({ data: { productId: rp.id, buyerId: buyerMain.id, buyerName: buyerMain.fullName, rating: 5, comment: 'Отличный препарат, заказываем повторно. Ждём модерации.', isApproved: false } }).catch(() => undefined);
    }

    // Акции продавцов (Promotion) — наполняет /promotions и /promotions/mine.
    if ((await prisma.promotion.count()) === 0) {
      const promoProducts = await prisma.product.findMany({ where: { isPromotion: true }, take: 8 });
      const disc = [10, 12, 15, 20, 15, 10, 25, 12];
      for (let i = 0; i < promoProducts.length; i++) {
        const p = promoProducts[i];
        await prisma.promotion.create({ data: { sellerId: p.sellerId, productId: p.id, title: `Скидка на «${p.name}»`, description: 'Специальная цена при оптовом заказе.', discountPercent: disc[i % disc.length], endsAt: new Date(Date.now() + 30 * 86400000), isActive: true } }).catch(() => undefined);
      }
    }

    // 1С sync-ключ продавцу.
    if (sellerMain && !sellerMain.syncApiKey) {
      await prisma.user.update({ where: { id: sellerMain.id }, data: { syncApiKey: 'vg_sync_' + sellerMain.id.slice(0, 12) } });
    }

    console.log('✓ demo enrichment done (financing, orders, org, rfq, leads, consults, promos, certs)');
  }
}

main()
  .then(() => console.log('Seed complete.'))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
