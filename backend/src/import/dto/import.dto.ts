import { IsArray, IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class CommitImportDto {
  // Строки из шага разбора (файл на сервере не хранится).
  @IsArray() rows: string[][];

  // Ключ поля → индекс колонки. Поля без сопоставления пропускаются.
  @IsObject() mapping: Record<string, number>;

  // Категория для строк, где нет колонки категории.
  @IsOptional() @IsString() defaultCategoryId?: string;

  // Прогон без записи в БД: показывает, что произойдёт.
  @IsOptional() @IsBoolean() dryRun?: boolean;
}

export interface ImportRowResult {
  row: number;
  name: string;
  // created — новая карточка; updated — своя обновлена;
  // offer_only — карточка чужая, добавлен только свой оффер; error — строка не прошла.
  action: 'created' | 'updated' | 'offer_only' | 'error';
  packPrice?: number;
  packUnit?: string | null;
  error?: string;
}
