export type UserRole = 'admin' | 'manager' | 'seller' | 'customer';
export type UserStatus = 'pending' | 'active' | 'suspended';

export interface User {
  _id: string;
  id?: string;
  email: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  vendorRequest?: {
    status: 'pending' | 'approved' | 'rejected';
    requestedAt?: string;
    reviewedAt?: string;
  };
  avatar?: string;
  sellerImage?: string;
  businessName?: string;
  businessAddress?: string;
  createdAt?: string;
  updatedAt?: string;
  mfa?: { enabled: boolean };
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface ProductVariant {
  _id?: string;
  color?: string;
  size?: string;
  sku?: string;
  price?: number;
  quantity: number;
  image?: string;
}

export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  onSale?: boolean;
  salePrice?: number;
  category: string | { _id: string; name: string };
  brand?: string | { _id: string; name: string };
  gender?: string;
  stock: number;
  mainImage?: string;
  images: string[];
  specifications?: Record<string, string>;
  tags?: string[];
  variants?: ProductVariant[];
  vendor: {
    _id: string;
    businessName?: string;
    fullName: string;
    role: UserRole;
  };
  status: string;
  rating: {
    average: number;
    count: number;
  };
  views: number;
  sales: number;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedVariant?: {
    color?: string;
    size?: string;
    sku?: string;
    price?: number;
    image?: string;
  };
}

export interface Category {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  status: string;
}

export interface Brand {
  _id: string;
  name: string;
  logo?: string;
  status: string;
}

export interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ProductsResponse {
  products: Product[];
  pagination: PaginationData;
}

export interface HeroSlide {
  _id: string;
  title: string;
  subtitle?: string;
  image: string;
  link?: string;
  isActive: boolean;
  order: number;
}

export interface OrderItem {
  _id: string;
  product: { _id: string; name: string; images: string[] };
  vendor: { businessName?: string; fullName: string };
  quantity: number;
  price: number;
  variant?: { color?: string; size?: string; sku?: string };
}

export interface Order {
  _id: string;
  orderNumber: string;
  createdAt: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'returned' | 'cancelled' | 'refunded';
  paymentStatus: string;
  paymentMethod: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shippingCost: number;
  total: number;
  shippingAddress: {
    fullName?: string;
    phone?: string;
    street?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  notes?: string;
  trackingNumber?: string;
  cancelReason?: string;
  shippedAt?: string;
  deliveredAt?: string;
  returnedAt?: string;
  cancelledAt?: string;
}

export interface DeliverySettings {
  _id: string;
  freeDeliveryThreshold: number;
  minDeliveryFee: number;
  deliveryFeeRate: number;
  estimatedDays: { standard: number; express: number };
}
