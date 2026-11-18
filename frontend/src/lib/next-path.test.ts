import { describe, expect, it } from 'vitest';
import { safeNext } from './next-path';

describe('возврат после входа', () => {
  it('путь внутри сайта', () => {
    expect(safeNext('?next=/cart')).toBe('/cart');
  });

  it('чужой сайт не принимается', () => {
    expect(safeNext('?next=https://evil.example')).toBeNull();
    expect(safeNext('?next=//evil.example')).toBeNull();
    expect(safeNext('?next=/\\evil.example')).toBeNull();
  });

  it('без параметра — null', () => {
    expect(safeNext('')).toBeNull();
  });
});
