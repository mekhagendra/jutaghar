import api, { API_BASE_URL } from '@/api';
import type { Product } from '@/types';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';

interface SaleProps {
  onViewProduct?: (product: Product) => void;
}

const getImageUrl = (path?: string) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

export default function Sale({ onViewProduct }: SaleProps) {
  const { width } = useWindowDimensions();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const numColumns = width > 992 ? 6 : width > 640 ? 3 : 2;
  const cardWidth = (width - 28 - (numColumns - 1) * 10) / numColumns;

  useEffect(() => {
    const fetchSaleProducts = async () => {
      try {
        const res = await api.get<{ products?: Product[] }>('/api/products?onSale=true&limit=6');
        setProducts((res.data?.products || []).filter((p) => p.onSale).slice(0, 6));
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchSaleProducts();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#e74c3c" />
      </View>
    );
  }

  if (products.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏷️ Sale</Text>
      <FlatList
        key={numColumns}
        data={products}
        keyExtractor={(item) => `sale-${item._id}`}
        numColumns={numColumns}
        scrollEnabled={false}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const imageUrl = getImageUrl(item.mainImage || item.images?.[0]);
          const discount = item.salePrice
            ? Math.round(((item.price - item.salePrice) / item.price) * 100)
            : 0;

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
                {discount > 0 && (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>-{discount}%</Text>
                  </View>
                )}
              </View>
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.salePrice}>
                    Rs. {(item.salePrice ?? item.price).toLocaleString()}
                  </Text>
                  {item.salePrice && (
                    <Text style={styles.originalPrice}>Rs. {item.price.toLocaleString()}</Text>
                  )}
                </View>
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
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
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
    borderWidth: 1,
    borderColor: '#fde8e8',
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
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#e74c3c',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  discountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  info: {
    padding: 10,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  salePrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#e74c3c',
  },
  originalPrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  rating: {
    fontSize: 11,
    color: '#f39c12',
    marginTop: 4,
  },
});
