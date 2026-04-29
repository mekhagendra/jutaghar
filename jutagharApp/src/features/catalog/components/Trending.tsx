import { API_BASE_URL } from '@/api';
import { isInWishlist, subscribeWishlist, toggleWishlist } from '@/stores/wishlistStore';
import type { Product } from '@/types';
import React, { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';

interface TrendingProps {
  products: Product[];
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

export default function Trending({ products, onViewProduct }: TrendingProps) {
  const [, setWishlistTick] = useState(0);
  const { width } = useWindowDimensions();
  useEffect(() => {
    const unsubscribe = subscribeWishlist(() => {
      setWishlistTick((tick) => tick + 1);
    });
    return unsubscribe;
  }, []);
  if (products.length === 0) return null;

  const trendingItems = products.slice(0, 6);
  const numColumns = width > 992 ? 6 : width > 640 ? 3 : 2;
  const cardWidth = (width - 28 - (numColumns - 1) * 10) / numColumns;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔥 Trending</Text>
      <FlatList
        key={numColumns}
        data={trendingItems}
        keyExtractor={(item) => `trending-${item._id}`}
        numColumns={numColumns}
        scrollEnabled={false}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
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
                <TouchableOpacity
                  style={styles.wishlistButton}
                  onPress={(event) => {
                    event.stopPropagation();
                    void toggleWishlist(item);
                  }}
                >
                  <Text style={styles.wishlistIcon}>{isInWishlist(item._id) ? '♥' : '♡'}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.price}>Rs. {price.toLocaleString()}</Text>
                {originalPrice && (
                  <Text style={styles.originalPrice}>Rs. {originalPrice.toLocaleString()}</Text>
                )}
                {item.rating && item.rating.count > 0 && (
                  <Text style={styles.rating}>
                    {'★'.repeat(Math.round(item.rating.average))} {item.rating.average.toFixed(1)}
                  </Text>
                )}
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
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 16,
  },
  row: {
    gap: 10,
    marginBottom: 10,
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
  wishlistButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 2,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wishlistIcon: {
    fontSize: 16,
    color: '#e74c3c',
  },
  info: {
    padding: 10,
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 3,
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  originalPrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
    marginTop: 1,
  },
  rating: {
    fontSize: 11,
    color: '#f39c12',
    marginTop: 3,
  },
});
