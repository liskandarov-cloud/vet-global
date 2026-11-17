import { normalizeMxik, normalizePackageCode } from './mxik';

describe('normalizeMxik', () => {
  it('принимает 17 цифр и снимает разделители', () => {
    expect(normalizeMxik('03004001001000000')).toBe('03004001001000000');
    expect(normalizeMxik('03004 001-001.000000')).toBe('03004001001000000');
  });

  it('восстанавливает ведущие нули, съеденные Excel', () => {
    expect(normalizeMxik(3004001001000000)).toBe('03004001001000000');
    expect(normalizeMxik('304001001000000')).toBe('00304001001000000');
  });

  it('отвергает мусор и слишком короткие/длинные коды', () => {
    expect(normalizeMxik('')).toBeNull();
    expect(normalizeMxik(null)).toBeNull();
    expect(normalizeMxik('abc')).toBeNull();
    expect(normalizeMxik('12345')).toBeNull();
    expect(normalizeMxik('123456789012345678')).toBeNull();
  });
});

describe('normalizePackageCode', () => {
  it('принимает только цифры', () => {
    expect(normalizePackageCode(' 1500563 ')).toBe('1500563');
    expect(normalizePackageCode('шт')).toBeNull();
    expect(normalizePackageCode('')).toBeNull();
  });
});
