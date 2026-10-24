import { isOwnStorageUrl, StorageLocation } from './own-url';

const ID = '3f2b8c1e-9a4d-4e7f-b2c5-1a2b3c4d5e6f';
const s3: StorageLocation = {
  s3Enabled: true,
  publicUrl: 'https://abc.supabase.co/storage/v1/object/public',
  bucket: 'vetglobal',
  apiBase: '',
};
const db: StorageLocation = { s3Enabled: false, publicUrl: '', bucket: '', apiBase: 'https://api.vethub.uz' };

describe('isOwnStorageUrl', () => {
  it('файл из нашего S3-бакета', () => {
    expect(isOwnStorageUrl(`${s3.publicUrl}/vetglobal/licenses/${ID}.pdf`, s3)).toBe(true);
    expect(isOwnStorageUrl(`${s3.publicUrl}/vetglobal/images/${ID}.jpg`, s3)).toBe(true);
  });

  it('файл из базы, отдаваемый нашим API', () => {
    expect(isOwnStorageUrl(`https://api.vethub.uz/api/files/${ID}`, db)).toBe(true);
    expect(isOwnStorageUrl(`/api/files/${ID}`, { ...db, apiBase: '' })).toBe(true);
  });

  it('чужое — нет, как бы похоже ни выглядело', () => {
    expect(isOwnStorageUrl('https://evil.example/login', s3)).toBe(false);
    expect(isOwnStorageUrl(`https://evil.example/vetglobal/licenses/${ID}.pdf`, s3)).toBe(false);
    expect(isOwnStorageUrl(`${s3.publicUrl}/vetglobal/licenses/${ID}.html`, s3)).toBe(false);
    expect(isOwnStorageUrl(`${s3.publicUrl}/vetglobal/../other/${ID}.pdf`, s3)).toBe(false);
    expect(isOwnStorageUrl(`${s3.publicUrl}.evil.example/vetglobal/licenses/${ID}.pdf`, s3)).toBe(false);
    expect(isOwnStorageUrl(`https://api.vethub.uz/api/files/${ID}?next=https://evil.example`, db)).toBe(false);
    expect(isOwnStorageUrl(`https://api.vethub.uz.evil.example/api/files/${ID}`, db)).toBe(false);
    expect(isOwnStorageUrl(undefined, s3)).toBe(false);
  });
});
