import { Prisma } from '@prisma/client';

// Кому можно продавать на площадке.
//
// Регистрация продавца открыта, а проверка ручная: администратор смотрит
// документы и лицензию. Раньше проверка влияла только на значок — продавец
// сразу после регистрации выставлял товар в публичный каталог и принимал
// заказы. Для ветпрепаратов это недопустимо.
//
// Теперь до проверки продавец готовит каталог (товары, предложения, прайс),
// но покупатели его не видят и заказать у него ничего не могут. Блокировка
// снимает продавца с витрины сразу, а не только закрывает ему вход.
//
// Правило одно на всю площадку: каталог, карточка, бренды, акции, бот,
// избранное, поставщики, заказ и тендер берут его отсюда, а не пишут своё.
export const SELLABLE_SELLER = {
  isVerified: true,
  isBanned: false,
} satisfies Prisma.UserWhereInput;

// Товар на витрине: не снят с продажи, и продавец может продавать.
export const PUBLIC_PRODUCT = {
  isActive: true,
  seller: SELLABLE_SELLER,
} satisfies Prisma.ProductWhereInput;

// Предложение продавца по товару, доступное покупателю: активно, продавцу
// можно продавать, и срок годности партии не истёк (или не указан).
//
// Раньше срок годности только подписывался на витрине («просрочено»), а
// предложение оставалось в продаже: карточка давала его выбрать, заказ
// проходил. По закону просроченный ветпрепарат продавать нельзя — теперь его
// нет ни на витрине, ни в подборе заказа, ни в цене «от».
//
// Функция, а не константа: «сейчас» у каждого запроса своё.
export function publicOffer(now: Date = new Date()) {
  return {
    isActive: true,
    seller: SELLABLE_SELLER,
    OR: [{ expiryDate: null }, { expiryDate: { gt: now } }],
  } satisfies Prisma.OfferWhereInput;
}

// Та же граница срока для одной записи (заказ по offerId из корзины):
// срок, наступивший ровно сейчас, уже истёк.
export function isExpired(expiryDate: Date | string | null | undefined, now: Date = new Date()): boolean {
  if (!expiryDate) return false;
  const t = new Date(expiryDate).getTime();
  return !Number.isNaN(t) && t <= now.getTime();
}

// «Короткий срок»: годен, но истекает меньше чем через SHORT_DATED_DAYS дней
// (по умолчанию 90). Покупатель должен видеть это до заказа.
export const SHORT_DATED_DAYS = Number(process.env.SHORT_DATED_DAYS) > 0 ? Number(process.env.SHORT_DATED_DAYS) : 90;

export function isShortDated(
  expiryDate: Date | string | null | undefined,
  now: Date = new Date(),
  days: number = SHORT_DATED_DAYS,
): boolean {
  if (!expiryDate || isExpired(expiryDate, now)) return false;
  return new Date(expiryDate).getTime() - now.getTime() < days * 86_400_000;
}

export function canSell(seller: { isVerified: boolean; isBanned: boolean } | null | undefined): boolean {
  return !!seller && seller.isVerified && !seller.isBanned;
}
