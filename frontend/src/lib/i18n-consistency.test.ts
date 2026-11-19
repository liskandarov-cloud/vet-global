// Переводы на всём сайте — проверка исходников, а не отдельных страниц.
//
// t('ключ') без записи в словаре показывает пользователю сам ключ
// («catalog.title»); узбекская строка с кириллицей — непереведённый текст;
// oʻ/gʻ пишутся знаком U+02BB, а не ASCII-апострофом — иначе одно и то же
// слово выглядит по-разному на соседних страницах.
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { formatMoney, setMoneyLang } from './utils';

const SRC = join(__dirname, '..');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return files(p);
    return /\.(ts|tsx)$/.test(name) && !/\.test\./.test(name) ? [p] : [];
  });
}

const STR = String.raw`('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|\`(?:[^\`\\]|\\.)*\`)`;
const TT = new RegExp(String.raw`\btt\(\s*` + STR + String.raw`\s*,\s*` + STR + String.raw`\s*\)`, 'g');
const T = /\bt\(\s*'([\w.]+)'\s*\)/g;
const CYR = /[А-Яа-яЁё]/;

const sources = files(SRC).map((p) => ({ path: relative(SRC, p), text: readFileSync(p, 'utf8') }));
const dictKeys = new Set(
  [...readFileSync(join(SRC, 'lib/i18n.tsx'), 'utf8').matchAll(/^\s*'([\w.]+)':\s*\{/gm)].map((m) => m[1]),
);

const pairs = sources.flatMap(({ path, text }) =>
  [...text.matchAll(TT)].map((m) => ({ where: `${path}:${text.slice(0, m.index).split('\n').length}`, uz: m[2].slice(1, -1) })),
);

describe('переводы', () => {
  it('исходники разобраны', () => {
    expect(pairs.length).toBeGreaterThan(500);
  });

  it('у каждого ключа t() есть перевод в словаре', () => {
    const missing = sources.flatMap(({ path, text }) =>
      [...text.matchAll(T)].filter((m) => !dictKeys.has(m[1])).map((m) => `${path}: ${m[1]}`),
    );
    expect(missing).toEqual([]);
  });

  it('в узбекских строках нет кириллицы', () => {
    const bad = pairs.filter((p) => CYR.test(p.uz.replace(/\$\{[^}]*\}/g, ''))).map((p) => `${p.where}: ${p.uz}`);
    expect(bad).toEqual([]);
  });

  it('oʻ и gʻ — знаком U+02BB', () => {
    const bad = pairs.filter((p) => /[oOgG]['‘’`][a-zA-Z]/.test(p.uz)).map((p) => `${p.where}: ${p.uz}`);
    expect(bad).toEqual([]);
  });
});

describe('валюта', () => {
  afterEach(() => setMoneyLang('ru'));

  it('по языку интерфейса', () => {
    expect(formatMoney(340000)).toMatch(/^340\s000 сум$/);
    setMoneyLang('uz');
    expect(formatMoney(340000)).toMatch(/^340\s000 soʻm$/);
  });
});
