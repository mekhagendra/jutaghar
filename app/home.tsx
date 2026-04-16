import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Header from '../components/Header';
import Navbar from '../components/Navbar';
import api, { API_BASE_URL } from '../lib/api';
import { addToCart, subscribeCart } from '../lib/cartStore';
import type { Brand, Category, HeroSlide, Product, ProductsResponse } from '../lib/types';

const { width } = Dimensions.get('window');

interface HomeScreenProps {
  onLogout?: () => void;
  onGoToLogin?: () => void;
  userData?: any;
  onViewProduct?: (product: Product) => void;
  onViewCart?: () => void;
  onViewProducts?: (categoryId?: string) => void;
  onViewOrders?: () => void;
  onViewProfile?: () => void;
  onViewWishlist?: () => void;
  onViewAbout?: () => void;
  onViewContact?: () => void;
}

export default function HomeScreen({ onLogout, onGoToLogin, userData, onViewProduct, onViewCart, onViewProducts, onViewOrders, onViewProfile, onViewWishlist, onViewAbout, onViewContact }: HomeScreenProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const heroScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const unsubscribe = subscribeCart(() => {
      // Keep cart in sync
    });
    return unsubscribe;
  }, []);

  // Auto-scroll hero slides
  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => {
        const next = (prev + 1) % heroSlides.length;
        heroScrollRef.current?.scrollTo({ x: next * (width - 24), animated: true });
        return next;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [heroSlides.length]);

  const fetchData = useCallback(async () => {
    try {
      const [productsRes, featuredRes, trendingRes, categoriesRes, brandsRes, heroRes] = await Promise.all([
        api.get<ProductsResponse>('/api/products?limit=20&sort=new'),
        api.get<ProductsResponse>('/api/products?limit=6&sort=rating'),
        api.get<ProductsResponse>('/api/products?limit=6&sort=popular'),
        api.get<Category[]>('/api/catalog/categories?status=active'),
        api.get<Brand[]>('/api/catalog/brands?status=active').catch(() => ({ data: [] as Brand[] })),
        api.get<HeroSlide[]>('/api/hero-slides'),
      ]);

      setProducts(productsRes.data?.products || (Array.isArray(productsRes.data) ? productsRes.data as unknown as Product[] : []));
      setFeaturedProducts(featuredRes.data?.products || []);
      setTrendingProducts(trendingRes.data?.products || []);
      setCategories(Array.isArray(categoriesRes.data) ? categoriesRes.data : []);
      setBrands(Array.isArray(brandsRes.data) ? brandsRes.data : []);
      setHeroSlides(Array.isArray(heroRes.data) ? heroRes.data.filter((s: HeroSlide) => s.isActive) : []);
    } catch (error: any) {
      console.log('Error fetching data:', error.message);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const searchProducts = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      fetchData();
      return;
    }
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ search: query, limit: '20' });
      if (selectedCategory) params.append('category', selectedCategory);
      const res = await api.get<ProductsResponse>(`/api/products?${params.toString()}`);
      setProducts(res.data?.products || []);
    } catch {
      Alert.alert('Error', 'Failed to search products');
    } finally {
      setIsLoading(false);
    }
  };

  const filterByCategory = async (categoryId: string | null) => {
    setSelectedCategory(categoryId);
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: '20', sort: 'new' });
      if (categoryId) params.append('category', categoryId);
      if (searchQuery) params.append('search', searchQuery);
      const res = await api.get<ProductsResponse>(`/api/products?${params.toString()}`);
      setProducts(res.data?.products || []);
    } catch {
      Alert.alert('Error', 'Failed to filter products');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    addToCart(product, 1);
    Alert.alert('Added to Cart', `${product.name} has been added to your cart.`);
  };

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

  // ── Hero Carousel ──
  const renderHeroSlides = () => {
    if (heroSlides.length === 0) return null;
    return (
      <View style={styles.heroContainer}>
        <ScrollView
          ref={heroScrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / (width - 24));
            setCurrentSlide(index);
          }}
        >
          {heroSlides.map((slide) => (
            <View key={slide._id} style={styles.heroSlide}>
              <Image
                source={{ uri: getImageUrl(slide.image) || undefined }}
                style={styles.heroImage}
                resizeMode="cover"
              />
              <View style={styles.heroOverlay}>
                <Text style={styles.heroTitle}>{slide.title}</Text>
                {slide.subtitle && <Text style={styles.heroSubtitle}>{slide.subtitle}</Text>}
              </View>
            </View>
          ))}
        </ScrollView>
        {heroSlides.length > 1 && (
          <View style={styles.heroDots}>
            {heroSlides.map((_, idx) => (
              <View key={idx} style={[styles.heroDot, idx === currentSlide && styles.heroDotActive]} />
            ))}
          </View>
        )}
      </View>
    );
  };


  // ── Category Cards ──
  const renderCategoryCards = () => {
    if (categories.length === 0) return null;
    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Shop by Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryCardsScroll}>
          {categories.map((cat) => {
            const imageUrl = getImageUrl(cat.image);
            return (
              <TouchableOpacity
                key={cat._id}
                style={[styles.categoryCard, selectedCategory === cat._id && styles.categoryCardActive]}
                onPress={() => filterByCategory(selectedCategory === cat._id ? null : cat._id)}
                activeOpacity={0.8}
              >
                <View style={styles.categoryImageContainer}>
                  {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.categoryImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.categoryPlaceholder}>
                      <Text style={styles.categoryPlaceholderIcon}>👟</Text>
                    </View>
                  )}
                  {selectedCategory === cat._id && (
                    <View style={styles.categoryActiveOverlay}>
                      <Text style={styles.categoryCheckmark}>✓</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.categoryCardName, selectedCategory === cat._id && styles.categoryCardNameActive]} numberOfLines={1}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  // ── Horizontal Product Strip ──
  const renderProductStrip = (title: string, items: Product[], emoji?: string) => {
    if (items.length === 0) return null;
    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>{emoji ? `${emoji} ` : ''}{title}</Text>
        <FlatList
          horizontal
          data={items}
          keyExtractor={(item) => `${title}-${item._id}`}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalListContent}
          renderItem={({ item }) => {
            const { price, originalPrice, onSale } = getProductPrice(item);
            const imageUrl = getImageUrl(item.mainImage || item.images?.[0]);
            return (
              <TouchableOpacity
                style={styles.horizontalCard}
                onPress={() => onViewProduct?.(item)}
                activeOpacity={0.8}
              >
                <View style={styles.horizontalImageContainer}>
                  {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.horizontalImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.horizontalImagePlaceholder}>
                      <Text style={styles.placeholderText}>No Image</Text>
                    </View>
                  )}
                  {onSale && (
                    <View style={styles.saleBadge}>
                      <Text style={styles.saleBadgeText}>SALE</Text>
                    </View>
                  )}
                </View>
                <View style={styles.horizontalInfo}>
                  <Text style={styles.horizontalName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.horizontalPrice}>Rs. {price.toLocaleString()}</Text>
                  {originalPrice && (
                    <Text style={styles.horizontalOriginalPrice}>Rs. {originalPrice.toLocaleString()}</Text>
                  )}
                  {item.rating && item.rating.count > 0 && (
                    <Text style={styles.horizontalRating}>
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
  };

  // ── Brand Showcase ──
  const renderBrands = () => {
    if (brands.length === 0) return null;
    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Top Brands</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.brandsScroll}>
          {brands.map((brand) => {
            const logoUrl = getImageUrl(brand.logo);
            return (
              <View key={brand._id} style={styles.brandCard}>
                {logoUrl ? (
                  <Image source={{ uri: logoUrl }} style={styles.brandLogo} resizeMode="contain" />
                ) : (
                  <View style={styles.brandLogoPlaceholder}>
                    <Text style={styles.brandInitial}>{brand.name.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <Text style={styles.brandName} numberOfLines={1}>{brand.name}</Text>
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  // ── Promo Strip ──
  const renderPromoStrip = () => (
    <View style={styles.promoStrip}>
      <View style={styles.promoItem}>
        <Text style={styles.promoIcon}>🔥</Text>
        <View>
          <Text style={styles.promoTitle}>Daily Deals</Text>
          <Text style={styles.promoSubtitle}>Up to 50% off</Text>
        </View>
      </View>
      <View style={styles.promoDivider} />
      <View style={styles.promoItem}>
        <Text style={styles.promoIcon}>🆕</Text>
        <View>
          <Text style={styles.promoTitle}>New Arrivals</Text>
          <Text style={styles.promoSubtitle}>Fresh styles weekly</Text>
        </View>
      </View>
    </View>
  );

  // ── Product Grid Card ──
  const renderProductCard = ({ item }: { item: Product }) => {
    const { price, originalPrice, onSale } = getProductPrice(item);
    const imageUrl = getImageUrl(item.mainImage || item.images?.[0]);

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => onViewProduct?.(item)}
        activeOpacity={0.8}
      >
        <View style={styles.productImageContainer}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.productImage} resizeMode="cover" />
          ) : (
            <View style={styles.productImagePlaceholder}>
              <Text style={styles.placeholderText}>No Image</Text>
            </View>
          )}
          {onSale && (
            <View style={styles.saleBadge}>
              <Text style={styles.saleBadgeText}>SALE</Text>
            </View>
          )}
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.productCategory}>{getCategoryName(item.category)}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.productPrice}>Rs. {price.toLocaleString()}</Text>
            {originalPrice && (
              <Text style={styles.originalPrice}>Rs. {originalPrice.toLocaleString()}</Text>
            )}
          </View>
          {item.rating && item.rating.count > 0 && (
            <Text style={styles.ratingText}>
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
  };

  if (isLoading && products.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <Header onSearch={(text) => searchProducts(text)} />

      {/* Navbar */}
      <Navbar items={[
        { key: 'products', label: 'Products', icon: '🛍️', onPress: () => onViewProducts?.() },
        { key: 'orders', label: 'Orders', icon: '📦', onPress: () => onViewOrders?.() },
        { key: 'wishlist', label: 'Wishlist', icon: '❤️', onPress: () => onViewWishlist?.() },
        { key: 'about', label: 'About Us', icon: 'ℹ️', onPress: () => onViewAbout?.() },
        { key: 'contact', label: 'Contact', icon: '✉️', onPress: () => onViewContact?.() },
      ]} />

      <FlatList
        data={products}
        keyExtractor={(item) => item._id}
        numColumns={2}
        columnWrapperStyle={styles.productRow}
        contentContainerStyle={styles.productList}
        renderItem={renderProductCard}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3498db']} />}
        ListHeaderComponent={
          <>
            {/* Hero Carousel */}
            {renderHeroSlides()}

            {/* Category Cards */}
            {renderCategoryCards()}

            {/* Featured Products (horizontal) */}
            {renderProductStrip('Featured', featuredProducts, '⭐')}

            {/* Promo Strip */}
            {renderPromoStrip()}

            {/* Trending Products (horizontal) */}
            {renderProductStrip('Trending Now', trendingProducts, '🔥')}

            {/* Brand Showcase */}
            {renderBrands()}

            {/* All Products Grid Header */}
            <Text style={styles.sectionTitle}>
              {selectedCategory ? 'Filtered Products' : '🛍️ All Products'}
            </Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>👟</Text>
            <Text style={styles.emptyText}>No products found</Text>
            <Text style={styles.emptySubtext}>Try a different search or category</Text>
          </View>
        }
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#7f8c8d',
  },

  // ── Search ──\n  // (handled by Header component)\n\n  // ── Hero ──", "oldString": "  // ── Search ──\n  searchContainer: {\n    flexDirection: 'row',\n    margin: 12,\n    backgroundColor: '#fff',\n    borderRadius: 12,\n    alignItems: 'center',\n    paddingHorizontal: 12,\n    elevation: 3,\n    shadowColor: '#000',\n    shadowOffset: { width: 0, height: 2 },\n    shadowOpacity: 0.08,\n    shadowRadius: 4,\n  },\n  searchIcon: {\n    fontSize: 16,\n    marginRight: 8,\n  },\n  searchInput: {\n    flex: 1,\n    paddingVertical: 12,\n    fontSize: 15,\n    color: '#333',\n  },\n  clearButton: {\n    padding: 6,\n  },\n  clearButtonText: {\n    fontSize: 16,\n    color: '#999',\n  },\n\n  // ── Hero ──
  heroContainer: {
    height: 200,
    marginBottom: 4,
  },
  heroSlide: {
    width: width - 24,
    height: 200,
    marginHorizontal: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  heroTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  heroSubtitle: {
    color: '#eee',
    fontSize: 14,
    marginTop: 3,
  },
  heroDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  heroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d0d0d0',
    marginHorizontal: 4,
  },
  heroDotActive: {
    backgroundColor: '#3498db',
    width: 24,
  },

  // ── Section ──

  // ── Section ──
  sectionContainer: {
    marginTop: 10,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1a1a2e',
    paddingHorizontal: 14,
    marginBottom: 10,
    marginTop: 4,
  },

  // ── Category Cards ──
  categoryCardsScroll: {
    paddingHorizontal: 10,
    paddingBottom: 4,
  },
  categoryCard: {
    width: 90,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  categoryCardActive: {},
  categoryImageContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    marginBottom: 6,
    borderWidth: 2,
    borderColor: '#e8e8e8',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  categoryPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e8edf3',
  },
  categoryPlaceholderIcon: {
    fontSize: 28,
  },
  categoryActiveOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(52, 152, 219, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryCheckmark: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  categoryCardName: {
    fontSize: 12,
    color: '#444',
    fontWeight: '500',
    textAlign: 'center',
  },
  categoryCardNameActive: {
    color: '#3498db',
    fontWeight: '700',
  },

  // ── Horizontal Product Strip ──
  horizontalListContent: {
    paddingHorizontal: 10,
  },
  horizontalCard: {
    width: 155,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 4,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  horizontalImageContainer: {
    height: 130,
    backgroundColor: '#f0f0f0',
    position: 'relative',
  },
  horizontalImage: {
    width: '100%',
    height: '100%',
  },
  horizontalImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ecf0f1',
  },
  horizontalInfo: {
    padding: 10,
  },
  horizontalName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 3,
  },
  horizontalPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  horizontalOriginalPrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
    marginTop: 1,
  },
  horizontalRating: {
    fontSize: 11,
    color: '#f39c12',
    marginTop: 3,
  },

  // ── Brand Showcase ──
  brandsScroll: {
    paddingHorizontal: 10,
    paddingBottom: 4,
  },
  brandCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: 90,
    height: 90,
    marginHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  brandLogo: {
    width: 48,
    height: 36,
    marginBottom: 6,
  },
  brandLogoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eef2f7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  brandInitial: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3498db',
  },
  brandName: {
    fontSize: 11,
    color: '#555',
    fontWeight: '500',
    textAlign: 'center',
  },

  // ── Promo Strip ──
  promoStrip: {
    flexDirection: 'row',
    backgroundColor: '#fff6e8',
    marginHorizontal: 12,
    marginVertical: 10,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffe0b2',
  },
  promoItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  promoIcon: {
    fontSize: 24,
  },
  promoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
  },
  promoSubtitle: {
    fontSize: 11,
    color: '#888',
  },
  promoDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#ffe0b2',
    marginHorizontal: 8,
  },

  // ── Product Grid ──
  productList: {
    paddingHorizontal: 6,
    paddingBottom: 20,
  },
  productRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  productCard: {
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
  productImageContainer: {
    height: 155,
    backgroundColor: '#f0f0f0',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productImagePlaceholder: {
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
  productInfo: {
    padding: 10,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 3,
  },
  productCategory: {
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
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  originalPrice: {
    fontSize: 13,
    color: '#95a5a6',
    textDecorationLine: 'line-through',
  },
  ratingText: {
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

  // ── Empty State ──
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 18,
    color: '#2c3e50',
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#95a5a6',
    marginTop: 4,
  },
});
