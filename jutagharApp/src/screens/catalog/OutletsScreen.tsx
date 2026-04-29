import api, { API_BASE_URL } from '@/api';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

interface OutletUser {
  _id: string;
  businessName?: string;
  fullName: string;
  email?: string;
  phone?: string;
  businessAddress?: string;
  sellerImage?: string;
  role: string;
  productCount?: number;
}

interface OutletsApiResponse {
  vendors?: OutletUser[];
  data?: {
    vendors?: OutletUser[];
  };
}

export default function OutletsScreen() {
  const { width } = useWindowDimensions();
  const [outlets, setOutlets] = useState<OutletUser[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOutlets = useCallback(async (showLoader = true) => {
    if (showLoader) {
      setIsLoading(true);
    }

    try {
      const res = await api.get<OutletsApiResponse>('/api/outlets?isApproved=true');
      const vendors = res.data?.vendors || res.data?.data?.vendors;
      setOutlets(Array.isArray(vendors) ? vendors : []);
    } catch {
      setOutlets([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOutlets(true);
  }, [fetchOutlets]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOutlets(false);
  };

  const filteredOutlets = outlets.filter((outlet) => {
    const text = query.trim().toLowerCase();
    if (!text) return true;
    return (
      (outlet.businessName || '').toLowerCase().includes(text) ||
      (outlet.fullName || '').toLowerCase().includes(text) ||
      (outlet.businessAddress || '').toLowerCase().includes(text)
    );
  });

  const getImageUrl = (path?: string) => {
    if (!path) return null;
    const normalized = path.trim();
    if (!normalized) return null;

    if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
      try {
        const parsed = new URL(normalized);
        const localHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0', '10.0.2.2']);
        if (localHosts.has(parsed.hostname)) {
          const base = new URL(API_BASE_URL);
          return `${base.origin}${parsed.pathname}${parsed.search}`;
        }
      } catch {
        // Fall back to original normalized path.
      }
      return normalized;
    }

    if (normalized.startsWith('file://') || normalized.startsWith('data:')) {
      return normalized;
    }

    return `${API_BASE_URL}${normalized.startsWith('/') ? '' : '/'}${normalized}`;
  };

  const mediaWidth = width > 768 ? 200 : width > 480 ? 152 : 120;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading outlets...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Outlets</Text>
        <Text style={styles.subtitle}>Discover trusted seller outlets</Text>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search by outlet name or location"
          autoCapitalize="none"
        />
      </View>

      <FlatList
        data={filteredOutlets}
        keyExtractor={(item) => item._id}
        contentContainerStyle={filteredOutlets.length === 0 ? styles.emptyList : styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3498db']} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={[styles.mediaContainer, { width: mediaWidth }]}>
              {item.sellerImage ? (
                <Image source={{ uri: getImageUrl(item.sellerImage) || undefined }} style={styles.sellerImage} resizeMode="cover" />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Text style={styles.logoPlaceholderText}>{(item.businessName || item.fullName).charAt(0).toUpperCase()}</Text>
                </View>
              )}
            </View>
            <View style={styles.cardContent}>
              <View>
                <Text style={styles.name} numberOfLines={1}>{item.businessName || item.fullName}</Text>
                {!!item.businessAddress && (
                  <Text style={styles.meta} numberOfLines={1}>{item.businessAddress}</Text>
                )}
                {!!item.phone && (
                  <Text style={styles.meta}>{item.phone}</Text>
                )}
                {!!item.email && (
                  <Text style={styles.meta} numberOfLines={1}>{item.email}</Text>
                )}
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No outlets found</Text>
            <Text style={styles.emptySubtitle}>Try changing your search or pull to refresh.</Text>
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eef1f4',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 12,
    fontSize: 13,
    color: '#6b7280',
  },
  searchInput: {
    backgroundColor: '#fff',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1f2937',
  },
  listContent: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mediaContainer: {
    aspectRatio: 16 / 9,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  sellerImage: {
    width: '100%',
    height: '100%',
  },
  logoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e5edf6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoPlaceholderText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2563eb',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  meta: {
    marginTop: 4,
    fontSize: 12,
    color: '#6b7280',
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyState: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  emptySubtitle: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 14,
    color: '#6b7280',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#6b7280',
  },
});
