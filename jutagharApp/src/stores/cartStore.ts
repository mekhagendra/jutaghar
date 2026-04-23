import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Product, CartItem } from '@/types';

const CART_STORAGE_KEY = 'jutaghar_cart';

let cartItems: CartItem[] = [];
let listeners: ((items: CartItem[]) => void)[] = [];

function notifyListeners() {
  listeners.forEach(listener => listener([...cartItems]));
}

export function subscribeCart(listener: (items: CartItem[]) => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}

export function getCartItems(): CartItem[] {
  return [...cartItems];
}

export async function loadCart(): Promise<CartItem[]> {
  try {
    const stored = await AsyncStorage.getItem(CART_STORAGE_KEY);
    if (stored) {
      cartItems = JSON.parse(stored);
    }
  } catch {
    cartItems = [];
  }
  notifyListeners();
  return [...cartItems];
}

async function persistCart() {
  try {
    await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
  } catch {
    // Ignore storage errors
  }
}

function getVariantKey(variant?: CartItem['selectedVariant']): string {
  if (!variant) return 'default';
  return `${variant.color || ''}-${variant.size || ''}-${variant.sku || ''}`;
}

export async function addToCart(
  product: Product,
  quantity: number = 1,
  selectedVariant?: CartItem['selectedVariant']
): Promise<void> {
  const variantKey = getVariantKey(selectedVariant);
  const existingIndex = cartItems.findIndex(
    item => item.product._id === product._id && getVariantKey(item.selectedVariant) === variantKey
  );

  if (existingIndex >= 0) {
    cartItems[existingIndex].quantity += quantity;
  } else {
    cartItems.push({ product, quantity, selectedVariant });
  }

  await persistCart();
  notifyListeners();
}

export async function removeFromCart(productId: string, variantKey?: string): Promise<void> {
  if (variantKey) {
    cartItems = cartItems.filter(
      item => !(item.product._id === productId && getVariantKey(item.selectedVariant) === variantKey)
    );
  } else {
    cartItems = cartItems.filter(item => item.product._id !== productId);
  }

  await persistCart();
  notifyListeners();
}

export async function updateQuantity(productId: string, quantity: number, variantKey?: string): Promise<void> {
  const index = cartItems.findIndex(item => {
    if (item.product._id !== productId) return false;
    if (variantKey) return getVariantKey(item.selectedVariant) === variantKey;
    return true;
  });

  if (index >= 0) {
    if (quantity <= 0) {
      cartItems.splice(index, 1);
    } else {
      cartItems[index].quantity = quantity;
    }
  }

  await persistCart();
  notifyListeners();
}

export async function clearCart(): Promise<void> {
  cartItems = [];
  await persistCart();
  notifyListeners();
}

export function getTotalItems(): number {
  return cartItems.reduce((sum, item) => sum + item.quantity, 0);
}

export function getTotalPrice(): number {
  return cartItems.reduce((sum, item) => {
    const price = item.selectedVariant?.price || item.product.salePrice || item.product.price;
    return sum + price * item.quantity;
  }, 0);
}
