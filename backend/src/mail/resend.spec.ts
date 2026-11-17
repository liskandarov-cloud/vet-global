import { sendViaResend } from './resend';

const msg = { from: 'VetHub <no-reply@vethub.uz>', to: ['buyer@vethub.uz'], subject: 'Тема', html: '<p>Текст</p>' };

describe('sendViaResend', () => {
  it('POST на API Resend с ключом и телом письма', async () => {
    const calls: any[] = [];
    const err = await sendViaResend('re_test', msg, async (url, init) => {
      calls.push({ url, init });
      return { ok: true, status: 200, text: async () => '' };
    });
    expect(err).toBeNull();
    expect(calls[0].url).toBe('https://api.resend.com/emails');
    expect(calls[0].init.method).toBe('POST');
    expect(calls[0].init.headers.Authorization).toBe('Bearer re_test');
    expect(JSON.parse(calls[0].init.body)).toEqual(msg);
  });

  it('ошибка провайдера возвращается текстом, а не исключением', async () => {
    const err = await sendViaResend('re_test', msg, async () => ({ ok: false, status: 422, text: async () => 'domain not verified' }));
    expect(err).toBe('Resend 422 domain not verified');
  });

  it('сетевая ошибка тоже не бросается', async () => {
    const err = await sendViaResend('re_test', msg, async () => {
      throw new Error('ECONNRESET');
    });
    expect(err).toBe('ECONNRESET');
  });
});
