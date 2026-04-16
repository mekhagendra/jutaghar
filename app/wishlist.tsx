import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Header from '../components/Header';
import { API_BASE_URL } from '../lib/api';
import { addToCart } from '../lib/cartStore';
import type { Product } from '../lib/types';
import {
    clearWishlist,
    getWishlistItems,
    removeFromWishlist,
    subscribeWishlist,
} from '../lib/wishlistStore';

const { width } = Dimensions.get('window');

interface WishlistScreenProps {
  onBack?: () => void;
  onViewProduct: (product: Product) => void;
}

export default function WishlistScreen({ onBack, onViewProduct }: WishlistScreenProps) {
  const [items, setItems] = useState<Product[]>([]);

  useEffect(() => {
    setItems(getWishlistItems());
    const unsubscribe = subscribeWishlist((newItems) => {
      setItems(newItems);
    });
    return unsubscribe;
  }, []);

  const getImageUrl = (path?: string) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  const handleRemove = (product: Product) => {
    Alert.alert('Remove', `Remove ${product.name} from wishlist?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeFromWishlist(product._id) },
    ]);
  };

  const handleAddToCart = (product: Product) => {
    addToCart(product, 1);
    Alert.alert('Added to Cart', `${product.name} has been added to your cart.`);
  };

  const handleClearAll = () => {
    Alert.alert('Clear Wishlist', 'Remove all items from your wishlist?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: clearWishlist },
    ]);
  };

  const getProductPrice = (product: Product) => {
    if (product.onSale && product.salePrice) {
      return { price: product.salePrice, originalPrice: product.price, onSale: true };
    }
    return { price: product.price, originalPrice: null, onSale: false };
  };

  const renderItem = ({ item }: { item: Product }) => {
    const { price, originalPrice, onSale } = getProductPrice(item);
    const imageUrl = getImageUrl(item.mainImage || item.images?.[0]);

    return (
      <TouchableOpacity style={styles.card} onPress={() => onViewProduct(item)} activeOpacity={0.8}>
        <View style={styles.cardImage}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.placeholderText}>👟</Text>
            </View>
          )}
          {onSale && (
            <View style={styles.saleBadge}>
              <Text style={styles.saleBadgeText}>SALE</Text>
            </View>
          )}
          <TouchableOpacity style={styles.removeButton} onPress={() => handleRemove(item)}>
            <Text style={styles.removeIcon}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>Rs. {price.toLocaleString()}</Text>
            {originalPrice && (
              <Text style={styles.originalPrice}>Rs. {originalPrice.toLocaleString()}</Text>
            )}
          </View>
          {item.rating && item.rating.count > 0 && (
            <Text style={styles.rating}>
              {'★'.repeat(Math.round(item.rating.average))} ({item.rating.count})
            </Text>
          )}
          <TouchableOpacity
            style={[styles.addToCartButton, item.stock <= 0 && styles.outOfStockButton]}
            onPress={() => item.stock > 0 && handleAddToCart(item)}
            disabled={item.stock <= 0}
          >
            <Text style={styles.addToCartText}>
              {item.stock <= 0 ? 'Out of Stock' : '🛒 Add to Cart'}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <Header />

      <FlatList
        data={items}
        keyExtractor={(item) => item._id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>❤️</Text>
            <Text style={styles.emptyText}>Your wishlist is empty</Text>
            <Text style={styles.emptySubtext}>Browse products and tap the heart to save them</Text>
            <TouchableOpacity style={styles.shopButton} onPress={onBack}>
              <Text style={styles.shopButtonText}>Browse Products</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },

  list: { paddingHorizontal: 6, paddingTop: 12, paddingBottom: 20 },
  row: { justifyContent: 'space-between', paddingHorizontal: 6 },

  card: {
    backgroundColor: '#fff', borderRadius: 12, width: (width - 36) / 2,
    marginBottom: 12, overflow: 'hidden', elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3,
  },
  cardImage: { height: 155, backgroundColor: '#f0f0f0', position: 'relative' },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: {
    width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#ecf0f1',
  },
  placeholderText: { fontSize: 32 },
  saleBadge: {
    position: 'absolute', top: 8, left: 8, backgroundColor: '#e74c3c',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  saleBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  removeButton: {
    position: 'absolute', top: 8, right: 8, width: 28, height: 28,
    borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
  },
  removeIcon: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

  cardInfo: { padding: 10 },
  productName: { fontSize: 14, fontWeight: '600', color: '#2c3e50', marginBottom: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  price: { fontSize: 16, fontWeight: 'bold', color: '#1a1a2e' },
  originalPrice: { fontSize: 13, color: '#95a5a6', textDecorationLine: 'line-through' },
  rating: { fontSize: 12, color: '#f39c12', marginBottom: 6 },
  addToCartButton: { backgroundColor: '#3498db', borderRadius: 8, padding: 9, alignItems: 'center' },
  outOfStockButton: { backgroundColor: '#bdc3c7' },
  addToCartText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  emptyContainer: { alignItems: 'center', paddingVertical: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, color: '#2c3e50', fontWeight: '600' },
  emptySubtext: { fontSize: 14, color: '#95a5a6', marginTop: 4, textAlign: 'center', paddingHorizontal: 40 },
  shopButton: {
    marginTop: 20, backgroundColor: '#3498db', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10,
  },
  shopButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
