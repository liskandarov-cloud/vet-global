// Описание колонок, которые продавец может сопоставить при импорте прайса.
// Единый источник правды: этот же список отдаётся фронту (GET /import/fields),
// чтобы форма сопоставления не расходилась с логикой разбора.

export type ImportFieldType = 'string' | 'number' | 'bool' | 'date' | 'enum';

export interface ImportField {
  key: string;
  label: string;
  labelUz: string;
  type: ImportFieldType;
  required?: boolean;
  hint?: string;
  hintUz?: string;
  // Синонимы заголовков для автосопоставления (в нижнем регистре, без пробелов).
  synonyms: string[];
}

export const IMPORT_FIELDS: ImportField[] = [
  {
    key: 'name',
    label: 'Название',
    labelUz: 'Nomi',
    type: 'string',
    required: true,
    synonyms: ['название', 'наименование', 'товар', 'препарат', 'номенклатура', 'nomi', 'mahsulot', 'name', 'product'],
  },
  {
    key: 'description',
    label: 'Описание',
    labelUz: 'Tavsif',
    type: 'string',
    synonyms: ['описание', 'состав', 'применение', 'tavsif', 'description'],
  },
  {
    key: 'manufacturer',
    label: 'Производитель',
    labelUz: 'Ishlab chiqaruvchi',
    type: 'string',
    hint: 'Бренд заводится автоматически',
    hintUz: 'Brend avtomatik yaratiladi',
    synonyms: ['производитель', 'бренд', 'завод', 'ishlabchiqaruvchi', 'brend', 'manufacturer', 'brand', 'vendor'],
  },
  {
    key: 'activeSubstance',
    label: 'Действующее вещество',
    labelUz: 'Taʼsir etuvchi modda',
    type: 'string',
    synonyms: ['действующеевещество', 'двещество', 'дв', 'субстанция', 'таъсиретувчимодда', 'activesubstance', 'substance'],
  },
  {
    key: 'form',
    label: 'Форма выпуска',
    labelUz: 'Chiqarilish shakli',
    type: 'string',
    synonyms: ['форма', 'формавыпуска', 'видупаковки', 'shakl', 'form'],
  },
  {
    key: 'animalType',
    label: 'Вид животных',
    labelUz: 'Hayvon turi',
    type: 'enum',
    hint: 'птица / КРС / МРС / лошади / питомцы',
    hintUz: 'parranda / KRS / MRS / otlar / uy hayvonlari',
    synonyms: ['видживотных', 'животные', 'вид', 'hayvonturi', 'animaltype', 'species'],
  },
  {
    key: 'categoryName',
    label: 'Категория',
    labelUz: 'Kategoriya',
    type: 'string',
    hint: 'Если колонка не задана — берётся категория по умолчанию',
    hintUz: 'Ustun tanlanmasa — standart kategoriya olinadi',
    synonyms: ['категория', 'группа', 'раздел', 'kategoriya', 'category', 'group'],
  },
  {
    key: 'price',
    label: 'Цена',
    labelUz: 'Narx',
    type: 'number',
    required: true,
    hint: 'Ровно как в прайсе — пересчёт сделает система',
    hintUz: 'Narxnomadagidek — tizim qayta hisoblaydi',
    synonyms: ['цена', 'стоимость', 'прайс', 'ценасум', 'narx', 'narxi', 'price', 'cost'],
  },
  {
    key: 'priceUnit',
    label: 'Цена указана за',
    labelUz: 'Narx nima uchun',
    type: 'string',
    hint: 'Напр. «1000 доз», «литр»',
    hintUz: 'Masalan «1000 doza», «litr»',
    synonyms: ['ценаза', 'единицацены', 'заединицу', 'narxuchun', 'priceunit', 'unit'],
  },
  {
    key: 'priceUnitQty',
    label: 'Количество в единице цены',
    labelUz: 'Narx birligidagi miqdor',
    type: 'number',
    hint: 'Напр. 1000 (доз). Пусто = 1',
    hintUz: 'Masalan 1000 (doza). Boʻsh = 1',
    synonyms: ['количествовединицецены', 'дозвединице', 'кратность', 'priceunitqty', 'unitqty'],
  },
  {
    key: 'packUnit',
    label: 'Единица заказа',
    labelUz: 'Buyurtma birligi',
    type: 'string',
    hint: 'Напр. «флакон», «канистра»',
    hintUz: 'Masalan «flakon», «kanistr»',
    synonyms: ['единицазаказа', 'упаковка', 'фасовка', 'buyurtmabirligi', 'packunit', 'packaging'],
  },
  {
    key: 'packSize',
    label: 'Размер упаковки',
    labelUz: 'Qadoq hajmi',
    type: 'number',
    hint: 'Напр. 5000 (доз во флаконе). Пусто = 1',
    hintUz: 'Masalan 5000 (flakondagi doza). Boʻsh = 1',
    synonyms: ['размерупаковки', 'дозвофлаконе', 'вупаковке', 'объём', 'объем', 'qadoqhajmi', 'packsize'],
  },
  {
    key: 'minOrder',
    label: 'Минимальный заказ',
    labelUz: 'Minimal buyurtma',
    type: 'number',
    synonyms: ['минимальныйзаказ', 'минзаказ', 'мин', 'minimalbuyurtma', 'minorder', 'moq'],
  },
  {
    key: 'stockQty',
    label: 'Остаток на складе',
    labelUz: 'Ombordagi qoldiq',
    type: 'number',
    synonyms: ['остаток', 'наличие', 'склад', 'количество', 'колво', 'qoldiq', 'stock', 'qty', 'quantity'],
  },
  {
    key: 'leadTimeDays',
    label: 'Срок поставки, дней',
    labelUz: 'Yetkazib berish, kun',
    type: 'number',
    synonyms: ['срокпоставки', 'поставка', 'дней', 'yetkazibberish', 'leadtime'],
  },
  {
    key: 'batchNumber',
    label: 'Номер партии',
    labelUz: 'Partiya raqami',
    type: 'string',
    synonyms: ['номерпартии', 'партия', 'серия', 'partiya', 'batch', 'lot'],
  },
  {
    key: 'expiryDate',
    label: 'Годен до',
    labelUz: 'Yaroqlilik muddati',
    type: 'date',
    synonyms: ['годендо', 'срокгодности', 'срокхранения', 'yaroqlilik', 'expiry', 'expirydate', 'bestbefore'],
  },
  {
    key: 'regNumber',
    label: 'Регистрационный номер',
    labelUz: 'Roʻyxat raqami',
    type: 'string',
    synonyms: ['регистрационныйномер', 'регномер', 'рег', 'royxatraqami', 'regnumber', 'registration'],
  },
  {
    key: 'isRx',
    label: 'Рецептурный',
    labelUz: 'Retsept boʻyicha',
    type: 'bool',
    synonyms: ['рецептурный', 'порецепту', 'рецепт', 'retsept', 'isrx', 'rx', 'prescription'],
  },
  {
    key: 'externalId',
    label: 'Код (1С / ERP)',
    labelUz: 'Kod (1C / ERP)',
    type: 'string',
    hint: 'По нему обновляются ранее загруженные товары',
    hintUz: 'Shu boʻyicha oldin yuklangan mahsulotlar yangilanadi',
    synonyms: ['код', 'артикул', 'sku', 'код1с', 'kod', 'externalid', 'code', 'article'],
  },
];

// Нормализация заголовка для сравнения с синонимами.
export function normalizeHeader(h: string): string {
  return String(h ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]/gi, '');
}

// Автосопоставление: заголовок колонки → ключ поля. Точное совпадение приоритетнее вхождения.
export function suggestMapping(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};
  const taken = new Set<number>();
  const norm = headers.map(normalizeHeader);

  for (const pass of ['exact', 'partial'] as const) {
    for (const field of IMPORT_FIELDS) {
      if (mapping[field.key] != null) continue;
      for (let i = 0; i < norm.length; i++) {
        if (taken.has(i) || !norm[i]) continue;
        const hit =
          pass === 'exact'
            ? field.synonyms.includes(norm[i])
            : field.synonyms.some((s) => s.length >= 4 && norm[i].includes(s));
        if (hit) {
          mapping[field.key] = i;
          taken.add(i);
          break;
        }
      }
    }
  }
  return mapping;
}
