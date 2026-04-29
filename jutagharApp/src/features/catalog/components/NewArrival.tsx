import api, { API_BASE_URL } from '@/api';
import { addToCart } from '@/features/checkout';
import type { Product, ProductsResponse } from '@/types';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';

interface NewArrivalProps {
  onViewProduct?: (product: Product) => void;
}

const getImageUrl = (path?: string) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

const getProductPrice = (product: Product) => {
  if (product.onSale && product.salePrice) {
    return { price: product.salePrice, originalPrice: product.price, onSale: true };
  }
  return { price: product.price, originalPrice: null, onSale: false };
};

const getCategoryName = (cat: string | { _id: string; name: string }) => {
  if (typeof cat === 'string') return cat;
  return cat?.name || '';
};

export default function NewArrival({ onViewProduct }: NewArrivalProps) {
  const { width } = useWindowDimensions();
  const [products, setProducts] = useState<Product[]>([]);

  const numColumns = width > 992 ? 6 : width > 640 ? 3 : 2;
  const cardWidth = (width - 28 - (numColumns - 1) * 10) / numColumns;

  const fetchNewArrivals = useCallback(async () => {
    try {
      const res = await api.get<ProductsResponse>('/api/products?limit=6&sort=new');
      setProducts((res.data?.products || []).slice(0, 6));
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchNewArrivals();
  }, [fetchNewArrivals]);

  const handleAddToCart = (product: Product) => {
    addToCart(product, 1);
    Alert.alert('Added to Cart', `${product.name} has been added to your cart.`);
  };

  if (products.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>✨ New Arrivals</Text>
      <FlatList
        key={numColumns}
        data={products}
        keyExtractor={(item) => item._id}
        numColumns={numColumns}
        scrollEnabled={false}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const { price, originalPrice, onSale } = getProductPrice(item);
          const imageUrl = getImageUrl(item.mainImage || item.images?.[0]);

          return (
            <TouchableOpacity
              style={[styles.card, { width: cardWidth }]}
              onPress={() => onViewProduct?.(item)}
              activeOpacity={0.8}
            >
              <View style={styles.imageContainer}>
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Text style={styles.placeholderText}>No Image</Text>
                  </View>
                )}
                {onSale && (
                  <View style={styles.saleBadge}>
                    <Text style={styles.saleBadgeText}>SALE</Text>
                  </View>
                )}
              </View>
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.category}>{getCategoryName(item.category)}</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.price}>Rs. {price.toLocaleString()}</Text>
                  {originalPrice && (
                    <Text style={styles.originalPrice}>Rs. {originalPrice.toLocaleString()}</Text>
                  )}
                </View>
                {item.rating && item.rating.count > 0 && (
                  <Text style={styles.rating}>
                    {'★'.repeat(Math.round(item.rating.average))}{'☆'.repeat(5 - Math.round(item.rating.average))} ({item.rating.count})
                  </Text>
                )}
                <TouchableOpacity
                  style={[styles.addToCartButton, item.stock <= 0 && styles.outOfStockButton]}
                  onPress={() => item.stock > 0 && handleAddToCart(item)}
                  disabled={item.stock <= 0}
                >
                  <Text style={styles.addToCartText}>
                    {item.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    marginBottom: 4,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1a1a2e',
    paddingHorizontal: 14,
    marginBottom: 10,
    marginTop: 4,
  },
  list: {
    paddingHorizontal: 14,
    paddingBottom: 20,
  },
  row: {
    gap: 10,
    marginBottom: 10,
    paddingHorizontal: 0,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  imageContainer: {
    aspectRatio: 1,
    backgroundColor: '#f0f0f0',
    position: 'relative',
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
    backgroundColor: '#ecf0f1',
  },
  placeholderText: {
    color: '#bbb',
    fontSize: 14,
  },
  saleBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#e74c3c',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  saleBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  info: {
    padding: 10,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 3,
  },
  category: {
    fontSize: 12,
    color: '#95a5a6',
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  originalPrice: {
    fontSize: 13,
    color: '#95a5a6',
    textDecorationLine: 'line-through',
  },
  rating: {
    fontSize: 12,
    color: '#f39c12',
    marginBottom: 6,
  },
  addToCartButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    padding: 9,
    alignItems: 'center',
  },
  outOfStockButton: {
    backgroundColor: '#bdc3c7',
  },
  addToCartText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
