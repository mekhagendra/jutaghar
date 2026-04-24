import api from '@/api';
import type { Order } from '@/types';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const STATUS_OPTIONS = ['all', 'pending', 'processing', 'shipped', 'delivered', 'returned', 'cancelled'] as const;
const ACTIVE_VENDOR_STAGES = ['pending', 'processing', 'shipped', 'delivered', 'returned'] as const;

interface VendorOrdersResponse {
  orders: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function SellerOrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>('all');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [selectedStatusByOrder, setSelectedStatusByOrder] = useState<Record<string, Order['status']>>({});
  const [cancelReasonByOrder, setCancelReasonByOrder] = useState<Record<string, string>>({});
  const [cancelInputOrderId, setCancelInputOrderId] = useState<string | null>(null);

  const fetchOrders = useCallback(async (nextPage: number, nextStatus: (typeof STATUS_OPTIONS)[number]) => {
    try {
      const params = new URLSearchParams({ page: String(nextPage), limit: '10' });
      if (nextStatus !== 'all') {
        params.set('status', nextStatus);
      }

      const res = await api.get<{ data?: VendorOrdersResponse } | VendorOrdersResponse>(`/api/vendors/orders?${params.toString()}`);
      const data = (res.data as any)?.data || res.data;
      const list = data?.orders || [];
      const pagination = data?.pagination || { page: nextPage, pages: 1, total: list.length };

      setOrders(Array.isArray(list) ? list : []);
      setSelectedStatusByOrder((prev) => {
        const next = { ...prev };
        (Array.isArray(list) ? list : []).forEach((order) => {
          if (ACTIVE_VENDOR_STAGES.includes(order.status as any) && !next[order._id]) {
            next[order._id] = order.status;
          }
        });
        return next;
      });
      setPage(pagination.page || nextPage);
      setPages(pagination.pages || 1);
      setTotalOrders(pagination.total || 0);
    } catch {
      setOrders([]);
      setPages(1);
      setPage(1);
      setTotalOrders(0);
    } finally {
      setIsLoading(false);
      setIsPageLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders(1, statusFilter);
  }, [fetchOrders, statusFilter]);

  const updateOrderStatus = async (orderId: string, status: Order['status'], cancelReason?: string) => {
    try {
      setUpdatingOrderId(orderId);
      await api.patch(`/api/orders/${orderId}/status`, { status, cancelReason });
      setOrders((prev) => prev.map((o) => (
        o._id === orderId
          ? {
              ...o,
              status,
              cancelReason: status === 'cancelled' ? (cancelReason || o.cancelReason) : undefined,
            }
          : o
      )));
      if (status === 'cancelled') {
        setCancelInputOrderId(null);
        setCancelReasonByOrder((prev) => ({ ...prev, [orderId]: '' }));
      }
    } catch {
      // keep UI unchanged when request fails
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return { bg: '#fff3cd', text: '#856404' };
      case 'processing':
        return { bg: '#cce5ff', text: '#004085' };
      case 'shipped':
        return { bg: '#d4edda', text: '#155724' };
      case 'delivered':
        return { bg: '#d1ecf1', text: '#0c5460' };
      case 'cancelled':
        return { bg: '#f8d7da', text: '#721c24' };
      case 'returned':
        return { bg: '#ffedd5', text: '#9a3412' };
      default:
        return { bg: '#e2e3e5', text: '#383d41' };
    }
  };

  const handleFilterChange = (status: (typeof STATUS_OPTIONS)[number]) => {
    setStatusFilter(status);
    setIsLoading(true);
  };

  const handlePageChange = (next: number) => {
    if (next < 1 || next > pages || next === page) return;
    setIsPageLoading(true);
    void fetchOrders(next, statusFilter);
  };

  const renderItem = ({ item }: { item: Order }) => {
    const customer = (item as any).user?.fullName || 'Customer';
    const customerEmail = (item as any).user?.email || '';
    const statusStyle = getStatusColor(item.status);

    const selectedStage = selectedStatusByOrder[item._id] || (ACTIVE_VENDOR_STAGES.includes(item.status as any) ? item.status : 'pending');
    const isExpanded = expandedOrderId === item._id;
    const isCancelledOrRefunded = item.status === 'cancelled' || item.status === 'refunded';
    const cancelReason = cancelReasonByOrder[item._id] || '';

    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
          <Text style={styles.total}>Rs. {item.total.toLocaleString()}</Text>
        </View>

        <View style={styles.badgesRow}>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}> 
            <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>{item.status}</Text>
          </View>
          <Text style={styles.metaMuted}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>

        <Text style={styles.metaStrong}>{customer}</Text>
        {!!customerEmail && <Text style={styles.meta}>{customerEmail}</Text>}

        <View style={styles.itemsWrap}>
          {item.items.slice(0, 2).map((line, index) => (
            <Text key={line._id ? `${line._id}-${index}` : `${item._id}-line-${index}`} style={styles.itemLine} numberOfLines={1}>
              {line.product?.name || 'Product'} x {line.quantity}
            </Text>
          ))}
          {item.items.length > 2 && (
            <Text style={styles.moreItems}>+{item.items.length - 2} more item(s)</Text>
          )}
        </View>

        {isExpanded && (
          <View style={styles.detailPanel}>
            <Text style={styles.detailLabel}>Shipping</Text>
            <Text style={styles.detailText}>
              {[item.shippingAddress?.fullName, item.shippingAddress?.phone].filter(Boolean).join(' • ') || 'N/A'}
            </Text>
            <Text style={styles.detailText}>
              {[
                item.shippingAddress?.address || item.shippingAddress?.street,
                item.shippingAddress?.city,
                item.shippingAddress?.state,
              ]
                .filter(Boolean)
                .join(', ') || 'N/A'}
            </Text>
            <Text style={[styles.detailLabel, { marginTop: 8 }]}>Payment</Text>
            <Text style={styles.detailText}>
              {item.paymentMethod || 'N/A'} • {item.paymentStatus || 'N/A'}
            </Text>

            {!isCancelledOrRefunded && (
              <>
                <Text style={[styles.detailLabel, { marginTop: 10 }]}>Set Stage</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stageRow}>
                  {ACTIVE_VENDOR_STAGES.map((stage) => (
                    <TouchableOpacity
                      key={stage}
                      style={[styles.stageChip, selectedStage === stage && styles.stageChipActive]}
                      onPress={() => setSelectedStatusByOrder((prev) => ({ ...prev, [item._id]: stage }))}
                    >
                      <Text style={[styles.stageChipText, selectedStage === stage && styles.stageChipTextActive]}>{stage}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <TouchableOpacity
                  style={[styles.actionButton, styles.inlineActionButton, (selectedStage === item.status || updatingOrderId === item._id) && styles.actionButtonDisabled]}
                  onPress={() => updateOrderStatus(item._id, selectedStage)}
                  disabled={selectedStage === item.status || updatingOrderId === item._id}
                >
                  <Text style={styles.actionText}>Update to {selectedStage}</Text>
                </TouchableOpacity>
              </>
            )}

            {item.status === 'cancelled' && !!item.cancelReason && (
              <>
                <Text style={[styles.detailLabel, { marginTop: 10 }]}>Cancel Reason</Text>
                <Text style={styles.detailText}>{item.cancelReason}</Text>
              </>
            )}
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.secondaryActionButton}
            onPress={() => setExpandedOrderId((prev) => (prev === item._id ? null : item._id))}
          >
            <Text style={styles.secondaryActionText}>{isExpanded ? 'Hide Details' : 'View Details'}</Text>
          </TouchableOpacity>

          {!isCancelledOrRefunded ? (
            <TouchableOpacity
              style={[styles.cancelButton, updatingOrderId === item._id && styles.actionButtonDisabled]}
              onPress={() => setCancelInputOrderId((prev) => (prev === item._id ? null : item._id))}
              disabled={updatingOrderId === item._id}
            >
              <Text style={styles.cancelButtonText}>Cancel Order</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.noActionBadge}>
              <Text style={styles.noActionText}>No action required</Text>
            </View>
          )}
        </View>

        {cancelInputOrderId === item._id && !isCancelledOrRefunded && (
          <View style={styles.cancelReasonPanel}>
            <Text style={styles.detailLabel}>Cancellation Reason (Required)</Text>
            <TextInput
              style={styles.cancelReasonInput}
              placeholder="Enter reason for cancellation"
              value={cancelReason}
              onChangeText={(text) => setCancelReasonByOrder((prev) => ({ ...prev, [item._id]: text }))}
            />
            <TouchableOpacity
              style={[styles.cancelSubmitButton, (!cancelReason.trim() || updatingOrderId === item._id) && styles.actionButtonDisabled]}
              onPress={() => updateOrderStatus(item._id, 'cancelled', cancelReason.trim())}
              disabled={!cancelReason.trim() || updatingOrderId === item._id}
            >
              <Text style={styles.cancelSubmitButtonText}>Confirm Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Vendor Orders</Text>
      </View>

      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {STATUS_OPTIONS.map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.filterTab, statusFilter === status && styles.filterTabActive]}
              onPress={() => handleFilterChange(status)}
            >
              <Text
                numberOfLines={1}
                style={[styles.filterTabText, statusFilter === status && styles.filterTabTextActive]}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => {
          setIsRefreshing(true);
          fetchOrders(page, statusFilter);
        }} />}
        ListHeaderComponent={
          <View style={styles.paginationInfoWrap}>
            <Text style={styles.paginationInfo}>Page {page} of {pages} ({totalOrders} orders)</Text>
            <View style={styles.paginationControls}>
              <TouchableOpacity
                onPress={() => handlePageChange(page - 1)}
                disabled={page <= 1 || isPageLoading}
                style={[styles.pageButton, (page <= 1 || isPageLoading) && styles.pageButtonDisabled]}
              >
                <Text style={styles.pageButtonText}>Prev</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handlePageChange(page + 1)}
                disabled={page >= pages || isPageLoading}
                style={[styles.pageButton, (page >= pages || isPageLoading) && styles.pageButtonDisabled]}
              >
                <Text style={styles.pageButtonText}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No orders yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    backgroundColor: '#1a1a2e',
    paddingTop: 50,
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  filterBar: {
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#edf1f5',
  },
  filterScroll: { paddingHorizontal: 12, paddingVertical: 6, gap: 6 },
  filterTab: {
    minHeight: 30,
    borderWidth: 1,
    borderColor: '#dce1e7',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    justifyContent: 'center',
    alignItems: 'center',
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
  list: { padding: 12, paddingBottom: 120 },
  paginationInfoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  paginationInfo: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  paginationControls: { flexDirection: 'row', gap: 8 },
  pageButton: {
    borderWidth: 1,
    borderColor: '#d7dce2',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#fff',
  },
  pageButtonDisabled: { opacity: 0.45 },
  pageButtonText: { fontSize: 12, color: '#334155', fontWeight: '700' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  orderNumber: { fontSize: 16, fontWeight: '700', color: '#1a1a2e' },
  total: { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  badgesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  statusBadgeText: { textTransform: 'capitalize', fontSize: 11, fontWeight: '700' },
  metaMuted: { fontSize: 12, color: '#94a3b8' },
  metaStrong: { fontSize: 14, color: '#0f172a', fontWeight: '700', marginBottom: 2 },
  meta: { fontSize: 13, color: '#666', marginBottom: 2 },
  itemsWrap: {
    borderTopWidth: 1,
    borderTopColor: '#eef1f4',
    borderBottomWidth: 1,
    borderBottomColor: '#eef1f4',
    paddingVertical: 8,
    marginTop: 6,
  },
  itemLine: { fontSize: 12, color: '#475569', marginBottom: 2 },
  moreItems: { fontSize: 11, color: '#64748b', fontWeight: '600', marginTop: 2 },
  detailPanel: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 8,
  },
  detailLabel: { fontSize: 11, color: '#64748b', fontWeight: '700', textTransform: 'uppercase' },
  detailText: { fontSize: 12, color: '#334155', marginTop: 2 },
  stageRow: { paddingTop: 6, gap: 8 },
  stageChip: {
    borderWidth: 1,
    borderColor: '#d7dce2',
    borderRadius: 999,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  stageChipActive: { borderColor: '#3498db', backgroundColor: '#e9f5ff' },
  stageChipText: { fontSize: 11, color: '#475569', fontWeight: '700', textTransform: 'capitalize' },
  stageChipTextActive: { color: '#3498db' },
  actions: { flexDirection: 'row', marginTop: 10, gap: 8 },
  secondaryActionButton: {
    borderWidth: 1,
    borderColor: '#d7dce2',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  secondaryActionText: { color: '#334155', fontWeight: '700', fontSize: 12 },
  actionButton: { backgroundColor: '#3498db', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  inlineActionButton: { marginTop: 8, alignSelf: 'flex-start' },
  actionButtonDisabled: { opacity: 0.5 },
  actionText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  cancelButton: {
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  cancelButtonText: { color: '#b91c1c', fontWeight: '700', fontSize: 12 },
  cancelReasonPanel: {
    backgroundColor: '#fff7ed',
    borderRadius: 10,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  cancelReasonInput: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#fdba74',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: '#334155',
  },
  cancelSubmitButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#dc2626',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  cancelSubmitButtonText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  noActionBadge: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  noActionText: { color: '#64748b', fontWeight: '700', fontSize: 12 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { fontSize: 16, color: '#666' },
});
