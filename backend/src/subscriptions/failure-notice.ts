// Плановый заказ по подписке не оформился — что сказать покупателю.
//
// Без уведомления сбой оставался только в логе сервера: продавец поднял
// минимальный заказ, удалил предложение или товар ушёл с продажи — а покупатель
// думал, что поставки идут. Попытка повторяется каждую ночь, поэтому то же
// уведомление не чаще раза в неделю (REPEAT_AFTER_MS).
export const REPEAT_AFTER_MS = 7 * 86_400_000;

export function subscriptionFailureNotice(productName: string | null | undefined, error: unknown) {
  const reason =
    error instanceof Error && error.message ? error.message : typeof error === 'string' && error ? error : 'неизвестная ошибка';
  // Точка в конце причины («…5 шт.») не должна удваиваться.
  return {
    title: 'Регулярный заказ не оформлен',
    body: `«${productName || 'Товар'}»: ${reason.replace(/[.!\s]+$/, '')}. Мы повторим попытку завтра — проверьте подписку.`,
    url: '/subscriptions',
  };
}
