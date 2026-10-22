import { PrismaService } from '../prisma/prisma.service';
import { packPriceOf } from '../common/pricing';
import { SELLABLE_SELLER } from '../common/visibility';

// Пересчёт денормализованных агрегатов товара (minPrice / offersCount).
// minPrice — минимальная цена ЕДИНИЦЫ ЗАКАЗА (упаковки/флакона) с учётом фасовки,
// поэтому считаем в JS: SQL-агрегат не умеет price * packSize / priceUnitQty.
//
// Учитываются только предложения продавцов, которым можно продавать: иначе
// карточка обещала бы цену, по которой заказ отклонят. Поэтому пересчёт нужен
// и тогда, когда меняется статус продавца, а не только его предложения.
//
// Вынесено из OffersService функцией, чтобы его могла звать и админка
// пользователей, не втягивая модуль предложений в свои зависимости.
export async function recalcProductAggregates(prisma: PrismaService, productId: string) {
  const offers = await prisma.offer.findMany({
    where: { productId, isActive: true, inStock: true, seller: SELLABLE_SELLER },
  });
  // Лучшее предложение — то же, которое подберёт заказ без явного оффера:
  // самое дешёвое с учётом фасовки. Из него берутся и цена, и минимальный
  // заказ, иначе карточка обещает цену одного предложения, а минимум — другого.
  const best = offers.reduce<(typeof offers)[number] | null>(
    (cheapest, o) => (!cheapest || packPriceOf(o) < packPriceOf(cheapest) ? o : cheapest),
    null,
  );
  await prisma.product.update({
    where: { id: productId },
    data: {
      minPrice: best ? packPriceOf(best) : null,
      offerMinOrder: best ? best.minOrder : null,
      offersCount: offers.length,
    },
  });
}

// Статус продавца поменялся: пересчитать все товары, где у него есть предложения.
export async function recalcSellerProducts(prisma: PrismaService, sellerId: string) {
  const rows = await prisma.offer.findMany({
    where: { sellerId },
    distinct: ['productId'],
    select: { productId: true },
  });
  for (const { productId } of rows) await recalcProductAggregates(prisma, productId);
}
