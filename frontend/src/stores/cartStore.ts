import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Product, ProductVariant } from '@/types';

interface CartState {
  items: CartItem[];
  addItem: (product: Product, quantity?: number, variant?: ProductVariant) => void;
  removeItem: (productId: string, variantKey?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantKey?: string) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

const getVariantKey = (variant?: ProductVariant | { color?: string; size?: string; sku?: string }) => {
  if (!variant) return '';
  return `${variant.color || ''}-${variant.size || ''}-${variant.sku || ''}`;
};

const getCartItemKey = (item: CartItem) => {
  const variantKey = getVariantKey(item.selectedVariant);
  return variantKey ? `${item.product._id}-${variantKey}` : item.product._id;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product: Product, quantity = 1, variant?: ProductVariant) => {
        set((state) => {
          const selectedVariant = variant ? {
            color: variant.color,
            size: variant.size,
            sku: variant.sku,
            price: variant.price
          } : undefined;

          const newItem: CartItem = { product, quantity, selectedVariant };
          const newItemKey = getCartItemKey(newItem);

          const existingItemIndex = state.items.findIndex(item => getCartItemKey(item) === newItemKey);

          if (existingItemIndex >= 0) {
            return {
              items: state.items.map((item, index) =>
                index === existingItemIndex
                  ? { ...item, quantity: item.quantity + quantity }
                  : item
              ),
            };
          }

          return {
            items: [...state.items, newItem],
          };
        });
      },

      removeItem: (productId: string, variantKey?: string) => {
        set((state) => ({
          items: state.items.filter((item) => {
            const itemKey = getCartItemKey(item);
            const targetKey = variantKey ? `${productId}-${variantKey}` : productId;
            return itemKey !== targetKey;
          }),
        }));
      },

      updateQuantity: (productId: string, quantity: number, variantKey?: string) => {
        if (quantity <= 0) {
          get().removeItem(productId, variantKey);
          return;
        }

        set((state) => ({
          items: state.items.map((item) => {
            const itemKey = getCartItemKey(item);
            const targetKey = variantKey ? `${productId}-${variantKey}` : productId;
            return itemKey === targetKey ? { ...item, quantity } : item;
          }),
        }));
      },

      clearCart: () => {
        set({ items: [] });
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce((total, item) => {
          const price = item.selectedVariant?.price || item.product.price;
          return total + price * item.quantity;
        }, 0);
      },
    }),
    {
      name: 'cart-storage',
    }
  )
);
