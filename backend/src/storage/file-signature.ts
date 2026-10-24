// Тип загружаемого файла — по его содержимому, а не по словам клиента.
//
// Раньше тип брался из заголовка Content-Type, а расширение — из имени файла;
// и то и другое присылает клиент. Под видом «image/png» в публичный бакет
// площадки ложился файл с любым содержимым и расширением — например, страница
// входа «в VetHub», отдаваемая с нашего домена. Теперь тип определяется по
// первым байтам, а расширение выводится из него.

export interface DetectedFile {
  mime: string;
  ext: string;
}

const startsWith = (buf: Buffer, bytes: number[], offset = 0) =>
  buf.length >= offset + bytes.length && bytes.every((b, i) => buf[offset + i] === b);

const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

export function detectFileType(buf: Buffer | undefined | null): DetectedFile | null {
  if (!buf || buf.length < 4) return null;
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return { mime: 'image/jpeg', ext: 'jpg' };
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { mime: 'image/png', ext: 'png' };
  if (startsWith(buf, ascii('GIF87a')) || startsWith(buf, ascii('GIF89a'))) return { mime: 'image/gif', ext: 'gif' };
  if (startsWith(buf, ascii('RIFF')) && startsWith(buf, ascii('WEBP'), 8)) return { mime: 'image/webp', ext: 'webp' };
  // Стандарт PDF допускает мусор перед заголовком в первом килобайте, и так
  // сохраняют некоторые сканеры. Это безопасно: тип и расширение ставим мы,
  // и такой файл отдаётся как PDF, а не как страница.
  if (buf.subarray(0, 1024).includes('%PDF-')) return { mime: 'application/pdf', ext: 'pdf' };
  return null;
}
