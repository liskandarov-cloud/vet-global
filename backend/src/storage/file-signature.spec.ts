import { detectFileType } from './file-signature';

const b = (...bytes: number[]) => Buffer.from(bytes);
const s = (text: string) => Buffer.from(text, 'latin1');

describe('detectFileType', () => {
  it('узнаёт разрешённые форматы по первым байтам', () => {
    expect(detectFileType(b(0xff, 0xd8, 0xff, 0xe0, 0, 0))).toEqual({ mime: 'image/jpeg', ext: 'jpg' });
    expect(detectFileType(b(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0))).toEqual({ mime: 'image/png', ext: 'png' });
    expect(detectFileType(s('GIF89a....'))).toEqual({ mime: 'image/gif', ext: 'gif' });
    expect(detectFileType(s('RIFF\x00\x00\x00\x00WEBPVP8 '))).toEqual({ mime: 'image/webp', ext: 'webp' });
    expect(detectFileType(s('%PDF-1.7\n'))).toEqual({ mime: 'application/pdf', ext: 'pdf' });
    // Сканер, записавший пару байт до заголовка, — всё ещё PDF.
    expect(detectFileType(s('\r\n\x00%PDF-1.4\n'))).toEqual({ mime: 'application/pdf', ext: 'pdf' });
  });

  // То, что раньше проходило под видом картинки по одному заголовку.
  it('HTML, SVG и прочее не узнаёт, как бы файл ни назывался', () => {
    expect(detectFileType(s('<!doctype html><script>alert(1)</script>'))).toBeNull();
    expect(detectFileType(s('<svg xmlns="http://www.w3.org/2000/svg" onload="x()"/>'))).toBeNull();
    expect(detectFileType(s('MZ\x90\x00'))).toBeNull();
    expect(detectFileType(s('RIFF\x00\x00\x00\x00WAVE'))).toBeNull();
  });

  it('пустой и слишком короткий файл — не картинка', () => {
    expect(detectFileType(undefined)).toBeNull();
    expect(detectFileType(Buffer.alloc(0))).toBeNull();
    expect(detectFileType(b(0xff, 0xd8))).toBeNull();
  });
});
