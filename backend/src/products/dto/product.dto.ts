import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { AnimalType } from '@prisma/client';
import { MXIK_PATTERN, PACKAGE_CODE_PATTERN, normalizeMxik, normalizePackageCode } from '../../common/mxik';

// Query booleans arrive as strings ("true"/"false"); coerce explicitly.
const toBool = ({ value }: { value: any }) =>
  value === true || value === 'true' || value === '1';

export class CreateProductDto {
  @IsString() name: string;
  @IsOptional() @IsString() nameUz?: string;
  @IsString() description: string;
  @IsOptional() @IsString() descriptionUz?: string;
  @IsString() categoryId: string;
  @IsNumber() @Min(0) price: number;
  @IsOptional() @IsString() activeSubstance?: string;
  @IsOptional() @IsString() manufacturer?: string;
  @IsOptional() @IsString() form?: string;
  @IsOptional() @IsEnum(AnimalType) animalType?: AnimalType;
  @IsOptional() @IsBoolean() inStock?: boolean;
  @IsOptional() @IsInt() @Min(0) stockQty?: number; // остаток; null/пусто = не отслеживать
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsInt() @Min(1) minOrder?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) images?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) certificates?: string[];
  @IsOptional() @IsBoolean() isPromotion?: boolean;
  @IsOptional() @IsString() promotionText?: string;
  @IsOptional() @IsBoolean() isNew?: boolean;
  @IsOptional() @IsString() externalId?: string; // код в 1С/ERP для синхронизации

  // Пустая строка очищает код; иначе приводим к каноническому виду, а то, что
  // привести нельзя, оставляем как есть — пусть проверка вернёт понятную ошибку.
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : (normalizeMxik(value) ?? value)))
  @Matches(MXIK_PATTERN, { message: 'Код ИКПУ — 17 цифр (tasnif.soliq.uz)' })
  mxikCode?: string | null;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : (normalizePackageCode(value) ?? value)))
  @Matches(PACKAGE_CODE_PATTERN, { message: 'Код упаковки — только цифры' })
  packageCode?: string | null;
}

export class UpdateProductDto extends CreateProductDto {}

export class ProductQueryDto {
  @IsOptional() @IsString() category?: string; // slug
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() manufacturer?: string;
  @IsOptional() @IsString() activeSubstance?: string;
  @IsOptional() @IsString() form?: string;
  @IsOptional() @IsEnum(AnimalType) animalType?: AnimalType;
  @IsOptional() @Transform(toBool) @IsBoolean() inStock?: boolean;
  @IsOptional() @Transform(toBool) @IsBoolean() isActive?: boolean;
  @IsOptional() @Transform(toBool) @IsBoolean() isPromotion?: boolean;
  // Товары, на которые прямо сейчас действует скидка.
  //
  // Отдельно от isPromotion: тот флаг продавец ставит в карточке вручную и со
  // скидкой он не связан — товар с флагом мог не иметь акции, а товар с
  // настоящей скидкой в подборку «Акции» не попадал.
  @IsOptional() @Transform(toBool) @IsBoolean() discounted?: boolean;
  @IsOptional() @IsString() sellerId?: string;
  @IsOptional() @IsNumber() priceMin?: number;
  @IsOptional() @IsNumber() priceMax?: number;
  @IsOptional() @IsString() sort?: 'newest' | 'price_asc' | 'price_desc' | 'rating';
  @IsOptional() @IsInt() @Min(0) skip?: number;
  @IsOptional() @IsInt() @Min(1) limit?: number;
}
