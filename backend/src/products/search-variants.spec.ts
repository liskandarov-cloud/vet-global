import { cyrToLat, latToCyr, searchVariants } from './search-variants';

describe('searchVariants', () => {
  it('латинский МНН находит русскую карточку', () => {
    expect(searchVariants('Ivermectin')).toContain('ивермектин');
    expect(searchVariants('ivermektin')).toContain('ивермектин');
  });

  it('русский запрос находит латинское название бренда', () => {
    expect(searchVariants('Байтрил')).toContain('baytril');
    expect(searchVariants('ивомек')).toContain('ivomec');
  });

  it('узбекская латиница с апострофами и диграфами', () => {
    expect(latToCyr("sigir go'shti")).toBe('сигир гошти');
    expect(latToCyr('qoʻy')).toBe('кой');
    expect(latToCyr('chorva')).toBe('чорва');
  });

  it('узбекская кириллица', () => {
    expect(cyrToLat('ўғит')).toBe('ogit');
  });

  it('исходный запрос всегда первым, без дублей и пустых', () => {
    expect(searchVariants('  Энрофлон  ')[0]).toBe('энрофлон');
    expect(searchVariants('10%')).toEqual(['10%']);
    expect(searchVariants('   ')).toEqual([]);
    expect(new Set(searchVariants('baytril')).size).toBe(searchVariants('baytril').length);
  });
});
