import api, { API_BASE_URL } from '@/api';
import { addToCart } from '@/features/checkout';
import type { Product, ProductsResponse } from '@/types';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Dimensions, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

interface NewArrivalProps {
  onViewProduct?: (product: Product) => void;
  onLoadMore?: () => void;
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

const getBrandName = (brand?: string | { _id: string; name: string }) => {
  if (!brand) return '';
  if (typeof brand === 'string') return brand;
  return brand.name || '';
};

export default function NewArrival({ onViewProduct, onLoadMore }: NewArrivalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const visibleCount = 6;

  const fetchNewArrivals = useCallback(async () => {
    try {
      const res = await api.get<ProductsResponse>('/api/products?limit=20&sort=new');
      setProducts(res.data?.products || []);
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

  const query = searchQuery.trim().toLowerCase();
  const filtered = query
    ? products.filter((p) => {
        const nameMatch = p.name.toLowerCase().includes(query);
        const brandMatch = getBrandName(p.brand).toLowerCase().includes(query);
        const sellerMatch =
          (p.vendor?.businessName || '').toLowerCase().includes(query) ||
          (p.vendor?.fullName || '').toLowerCase().includes(query);
        return nameMatch || brandMatch || sellerMatch;
      })
    : products;

  const visibleProducts = query ? filtered : filtered.slice(0, visibleCount);
  const hasMore = !query && visibleCount < products.length;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>✨ New Arrivals</Text>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, brand or seller…"
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>
      {query && filtered.length === 0 && (
        <Text style={styles.noResults}>No products match &ldquo;{searchQuery}&rdquo;</Text>
      )}
      <FlatList
        data={visibleProducts}
        keyExtractor={(item) => item._id}
        numColumns={2}
        scrollEnabled={false}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const { price, originalPrice, onSale } = getProductPrice(item);
          const imageUrl = getImageUrl(item.mainImage || item.images?.[0]);

          return (
            <TouchableOpacity
              style={styles.card}
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
      {hasMore && (
        <TouchableOpacity
          style={styles.loadMoreButton}
          onPress={() => onLoadMore?.()}
          activeOpacity={0.8}
        >
          <Text style={styles.loadMoreText}>Load More</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    marginBottom: 4,
  },
  searchContainer: {
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e4e7eb',
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#1f2937',
  },
  noResults: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 14,
    paddingVertical: 20,
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
    paddingHorizontal: 6,
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: (width - 36) / 2,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  imageContainer: {
    height: 155,
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
  loadMoreButton: {
    backgroundColor: '#3498db',
    marginHorizontal: 12,
    marginTop: 4,
    marginBottom: 12,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  loadMoreText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
