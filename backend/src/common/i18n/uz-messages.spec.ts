import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import { UZ_MESSAGES } from './uz-messages.data';
import { localizeErrorBody, translateToUz, wantsUz } from './uz-messages';

// Сообщения, которые сервер отдаёт пользователю: текст в исключениях, а также
// в модулях, где сообщения собираются функциями (статусы заказа, оплата,
// права в организации, ЭДО) и в константах входа.
const SRC = join(__dirname, '../..');
const HELPERS = ['orders/status.ts', 'payments/payable.ts', 'organizations/permissions.ts', 'didox/mode.ts'];
const LIT = String.raw`(\`(?:[^\`\\]|\\.)*\`|'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*")`;
const CYR = /[А-Яа-яЁё]/;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : /\.ts$/.test(n) && !/\.spec\./.test(n) ? [p] : [];
  });
}

function messagesInCode(): Set<string> {
  const out = new Set<string>();
  for (const p of files(SRC)) {
    const rel = relative(SRC, p);
    const s = readFileSync(p, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
      .replace(/\s\/\/[^'"`\n]*$/gm, '');
    const lits = [...s.matchAll(new RegExp(String.raw`[A-Za-z]+Exception\(\s*` + LIT, 'g'))].map((m) => m[1]);
    if (rel === 'auth/auth.service.ts') lits.push(...[...s.matchAll(new RegExp('const [A-Z_]+ = ' + LIT, 'g'))].map((m) => m[1]));
    if (HELPERS.includes(rel)) lits.push(...[...s.matchAll(new RegExp(LIT, 'g'))].map((m) => m[1]));
    for (const l of lits) {
      const t = l.slice(1, -1);
      if (CYR.test(t)) out.add(t);
    }
  }
  return out;
}

describe('сообщения сервера на узбекском', () => {
  const inCode = messagesInCode();

  it('у каждого сообщения в коде есть перевод, лишних ключей нет', () => {
    expect(inCode.size).toBeGreaterThan(80);
    expect([...inCode].filter((m) => !(m in UZ_MESSAGES))).toEqual([]);
    expect(Object.keys(UZ_MESSAGES).filter((k) => !inCode.has(k))).toEqual([]);
  });

  it('переводы — латиницей, oʻ/gʻ знаком U+02BB, подстановки на месте', () => {
    for (const [ru, uz] of Object.entries(UZ_MESSAGES)) {
      expect({ ru, cyrillic: CYR.test(uz) }).toEqual({ ru, cyrillic: false });
      expect({ ru, ascii: /[oOgG]['‘’`][a-z]/.test(uz) }).toEqual({ ru, ascii: false });
      const slots = (ru.match(/\$\{/g) ?? []).length;
      expect({ ru, slots: new Set(uz.match(/\{\d+\}/g) ?? []).size }).toEqual({ ru, slots });
    }
  });

  it('точная фраза и фраза с подстановками', () => {
    expect(translateToUz('Заказ не найден')).toBe('Buyurtma topilmadi');
    expect(translateToUz('В наличии только 3 шт. — «Вироцид»')).toBe('Omborda faqat 3 dona bor — «Вироцид»');
    expect(translateToUz('Минимальный заказ для «АВИВАК-НБ» — 5 шт.')).toBe('«АВИВАК-НБ» uchun minimal buyurtma — 5 dona');
    expect(translateToUz('Из статуса PENDING нельзя перейти в DELIVERED. Допустимо: CONFIRMED, CANCELLED')).toBe(
      'PENDING holatidan DELIVERED ga oʻtib boʻlmaydi. Mumkin: CONFIRMED, CANCELLED',
    );
    expect(translateToUz('Unknown message')).toBeNull();
  });

  it('язык — по первому в Accept-Language', () => {
    expect(wantsUz('uz')).toBe(true);
    expect(wantsUz('uz-UZ,ru;q=0.8')).toBe(true);
    expect(wantsUz('ru')).toBe(false);
    expect(wantsUz('ru-RU,uz;q=0.5')).toBe(false);
    expect(wantsUz(undefined)).toBe(false);
  });

  it('тело ошибки: строка и список, непереведённое — как есть', () => {
    expect(localizeErrorBody({ statusCode: 404, message: 'Заказ не найден' })).toEqual({ statusCode: 404, message: 'Buyurtma topilmadi' });
    expect(localizeErrorBody({ statusCode: 400, message: ['Файл пустой', 'price must be a number'] })).toEqual({
      statusCode: 400,
      message: ['Fayl boʻsh', 'price must be a number'],
    });
    expect(localizeErrorBody('text')).toBe('text');
  });
});
