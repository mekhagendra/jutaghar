import api, { API_BASE_URL } from '@/api';
import { triggerHomeNavigation } from '@/shared/navigation/homeNavigation';
import type { Product, ProductsResponse } from '@/types';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface HeaderProps {
  onSearch?: (query: string) => void;
  onSelectSuggestion?: (product: Product) => void;
  onLogoPress?: () => void;
}

const SUGGESTION_LIMIT = 6;
const DEBOUNCE_MS = 250;

const getImageUrl = (path?: string) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

export default function Header({ onSearch, onSelectSuggestion, onLogoPress }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsFetching(false);
      return;
    }

    const reqId = ++requestIdRef.current;
    setIsFetching(true);
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ search: trimmed, limit: String(SUGGESTION_LIMIT) });
        const res = await api.get<ProductsResponse>(`/api/products?${params.toString()}`);
        if (reqId !== requestIdRef.current) return;
        setSuggestions(res.data?.products || []);
      } catch {
        if (reqId !== requestIdRef.current) return;
        setSuggestions([]);
      } finally {
        if (reqId === requestIdRef.current) setIsFetching(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const submitSearch = () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    Keyboard.dismiss();
    setIsFocused(false);
    onSearch?.(trimmed);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSuggestions([]);
    onSearch?.('');
  };

  const handleSelectSuggestion = (product: Product) => {
    Keyboard.dismiss();
    setIsFocused(false);
    setSearchQuery('');
    setSuggestions([]);
    if (onSelectSuggestion) {
      onSelectSuggestion(product);
    } else {
      onSearch?.(product.name);
    }
  };

  const handleLogoPress = () => {
    if (onLogoPress) {
      onLogoPress();
      return;
    }
    triggerHomeNavigation();
  };

  const trimmedQuery = searchQuery.trim();
  const showDropdown = isFocused && trimmedQuery.length >= 2;
  const showEmptyState = showDropdown && !isFetching && suggestions.length === 0;

  return (
    <View style={styles.headerWrapper}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.logoContainer} onPress={handleLogoPress} activeOpacity={0.8}>
          <Image
            source={require('../../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchBar}
            placeholder="Search..."
            placeholderTextColor="#5d2700"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={submitSearch}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              // Delay so that taps on suggestions can register before the dropdown disappears.
              setTimeout(() => setIsFocused(false), 150);
            }}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {isFetching ? (
            <ActivityIndicator size="small" color="#e25e00" style={styles.spinner} />
          ) : null}
          {searchQuery.length > 0 && !isFetching && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showDropdown && (
        <View style={styles.dropdown}>
          {showEmptyState ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>No matches for &quot;{trimmedQuery}&quot;</Text>
              <TouchableOpacity onPress={submitSearch}>
                <Text style={styles.viewAllText}>Search anyway</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={suggestions}
              keyExtractor={(item) => item._id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const imageUrl = getImageUrl(item.mainImage || item.images?.[0]);
                const price = item.onSale && item.salePrice ? item.salePrice : item.price;
                const categoryName =
                  typeof item.category === 'object' && item.category?.name
                    ? item.category.name
                    : typeof item.category === 'string'
                      ? item.category
                      : null;
                return (
                  <Pressable
                    style={({ pressed }) => [styles.suggestionRow, pressed && styles.suggestionRowPressed]}
                    onPress={() => handleSelectSuggestion(item)}
                  >
                    <View style={styles.suggestionImageWrap}>
                      {imageUrl ? (
                        <Image source={{ uri: imageUrl }} style={styles.suggestionImage} resizeMode="cover" />
                      ) : (
                        <View style={[styles.suggestionImage, styles.suggestionImagePlaceholder]}>
                          <Text style={styles.placeholderText}>👟</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.suggestionInfo}>
                      <Text style={styles.suggestionName} numberOfLines={1}>{item.name}</Text>
                      {categoryName ? (
                        <Text style={styles.suggestionMeta} numberOfLines={1}>{categoryName}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.suggestionPrice}>Rs. {price.toLocaleString()}</Text>
                  </Pressable>
                );
              }}
              ItemSeparatorComponent={() => <View style={styles.suggestionDivider} />}
              ListFooterComponent={
                suggestions.length > 0 ? (
                  <Pressable
                    style={({ pressed }) => [styles.viewAllRow, pressed && styles.suggestionRowPressed]}
                    onPress={submitSearch}
                  >
                    <Text style={styles.viewAllText}>See all results for &quot;{trimmedQuery}&quot;</Text>
                  </Pressable>
                ) : null
              }
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrapper: {
    position: 'relative',
    zIndex: 50,
    elevation: 50,
  },
  header: {
    paddingTop: 40,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  logo: {
    width: 60,
    height: 40,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#ac3c00',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  searchBar: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 16,
    color: '#5d2700',
  },
  spinner: {
    marginLeft: 4,
  },
  clearButton: {
    padding: 4,
    marginLeft: 4,
  },
  clearText: {
    color: '#e25e00',
    fontSize: 16,
  },
  dropdown: {
    position: 'absolute',
    top: 88,
    left: 88,
    right: 16,
    maxHeight: 360,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 12,
    overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  suggestionRowPressed: {
    backgroundColor: '#fff5ec',
  },
  suggestionImageWrap: {
    width: 40,
    height: 40,
    borderRadius: 6,
    overflow: 'hidden',
    marginRight: 10,
    backgroundColor: '#f3f4f6',
  },
  suggestionImage: {
    width: '100%',
    height: '100%',
  },
  suggestionImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 18,
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  suggestionMeta: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  suggestionPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ac3c00',
    marginLeft: 8,
  },
  suggestionDivider: {
    height: 1,
    backgroundColor: '#f1f1f1',
  },
  viewAllRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    backgroundColor: '#fff7ef',
  },
  viewAllText: {
    color: '#ac3c00',
    fontWeight: '700',
    fontSize: 13,
  },
  emptyRow: {
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 6,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 13,
  },
});
