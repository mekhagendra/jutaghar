import { API_BASE_URL } from '@/api';
import type { Product } from '@/types';
import React, { useEffect, useRef } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';

const HORIZONTAL_PADDING = 14;
const CARD_GAP = 10;
const AUTO_SCROLL_INTERVAL_MS = 3200;

interface FeaturedProps {
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

export default function Featured({ products, onViewProduct }: FeaturedProps) {
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<Product>>(null);
  const currentIndexRef = useRef(0);
  const isUserInteractingRef = useRef(false);

  const featuredItems = products.slice(0, 4);
  const visibleItems = width > 992 ? 4 : width > 760 ? 3 : width > 520 ? 2 : 1;
  const viewportWidth = width - HORIZONTAL_PADDING * 2;
  const cardWidth = (viewportWidth - (visibleItems - 1) * CARD_GAP) / visibleItems;
  const itemSize = cardWidth + CARD_GAP;
  const maxStartIndex = Math.max(0, featuredItems.length - visibleItems);

  useEffect(() => {
    currentIndexRef.current = 0;
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [itemSize, featuredItems.length]);

  useEffect(() => {
    if (maxStartIndex === 0) return;

    const id = setInterval(() => {
      if (isUserInteractingRef.current) return;

      const nextIndex = currentIndexRef.current >= maxStartIndex ? 0 : currentIndexRef.current + 1;
      listRef.current?.scrollToOffset({ offset: nextIndex * itemSize, animated: true });
      currentIndexRef.current = nextIndex;
    }, AUTO_SCROLL_INTERVAL_MS);

    return () => clearInterval(id);
  }, [itemSize, maxStartIndex]);

  if (featuredItems.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Featured</Text>
          <Text style={styles.subtitle}>Handpicked just for you</Text>
        </View>
      </View>
      <FlatList
        ref={listRef}
        data={featuredItems}
        keyExtractor={(item) => `featured-${item._id}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEnabled
        snapToInterval={itemSize}
        decelerationRate="fast"
        snapToAlignment="start"
        disableIntervalMomentum
        bounces={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
        onScrollBeginDrag={() => {
          isUserInteractingRef.current = true;
        }}
        onMomentumScrollEnd={(event) => {
          const offsetX = event.nativeEvent.contentOffset.x;
          currentIndexRef.current = Math.max(0, Math.min(maxStartIndex, Math.round(offsetX / itemSize)));
          isUserInteractingRef.current = false;
        }}
        getItemLayout={(_, index) => ({
          length: itemSize,
          offset: itemSize * index,
          index,
        })}
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
  header: {
    paddingHorizontal: 14,
    marginBottom: 12,
    marginTop: 4,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 16,
  },
  separator: {
    width: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    padding: 12,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
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
