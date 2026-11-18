import { clientIp, isCloudflare } from './client-ip';

describe('адрес клиента за Cloudflare', () => {
  it('узел Cloudflare — клиент из CF-Connecting-IP', () => {
    expect(clientIp({ ip: '172.68.10.5', headers: { 'cf-connecting-ip': '213.230.1.2' } })).toBe('213.230.1.2');
    expect(clientIp({ ip: '::ffff:162.158.1.1', headers: { 'cf-connecting-ip': '2a02:6b8::1' } })).toBe('2a02:6b8::1');
  });

  // Иначе любой подставил бы заголовок и обходил ограничитель частоты.
  it('не Cloudflare — заголовку не верим', () => {
    expect(clientIp({ ip: '95.214.1.1', headers: { 'cf-connecting-ip': '1.1.1.1' } })).toBe('95.214.1.1');
  });

  it('мусор в заголовке не принимается', () => {
    expect(clientIp({ ip: '172.68.10.5', headers: { 'cf-connecting-ip': 'не адрес' } })).toBe('172.68.10.5');
  });

  it('распознаёт диапазоны Cloudflare', () => {
    expect(isCloudflare('104.16.1.1')).toBe(true);
    expect(isCloudflare('2606:4700::6810:1')).toBe(true);
    expect(isCloudflare('8.8.8.8')).toBe(false);
  });
});
