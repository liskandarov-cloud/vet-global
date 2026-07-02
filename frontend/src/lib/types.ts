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
  isVerified?: boolean;
  rating?: number;
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
}

export interface ProductList {
  total: number;
  skip: number;
  limit: number;
  products: Product[];
}
