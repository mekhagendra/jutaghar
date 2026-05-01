import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import api, { API_BASE_URL } from '@/api';
import type { Product } from '@/types';

interface SellerProductsScreenProps {
  onAddProduct: () => void;
  onEditProduct: (product: Product) => void;
}

type ProductStatusFilter = 'all' | 'active' | 'draft' | 'out_of_stock' | 'discontinued';

const FILTER_OPTIONS: { key: ProductStatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'draft', label: 'Draft' },
  { key: 'out_of_stock', label: 'Out of Stock' },
  { key: 'discontinued', label: 'Discontinued' },
];

export default function SellerProductsScreen({ onAddProduct, onEditProduct }: SellerProductsScreenProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ProductStatusFilter>('all');
  const [salePriceInputs, setSalePriceInputs] = useState<Record<string, string>>({});
  const [updatingSaleId, setUpdatingSaleId] = useState<string | null>(null);

  const fetchProducts = useCallback(async (filter: ProductStatusFilter) => {
    try {
      const query = filter !== 'all' ? `?status=${encodeURIComponent(filter)}` : '';
      const res = await api.get<{ products: Product[] } | { data: { products: Product[] } }>(`/api/products/vendor/my-products${query}`);
      const data = (res.data as any)?.products || (res.data as any)?.data?.products || [];
      setProducts(Array.isArray(data) ? data : []);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load your products.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts(statusFilter);
  }, [fetchProducts, statusFilter]);

  const handleFilterChange = (filter: ProductStatusFilter) => {
    setStatusFilter(filter);
    setIsLoading(true);
    void fetchProducts(filter);
  };

  const handleDelete = (product: Product) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete ${product.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/products/${product._id}`);
              setProducts((prev) => prev.filter((p) => p._id !== product._id));
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete product.');
            }
          },
        },
      ]
    );
  };

  const getImageUrl = (path?: string) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  const handleSaleToggle = async (product: Product) => {
    try {
      setUpdatingSaleId(product._id);
      if (product.onSale) {
        await api.patch(`/api/products/${product._id}`, { onSale: false });
        setProducts((prev) => prev.map((p) => (p._id === product._id ? { ...p, onSale: false, salePrice: undefined } : p)));
        return;
      }

      const raw = salePriceInputs[product._id];
      const salePrice = raw ? Number(raw) : NaN;
      if (Number.isNaN(salePrice) || salePrice <= 0 || salePrice >= product.price) {
        Alert.alert('Invalid Sale Price', 'Enter a sale price less than the regular price.');
        return;
      }

      await api.patch(`/api/products/${product._id}`, { onSale: true, salePrice });
      setProducts((prev) => prev.map((p) => (p._id === product._id ? { ...p, onSale: true, salePrice } : p)));
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update sale status.');
    } finally {
      setUpdatingSaleId(null);
    }
  };

  const renderItem = ({ item }: { item: Product }) => {
    const imageUrl = getImageUrl(item.mainImage || item.images?.[0]);

    return (
      <View style={styles.card}>
        <View style={styles.imageWrap}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={styles.placeholder}><Text style={styles.placeholderText}>📦</Text></View>
          )}
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.meta}>Rs. {item.price.toLocaleString()} • Stock: {item.stock}</Text>
          <Text style={styles.meta}>Status: {item.status}</Text>
          <View style={styles.saleRow}>
            <TouchableOpacity
              style={[styles.saleToggleButton, item.onSale && styles.saleToggleButtonActive]}
              onPress={() => handleSaleToggle(item)}
              disabled={updatingSaleId === item._id}
            >
              <Text style={[styles.saleToggleText, item.onSale && styles.saleToggleTextActive]}>
                {item.onSale ? 'Sale ON' : 'Enable Sale'}
              </Text>
            </TouchableOpacity>
            {item.onSale ? (
              <Text style={styles.saleActivePrice}>Rs. {(item.salePrice || 0).toLocaleString()}</Text>
            ) : (
              <TextInput
                style={styles.saleInput}
                keyboardType="decimal-pad"
                placeholder="Sale price"
                value={salePriceInputs[item._id] ?? ''}
                onChangeText={(value) => setSalePriceInputs((prev) => ({ ...prev, [item._id]: value }))}
              />
            )}
          </View>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.editButton} onPress={() => onEditProduct(item)}>
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addButton} onPress={onAddProduct}>
              <Text style={styles.addButtonText}>Add New</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item)}>
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.titleRow}>
        <Text style={styles.titleText}>Manage Products</Text>
        <TouchableOpacity style={styles.inlineAddButton} onPress={onAddProduct}>
          <Text style={styles.inlineAddText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersRow}
        style={styles.filtersWrap}
      >
        {FILTER_OPTIONS.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterChip,
              statusFilter === filter.key && styles.filterChipActive,
            ]}
            onPress={() => handleFilterChange(filter.key)}
          >
            <Text
              style={[
                styles.filterChipText,
                statusFilter === filter.key && styles.filterChipTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={products}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => {
          setIsRefreshing(true);
          fetchProducts(statusFilter);
        }} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No products in this filter</Text>
            {statusFilter === 'all' ? (
              <TouchableOpacity style={styles.emptyAddButton} onPress={onAddProduct}>
                <Text style={styles.emptyAddText}>Add Product</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.emptyAddButton} onPress={() => handleFilterChange('all')}>
                <Text style={styles.emptyAddText}>Show All Products</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  titleRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleText: { color: '#1a1a2e', fontSize: 18, fontWeight: '700' },
  inlineAddButton: { backgroundColor: '#3498db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  inlineAddText: { color: '#fff', fontWeight: '700' },
  filtersWrap: { maxHeight: 56, backgroundColor: '#f8f9fa' },
  filtersRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  filterChip: {
    borderWidth: 1,
    borderColor: '#d7dce2',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  filterChipActive: {
    borderColor: '#3498db',
    backgroundColor: '#e9f5ff',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4b5563',
  },
  filterChipTextActive: {
    color: '#3498db',
  },
  list: { padding: 12, paddingBottom: 120 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 10,
    padding: 10,
    flexDirection: 'row',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  imageWrap: { width: 72, height: 72, borderRadius: 8, overflow: 'hidden', backgroundColor: '#eef1f4' },
  image: { width: '100%', height: '100%' },
  placeholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  placeholderText: { fontSize: 20 },
  info: { flex: 1, marginLeft: 10 },
  name: { fontSize: 15, fontWeight: '700', color: '#1a1a2e', marginBottom: 2 },
  meta: { fontSize: 12, color: '#666', marginBottom: 2 },
  saleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  saleToggleButton: {
    borderWidth: 1,
    borderColor: '#d7dce2',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  saleToggleButtonActive: {
    borderColor: '#2e7d32',
    backgroundColor: '#eaf8ec',
  },
  saleToggleText: { fontSize: 11, color: '#4b5563', fontWeight: '700' },
  saleToggleTextActive: { color: '#2e7d32' },
  saleInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d7dce2',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    color: '#374151',
    backgroundColor: '#fff',
  },
  saleActivePrice: { fontSize: 12, color: '#d32f2f', fontWeight: '700' },
  actions: { flexDirection: 'row', marginTop: 6, gap: 8 },
  editButton: { backgroundColor: '#546e7a', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  editButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  addButton: { backgroundColor: '#3498db', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  addButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  deleteButton: { backgroundColor: '#e74c3c', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  deleteButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 16, color: '#666', marginBottom: 12 },
  emptyAddButton: { backgroundColor: '#3498db', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10 },
  emptyAddText: { color: '#fff', fontWeight: '700' },
});
