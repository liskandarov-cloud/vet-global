import { Prisma, PrismaClient } from '@prisma/client';
import { packPriceOf } from '../common/pricing';
import { publicOffer } from '../common/visibility';
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
  const offers = await prisma.offer.findMany({ where: { productId, ...publicOffer() } });
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

// Наличие владельца карточки — в его собственном предложении.
//
// Кабинет, заказ, тендер и отмена меняют остаток карточки (stockQty, inStock),
// а пересчёт выше берёт наличие из предложений: «под заказ», записанное в
// карточку, затиралось следующим же пересчётом — сменой цены, правкой
// предложения, импортом. Товар с нулевым остатком снова становился «в
// наличии», и заказ проходил без подтверждения. Звать после каждого такого
// изменения, в той же транзакции.
export async function syncOwnerOfferStock(db: Prisma.TransactionClient, productId: string) {
  const p = await db.product.findUnique({ where: { id: productId }, select: { sellerId: true, stockQty: true, inStock: true } });
  if (!p) return;
  await db.offer.updateMany({
    where: { productId, sellerId: p.sellerId },
    data: { inStock: p.inStock, ...(p.stockQty != null ? { stockQty: p.stockQty } : {}) },
  });
}

// Обратное направление: владелец правит своё предложение в панели — карточка
// повторяет цену, минимальный заказ и остаток. Заказ ограничивает и списывает
// остаток карточки, а кабинет показывает её цену: без этого склад, заданный в
// предложении, заказ не видел, а продавец видел в таблице прежнюю цену.
export async function syncProductFromOwnerOffer(
  db: Prisma.TransactionClient,
  offer: { productId: string; sellerId: string; price: Prisma.Decimal; minOrder: number; inStock: boolean; stockQty: number | null },
) {
  await db.product.updateMany({
    where: { id: offer.productId, sellerId: offer.sellerId },
    data: {
      price: offer.price,
      minOrder: offer.minOrder,
      inStock: offer.inStock,
      ...(offer.stockQty != null ? { stockQty: offer.stockQty } : {}),
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
