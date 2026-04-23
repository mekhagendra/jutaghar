import api from '@/api';
import Brands from '@/features/catalog/components/Brands';
import Category from '@/features/catalog/components/Category';
import Featured from '@/features/catalog/components/Featured';
import NewArrival from '@/features/catalog/components/NewArrival';
import Sale from '@/features/catalog/components/Sale';
import Trending from '@/features/catalog/components/Trending';
import Header from '@/shared/components/Header';
import Navbar from '@/shared/components/Navbar';
import type { Brand, Category as CategoryType, Product, ProductsResponse } from '@/types';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface HomeScreenProps {
  onLogout?: () => void;
  onGoToLogin?: () => void;
  userData?: any;
  onViewProduct?: (product: Product) => void;
  onViewCart?: () => void;
  onViewProducts?: (options?: { category?: string; gender?: string; sort?: string; brand?: string }) => void;
  onViewOrders?: () => void;
  onViewProfile?: () => void;
  onViewWishlist?: () => void;
  onViewAbout?: () => void;
  onViewContact?: () => void;
}

export default function HomeScreen({ onViewProduct, onViewProducts }: HomeScreenProps) {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [menCategories, setMenCategories] = useState<CategoryType[]>([]);
  const [womenCategories, setWomenCategories] = useState<CategoryType[]>([]);
  const [kidsCategories, setKidsCategories] = useState<CategoryType[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (showLoader = true) => {
    if (showLoader) {
      setIsLoading(true);
    }

    try {
      // Fetch the sections needed for first paint first.
      const [featuredRes, trendingRes, categoriesRes] = await Promise.all([
        api.get<ProductsResponse>('/api/products?limit=6&sort=rating'),
        api.get<ProductsResponse>('/api/products?limit=6&sort=popular'),
        api.get<CategoryType[]>('/api/catalog/categories?status=active'),
      ]);

      setFeaturedProducts(featuredRes.data?.products || []);
      setTrendingProducts(trendingRes.data?.products || []);
      setCategories(Array.isArray(categoriesRes.data) ? categoriesRes.data : []);

      setIsLoading(false);

      // Fetch secondary navigation data in the background.
      const [brandsRes, menCatRes, womenCatRes, kidsCatRes] = await Promise.all([
        api.get<Brand[]>('/api/catalog/brands?status=active').catch(() => ({ data: [] as Brand[] })),
        api.get('/api/catalog/categories?withInventory=true&gender=men').catch(() => ({ data: { data: [] } })),
        api.get('/api/catalog/categories?withInventory=true&gender=women').catch(() => ({ data: { data: [] } })),
        api.get('/api/catalog/categories?withInventory=true&gender=kids').catch(() => ({ data: { data: [] } })),
      ]);

      setBrands(Array.isArray(brandsRes.data) ? brandsRes.data : []);

      const extractCats = (res: any) => {
        const cats = res.data?.data || res.data || [];
        return Array.isArray(cats) ? cats.filter((c: any) => c.productCount && c.productCount > 0) : [];
      };
      setMenCategories(extractCats(menCatRes));
      setWomenCategories(extractCats(womenCatRes));
      setKidsCategories(extractCats(kidsCatRes));
    } catch (error: any) {
      console.log('Error fetching data:', error.message);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(false);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <Header onSearch={(text) => onViewProducts?.({ category: text })} />

      {/* Navbar */}
      <Navbar items={[
        {
          key: 'products', label: 'Products', icon: '🛍️',
          onPress: () => onViewProducts?.(),
          submenu: [
            { label: 'All Products', onPress: () => onViewProducts?.() },
            ...categories.map(cat => ({
              label: cat.name,
              onPress: () => onViewProducts?.({ category: cat.name }),
            })),
          ],
        },
        { key: 'new-arrival', label: 'New Arrival', icon: '✨', onPress: () => onViewProducts?.({ sort: 'new' }) },
        { key: 'best-seller', label: 'Best Seller', icon: '🔥', onPress: () => onViewProducts?.({ sort: 'popular' }) },
        { key: 'sale', label: 'Sale', icon: '🏷️', onPress: () => onViewProducts?.({ sort: 'price-asc' }) },
        { key: 'outlets', label: 'Outlets', icon: '🏪', onPress: () => onViewProducts?.() },
      ]} />

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3498db']} />}
        contentContainerStyle={styles.scrollContent}
      >

        {/* Featured Products */}
        <Featured products={featuredProducts} onViewProduct={onViewProduct} />

        {/* Shop by Category */}
        <Category
          categories={categories}
          onSelectCategory={(name) => onViewProducts?.({ category: name })}
        />

        {/* Trending Products */}
        <Trending products={trendingProducts} onViewProduct={onViewProduct} />

        {/* Sale Products */}
        <Sale onViewProduct={onViewProduct} />

        {/* Top Brands */}
        <Brands
          brands={brands}
          onSelectBrand={(name) => onViewProducts?.({ brand: name })}
        />

        {/* New Arrivals Grid */}
        <NewArrival onViewProduct={onViewProduct} onLoadMore={() => onViewProducts?.({ sort: 'new' })} />
      </ScrollView>
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
  scrollContent: {
    paddingBottom: 20,
  },
});
