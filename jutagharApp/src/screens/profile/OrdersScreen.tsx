import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import Header from '@/shared/components/Header';
import api from '@/api';
import type { Order } from '@/types';

const STATUS_OPTIONS = ['all', 'pending', 'processing', 'shipped', 'delivered', 'returned', 'cancelled'];

interface OrdersScreenProps {
  onBack: () => void;
  onViewOrder: (orderId: string) => void;
}

export default function OrdersScreen({ onBack, onViewOrder }: OrdersScreenProps) {
  const { width } = useWindowDimensions();
  const isCompact = width < 360;
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get<{ orders: Order[] }>('/api/orders');
      setOrders(res.data?.orders || []);
    } catch {
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchOrders();
    setIsRefreshing(false);
  };

  const filteredOrders = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return { bg: '#fff3cd', text: '#856404' };
      case 'processing': return { bg: '#cce5ff', text: '#004085' };
      case 'shipped': return { bg: '#d4edda', text: '#155724' };
      case 'delivered': return { bg: '#d1ecf1', text: '#0c5460' };
      case 'returned': return { bg: '#ffedd5', text: '#9a3412' };
      case 'cancelled': return { bg: '#f8d7da', text: '#721c24' };
      case 'refunded': return { bg: '#e2e3e5', text: '#383d41' };
      default: return { bg: '#e8e8e8', text: '#555' };
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderOrder = ({ item }: { item: Order }) => {
    const statusStyle = getStatusColor(item.status);
    return (
      <TouchableOpacity style={styles.orderCard} onPress={() => onViewOrder(item._id)} activeOpacity={0.7}>
        <View style={styles.orderHeader}>
          <Text style={styles.orderNumber} numberOfLines={1}>#{item.orderNumber}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]} numberOfLines={1}>{item.status}</Text>
          </View>
        </View>
        <View style={[styles.orderDetails, isCompact && styles.orderDetailsCompact]}>
          <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
          <Text style={styles.orderTotal}>Rs. {item.total.toLocaleString()}</Text>
        </View>
        <View style={[styles.orderFooter, isCompact && styles.orderFooterCompact]}>
          <Text style={styles.itemCount}>
            {item.items?.length || 0} item{(item.items?.length || 0) !== 1 ? 's' : ''}
          </Text>
          <Text style={styles.viewDetails}>View Details →</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <Header />

      {/* Filter Tabs */}
      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {STATUS_OPTIONS.map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.filterTab, filter === status && styles.filterTabActive]}
              onPress={() => setFilter(status)}
            >
              <Text
                numberOfLines={1}
                style={[styles.filterTabText, filter === status && styles.filterTabTextActive]}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item._id}
          renderItem={renderOrder}
          contentContainerStyle={styles.ordersList}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          initialNumToRender={8}
          windowSize={10}
          removeClippedSubviews
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyText}>No orders found</Text>
              <Text style={styles.emptySubtext}>
                {filter !== 'all' ? 'Try a different filter' : 'Start shopping to see your orders here'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },

  filterBar: {
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#edf1f5',
  },
  filterScroll: { paddingHorizontal: 12, paddingVertical: 6, gap: 6 },
  filterTab: {
    minHeight: 30,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dce1e7',
    backgroundColor: '#fff',
  },
  filterTabActive: { backgroundColor: '#3498db', borderColor: '#3498db' },
  filterTabText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#666',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  filterTabTextActive: { color: '#fff', fontWeight: '700' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  ordersList: { paddingHorizontal: 12, paddingBottom: 20 },
  orderCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3,
  },
  orderHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10,
  },
  orderNumber: { flex: 1, marginRight: 8, fontSize: 16, fontWeight: '700', color: '#1a1a2e' },
  statusBadge: { maxWidth: '45%', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  orderDetails: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  orderDetailsCompact: {
    alignItems: 'flex-start',
    flexDirection: 'column',
    gap: 2,
  },
  orderDate: { fontSize: 13, color: '#888' },
  orderTotal: { fontSize: 16, fontWeight: '700', color: '#1a1a2e' },
  orderFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  orderFooterCompact: {
    alignItems: 'flex-start',
    flexDirection: 'column',
    gap: 4,
  },
  itemCount: { fontSize: 13, color: '#888' },
  viewDetails: { fontSize: 13, color: '#3498db', fontWeight: '600' },

  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, color: '#2c3e50', fontWeight: '600' },
  emptySubtext: { fontSize: 14, color: '#95a5a6', marginTop: 4, textAlign: 'center' },
});
