import { PrismaClient } from '@prisma/client';
import { packPriceOf } from '../common/pricing';
import { PUBLIC_OFFER } from '../common/visibility';
import { pickBestOffer } from './best-offer';

// Пересчёт денормализованных агрегатов товара (minPrice / offersCount / наличие).
// minPrice — цена ЕДИНИЦЫ ЗАКАЗА (упаковки/флакона) с учётом фасовки,
// поэтому считаем в JS: SQL-агрегат не умеет price * packSize / priceUnitQty.
//
// Учитываются только предложения продавцов, которым можно продавать: иначе
// карточка обещала бы цену, по которой заказ отклонят. Поэтому пересчёт нужен
// и тогда, когда меняется статус продавца, а не только его предложения.
//
// Цена «от» и минимальный заказ — из того предложения, которое подберёт заказ
// (best-offer.ts). Если у карточки есть предложения, наличие тоже их: раньше
// карточка из импорта с нулевым остатком говорила «в наличии», хотя на складе
// не было ни у кого.
//
// Функция, а не метод OffersService: её зовут и админка пользователей, и сид,
// не втягивая модуль предложений в свои зависимости. Принимает PrismaClient —
// сервис Nest его расширяет, а сид работает с клиентом напрямую.
export async function recalcProductAggregates(prisma: PrismaClient, productId: string) {
  const offers = await prisma.offer.findMany({ where: { productId, ...PUBLIC_OFFER } });
  const best = pickBestOffer(offers);
  await prisma.product.update({
    where: { id: productId },
    data: {
      minPrice: best ? packPriceOf(best) : null,
      offerMinOrder: best ? best.minOrder : null,
      offersCount: offers.length,
      ...(offers.length ? { inStock: offers.some((o) => o.inStock) } : {}),
    },
  });
}

// Статус продавца поменялся: пересчитать все товары, где у него есть предложения.
export async function recalcSellerProducts(prisma: PrismaClient, sellerId: string) {
  const rows = await prisma.offer.findMany({
    where: { sellerId },
    distinct: ['productId'],
    select: { productId: true },
  });
  for (const { productId } of rows) await recalcProductAggregates(prisma, productId);
}
