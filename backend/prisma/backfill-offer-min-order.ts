// Досчёт минимального заказа по лучшему предложению для уже существующих товаров.
//
// Колонка появилась вместе с исправлением: карточка каталога показывала цену
// лучшего предложения и минимум самого товара — разные числа, из-за чего
// покупатель добавлял одну упаковку, а заказ требовал три. У товаров, созданных
// до этого, значения нет, и до первого пересчёта карточка врала бы по-прежнему.
//
// Скрипт идемпотентен: считает то же, что и обычный пересчёт после правки
// предложения, и повторный запуск ничего не меняет.

import { PrismaClient } from '@prisma/client';
import { packPriceOf } from '../src/common/pricing';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({ select: { id: true, offerMinOrder: true } });
  let updated = 0;

  for (const product of products) {
    const offers = await prisma.offer.findMany({
      where: { productId: product.id, isActive: true, inStock: true },
    });
    const best = offers.reduce<(typeof offers)[number] | null>(
      (cheapest, o) => (!cheapest || packPriceOf(o) < packPriceOf(cheapest) ? o : cheapest),
      null,
    );
    const value = best ? best.minOrder : null;
    if (value === product.offerMinOrder) continue;

    await prisma.product.update({ where: { id: product.id }, data: { offerMinOrder: value } });
    updated++;
  }

  console.log(`товаров просмотрено: ${products.length}, обновлено: ${updated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
