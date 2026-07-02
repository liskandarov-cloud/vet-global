import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { AnimalType } from '@prisma/client';

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
  @IsOptional() @IsInt() @Min(1) minOrder?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) images?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) certificates?: string[];
  @IsOptional() @IsBoolean() isPromotion?: boolean;
  @IsOptional() @IsString() promotionText?: string;
  @IsOptional() @IsBoolean() isNew?: boolean;
  @IsOptional() @IsString() externalId?: string; // код в 1С/ERP для синхронизации
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
  @IsOptional() @Transform(toBool) @IsBoolean() isPromotion?: boolean;
  @IsOptional() @IsString() sellerId?: string;
  @IsOptional() @IsNumber() priceMin?: number;
  @IsOptional() @IsNumber() priceMax?: number;
  @IsOptional() @IsString() sort?: 'newest' | 'price_asc' | 'price_desc' | 'rating';
  @IsOptional() @IsInt() @Min(0) skip?: number;
  @IsOptional() @IsInt() @Min(1) limit?: number;
}
