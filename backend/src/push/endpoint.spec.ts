import { isPushEndpointAllowed } from './endpoint';

describe('адрес push-подписки', () => {
  it('подписки настоящих браузеров принимаются', () => {
    expect(isPushEndpointAllowed('https://fcm.googleapis.com/fcm/send/abc:def')).toBe(true);
    expect(isPushEndpointAllowed('https://updates.push.services.mozilla.com/wpush/v2/gAAA')).toBe(true);
    expect(isPushEndpointAllowed('https://web.push.apple.com/QGxyz')).toBe(true);
    expect(isPushEndpointAllowed('https://wns2-par02p.notify.windows.com/w/?token=x')).toBe(true);
  });

  it('внутренние и произвольные адреса — нет (SSRF)', () => {
    expect(isPushEndpointAllowed('http://localhost:8000/api/maintenance/reset')).toBe(false);
    expect(isPushEndpointAllowed('http://169.254.169.254/latest/meta-data')).toBe(false);
    expect(isPushEndpointAllowed('https://evil.example.com/collect')).toBe(false);
    expect(isPushEndpointAllowed('https://fcm.googleapis.com.evil.example.com/x')).toBe(false);
    expect(isPushEndpointAllowed('http://fcm.googleapis.com/fcm/send/x')).toBe(false);
    expect(isPushEndpointAllowed('https://fcm.googleapis.com:8443/x')).toBe(false);
    expect(isPushEndpointAllowed('https://user:pw@fcm.googleapis.com/x')).toBe(false);
    expect(isPushEndpointAllowed('not a url')).toBe(false);
    expect(isPushEndpointAllowed(undefined)).toBe(false);
  });
});
