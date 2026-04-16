import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Header from '../components/Header';
import api, { API_BASE_URL } from '../lib/api';
import { addToCart } from '../lib/cartStore';
import type { Brand, Category, Product, ProductsResponse } from '../lib/types';

const { width } = Dimensions.get('window');

interface ProductsScreenProps {
  onBack?: () => void;
  onViewProduct: (product: Product) => void;
  onViewCart?: () => void;
  initialCategory?: string | null;
  initialGender?: string | null;
  initialSort?: string | null;
  initialBrand?: string | null;
  initialSearch?: string;
}

export default function ProductsScreen({
  onBack,
  onViewProduct,
  onViewCart,
  initialCategory,
  initialGender,
  initialSort,
  initialBrand,
  initialSearch,
}: ProductsScreenProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialSearch || '');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory || null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(initialBrand || null);
  const [selectedGender, setSelectedGender] = useState<string | null>(initialGender || null);
  const [sortBy, setSortBy] = useState(initialSort || 'new');
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const genderOptions = ['Men', 'Women', 'Kids', 'Unisex'];
  const sortOptions = [
    { label: 'Newest First', value: 'new' },
    { label: 'Price: Low to High', value: 'price-asc' },
    { label: 'Price: High to Low', value: 'price-desc' },
    { label: 'Most Popular', value: 'popular' },
    { label: 'Top Rated', value: 'rating' },
  ];

  const fetchFilters = useCallback(async () => {
    try {
      const [catRes, brandRes] = await Promise.all([
        api.get<Category[]>('/api/catalog/categories?status=active'),
        api.get<Brand[]>('/api/catalog/brands?status=active').catch(() => ({ data: [] as Brand[] })),
      ]);
      setCategories(Array.isArray(catRes.data) ? catRes.data : []);
      setBrands(Array.isArray(brandRes.data) ? brandRes.data : []);
    } catch {
      // Non-critical
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ sort: sortBy });
      if (searchQuery) params.append('search', searchQuery);
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedBrand) params.append('brand', selectedBrand);
      if (selectedGender) params.append('gender', selectedGender);
      if (minPrice) params.append('minPrice', minPrice);
      if (maxPrice) params.append('maxPrice', maxPrice);

      const res = await api.get<ProductsResponse>(`/api/products?${params.toString()}`);
      setProducts(res.data?.products || []);
    } catch {
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedCategory, selectedBrand, selectedGender, sortBy, minPrice, maxPrice]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

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

  const handleAddToCart = (product: Product) => {
    addToCart(product, 1);
    Alert.alert('Added to Cart', `${product.name} has been added to your cart.`);
  };

  const clearAllFilters = () => {
    setSelectedCategory(null);
    setSelectedBrand(null);
    setSelectedGender(null);
    setMinPrice('');
    setMaxPrice('');
    setSearchQuery('');
  };

  const activeFiltersCount =
    (selectedCategory ? 1 : 0) +
    (selectedBrand ? 1 : 0) +
    (selectedGender ? 1 : 0) +
    (minPrice || maxPrice ? 1 : 0);

  const renderProductCard = ({ item }: { item: Product }) => {
    const { price, originalPrice, onSale } = getProductPrice(item);
    const imageUrl = getImageUrl(item.mainImage || item.images?.[0]);

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => onViewProduct(item)}
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
          <View style={styles.priceRow}>
            <Text style={styles.productPrice}>Rs. {price.toLocaleString()}</Text>
            {originalPrice && (
              <Text style={styles.originalPrice}>Rs. {originalPrice.toLocaleString()}</Text>
            )}
          </View>
          {item.rating && item.rating.count > 0 && (
            <Text style={styles.ratingText}>
              {'★'.repeat(Math.round(item.rating.average))} ({item.rating.count})
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

  // Filter Modal
  const renderFilterModal = () => (
    <Modal visible={showFilters} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filters</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Gender */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Gender</Text>
              <View style={styles.filterChips}>
                {genderOptions.map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.filterChip, selectedGender === g && styles.filterChipActive]}
                    onPress={() => setSelectedGender(selectedGender === g ? null : g)}
                  >
                    <Text style={[styles.filterChipText, selectedGender === g && styles.filterChipTextActive]}>
                      {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Category */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Category</Text>
              <View style={styles.filterChips}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat._id}
                    style={[styles.filterChip, selectedCategory === cat._id && styles.filterChipActive]}
                    onPress={() => setSelectedCategory(selectedCategory === cat._id ? null : cat._id)}
                  >
                    <Text style={[styles.filterChipText, selectedCategory === cat._id && styles.filterChipTextActive]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Brand */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Brand</Text>
              <View style={styles.filterChips}>
                {brands.map((brand) => (
                  <TouchableOpacity
                    key={brand._id}
                    style={[styles.filterChip, selectedBrand === brand._id && styles.filterChipActive]}
                    onPress={() => setSelectedBrand(selectedBrand === brand._id ? null : brand._id)}
                  >
                    <Text style={[styles.filterChipText, selectedBrand === brand._id && styles.filterChipTextActive]}>
                      {brand.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Price Range */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Price Range</Text>
              <View style={styles.priceInputRow}>
                <TextInput
                  style={styles.priceInput}
                  placeholder="Min"
                  keyboardType="numeric"
                  value={minPrice}
                  onChangeText={setMinPrice}
                />
                <Text style={styles.priceDash}>—</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="Max"
                  keyboardType="numeric"
                  value={maxPrice}
                  onChangeText={setMaxPrice}
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.filterActions}>
            <TouchableOpacity style={styles.clearFilterButton} onPress={clearAllFilters}>
              <Text style={styles.clearFilterText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyFilterButton} onPress={() => setShowFilters(false)}>
              <Text style={styles.applyFilterText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Sort Modal
  const renderSortModal = () => (
    <Modal visible={showSort} animationType="fade" transparent>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSort(false)}>
        <View style={styles.sortModalContent}>
          <Text style={styles.modalTitle}>Sort By</Text>
          {sortOptions.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.sortOption, sortBy === opt.value && styles.sortOptionActive]}
              onPress={() => { setSortBy(opt.value); setShowSort(false); }}
            >
              <Text style={[styles.sortOptionText, sortBy === opt.value && styles.sortOptionTextActive]}>
                {opt.label}
              </Text>
              {sortBy === opt.value && <Text style={styles.sortCheck}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <Header onSearch={(text) => setSearchQuery(text)} />

      {/* Filter & Sort Bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity style={styles.filterBarButton} onPress={() => setShowFilters(true)}>
          <Text style={styles.filterBarIcon}>⚙</Text>
          <Text style={styles.filterBarText}>
            Filters{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterBarButton} onPress={() => setShowSort(true)}>
          <Text style={styles.filterBarIcon}>↕</Text>
          <Text style={styles.filterBarText}>Sort</Text>
        </TouchableOpacity>
        {activeFiltersCount > 0 && (
          <TouchableOpacity onPress={clearAllFilters}>
            <Text style={styles.clearAllText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Products Grid */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item._id}
          numColumns={2}
          columnWrapperStyle={styles.productRow}
          contentContainerStyle={styles.productList}
          renderItem={renderProductCard}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>👟</Text>
              <Text style={styles.emptyText}>No products found</Text>
              <Text style={styles.emptySubtext}>Try different filters or search terms</Text>
            </View>
          }
        />
      )}

      {renderFilterModal()}
      {renderSortModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },

  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginBottom: 8,
    alignItems: 'center',
    gap: 10,
  },
  filterBarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 1,
    gap: 4,
  },
  filterBarIcon: { fontSize: 14 },
  filterBarText: { fontSize: 13, color: '#333', fontWeight: '600' },
  clearAllText: { fontSize: 13, color: '#e74c3c', fontWeight: '600', marginLeft: 'auto' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  productList: { paddingHorizontal: 6, paddingBottom: 20 },
  productRow: { justifyContent: 'space-between', paddingHorizontal: 6 },
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
  productImageContainer: { height: 155, backgroundColor: '#f0f0f0', position: 'relative' },
  productImage: { width: '100%', height: '100%' },
  productImagePlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#ecf0f1' },
  placeholderText: { color: '#bbb', fontSize: 14 },
  saleBadge: {
    position: 'absolute', top: 8, left: 8, backgroundColor: '#e74c3c',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  saleBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  productInfo: { padding: 10 },
  productName: { fontSize: 14, fontWeight: '600', color: '#2c3e50', marginBottom: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  productPrice: { fontSize: 16, fontWeight: 'bold', color: '#1a1a2e' },
  originalPrice: { fontSize: 13, color: '#95a5a6', textDecorationLine: 'line-through' },
  ratingText: { fontSize: 12, color: '#f39c12', marginBottom: 6 },
  addToCartButton: { backgroundColor: '#3498db', borderRadius: 8, padding: 9, alignItems: 'center' },
  outOfStockButton: { backgroundColor: '#bdc3c7' },
  addToCartText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, color: '#2c3e50', fontWeight: '600' },
  emptySubtext: { fontSize: 14, color: '#95a5a6', marginTop: 4 },

  // Modal styles
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '80%', padding: 20,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a2e' },
  modalClose: { fontSize: 20, color: '#999', padding: 4 },

  filterSection: { marginBottom: 20 },
  filterLabel: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 10 },
  filterChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fff',
  },
  filterChipActive: { backgroundColor: '#3498db', borderColor: '#3498db' },
  filterChipText: { fontSize: 13, color: '#555' },
  filterChipTextActive: { color: '#fff', fontWeight: '600' },

  priceInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  priceInput: {
    flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
  },
  priceDash: { fontSize: 16, color: '#999' },

  filterActions: { flexDirection: 'row', gap: 12, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eee' },
  clearFilterButton: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: '#ddd', alignItems: 'center',
  },
  clearFilterText: { color: '#666', fontSize: 14, fontWeight: '600' },
  applyFilterButton: {
    flex: 2, paddingVertical: 12, borderRadius: 10,
    backgroundColor: '#3498db', alignItems: 'center',
  },
  applyFilterText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  sortModalContent: {
    backgroundColor: '#fff', borderRadius: 16, margin: 20,
    marginTop: 'auto', marginBottom: 40, padding: 20,
  },
  sortOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  sortOptionActive: {},
  sortOptionText: { fontSize: 15, color: '#333' },
  sortOptionTextActive: { color: '#3498db', fontWeight: '700' },
  sortCheck: { color: '#3498db', fontSize: 18, fontWeight: 'bold' },
});
