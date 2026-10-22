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

// Предложение продавца по товару, доступное покупателю.
export const PUBLIC_OFFER = {
  isActive: true,
  seller: SELLABLE_SELLER,
} satisfies Prisma.OfferWhereInput;

export function canSell(seller: { isVerified: boolean; isBanned: boolean } | null | undefined): boolean {
  return !!seller && seller.isVerified && !seller.isBanned;
}
