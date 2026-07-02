import { Injectable } from '@nestjs/common';
import { Workbook } from 'exceljs';

export interface SheetColumn {
  header: string;
  key: string;
  width?: number;
}

@Injectable()
export class ExcelService {
  // Builds a single-sheet xlsx workbook from columns + rows.
  async sheet(
    title: string,
    columns: SheetColumn[],
    rows: Record<string, any>[],
  ): Promise<Buffer> {
    const wb = new Workbook();
    wb.creator = 'VetGlobal';
    const ws = wb.addWorksheet(title.slice(0, 31));

    ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 20 }));

    // Header styling (teal background, white bold text).
    ws.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    });

    rows.forEach((r) => ws.addRow(r));

    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer as ArrayBuffer);
  }
}
