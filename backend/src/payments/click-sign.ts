// Проверка подписи колбэка Click Shop API.
//
// Подпись — md5 от полей запроса и секрета магазина. Раньше секрет брался из
// окружения как есть: когда CLICK_SECRET_KEY не задан, в строку подставлялось
// буквальное «undefined» (а из docker-compose — пустая строка), и подпись мог
// посчитать любой. Оплату любого платежа можно было провести без денег. Payme
// в той же ситуации отказывает (нет ключа — нет доступа); Click теперь тоже.

import { createHash, timingSafeEqual } from 'crypto';

export type ClickStage = 'prepare' | 'complete';

// Тело колбэка как пришло (form-urlencoded — строки); доверять полям можно
// только после проверки подписи.
export type ClickParams = Record<string, unknown>;

// Состояние подготовки в Payment.meta.
export type ClickMeta = { clickPrepareId?: string };

export function clickMeta(json: unknown): ClickMeta {
  return json && typeof json === 'object' && !Array.isArray(json) ? (json as ClickMeta) : {};
}

export interface ClickConfig {
  serviceId?: string | null;
  secret?: string | null;
}

// Действие, которое Click присылает на каждом шаге протокола.
const ACTION: Record<ClickStage, string> = { prepare: '0', complete: '1' };

const md5 = (s: string) => createHash('md5').update(s).digest('hex');

export function clickSignatureValid(p: ClickParams, cfg: ClickConfig, stage: ClickStage): boolean {
  const secret = (cfg.secret ?? '').trim();
  const serviceId = String(cfg.serviceId ?? '').trim();
  // Без секрета или сервиса проверять нечем: такой магазин колбэки не принимает.
  if (!secret || !serviceId) return false;
  if (!p || typeof p !== 'object') return false;
  // Колбэк обязан прийти для нашего сервиса: подпись чужого сервиса Click с
  // тем же секретом (или подобранная) здесь силы не имеет.
  if (String(p.service_id ?? '') !== serviceId) return false;
  if (String(p.action ?? '') !== ACTION[stage]) return false;

  const f = (k: string) => String(p[k]);
  const prepareId = stage === 'complete' ? f('merchant_prepare_id') : '';
  const expected = md5(
    `${f('click_trans_id')}${f('service_id')}${secret}${f('merchant_trans_id')}${prepareId}${f('amount')}${f('action')}${f('sign_time')}`,
  );
  const given = typeof p.sign_string === 'string' ? p.sign_string.toLowerCase() : '';
  if (given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}
