import { integrationsStatus } from './integrations';

const status = (vars: Record<string, string>) =>
  Object.fromEntries(integrationsStatus((k) => vars[k]).map((s) => [s.key, s]));

describe('сводка интеграций', () => {
  it('прод без ключей — всё выключено, и видно, чего не хватает', () => {
    const s = status({ SEED_DEMO: 'false', PAYMENTS_MODE: 'mock', DIDOX_MODE: 'mock' });
    expect(Object.values(s).every((x) => x.state === 'off')).toBe(true);
    expect(s.click.missing).toEqual(['CLICK_SERVICE_ID', 'CLICK_MERCHANT_ID', 'CLICK_SECRET_KEY']);
    expect(s.didox.missing).toEqual(['DIDOX_TOKEN']);
  });

  it('ключи включают ровно свою интеграцию', () => {
    const s = status({ TELEGRAM_BOT_TOKEN: 't', PAYME_MERCHANT_ID: 'm', PAYME_KEY: 'k', RESEND_API_KEY: 'r' });
    expect([s.telegram.state, s.payme.state, s.mail.state]).toEqual(['live', 'live', 'live']);
    expect([s.click.state, s.uzum.state, s.sms.state]).toEqual(['off', 'off', 'off']);
  });

  it('демо-стенд — оплата и ЭДО в имитации', () => {
    const s = status({ SEED_DEMO: 'true' });
    expect([s.click.state, s.payme.state, s.uzum.state, s.didox.state]).toEqual(['demo', 'demo', 'demo', 'demo']);
  });

  // Сводка видна в браузере админа: секрет в ней не должен оказаться никогда.
  it('значения ключей не отдаются', () => {
    const json = JSON.stringify(integrationsStatus((k) => (k === 'PAYME_KEY' ? 'super-secret' : undefined)));
    expect(json).not.toContain('super-secret');
  });
});
