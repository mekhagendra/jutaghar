import {
    addToWishlist,
    clearWishlist,
    getWishlistCount,
    getWishlistItems,
    isInWishlist,
    toggleWishlist,
} from '@/stores/wishlistStore';
import type { Product } from '@/types';

function makeProduct(id: string, overrides: Partial<Product> = {}): Product {
  return {
    _id: id,
    name: `Wishlist ${id}`,
    description: 'Test wishlist product',
    price: 1200,
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

describe('wishlistStore', () => {
  beforeEach(async () => {
    await clearWishlist();
  });

  afterEach(async () => {
    await clearWishlist();
  });

  it('adds products and prevents duplicates', async () => {
    const product = makeProduct('w1');

    await addToWishlist(product);
    await addToWishlist(product);

    expect(getWishlistCount()).toBe(1);
    expect(isInWishlist(product._id)).toBe(true);
  });

  it('toggles wishlist state and returns current state', async () => {
    const product = makeProduct('w2');

    const added = await toggleWishlist(product);
    expect(added).toBe(true);
    expect(getWishlistCount()).toBe(1);

    const removed = await toggleWishlist(product);
    expect(removed).toBe(false);
    expect(getWishlistCount()).toBe(0);
  });

  it('clears wishlist items', async () => {
    await addToWishlist(makeProduct('w3'));
    await addToWishlist(makeProduct('w4'));

    expect(getWishlistItems()).toHaveLength(2);

    await clearWishlist();

    expect(getWishlistItems()).toHaveLength(0);
  });
});
