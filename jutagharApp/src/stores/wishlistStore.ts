import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Product } from '@/types';

const WISHLIST_STORAGE_KEY = 'jutaghar_wishlist';

let wishlistItems: Product[] = [];
let listeners: ((items: Product[]) => void)[] = [];

function notifyListeners() {
  listeners.forEach(listener => listener([...wishlistItems]));
}

export function subscribeWishlist(listener: (items: Product[]) => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}

export function getWishlistItems(): Product[] {
  return [...wishlistItems];
}

export function isInWishlist(productId: string): boolean {
  return wishlistItems.some(item => item._id === productId);
}

export function getWishlistCount(): number {
  return wishlistItems.length;
}

export async function loadWishlist(): Promise<Product[]> {
  try {
    const stored = await AsyncStorage.getItem(WISHLIST_STORAGE_KEY);
    if (stored) {
      wishlistItems = JSON.parse(stored);
    }
  } catch {
    wishlistItems = [];
  }
  notifyListeners();
  return [...wishlistItems];
}

async function persistWishlist() {
  try {
    await AsyncStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlistItems));
  } catch {
    // Ignore storage errors
  }
}

export async function addToWishlist(product: Product): Promise<void> {
  if (isInWishlist(product._id)) return;
  wishlistItems.push(product);
  await persistWishlist();
  notifyListeners();
}

export async function removeFromWishlist(productId: string): Promise<void> {
  wishlistItems = wishlistItems.filter(item => item._id !== productId);
  await persistWishlist();
  notifyListeners();
}

export async function toggleWishlist(product: Product): Promise<boolean> {
  if (isInWishlist(product._id)) {
    await removeFromWishlist(product._id);
    return false;
  } else {
    await addToWishlist(product);
    return true;
  }
}

export async function clearWishlist(): Promise<void> {
  wishlistItems = [];
  await persistWishlist();
  notifyListeners();
}
