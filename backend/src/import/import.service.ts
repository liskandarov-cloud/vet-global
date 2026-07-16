import { BadRequestException, Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { Readable } from 'stream';
import { AnimalType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { ProductsService } from '../products/products.service';
import { OffersService } from '../offers/offers.service';
import { packPriceOf } from '../common/pricing';
import { CommitImportDto, ImportRowResult } from './dto/import.dto';
import { IMPORT_FIELDS, suggestMapping } from './import.fields';

// Потолок строк за один импорт: защищает от выгрузки всего 1С одним файлом.
const MAX_ROWS = 2000;
// Разбор ищет строку заголовков в первых строках — прайсы часто начинаются с шапки.
const HEADER_SCAN_DEPTH = 10;

@Injectable()
export class ImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly products: ProductsService,
    private readonly offers: OffersService,
  ) {}

  fields() {
    // Синонимы — деталь реализации автосопоставления, наружу не отдаём.
    return IMPORT_FIELDS.map(({ synonyms, ...f }) => f);
  }

  // Шаг 1: разбор файла. Возвращает заголовки, все строки и предложенное сопоставление.
  // Файл на сервере не сохраняем — строки едут обратно на шаг 2 вместе с сопоставлением.
  async parse(file: any) {
    if (!file?.buffer) throw new BadRequestException('Файл не получен');

    const wb = new ExcelJS.Workbook();
    const isCsv =
      file.mimetype?.includes('csv') || /\.csv$/i.test(file.originalname ?? '');

    try {
      if (isCsv) {
        await wb.csv.read(Readable.from(file.buffer.toString('utf8')));
      } else {
        await wb.xlsx.load(file.buffer);
      }
    } catch {
      throw new BadRequestException('Не удалось прочитать файл. Ожидается .xlsx или .csv');
    }

    const ws = wb.worksheets[0];
    if (!ws) throw new BadRequestException('В файле нет листов');

    const raw: string[][] = [];
    ws.eachRow({ includeEmpty: false }, (row) => {
      const values: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        values[col - 1] = this.cellText(cell);
      });
      raw.push(values);
    });
    if (!raw.length) throw new BadRequestException('Файл пустой');

    const headerIdx = this.findHeaderRow(raw);
    const headers = (raw[headerIdx] ?? []).map((h, i) => (h?.trim() ? h.trim() : `Колонка ${i + 1}`));
    const body = raw
      .slice(headerIdx + 1)
      .filter((r) => r.some((c) => c?.trim()))
      .slice(0, MAX_ROWS);

    const totalFound = raw.length - headerIdx - 1;

    return {
      headers,
      rows: body,
      totalRows: body.length,
      truncated: totalFound > MAX_ROWS ? totalFound - MAX_ROWS : 0,
      suggested: suggestMapping(headers),
      sheetName: ws.name,
    };
  }

  // Строка заголовков — та, где больше всего непустых текстовых ячеек без чисел.
  private findHeaderRow(raw: string[][]): number {
    let best = 0;
    let bestScore = -1;
    for (let i = 0; i < Math.min(HEADER_SCAN_DEPTH, raw.length); i++) {
      const cells = (raw[i] ?? []).filter((c) => c?.trim());
      if (cells.length < 2) continue;
      const textCells = cells.filter((c) => !/^[\d\s.,]+$/.test(c));
      const score = textCells.length;
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
    return best;
  }

  private cellText(cell: ExcelJS.Cell): string {
    const v: any = cell?.value;
    if (v == null) return '';
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    if (typeof v === 'object') {
      if ('text' in v) return String(v.text ?? '');
      if ('result' in v) return String(v.result ?? '');
      if ('richText' in v) return (v.richText ?? []).map((t: any) => t.text).join('');
      return '';
    }
    return String(v);
  }

  // Шаг 2: применение. dryRun=true считает результат, ничего не записывая.
  async commit(dto: CommitImportDto, user: AuthUser) {
    const rows = dto.rows ?? [];
    if (!rows.length) throw new BadRequestException('Нет строк для импорта');
    if (rows.length > MAX_ROWS)
      throw new BadRequestException(`Слишком много строк: максимум ${MAX_ROWS} за раз`);

    const mapping = dto.mapping ?? {};
    if (mapping.name == null) throw new BadRequestException('Не сопоставлена колонка «Название»');
    if (mapping.price == null) throw new BadRequestException('Не сопоставлена колонка «Цена»');

    const categories = await this.prisma.category.findMany();
    const defaultCat = dto.defaultCategoryId
      ? categories.find((c) => c.id === dto.defaultCategoryId)
      : undefined;
    if (dto.defaultCategoryId && !defaultCat)
      throw new BadRequestException('Категория по умолчанию не найдена');

    const results: ImportRowResult[] = [];
    const touchedProducts = new Set<string>();
    let created = 0;
    let updated = 0;
    let offersUpserted = 0;
    let failed = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const at = (key: string): string => {
        const idx = mapping[key];
        return idx == null ? '' : String(row[idx] ?? '').trim();
      };

      try {
        const name = at('name');
        if (!name) throw new Error('Пустое название');

        const price = this.parseNumber(at('price'));
        if (price == null || price <= 0) throw new Error(`Некорректная цена: «${at('price')}»`);

        // Категория: из колонки → по умолчанию → ошибка.
        const catName = at('categoryName');
        let categoryId = defaultCat?.id;
        if (catName) {
          const found = categories.find(
            (c) =>
              c.name.toLowerCase() === catName.toLowerCase() ||
              c.nameUz.toLowerCase() === catName.toLowerCase() ||
              c.slug.toLowerCase() === catName.toLowerCase(),
          );
          if (found) categoryId = found.id;
          else if (!categoryId) throw new Error(`Категория «${catName}» не найдена`);
        }
        if (!categoryId) throw new Error('Не указана категория');

        const manufacturer = at('manufacturer') || undefined;
        const externalId = at('externalId') || undefined;

        // Поиск карточки товара. Сначала свой код 1С, затем название+производитель
        // среди всех продавцов: в мультипоставщике один SKU = одна карточка,
        // к ней прикрепляются офферы разных дистрибьюторов.
        let product = externalId
          ? await this.prisma.product.findFirst({ where: { sellerId: user.id, externalId } })
          : null;
        if (!product) {
          product = await this.prisma.product.findFirst({
            where: {
              name: { equals: name, mode: 'insensitive' },
              ...(manufacturer
                ? { manufacturer: { equals: manufacturer, mode: 'insensitive' } }
                : {}),
            },
          });
        }

        // Пустая колонка фото не должна стирать уже загруженные снимки.
        const images = this.parseImages(at('images'));

        const productData: Record<string, unknown> = {
          name,
          description: at('description') || product?.description || name,
          categoryId,
          price,
          ...(images.length ? { images } : {}),
          ...(manufacturer ? { manufacturer } : {}),
          ...(at('activeSubstance') ? { activeSubstance: at('activeSubstance') } : {}),
          ...(at('form') ? { form: at('form') } : {}),
          ...(this.parseAnimal(at('animalType')) ? { animalType: this.parseAnimal(at('animalType')) } : {}),
          ...(externalId ? { externalId } : {}),
        };

        // Чужую карточку не трогаем — только прикрепляем свой оффер.
        const isMine = !product || product.sellerId === user.id;
        let action: ImportRowResult['action'];

        if (!product) {
          action = 'created';
          if (!dto.dryRun) {
            product = await this.prisma.product.create({
              data: { ...productData, sellerId: user.id } as Prisma.ProductUncheckedCreateInput,
            });
            await this.products.upsertBrand(manufacturer);
          }
          created++;
        } else if (isMine) {
          action = 'updated';
          if (!dto.dryRun) {
            product = await this.prisma.product.update({
              where: { id: product.id },
              data: productData as Prisma.ProductUncheckedUpdateInput,
            });
            await this.products.upsertBrand(manufacturer);
          }
          updated++;
        } else {
          action = 'offer_only';
        }

        // Оффер продавца: цена + фасовка.
        const offerData: Record<string, unknown> = {
          price,
          priceUnit: at('priceUnit') || null,
          priceUnitQty: this.parseNumber(at('priceUnitQty')) ?? 1,
          packSize: this.parseNumber(at('packSize')) ?? 1,
          packUnit: at('packUnit') || null,
          minOrder: this.parseNumber(at('minOrder')) ?? 1,
          stockQty: this.parseNumber(at('stockQty')),
          leadTimeDays: this.parseNumber(at('leadTimeDays')),
          batchNumber: at('batchNumber') || null,
          expiryDate: this.parseDate(at('expiryDate')),
          regNumber: at('regNumber') || null,
          isRx: this.parseBool(at('isRx')) ?? false,
          inStock: true,
        };

        if (!dto.dryRun && product) {
          await this.prisma.offer.upsert({
            where: { productId_sellerId: { productId: product.id, sellerId: user.id } },
            create: {
              productId: product.id,
              sellerId: user.id,
              ...offerData,
            } as Prisma.OfferUncheckedCreateInput,
            update: offerData as Prisma.OfferUncheckedUpdateInput,
          });
          touchedProducts.add(product.id);
        }
        offersUpserted++;

        results.push({
          row: i + 1,
          name,
          action,
          packPrice: packPriceOf(offerData),
          packUnit: (offerData.packUnit as string) ?? null,
        });
      } catch (e: any) {
        failed++;
        results.push({
          row: i + 1,
          name: mapping.name != null ? String(row[mapping.name] ?? '') : '',
          action: 'error',
          error: e?.message ?? 'Ошибка строки',
        });
      }
    }

    // Пересчёт агрегатов один раз на товар, а не на каждую строку.
    if (!dto.dryRun) {
      for (const id of touchedProducts) await this.offers.recalcProduct(id);
    }

    return {
      dryRun: !!dto.dryRun,
      total: rows.length,
      created,
      updated,
      offersUpserted,
      failed,
      results,
    };
  }

  // Прайсы приходят с разделителями тысяч и запятой в дробной части: «22 400,50», «1 344 000».
  private parseNumber(v: string): number | null {
    if (!v) return null;
    const cleaned = v
      .replace(/ /g, '')
      .replace(/[^\d.,-]/g, '')
      .replace(/\s/g, '');
    if (!cleaned) return null;
    // Запятая как десятичный разделитель, если после неё 1-2 цифры до конца.
    const normalized = /,\d{1,2}$/.test(cleaned)
      ? cleaned.replace(/\./g, '').replace(',', '.')
      : cleaned.replace(/[,\s]/g, '');
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }

  // Ссылки на фото: через запятую/перенос строки, только http(s) и относительные /uploads.
  private parseImages(v: string): string[] {
    if (!v) return [];
    return v
      .split(/[,\n;]+/)
      .map((s) => s.trim())
      .filter((s) => /^https?:\/\//i.test(s) || s.startsWith('/'));
  }

  private parseBool(v: string): boolean | null {
    if (!v) return null;
    return ['да', 'ha', 'yes', 'true', '1', '+', 'rx'].includes(v.toLowerCase().trim());
  }

  private parseDate(v: string): Date | null {
    if (!v) return null;
    // ДД.ММ.ГГГГ — самый частый формат в узбекских прайсах.
    const m = v.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})$/);
    if (m) {
      const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
      const d = new Date(year, Number(m[2]) - 1, Number(m[1]));
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  private parseAnimal(v: string): AnimalType | null {
    if (!v) return null;
    const s = v.toLowerCase().replace(/ё/g, 'е');
    if (/птиц|parrand|poultry|куриц|бройлер/.test(s)) return AnimalType.POULTRY;
    if (/крс|коров|скот|cattle|qoramol|бык|телён|телен/.test(s)) return AnimalType.CATTLE;
    if (/мрс|овц|коз|sheep|goat|qoʻy|qoy|echki/.test(s)) return AnimalType.SMALL_RUMINANTS;
    if (/лошад|конь|horse|ot\b/.test(s)) return AnimalType.HORSES;
    if (/собак|кошк|пит[оo]мц|pet|dog|cat|it\b|mushuk/.test(s)) return AnimalType.PETS;
    return AnimalType.OTHER;
  }

  // Выгрузка своего прайса в том же формате, что принимает импорт:
  // продавец скачивает, правит цены/остатки и заливает обратно.
  async exportMine(user: AuthUser): Promise<Buffer> {
    const offers = await this.prisma.offer.findMany({
      where: { sellerId: user.id },
      include: { product: { include: { category: true } } },
      orderBy: { updatedAt: 'desc' },
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Прайс');
    ws.addRow(IMPORT_FIELDS.map((f) => f.label));
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F4F1' } };
    IMPORT_FIELDS.forEach((f, i) => {
      ws.getColumn(i + 1).width = Math.max(14, Math.min(28, f.label.length + 6));
    });

    const animalRu: Record<string, string> = {
      POULTRY: 'птица', CATTLE: 'КРС', SMALL_RUMINANTS: 'МРС',
      HORSES: 'лошади', PETS: 'питомцы', OTHER: 'другое',
    };

    for (const o of offers) {
      const p: any = o.product;
      const val: Record<string, any> = {
        name: p.name,
        description: p.description,
        manufacturer: p.manufacturer ?? '',
        activeSubstance: p.activeSubstance ?? '',
        form: p.form ?? '',
        animalType: p.animalType ? animalRu[p.animalType] ?? '' : '',
        categoryName: p.category?.name ?? '',
        price: Number(o.price),
        priceUnit: o.priceUnit ?? '',
        priceUnitQty: o.priceUnitQty ?? 1,
        packUnit: o.packUnit ?? '',
        packSize: o.packSize ?? 1,
        minOrder: o.minOrder ?? 1,
        stockQty: o.stockQty ?? '',
        leadTimeDays: o.leadTimeDays ?? '',
        batchNumber: o.batchNumber ?? '',
        expiryDate: o.expiryDate ? new Date(o.expiryDate).toLocaleDateString('ru-RU') : '',
        regNumber: o.regNumber ?? '',
        isRx: o.isRx ? 'да' : '',
        images: Array.isArray(p.images) ? p.images.join(', ') : '',
        externalId: p.externalId ?? '',
      };
      ws.addRow(IMPORT_FIELDS.map((f) => val[f.key] ?? ''));
    }

    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer as ArrayBuffer);
  }

  // Шаблон прайса с примером заполнения (включая фасовку).
  async template(): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Прайс');

    const cols = IMPORT_FIELDS.map((f) => f.label);
    ws.addRow(cols);
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6F4F1' },
    };
    IMPORT_FIELDS.forEach((f, i) => {
      ws.getColumn(i + 1).width = Math.max(14, Math.min(28, f.label.length + 6));
    });

    // Пример: вакцина, цена за 1000 доз, флакон 5000 доз → 112 000 сум/флакон.
    const example: Record<string, string> = {
      name: 'Вакцина Пример НБ',
      description: 'Живая вакцина против ньюкаслской болезни',
      manufacturer: 'Bioveta',
      activeSubstance: 'Штамм La Sota',
      form: 'Лиофилизат',
      animalType: 'птица',
      categoryName: 'Вакцины',
      price: '22400',
      priceUnit: '1000 доз',
      priceUnitQty: '1000',
      packUnit: 'флакон',
      packSize: '5000',
      minOrder: '1',
      stockQty: '120',
      leadTimeDays: '3',
      batchNumber: 'B-2401',
      expiryDate: '31.12.2027',
      regNumber: 'UZ-VET-0001',
      isRx: 'да',
      images: 'https://example.com/foto1.jpg, https://example.com/foto2.jpg',
      externalId: 'SKU-001',
    };
    ws.addRow(IMPORT_FIELDS.map((f) => example[f.key] ?? ''));

    const note = ws.addRow([]);
    note.getCell(1).value =
      'Пример: 22 400 сум за 1000 доз, во флаконе 5000 доз → платформа посчитает 112 000 сум за флакон. Для обычных товаров колонки фасовки можно не заполнять.';
    note.getCell(1).font = { italic: true, color: { argb: 'FF64748B' } };

    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer as ArrayBuffer);
  }
}
