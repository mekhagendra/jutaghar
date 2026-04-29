// User types
export type UserRole = 'admin' | 'manager' | 'seller' | 'customer';
export type UserStatus = 'pending' | 'active' | 'suspended';

export interface Affiliation {
  parentId: string;
  level: number;
  commissionRate: number;
}

export interface VendorRequest {
  status: 'none' | 'pending' | 'approved' | 'rejected';
  businessName?: string;
  businessAddress?: string;
  taxId?: string;
  sellerImage?: string;
  requestedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export interface User {
  _id: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  googleId?: string;
  businessName?: string;
  sellerImage?: string;
  businessLicense?: string;
  businessAddress?: string;
  taxId?: string;
  vendorRequest?: VendorRequest;
  affiliations?: Affiliation[];
  affiliatedBy?: string;
  approvedAt?: string;
  approvedBy?: string;
  mfa?: { enabled: boolean };
  createdAt: string;
  updatedAt: string;
}

// Product types
export type ProductStatus = 'draft' | 'active' | 'out_of_stock' | 'discontinued';

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
  status: ProductStatus;
  rating: {
    average: number;
    count: number;
  };
  views: number;
  sales: number;
  createdAt: string;
  updatedAt: string;
}

// Order types
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'returned' | 'cancelled' | 'refunded';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type PaymentMethod = 'esewa' | 'khalti' | 'cash_on_delivery';

export interface OrderItem {
  product: string | Product;
  quantity: number;
  price: number;
  vendor: string;
  variant?: {
    color?: string;
    size?: string;
    sku?: string;
  };
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  user: string | User;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shippingCost: number;
  discount: number;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  shippingAddress: ShippingAddress;
  notes?: string;
  trackingNumber?: string;
  cancelReason?: string;
  shippedAt?: string;
  deliveredAt?: string;
  returnedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Cart types
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

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: unknown[];
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  role?: 'seller' | 'customer';
  businessName?: string;
  businessLicense?: string;
  businessAddress?: string;
  taxId?: string;
  affiliatedBy?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// Stats types
export interface AdminStats {
  users: {
    total: number;
    active: number;
  };
  vendors: {
    total: number;
    pending: number;
  };
  products: {
    total: number;
    active: number;
  };
  orders: {
    total: number;
    pending: number;
  };
  revenue: {
    total: number;
  };
  recentOrders: Order[];
}

export interface VendorStats {
  products: {
    total: number;
    active: number;
    outOfStock: number;
  };
  orders: {
    total: number;
    pending: number;
    completed: number;
  };
  revenue: {
    total: number;
  };
  topProducts: Product[];
}
