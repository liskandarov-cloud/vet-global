import { describe, it, expect } from 'vitest';
import { localizedPath, stripLang } from './lang-path';

describe('язык в адресе', () => {
  it('снимает префикс', () => {
    expect(stripLang('/uz/catalog')).toBe('/catalog');
    expect(stripLang('/uz')).toBe('/');
    expect(stripLang('/catalog')).toBe('/catalog');
    expect(stripLang('/uzbek-vaccines')).toBe('/uzbek-vaccines');
  });
  it('переводит путь в другую версию', () => {
    expect(localizedPath('/products/1', 'uz')).toBe('/uz/products/1');
    expect(localizedPath('/uz/products/1', 'ru')).toBe('/products/1');
    expect(localizedPath('/', 'uz')).toBe('/uz');
    expect(localizedPath('/uz', 'uz')).toBe('/uz');
  });
});
