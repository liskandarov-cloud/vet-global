// Справочные данные: реальные производители ветеринарных препаратов.
//
// Это не демо-данные. Бренд в модели не зависит от продавца и не содержит ни
// цены, ни наличия — только факты о компании, поэтому его можно заводить на
// проде. Товары так заполнить нельзя: Product требует sellerId и price, то
// есть любая карточка это чьё-то предложение с ценой, и выдумывать их за
// реальные компании недопустимо — они таких условий не давали.
//
// Зачем: при импорте прайса поле «производитель» сопоставляется с брендом
// (см. upsertBrand в products.service). Если справочник заполнен заранее,
// товар попадает в бренд с описанием и логотипом, а не создаёт пустышку.
//
// Запуск идемпотентный, можно гонять повторно: npm run seed:reference
// Существующим брендам описание дописывается только если его ещё нет —
// правки, сделанные вручную в админке, не затираются.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Описания намеренно короткие и сдержанные: страна и специализация — то, что
// проверяемо. Ни оборотов, ни дат основания, ни маркетинговых формулировок.
const MANUFACTURERS: { name: string; country: string; focus: string }[] = [
  { name: 'Zoetis', country: 'США', focus: 'вакцины, антипаразитарные и противомикробные препараты для продуктивных и домашних животных' },
  { name: 'MSD Animal Health', country: 'США', focus: 'вакцины для птицы и КРС, противопаразитарные средства, системы идентификации' },
  { name: 'Boehringer Ingelheim Animal Health', country: 'Германия', focus: 'вакцины для свиней и птицы, препараты для КРС и домашних животных' },
  { name: 'Elanco', country: 'США', focus: 'кормовые добавки, антибиотики и противопаразитарные препараты' },
  { name: 'Ceva Santé Animale', country: 'Франция', focus: 'вакцины для птицы, препараты для КРС и мелких домашних животных' },
  { name: 'Virbac', country: 'Франция', focus: 'дерматология, стоматология, вакцины и диетические корма' },
  { name: 'Vetoquinol', country: 'Франция', focus: 'препараты для КРС, свиней и домашних животных' },
  { name: 'Dechra', country: 'Великобритания', focus: 'эндокринология, дерматология и обезболивание в ветеринарии' },
  { name: 'HIPRA', country: 'Испания', focus: 'вакцины для свиней, птицы и КРС' },
  { name: 'Huvepharma', country: 'Болгария', focus: 'кормовые ферменты, кокцидиостатики и антибиотики для птицеводства' },
  { name: 'Bioveta', country: 'Чехия', focus: 'вакцины и препараты для продуктивных и домашних животных' },
  { name: 'Biowet Puławy', country: 'Польша', focus: 'вакцины и биопрепараты для животных' },
  { name: 'KRKA', country: 'Словения', focus: 'ветеринарные лекарственные препараты' },
  { name: 'LIVISTO', country: 'Испания', focus: 'противомикробные и противопаразитарные препараты для животных' },
  { name: 'Phibro Animal Health', country: 'США', focus: 'кормовые добавки, вакцины и средства нутрициологии животных' },
  { name: 'Interchemie', country: 'Нидерланды', focus: 'инъекционные и пероральные препараты для продуктивных животных' },
  { name: 'Lohmann Animal Health', country: 'Германия', focus: 'вакцины для птицеводства' },
  { name: 'Invesa', country: 'Испания', focus: 'ветеринарные препараты для продуктивных животных' },
  { name: 'Nita-Farm', country: 'Россия', focus: 'антибиотики, противопаразитарные и витаминные препараты' },
  { name: 'Мосагроген', country: 'Россия', focus: 'препараты для домашних и продуктивных животных' },
  { name: 'АВЗ', country: 'Россия', focus: 'антипаразитарные средства, витамины и зоогигиена' },
  { name: 'Ветбиохим', country: 'Россия', focus: 'вакцины и диагностические средства' },
];

async function main() {
  let created = 0;
  let described = 0;

  for (const m of MANUFACTURERS) {
    const slug = slugify(m.name);
    const description = `${m.country}. ${m.focus[0].toUpperCase()}${m.focus.slice(1)}.`;

    const existing = await prisma.brand.findFirst({
      where: { OR: [{ slug }, { name: m.name }] },
    });

    if (!existing) {
      await prisma.brand.create({ data: { name: m.name, slug, description } });
      created++;
      continue;
    }

    // Описание дописываем только пустым: ручные правки важнее справочника.
    if (!existing.description) {
      await prisma.brand.update({ where: { id: existing.id }, data: { description } });
      described++;
    }
  }

  const total = await prisma.brand.count();
  console.log(`✓ бренды: создано ${created}, описано ${described}, всего в базе ${total}`);
}

main()
  .catch((e) => {
    console.error('справочник брендов не загружен:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
