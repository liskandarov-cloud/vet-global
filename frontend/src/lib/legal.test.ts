import { describe, expect, it } from 'vitest';
import { LEGAL_DOCS, type LegalDocKey } from './legal';
import { LEGAL_SECTIONS_UZ } from './legal-uz';

// Узбекская редакция — перевод русской: разделы должны совпадать один к
// одному, иначе при правке одной из них вторая молча отстанет.
describe('юридические документы', () => {
  for (const key of Object.keys(LEGAL_DOCS) as LegalDocKey[]) {
    it(`${key}: узбекская редакция совпадает по разделам и абзацам`, () => {
      const ru = LEGAL_DOCS[key].sections;
      const uz = LEGAL_SECTIONS_UZ[key];
      expect(uz.map((s) => s.h.split('.')[0])).toEqual(ru.map((s) => s.h.split('.')[0]));
      expect(uz.map((s) => s.p.length)).toEqual(ru.map((s) => s.p.length));
    });

    it(`${key}: места для юриста есть в обеих редакциях`, () => {
      const count = (secs: { p: string[] }[]) => secs.flatMap((s) => s.p).join(' ').match(/\[[^\]]+\]/g)?.length ?? 0;
      expect(count(LEGAL_SECTIONS_UZ[key])).toBe(count(LEGAL_DOCS[key].sections));
    });
  }
});
