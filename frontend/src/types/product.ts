// Comprehensive product types for Jutaghar footwear platform

export type Gender = 'men' | 'women' | 'kids' | 'unisex';
export type ProductStatus = 'active' | 'out_of_stock' | 'discontinued';
export type SizeSystem = 'EU' | 'US' | 'UK' | 'Kids';
export type ToeShape = 'round' | 'pointed' | 'square' | 'almond' | 'open';
export type HeelType = 'flat' | 'block' | 'stiletto' | 'wedge' | 'platform' | 'kitten' | 'cone';
export type ClosureType = 'lace' | 'slip-on' | 'velcro' | 'buckle' | 'zipper' | 'elastic';
export type ActivityType = 'running' | 'walking' | 'hiking' | 'sports' | 'casual' | 'formal' | 'work';
export type Terrain = 'road' | 'trail' | 'indoor' | 'all-terrain';
export type AgeGroup = 'infant' | 'toddler' | 'little-kid' | 'big-kid' | 'teen';

export interface ProductVariant {
  variantId: string;
  size: string;
  sizeSystem: SizeSystem;
  width?: 'narrow' | 'medium' | 'wide' | 'extra-wide';
  color: string;
  colorHex?: string;
  stock: number;
  price: number;
  campaignPrice?: number;
  sku: string;
  barcode?: string;
  gtin?: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
}

export interface MaterialDetails {
  upper?: string;
  lining?: string;
  sole?: string;
  insole?: string;
}

export interface PerformanceFeatures {
  cushioning?: 'minimal' | 'moderate' | 'maximum';
  archSupport?: 'low' | 'medium' | 'high';
  waterproof?: boolean;
  breathability?: 'low' | 'medium' | 'high';
  slipResistant?: boolean;
  safetyToe?: boolean;
  reflective?: boolean;
}

export interface KidsSpecific {
  ageGroup?: AgeGroup;
  sizeType?: 'infant' | 'toddler' | 'youth';
  safetyFeatures?: string[];
  schoolApproved?: boolean;
  growthRoom?: boolean;
  easyFastening?: boolean;
}

export interface ProductImages {
  hero: string;
  gallery: string[];
  soleView?: string;
  lifestyle?: string[];
  sizeChart?: string;
}

export interface ProductBadge {
  type: 'new' | 'featured' | 'best-seller' | 'limited-stock' | 'sale';
  label: string;
  color: string;
}

export interface Product {
  _id: string;
  name: string;
  slug: string;
  brand: string;
  category: string;
  gender: Gender;
  productType: string;
  
  // Pricing
  basePrice: number;
  currency: string;
  campaignPrice?: number;
  
  // Description
  shortDescription: string;
  longDescription: string;
  
  // Images
  images: ProductImages;
  
  // Variants
  variants: ProductVariant[];
  availableColors: string[];
  availableSizes: string[];
  
  // Physical attributes
  toeShape?: ToeShape;
  heelType?: HeelType;
  heelHeight?: number; // in cm
  closureType?: ClosureType;
  
  // Materials
  materials?: MaterialDetails;
  
  // Performance
  activityType?: ActivityType[];
  terrain?: Terrain[];
  performance?: PerformanceFeatures;
  
  // Kids specific
  kidsDetails?: KidsSpecific;
  
  // Metadata
  status: ProductStatus;
  badges?: ProductBadge[];
  tags?: string[];
  rating?: number;
  reviewCount?: number;
  salesCount?: number;
  
  // SEO
  metaTitle?: string;
  metaDescription?: string;
  
  // Vendor
  vendor: {
    _id: string;
    name: string;
    businessName?: string;
  };
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface ProductFilter {
  gender?: Gender[];
  category?: string[];
  brand?: string[];
  priceRange?: {
    min: number;
    max: number;
  };
  sizes?: string[];
  colors?: string[];
  materials?: string[];
  closureType?: ClosureType[];
  heelHeight?: {
    min: number;
    max: number;
  };
  activityType?: ActivityType[];
  waterproof?: boolean;
  width?: string[];
  inStock?: boolean;
}

export interface ProductSearchParams {
  query?: string;
  filter?: ProductFilter;
  sort?: 'new' | 'price-asc' | 'price-desc' | 'popular' | 'rating';
  page?: number;
  limit?: number;
  tag?: string;
}
