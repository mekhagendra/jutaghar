import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Header from '@/shared/components/Header';
import { API_BASE_URL } from '@/api';
import {
    getCartItems,
    getTotalItems,
    getTotalPrice,
    removeFromCart,
    subscribeCart,
    updateQuantity,
} from '@/features/checkout';
import type { CartItem } from '@/types';

interface CartScreenProps {
  onBack?: () => void;
  onCheckout?: () => void;
  onBrowseProducts?: () => void;
}

export default function CartScreen({ onBack, onCheckout, onBrowseProducts }: CartScreenProps) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(getCartItems());
    const unsubscribe = subscribeCart((newItems) => {
      setItems(newItems);
    });
    return unsubscribe;
  }, []);

  const getImageUrl = (path?: string) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  const getItemPrice = (item: CartItem) => {
    return item.selectedVariant?.price || item.product.salePrice || item.product.price;
  };

  const getVariantKey = (variant?: CartItem['selectedVariant']) => {
    if (!variant) return undefined;
    return `${variant.color || ''}-${variant.size || ''}-${variant.sku || ''}`;
  };

  const handleRemoveItem = (item: CartItem) => {
    Alert.alert('Remove Item', `Remove ${item.product.name} from cart?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeFromCart(item.product._id, getVariantKey(item.selectedVariant)) },
    ]);
  };

  const handleUpdateQuantity = async (item: CartItem, nextQuantity: number) => {
    await updateQuantity(item.product._id, nextQuantity, getVariantKey(item.selectedVariant));
  };

  const handleCheckout = () => {
    if (onCheckout) {
      onCheckout();
    } else {
      Alert.alert('Checkout', 'Checkout functionality coming soon!');
    }
  };

  const totalItems = getTotalItems();
  const totalPrice = getTotalPrice();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <Header />

      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>Add some products to get started!</Text>
          <TouchableOpacity style={styles.shopButton} onPress={onBrowseProducts || onBack}>
            <Text style={styles.shopButtonText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView style={styles.itemsList} showsVerticalScrollIndicator={false}>
            {items.map((item, index) => {
              const imageUrl = getImageUrl(
                item.selectedVariant?.image || item.product.mainImage || item.product.images?.[0]
              );
              const price = getItemPrice(item);

              return (
                <View key={`${item.product._id}-${index}`} style={styles.cartItem}>
                  {/* Product Image */}
                  <View style={styles.itemImage}>
                    {imageUrl ? (
                      <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <Text style={styles.placeholderText}>👟</Text>
                      </View>
                    )}
                  </View>

                  {/* Product Info */}
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={2}>{item.product.name}</Text>
                    {item.selectedVariant && (
                      <Text style={styles.variantText}>
                        {[item.selectedVariant.color, item.selectedVariant.size].filter(Boolean).join(' / ')}
                      </Text>
                    )}
                    <Text style={styles.itemPrice}>Rs. {price.toLocaleString()}</Text>

                    {/* Quantity Controls */}
                    <View style={styles.quantityRow}>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        onPress={() => {
                          void handleUpdateQuantity(item, item.quantity - 1);
                        }}
                      >
                        <Text style={styles.qtyBtnText}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.qtyValue}>{item.quantity}</Text>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        onPress={() => {
                          void handleUpdateQuantity(item, item.quantity + 1);
                        }}
                      >
                        <Text style={styles.qtyBtnText}>+</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.removeBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        onPress={() => handleRemoveItem(item)}
                      >
                        <Text style={styles.removeBtnText}>🗑</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Item Total */}
                  <Text style={styles.itemTotal}>
                    Rs. {(price * item.quantity).toLocaleString()}
                  </Text>
                </View>
              );
            })}
            <View style={{ height: 120 }} />
          </ScrollView>

          {/* Bottom Summary */}
          <View style={styles.bottomBar}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal ({totalItems} items)</Text>
              <Text style={styles.summaryValue}>Rs. {totalPrice.toLocaleString()}</Text>
            </View>
            <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Text style={styles.checkoutText}>Proceed to Checkout</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#95a5a6',
    marginBottom: 24,
  },
  shopButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
  },
  shopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  itemsList: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 28,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  variantText: {
    fontSize: 13,
    color: '#95a5a6',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#ecf0f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  qtyValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    minWidth: 24,
    textAlign: 'center',
  },
  removeBtn: {
    marginLeft: 'auto',
    padding: 4,
  },
  removeBtnText: {
    fontSize: 18,
  },
  itemTotal: {
    position: 'absolute',
    top: 12,
    right: 12,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  bottomBar: {
    padding: 16,
    paddingBottom: 30,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  checkoutButton: {
    backgroundColor: '#3498db',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  checkoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
