// Ссылка ведёт на файл, загруженный через нашу /uploads, а не куда угодно.
//
// Документы продавца — лицензии — открывает администратор, чтобы решить,
// можно ли продавцу продавать. Раньше в документ записывалась любая строка:
// продавец мог положить туда внешнюю ссылку, и администратор, самая ценная
// учётная запись площадки, переходил бы по ней сам.

export interface StorageLocation {
  s3Enabled: boolean;
  // S3: публичный адрес и бакет; без S3 — адрес API, с которого отдаются файлы.
  publicUrl: string;
  bucket: string;
  apiBase: string;
}

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function isOwnStorageUrl(url: unknown, loc: StorageLocation): boolean {
  if (typeof url !== 'string') return false;
  const pattern = loc.s3Enabled
    ? `^${escape(`${loc.publicUrl}/${loc.bucket}/`)}(images|certificates|licenses)/${UUID}\\.(jpg|png|gif|webp|pdf)$`
    : `^${escape(loc.apiBase)}/api/files/${UUID}$`;
  return new RegExp(pattern, 'i').test(url);
}
