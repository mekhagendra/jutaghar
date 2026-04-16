import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { API_BASE_URL } from '../lib/api';
import type { Brand as BrandType } from '../lib/types';

interface BrandsProps {
  brands: BrandType[];
  onSelectBrand?: (brandName: string) => void;
}

const getImageUrl = (path?: string) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

export default function Brands({ brands, onSelectBrand }: BrandsProps) {
  if (brands.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Top Brands</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {brands.map((brand) => {
          const logoUrl = getImageUrl(brand.logo);
          return (
            <TouchableOpacity
              key={brand._id}
              style={styles.card}
              onPress={() => onSelectBrand?.(brand.name)}
              activeOpacity={0.8}
            >
              {logoUrl ? (
                <Image source={{ uri: logoUrl }} style={styles.logo} resizeMode="contain" />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Text style={styles.initial}>{brand.name.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <Text style={styles.name} numberOfLines={1}>{brand.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
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
  scroll: {
    paddingHorizontal: 10,
    paddingBottom: 4,
  },
  card: {
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
  logo: {
    width: 48,
    height: 36,
    marginBottom: 6,
  },
  logoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eef2f7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  initial: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3498db',
  },
  name: {
    fontSize: 11,
    color: '#555',
    fontWeight: '500',
    textAlign: 'center',
  },
});
