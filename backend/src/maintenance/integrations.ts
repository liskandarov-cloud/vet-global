// Сводка интеграций для админки: что работает по-настоящему, что в демо, чего
// не хватает. Значения ключей не отдаются — только имена недостающих.
//
// Режимы считаются теми же функциями, что и сами сервисы, чтобы сводка не
// разошлась с поведением.
import { PaymentProvider } from '@prisma/client';
import { onlinePaymentMode, payProviders, PROVIDER_KEYS } from '../payments/payable';
import { didoxMode } from '../didox/mode';

export type IntegrationState = 'live' | 'demo' | 'off';

export interface IntegrationStatus {
  key: string;
  title: string;
  state: IntegrationState;
  missing: string[];
  how: string;
}

type Get = (key: string) => string | undefined;

export function integrationsStatus(get: Get): IntegrationStatus[] {
  const lacking = (...keys: string[]) => keys.filter((k) => !get(k));
  const byKeys = (...keys: string[]): IntegrationState => (lacking(...keys).length ? 'off' : 'live');
  const api = (get('PUBLIC_API_URL') ?? 'https://api.vethub.uz').replace(/\/(api\/?)?$/, '');

  const payMode = onlinePaymentMode(get('PAYMENTS_MODE'), get('SEED_DEMO'));
  const live = payProviders(payMode, get);
  const pay = (p: PaymentProvider): IntegrationState => (payMode === 'mock' ? 'demo' : live.includes(p) ? 'live' : 'off');

  const smtp = get('SMTP_HOST');
  const didox = didoxMode(get);

  return [
    {
      key: 'mail',
      title: 'Почта (Resend)',
      state: get('RESEND_API_KEY') ? 'live' : smtp === 'ethereal' ? 'demo' : smtp ? 'live' : 'off',
      missing: get('RESEND_API_KEY') || smtp ? [] : ['RESEND_API_KEY'],
      how: 'resend.com → API Keys; домен vethub.uz подтвердить в Resend (DNS-записи добавить в Cloudflare).',
    },
    {
      key: 'sms',
      title: 'SMS (Eskiz)',
      state: byKeys('ESKIZ_EMAIL', 'ESKIZ_PASSWORD'),
      missing: lacking('ESKIZ_EMAIL', 'ESKIZ_PASSWORD'),
      how: 'Договор с eskiz.uz: логин и пароль SMS-шлюза; тексты SMS согласовать в Eskiz как шаблоны.',
    },
    {
      key: 'telegram',
      title: 'Telegram-бот',
      state: byKeys('TELEGRAM_BOT_TOKEN'),
      missing: lacking('TELEGRAM_BOT_TOKEN'),
      how: 'Токен от @BotFather. TELEGRAM_ADMIN_CHAT_ID — чат команды: новые заказы, заявки, продавцы на проверке, заявки на кредит.',
    },
    {
      key: 'click',
      title: 'Оплата Click',
      state: pay(PaymentProvider.CLICK),
      missing: lacking(...PROVIDER_KEYS.CLICK),
      how: `Договор с Click (схема Shop API). В кабинете Click: Prepare URL ${api}/api/payments/click/prepare, Complete URL ${api}/api/payments/click/complete.`,
    },
    {
      key: 'payme',
      title: 'Оплата Payme',
      state: pay(PaymentProvider.PAYME),
      missing: lacking(...PROVIDER_KEYS.PAYME),
      how: `Договор с Payme Business: ID мерчанта и «Key для системы». Endpoint в кабинете: ${api}/api/payments/payme.`,
    },
    {
      key: 'uzum',
      title: 'Оплата UZUM',
      state: pay(PaymentProvider.UZUM),
      missing: [],
      how: 'Договор с Uzum Bank: мерчант-API выдаётся по договору, после этого подключается в коде.',
    },
    {
      key: 'didox',
      title: 'ЭДО Didox и подпись E-IMZO',
      state: didox,
      missing: lacking('DIDOX_TOKEN'),
      how: 'Партнёрский токен Didox (аккаунт-менеджер @Didox_account). Боевой контур: DIDOX_BASE_URL=https://api-partners.didox.uz. Документы подписываются ЭЦП в кабинете Didox.',
    },
    {
      key: 'push',
      title: 'Push-уведомления',
      state: byKeys('VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY'),
      missing: lacking('VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY'),
      how: 'Ключи VAPID выпускает workflow «VAPID rotate» в GitHub Actions.',
    },
    {
      key: 'alerts',
      title: 'Оповещения о сбоях',
      state: byKeys('ERROR_WEBHOOK_URL'),
      missing: lacking('ERROR_WEBHOOK_URL'),
      how: 'URL вебхука: Telegram Bot API sendMessage (тогда ещё ERROR_WEBHOOK_CHAT_ID), Slack или Discord.',
    },
  ];
}
