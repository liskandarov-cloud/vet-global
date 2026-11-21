import { Alert, tt } from '../alerts/text';
import { translateToUz } from '../common/i18n/uz-messages';

// Плановый заказ по подписке не оформился — что сказать покупателю.
//
// Без уведомления сбой оставался только в логе сервера: продавец поднял
// минимальный заказ, удалил предложение или товар ушёл с продажи — а покупатель
// думал, что поставки идут. Попытка повторяется каждую ночь, поэтому то же
// уведомление не чаще раза в неделю (REPEAT_AFTER_MS).
export const REPEAT_AFTER_MS = 7 * 86_400_000;

export function subscriptionFailureNotice(productName: string | null | undefined, error: unknown): Alert {
  const reason =
    error instanceof Error && error.message ? error.message : typeof error === 'string' && error ? error : 'неизвестная ошибка';
  // Причина — сообщение сервера; по-узбекски — тем же словарём, что и ошибки.
  // Точка в конце причины («…5 шт.») не должна удваиваться.
  const trim = (t: string) => t.replace(/[.!\s]+$/, '');
  const uz = translateToUz(reason) ?? (reason === 'неизвестная ошибка' ? 'nomaʼlum xato' : reason);
  return {
    title: tt('Регулярный заказ не оформлен', 'Muntazam buyurtma rasmiylashtirilmadi'),
    body: tt(
      `«${productName || 'Товар'}»: ${trim(reason)}. Мы повторим попытку завтра — проверьте подписку.`,
      `«${productName || 'Tovar'}»: ${trim(uz)}. Ertaga yana urinib koʻramiz — obunani tekshiring.`,
    ),
    url: '/subscriptions',
  };
}
