import { brandSlug } from './brand-slug';

describe('brandSlug', () => {
  it('латиница, без страны в скобках', () => {
    expect(brandSlug('НПЦ БелАгроГен (Беларусь)')).toBe('npts-belagrogen');
    expect(brandSlug('АВИВАК')).toBe('avivak');
    expect(brandSlug('Kaesler Nutrition GmbH (Германия)')).toBe('kaesler-nutrition-gmbh');
    expect(brandSlug('CID LINES')).toBe('cid-lines');
  });

  it('пустой результат — запасной адрес', () => {
    expect(brandSlug('(—)')).toBe('brand');
  });
});
