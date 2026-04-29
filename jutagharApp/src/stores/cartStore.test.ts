import {
    addToCart,
    clearCart,
    getCartItems,
    getTotalItems,
    getTotalPrice,
    removeFromCart,
    updateQuantity,
} from '@/stores/cartStore';
import type { Product } from '@/types';

function makeProduct(id: string, overrides: Partial<Product> = {}): Product {
  return {
    _id: id,
    name: `Product ${id}`,
    description: 'Test product',
    price: 1000,
    category: 'Sneakers',
    stock: 10,
    images: [],
    vendor: {
      _id: 'vendor-1',
      fullName: 'Vendor',
      role: 'seller',
    },
    status: 'active',
    rating: {
      average: 0,
      count: 0,
    },
    views: 0,
    sales: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('cartStore', () => {
  beforeEach(async () => {
    await clearCart();
  });

  afterEach(async () => {
    await clearCart();
  });

  it('adds items and calculates totals', async () => {
    const product = makeProduct('p1', { price: 1200 });

    await addToCart(product, 2);

    expect(getCartItems()).toHaveLength(1);
    expect(getTotalItems()).toBe(2);
    expect(getTotalPrice()).toBe(2400);
  });

  it('merges same product with same variant key', async () => {
    const product = makeProduct('p2', { price: 900 });
    const variant = { color: 'Black', size: '42', sku: 'SKU-42', price: 950 };

    await addToCart(product, 1, variant);
    await addToCart(product, 2, variant);

    const items = getCartItems();
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(3);
    expect(getTotalPrice()).toBe(2850);
  });

  it('keeps separate lines for different variants and removes by variant key', async () => {
    const product = makeProduct('p3');
    const red = { color: 'Red', size: '40', sku: 'R40', price: 1000 };
    const blue = { color: 'Blue', size: '40', sku: 'B40', price: 1000 };

    await addToCart(product, 1, red);
    await addToCart(product, 1, blue);
    expect(getCartItems()).toHaveLength(2);

    await removeFromCart(product._id, 'Red-40-R40');
    const items = getCartItems();
    expect(items).toHaveLength(1);
    expect(items[0].selectedVariant?.sku).toBe('B40');
  });

  it('removes item when quantity is set to zero', async () => {
    const product = makeProduct('p4');

    await addToCart(product, 1);
    await updateQuantity(product._id, 0);

    expect(getCartItems()).toHaveLength(0);
    expect(getTotalItems()).toBe(0);
  });

  it('uses sale price when variant price is not provided', async () => {
    const product = makeProduct('p5', {
      price: 2000,
      salePrice: 1500,
      onSale: true,
    });

    await addToCart(product, 2);

    expect(getTotalPrice()).toBe(3000);
  });
});
