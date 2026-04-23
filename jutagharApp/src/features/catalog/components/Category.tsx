import { API_BASE_URL } from '@/api';
import type { Category as CategoryType } from '@/types';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface CategoryProps {
  categories: CategoryType[];
  onSelectCategory?: (categoryName: string) => void;
}

const getImageUrl = (path?: string) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

export default function Category({ categories, onSelectCategory }: CategoryProps) {
  if (categories.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Categories</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {categories.map((cat) => {
          const imageUrl = getImageUrl(cat.image);
          return (
            <TouchableOpacity
              key={cat._id}
              style={styles.card}
              onPress={() => onSelectCategory?.(cat.name)}
              activeOpacity={0.8}
            >
              <View style={styles.imageContainer}>
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
                ) : (
                  <View style={styles.placeholder}>
                    <Text style={styles.placeholderIcon}>👟</Text>
                  </View>
                )}
              </View>
              <Text style={styles.name} numberOfLines={1}>{cat.name}</Text>
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
    width: 90,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  imageContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    marginBottom: 6,
    borderWidth: 2,
    borderColor: '#e8e8e8',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e8edf3',
  },
  placeholderIcon: {
    fontSize: 28,
  },
  name: {
    fontSize: 12,
    color: '#444',
    fontWeight: '500',
    textAlign: 'center',
  },
});
