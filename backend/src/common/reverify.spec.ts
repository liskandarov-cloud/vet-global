import { offerDocsChanged, sellerIdentityChanged } from './reverify';

describe('повторная проверка после замены данных', () => {
  const offer = { certificates: ['a.pdf', 'b.pdf'], regNumber: 'VET-1' };

  it('замена сертификата снимает отметку', () => {
    expect(offerDocsChanged(offer, { certificates: ['a.pdf', 'x.pdf'] })).toBe(true);
  });

  it('тот же набор в другом порядке — не замена', () => {
    expect(offerDocsChanged(offer, { certificates: ['b.pdf', 'a.pdf'], regNumber: 'VET-1' })).toBe(false);
  });

  it('смена регистрационного номера снимает отметку', () => {
    expect(offerDocsChanged(offer, { regNumber: 'VET-2' })).toBe(true);
  });

  it('правка цены (поля не переданы) отметку не трогает', () => {
    expect(offerDocsChanged(offer, {})).toBe(false);
  });

  it('продавец сменил ИНН или название — снова на проверку', () => {
    const seller = { company: 'ООО «Вет»', inn: '301234567' };
    expect(sellerIdentityChanged(seller, { inn: '309999999' })).toBe(true);
    expect(sellerIdentityChanged(seller, { company: 'ООО «Другая»' })).toBe(true);
    expect(sellerIdentityChanged(seller, { company: ' ООО «Вет» ', inn: '301234567' })).toBe(false);
    expect(sellerIdentityChanged(seller, { bankAccount: '2020' } as any)).toBe(false);
  });
});
