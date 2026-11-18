import { createHash } from 'crypto';
import { clickSignatureValid } from './click-sign';

// Протокол Click подтверждает оплату подписью md5 с секретом магазина.
//
// Секрет брался из окружения без проверки, что он вообще задан. На проде его
// нет (PAYMENTS_MODE=mock, CLICK_SECRET_KEY не заведён), и в строку подписи
// подставлялось буквальное «undefined» (или пустая строка из compose): подпись
// мог посчитать кто угодно и провести «оплату» любого платежа без денег.

const md5 = (s: string) => createHash('md5').update(s).digest('hex');

// Подпись завершения: click_trans_id + service_id + secret + merchant_trans_id
// + merchant_prepare_id + amount + action + sign_time. У подготовки нет
// merchant_prepare_id.
function body(secret: string, stage: 'prepare' | 'complete', over: Record<string, any> = {}) {
  const p: Record<string, any> = {
    click_trans_id: '777',
    service_id: '12345',
    merchant_trans_id: 'pay-1',
    ...(stage === 'complete' ? { merchant_prepare_id: 'pay-1' } : {}),
    amount: '150000',
    action: stage === 'complete' ? '1' : '0',
    sign_time: '2026-11-18 10:00:00',
    ...over,
  };
  const prep = stage === 'complete' ? `${p.merchant_prepare_id}` : '';
  p.sign_string = md5(
    `${p.click_trans_id}${p.service_id}${secret}${p.merchant_trans_id}${prep}${p.amount}${p.action}${p.sign_time}`,
  );
  return p;
}

describe('Click: подпись колбэка', () => {
  it('без секрета магазина колбэк не принимается — даже с подписью от «undefined»', () => {
    const cfg = { serviceId: '12345', secret: undefined };
    expect(clickSignatureValid(body('undefined', 'complete'), cfg, 'complete')).toBe(false);
    expect(clickSignatureValid(body('undefined', 'prepare'), cfg, 'prepare')).toBe(false);
  });

  it('пустой секрет (compose подставляет "") — тоже отказ', () => {
    const cfg = { serviceId: '12345', secret: '' };
    expect(clickSignatureValid(body('', 'complete'), cfg, 'complete')).toBe(false);
  });

  it('без идентификатора сервиса — отказ', () => {
    const cfg = { serviceId: undefined, secret: 's3cret' };
    expect(clickSignatureValid(body('s3cret', 'complete'), cfg, 'complete')).toBe(false);
  });

  it('подпись под чужой сервис не принимается', () => {
    const cfg = { serviceId: '12345', secret: 's3cret' };
    expect(clickSignatureValid(body('s3cret', 'complete', { service_id: '99999' }), cfg, 'complete')).toBe(false);
  });

  it('действие должно соответствовать шагу протокола', () => {
    const cfg = { serviceId: '12345', secret: 's3cret' };
    // Подпись подготовки (action=0) не годится для завершения и наоборот.
    expect(clickSignatureValid(body('s3cret', 'complete', { action: '0' }), cfg, 'complete')).toBe(false);
    expect(clickSignatureValid(body('s3cret', 'prepare', { action: '1' }), cfg, 'prepare')).toBe(false);
  });

  it('неверная или отсутствующая подпись — отказ', () => {
    const cfg = { serviceId: '12345', secret: 's3cret' };
    expect(clickSignatureValid({ ...body('s3cret', 'complete'), sign_string: 'bad' }, cfg, 'complete')).toBe(false);
    expect(clickSignatureValid({ ...body('s3cret', 'complete'), sign_string: undefined }, cfg, 'complete')).toBe(false);
    expect(clickSignatureValid(body('other', 'complete'), cfg, 'complete')).toBe(false);
  });

  it('правильная подпись принимается на обоих шагах', () => {
    const cfg = { serviceId: '12345', secret: 's3cret' };
    expect(clickSignatureValid(body('s3cret', 'prepare'), cfg, 'prepare')).toBe(true);
    expect(clickSignatureValid(body('s3cret', 'complete'), cfg, 'complete')).toBe(true);
  });
});
