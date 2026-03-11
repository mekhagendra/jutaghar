import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '@/types';

interface WishlistState {
  items: Product[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  toggleItem: (product: Product) => void;
  isInWishlist: (productId: string) => boolean;
  getTotalItems: () => number;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product: Product) => {
        set((state) => {
          if (state.items.some((p) => p._id === product._id)) return state;
          return { items: [...state.items, product] };
        });
      },

      removeItem: (productId: string) => {
        set((state) => ({ items: state.items.filter((p) => p._id !== productId) }));
      },

      toggleItem: (product: Product) => {
        const { isInWishlist, addItem, removeItem } = get();
        if (isInWishlist(product._id)) {
          removeItem(product._id);
        } else {
          addItem(product);
        }
      },

      isInWishlist: (productId: string) => {
        return get().items.some((p) => p._id === productId);
      },

      getTotalItems: () => get().items.length,
    }),
    { name: 'wishlist-storage' }
  )
);
