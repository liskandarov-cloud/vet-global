import { BlockList, isIPv4, isIPv6 } from 'net';

// Адрес клиента за Cloudflare и Render.
//
// Запрос идёт клиент → Cloudflare → прокси Render → приложение. trust proxy = 1
// снимает только прокси Render, и req.ip оказывался адресом узла Cloudflare —
// одним на множество посетителей: ограничитель частоты считал их одним
// клиентом (счётчик на проде прыгал 118→117→118), и перебор пароля одним
// человеком закрывал вход всем, кто шёл через тот же узел.
//
// Если запрос пришёл с адреса Cloudflare, клиент — в CF-Connecting-IP: этот
// заголовок Cloudflare всегда перезаписывает сам, подделать его нельзя. С
// любого другого адреса заголовку не верим.

// shortcut: диапазоны зашиты по https://www.cloudflare.com/ips/ (меняются
// редко); при смене — обновить список здесь.
const CLOUDFLARE_V4 = [
  '173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22', '141.101.64.0/18',
  '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20', '197.234.240.0/22', '198.41.128.0/17',
  '162.158.0.0/15', '104.16.0.0/13', '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22',
];
const CLOUDFLARE_V6 = [
  '2400:cb00::/32', '2606:4700::/32', '2803:f800::/32', '2405:b500::/32', '2405:8100::/32',
  '2a06:98c0::/29', '2c0f:f248::/32',
];

const cloudflare = new BlockList();
for (const c of CLOUDFLARE_V4) {
  const [net, bits] = c.split('/');
  cloudflare.addSubnet(net, Number(bits), 'ipv4');
}
for (const c of CLOUDFLARE_V6) {
  const [net, bits] = c.split('/');
  cloudflare.addSubnet(net, Number(bits), 'ipv6');
}

const normalize = (ip: string) => (ip.startsWith('::ffff:') && isIPv4(ip.slice(7)) ? ip.slice(7) : ip);

export function isCloudflare(ip: string): boolean {
  const a = normalize(ip);
  if (isIPv4(a)) return cloudflare.check(a, 'ipv4');
  if (isIPv6(a)) return cloudflare.check(a, 'ipv6');
  return false;
}

export function clientIp(req: { ip?: string; headers?: Record<string, string | string[] | undefined> }): string {
  const ip = normalize(req.ip ?? '');
  const header = req.headers?.['cf-connecting-ip'];
  const cf = Array.isArray(header) ? header[0] : header;
  if (cf && isCloudflare(ip) && (isIPv4(cf) || isIPv6(cf))) return normalize(cf);
  return ip;
}
