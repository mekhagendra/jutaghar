import { addToCart } from '@/features/checkout';
import api, { API_BASE_URL } from '@/api';
import Header from '@/shared/components/Header';
import type { Brand, Category, Product, ProductsResponse } from '@/types';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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

const { width } = Dimensions.get('window');

type SelectorType = 'gender' | 'category' | 'brand' | null;

// ---------------------------------------------------------------------------
// PriceFilterRow — owns its own local state so typing never triggers a
// ProductsScreen re-render, which would remount the FlatList header and kill
// keyboard focus after every keystroke.
// ---------------------------------------------------------------------------
interface PriceFilterRowProps {
  onApply: (min: string, max: string) => void;
  resetKey: number; // increment from parent to clear both inputs
}

const PriceFilterRow = React.memo(function PriceFilterRow({
  onApply,
  resetKey,
}: PriceFilterRowProps) {
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');

  useEffect(() => {
    setMin('');
    setMax('');
  }, [resetKey]);

  const sanitize = (v: string) => v.replace(/\D/g, '').slice(0, 7);

  const handleApply = () => {
    const minVal = min.trim();
    const maxVal = max.trim();
    if (minVal && maxVal && Number(minVal) > Number(maxVal)) {
      Alert.alert('Invalid Range', 'Minimum price cannot be greater than maximum price.');
      return;
    }
    onApply(minVal, maxVal);
  };

  return (
    <View style={priceRowStyles.row}>
      <TextInput
        style={priceRowStyles.input}
        placeholder="Min price"
        keyboardType="number-pad"
        value={min}
        onChangeText={(v) => setMin(sanitize(v))}
        returnKeyType="done"
      />
      <TextInput
        style={priceRowStyles.input}
        placeholder="Max price"
        keyboardType="number-pad"
        value={max}
        onChangeText={(v) => setMax(sanitize(v))}
        returnKeyType="done"
      />
      <TouchableOpacity style={priceRowStyles.applyBtn} onPress={handleApply}>
        <Text style={priceRowStyles.applyText}>Apply</Text>
      </TouchableOpacity>
    </View>
  );
});

const priceRowStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e4e7eb',
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: '#1f2937',
  },
  applyBtn: {
    backgroundColor: '#3498db',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});

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
  const listRef = useRef<FlatList<Product>>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialSearch || '');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory || null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(initialBrand || null);
  const [selectedGender, setSelectedGender] = useState<string | null>(initialGender || null);
  const [sortBy, setSortBy] = useState(initialSort || 'new');
  const [showSort, setShowSort] = useState(false);
  const [activeSelector, setActiveSelector] = useState<SelectorType>(null);
  const [appliedMinPrice, setAppliedMinPrice] = useState('');
  const [appliedMaxPrice, setAppliedMaxPrice] = useState('');
  const [priceFilterResetKey, setPriceFilterResetKey] = useState(0);

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
      if (appliedMinPrice) params.append('minPrice', appliedMinPrice);
      if (appliedMaxPrice) params.append('maxPrice', appliedMaxPrice);

      const res = await api.get<ProductsResponse>(`/api/products?${params.toString()}`);
      setProducts(res.data?.products || []);
    } catch {
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedCategory, selectedBrand, selectedGender, sortBy, appliedMinPrice, appliedMaxPrice]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    // Ensure the list starts at the top when Products opens from Home "Load More".
    if (initialSort === 'new') {
      const id = requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ offset: 0, animated: false });
      });
      return () => cancelAnimationFrame(id);
    }
  }, [initialSort]);

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
    setAppliedMinPrice('');
    setAppliedMaxPrice('');
    setSearchQuery('');
    setPriceFilterResetKey((k) => k + 1);
  };

  const handleApplyPrice = useCallback((min: string, max: string) => {
    setAppliedMinPrice(min);
    setAppliedMaxPrice(max);
  }, []);

  const activeFiltersCount =
    (selectedCategory ? 1 : 0) +
    (selectedBrand ? 1 : 0) +
    (selectedGender ? 1 : 0) +
    (appliedMinPrice || appliedMaxPrice ? 1 : 0);

  const selectorValue = (type: Exclude<SelectorType, null>) => {
    if (type === 'gender') return selectedGender || 'All';
    if (type === 'category') return selectedCategory || 'All';
    return selectedBrand || 'All';
  };

  const selectorOptions = (type: Exclude<SelectorType, null>) => {
    if (type === 'gender') {
      return genderOptions.map((option) => ({ label: option, value: option }));
    }

    if (type === 'category') {
      return categories.map((category) => ({ label: category.name, value: category.name }));
    }

    return brands.map((brand) => ({ label: brand.name, value: brand.name }));
  };

  const handleSelectorChange = (type: Exclude<SelectorType, null>, value: string | null) => {
    if (type === 'gender') {
      setSelectedGender(value);
    } else if (type === 'category') {
      setSelectedCategory(value);
    } else {
      setSelectedBrand(value);
    }

    setActiveSelector(null);
  };

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

  const renderSelectorModal = () => {
    if (!activeSelector) {
      return null;
    }

    const title = activeSelector.charAt(0).toUpperCase() + activeSelector.slice(1);
    const options = selectorOptions(activeSelector);
    const selectedValue = selectorValue(activeSelector);

    return (
      <Modal visible animationType="fade" transparent>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setActiveSelector(null)}>
          <View style={styles.selectorModalContent}>
            <Text style={styles.modalTitle}>{title}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.selectorOption, selectedValue === 'All' && styles.selectorOptionActive]}
                onPress={() => handleSelectorChange(activeSelector, null)}
              >
                <Text style={[styles.selectorOptionText, selectedValue === 'All' && styles.selectorOptionTextActive]}>
                  All
                </Text>
              </TouchableOpacity>
              {options.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.selectorOption, selectedValue === option.value && styles.selectorOptionActive]}
                  onPress={() => handleSelectorChange(activeSelector, option.value)}
                >
                  <Text
                    style={[
                      styles.selectorOptionText,
                      selectedValue === option.value && styles.selectorOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const renderHeader = () => (
    <View style={styles.listHeader}>
      <Header onSearch={(text) => setSearchQuery(text)} />

      <View style={styles.inlineFilterPanel}>
        <View style={styles.selectorRow}>
          <TouchableOpacity style={styles.selectorButton} onPress={() => setActiveSelector('gender')}>
            <Text style={styles.selectorInlineText} numberOfLines={1}>Gender: {selectorValue('gender')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.selectorButton} onPress={() => setActiveSelector('category')}>
            <Text style={styles.selectorInlineText} numberOfLines={1}>Category: {selectorValue('category')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.selectorButton} onPress={() => setActiveSelector('brand')}>
            <Text style={styles.selectorInlineText} numberOfLines={1}>Brand: {selectorValue('brand')}</Text>
          </TouchableOpacity>
        </View>

        <PriceFilterRow onApply={handleApplyPrice} resetKey={priceFilterResetKey} />

        <View style={styles.filterMetaRow}>
          <TouchableOpacity style={styles.sortTrigger} onPress={() => setShowSort(true)}>
            <Text style={styles.sortTriggerText} numberOfLines={1}>
              Sort: {sortOptions.find((opt) => opt.value === sortBy)?.label || 'Newest First'}
            </Text>
          </TouchableOpacity>
          {activeFiltersCount > 0 && (
            <TouchableOpacity onPress={clearAllFilters}>
              <Text style={styles.clearAllText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
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

      {/* Products Grid */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={products}
          keyExtractor={(item) => item._id}
          numColumns={2}
          columnWrapperStyle={styles.productRow}
          contentContainerStyle={styles.productList}
          renderItem={renderProductCard}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>👟</Text>
              <Text style={styles.emptyText}>No products found</Text>
              <Text style={styles.emptySubtext}>Try different filters or search terms</Text>
            </View>
          }
        />
      )}

      {renderSelectorModal()}
      {renderSortModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  listHeader: {
    marginBottom: 12,
  },
  inlineFilterPanel: {
    paddingHorizontal: 12,
    gap: 10,
  },
  selectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  selectorButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e4e7eb',
    paddingHorizontal: 8,
    paddingVertical: 9,
    justifyContent: 'center',
  },
  selectorInlineText: {
    fontSize: 12,
    color: '#1f2937',
    fontWeight: '600',
  },
  priceFilterRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  inlinePriceInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e4e7eb',
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: '#1f2937',
  },
  inlineApplyButton: {
    backgroundColor: '#3498db',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineApplyButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  filterMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sortTrigger: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e4e7eb',
    flexShrink: 1,
  },
  sortTriggerText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
  },
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
  selectorModalContent: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '70%', padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a2e' },
  selectorOption: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eef1f4',
    marginTop: 10,
  },
  selectorOptionActive: { backgroundColor: '#eef7ff', borderColor: '#3498db' },
  selectorOptionText: { fontSize: 15, color: '#333' },
  selectorOptionTextActive: { color: '#3498db', fontWeight: '700' },

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
