export interface Category {
  id: string;
  name: string;
  nameUz: string;
  slug: string;
  icon?: string;
}

export interface SellerBrief {
  id: string;
  company?: string | null;
  fullName?: string;
  isVerified?: boolean;
  rating?: number;
  reviewsCount?: number;
  logoUrl?: string | null;
}

export interface PriceBreak {
  minQty: number;
  price: number;
}

export interface Offer {
  id: string;
  productId: string;
  sellerId: string;
  price: number;
  inStock: boolean;
  stockQty?: number | null;
  minOrder: number;
  leadTimeDays?: number | null;
  netTermDays?: number | null;
  priceBreaks?: PriceBreak[] | null;
  batchNumber?: string | null;
  expiryDate?: string | null;
  regNumber?: string | null;
  isRx: boolean;
  certificates: string[];
  certVerified: boolean;
  seller?: SellerBrief;
}

export interface Product {
  id: string;
  name: string;
  nameUz?: string;
  description: string;
  categoryId: string;
  price: number;
  activeSubstance?: string;
  manufacturer?: string;
  form?: string;
  animalType?: string;
  inStock: boolean;
  minOrder: number;
  images: string[];
  certificates: string[];
  isPromotion: boolean;
  promotionText?: string;
  isNew?: boolean;
  rating: number;
  reviewsCount: number;
  seller?: SellerBrief;
  category?: { name: string; nameUz: string; slug: string };
  related?: Product[];
  // Мульти-поставщик
  minPrice?: number | null;
  offersCount?: number;
  offers?: Offer[];
}

export interface ProductList {
  total: number;
  skip: number;
  limit: number;
  products: Product[];
}
