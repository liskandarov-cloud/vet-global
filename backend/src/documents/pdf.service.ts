import { Injectable } from '@nestjs/common';
import { existsSync } from 'fs';
import PDFDocument from 'pdfkit';

// Cyrillic-capable font. DejaVuSans is installed via `apk add font-dejavu` in the image;
// FONT_PATH env can override. Falls back to the built-in Helvetica (latin-only) if absent.
const FONT_CANDIDATES = [
  process.env.FONT_PATH,
  '/usr/share/fonts/dejavu/DejaVuSans.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
].filter(Boolean) as string[];
const CYRILLIC_FONT = FONT_CANDIDATES.find((p) => existsSync(p));

export interface InvoiceData {
  number: string;
  date: Date;
  seller: {
    company?: string | null;
    inn?: string | null;
    bankName?: string | null;
    bankAccount?: string | null;
    bankMfo?: string | null;
    vatPayer?: boolean;
  };
  buyer: { name: string; company?: string | null; inn?: string | null; phone: string };
  items: { name: string; quantity: number; price: number }[];
  subtotal: number;
  vetPointsUsed: number;
  total: number;
}

// Ставка НДС (ҚҚС) в Узбекистане. Цены считаем НДС-включёнными, поэтому
// выделяем налог обратным счётом: НДС = сумма × 12 / 112.
const VAT_RATE = 12;

@Injectable()
export class PdfService {
  // Renders a B2B invoice (счёт на оплату) to a PDF buffer.
  async invoice(data: InvoiceData): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c as Buffer));

    const done = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    // Register a Cyrillic-capable font as the default; PDFKit's Helvetica can't render Cyrillic.
    if (CYRILLIC_FONT) {
      doc.registerFont('body', CYRILLIC_FONT);
      doc.font('body');
    }

    const teal = '#0D9488';
    const money = (n: number) => `${n.toLocaleString('ru-RU')} сум`;

    // Header
    doc.fillColor(teal).fontSize(22).text('VetGlobal', 50, 50);
    doc.fillColor('#0F172A').fontSize(16).text(`Счёт на оплату № ${data.number}`, 50, 85);
    doc
      .fontSize(10)
      .fillColor('#475569')
      .text(`Дата: ${data.date.toLocaleDateString('ru-RU')}`, 50, 108);

    // Parties
    let y = 145;
    doc.fillColor('#0F172A').fontSize(11).text('Поставщик:', 50, y);
    doc.fillColor('#475569').fontSize(10)
      .text(data.seller.company ?? '—', 50, y + 15)
      .text(data.seller.inn ? `ИНН: ${data.seller.inn}` : '', 50, y + 30);

    doc.fillColor('#0F172A').fontSize(11).text('Покупатель:', 320, y);
    doc.fillColor('#475569').fontSize(10)
      .text(data.buyer.company ?? data.buyer.name, 320, y + 15)
      .text(data.buyer.inn ? `ИНН: ${data.buyer.inn}` : '', 320, y + 30)
      .text(`Тел: ${data.buyer.phone}`, 320, y + 45);

    // Банковские реквизиты поставщика — без них по счёту нельзя сделать перевод.
    const bankLines = [
      data.seller.bankName ? `Банк: ${data.seller.bankName}` : null,
      data.seller.bankAccount ? `Р/с: ${data.seller.bankAccount}` : null,
      data.seller.bankMfo ? `МФО: ${data.seller.bankMfo}` : null,
    ].filter(Boolean) as string[];
    if (bankLines.length) {
      let by = y + 48;
      doc.fillColor('#0F172A').fontSize(9).text('Банковские реквизиты:', 50, by);
      doc.fillColor('#475569').fontSize(9);
      bankLines.forEach((line) => { by += 13; doc.text(line, 50, by); });
      y = Math.max(y, by - 48);
    }

    // Table header
    y = 235;
    doc.rect(50, y, 495, 22).fill(teal);
    doc.fillColor('#FFFFFF').fontSize(10);
    doc.text('№', 58, y + 6);
    doc.text('Наименование', 85, y + 6);
    doc.text('Кол-во', 330, y + 6);
    doc.text('Цена', 400, y + 6);
    doc.text('Сумма', 480, y + 6);

    // Rows
    y += 22;
    doc.fillColor('#0F172A').fontSize(9);
    data.items.forEach((it, i) => {
      const lineTotal = it.price * it.quantity;
      doc.text(String(i + 1), 58, y + 6);
      doc.text(it.name, 85, y + 6, { width: 235 });
      doc.text(String(it.quantity), 330, y + 6);
      doc.text(money(it.price), 400, y + 6);
      doc.text(money(lineTotal), 470, y + 6);
      const rowH = Math.max(22, doc.heightOfString(it.name, { width: 235 }) + 12);
      y += rowH;
      doc.moveTo(50, y).lineTo(545, y).strokeColor('#E2E8F0').stroke();
    });

    // Totals
    y += 12;
    doc.fontSize(10).fillColor('#475569');
    doc.text('Сумма позиций:', 380, y);
    doc.fillColor('#0F172A').text(money(data.subtotal), 470, y);
    if (data.vetPointsUsed > 0) {
      y += 16;
      doc.fillColor('#475569').text('Списано VetPoints:', 380, y);
      doc.fillColor('#F97316').text(`-${money(data.vetPointsUsed)}`, 470, y);
    }
    y += 20;
    doc.fontSize(12).fillColor('#0F172A').text('ИТОГО к оплате:', 380, y);
    doc.fillColor(teal).text(money(data.total), 470, y);
    // НДС (ҚҚС) выделяем из включённой в цену суммы, если поставщик — плательщик.
    if (data.seller.vatPayer) {
      const vat = Math.round((data.total * VAT_RATE) / (100 + VAT_RATE));
      y += 16;
      doc.fontSize(9).fillColor('#475569').text(`в т.ч. НДС (ҚҚС) ${VAT_RATE}%:`, 380, y);
      doc.fillColor('#475569').text(money(vat), 470, y);
    }

    // Подпись и печать.
    y += 50;
    doc.fontSize(10).fillColor('#0F172A');
    doc.text('Руководитель ______________________', 50, y);
    doc.fillColor('#94A3B8').fontSize(9).text('М.П.', 50, y + 22);

    doc.fontSize(8).fillColor('#94A3B8').text(
      'Документ сформирован автоматически на платформе VetGlobal.',
      50,
      790,
      { align: 'center', width: 495 },
    );

    doc.end();
    return done;
  }
}
