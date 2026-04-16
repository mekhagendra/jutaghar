import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import api, { API_BASE_URL } from '../lib/api';
import type { Order } from '../lib/types';

interface OrderDetailScreenProps {
  orderId: string;
  onBack: () => void;
}

const STATUS_STEPS = [
  { key: 'pending', label: 'Placed', icon: '🕐' },
  { key: 'processing', label: 'Processing', icon: '📦' },
  { key: 'shipped', label: 'Shipped', icon: '🚚' },
  { key: 'delivered', label: 'Delivered', icon: '✅' },
];
const STATUS_ORDER = ['pending', 'processing', 'shipped', 'delivered'];

export default function OrderDetailScreen({ orderId, onBack }: OrderDetailScreenProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await api.get<Order>(`/api/orders/${orderId}`);
      setOrder((res.data as any)?.data || res.data);
    } catch {
      Alert.alert('Error', 'Failed to load order details');
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const getImageUrl = (path?: string) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return { bg: '#fff3cd', text: '#856404' };
      case 'processing': return { bg: '#cce5ff', text: '#004085' };
      case 'shipped': return { bg: '#d4edda', text: '#155724' };
      case 'delivered': return { bg: '#d1ecf1', text: '#0c5460' };
      case 'cancelled': return { bg: '#f8d7da', text: '#721c24' };
      case 'refunded': return { bg: '#e2e3e5', text: '#383d41' };
      default: return { bg: '#e8e8e8', text: '#555' };
    }
  };

  const handleCancelOrder = () => {
    if (!order) return;
    Alert.alert('Cancel Order', 'Are you sure you want to cancel this order?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.patch(`/api/orders/${orderId}/cancel`);
            Alert.alert('Cancelled', 'Order has been cancelled.');
            fetchOrder();
          } catch {
            Alert.alert('Error', 'Failed to cancel order');
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <Text style={{ fontSize: 16, color: '#666' }}>Order not found</Text>
        <TouchableOpacity onPress={onBack} style={{ marginTop: 16 }}>
          <Text style={{ color: '#3498db', fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusStyle = getStatusColor(order.status);
  const activeStepIndex = STATUS_ORDER.indexOf(order.status);
  const isCancelled = order.status === 'cancelled' || order.status === 'refunded';
  const canCancel = ['pending', 'processing'].includes(order.status);
  const addr = order.shippingAddress;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order #{order.orderNumber}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Badge */}
        <View style={styles.section}>
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>{order.status}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.paymentStatus).bg }]}>
              <Text style={[styles.statusBadgeText, { color: getStatusColor(order.paymentStatus).text }]}>
                {order.paymentStatus}
              </Text>
            </View>
          </View>
          <Text style={styles.orderDate}>Placed on {formatDate(order.createdAt)}</Text>
        </View>

        {/* Order Tracker */}
        {!isCancelled ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Status</Text>
            <View style={styles.tracker}>
              {STATUS_STEPS.map((step, index) => {
                const isDone = index < activeStepIndex;
                const isActive = index === activeStepIndex;
                return (
                  <View key={step.key} style={styles.trackerStep}>
                    <View style={[
                      styles.trackerDot,
                      isDone && styles.trackerDotDone,
                      isActive && styles.trackerDotActive,
                    ]}>
                      <Text style={styles.trackerIcon}>{step.icon}</Text>
                    </View>
                    <Text style={[
                      styles.trackerLabel,
                      (isDone || isActive) && styles.trackerLabelActive,
                    ]}>{step.label}</Text>
                    {index < STATUS_STEPS.length - 1 && (
                      <View style={[styles.trackerLine, isDone && styles.trackerLineDone]} />
                    )}
                  </View>
                );
              })}
            </View>
            {order.trackingNumber && (
              <View style={styles.trackingBox}>
                <Text style={styles.trackingLabel}>🚚 Tracking: </Text>
                <Text style={styles.trackingNumber}>{order.trackingNumber}</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.section, { backgroundColor: '#fdf2f2' }]}>
            <Text style={{ fontSize: 15, color: '#c0392b', fontWeight: '600' }}>
              ❌ This order has been {order.status}.
            </Text>
          </View>
        )}

        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items Ordered</Text>
          {order.items.map((item) => {
            const img = getImageUrl(item.product?.images?.[0]);
            return (
              <View key={item._id} style={styles.itemRow}>
                <View style={styles.itemImage}>
                  {img ? (
                    <Image source={{ uri: img }} style={styles.itemImg} resizeMode="cover" />
                  ) : (
                    <View style={styles.itemImgPlaceholder}>
                      <Text>📦</Text>
                    </View>
                  )}
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={2}>{item.product?.name}</Text>
                  {item.variant && (
                    <Text style={styles.itemVariant}>
                      {[item.variant.color, item.variant.size].filter(Boolean).join(' / ')}
                    </Text>
                  )}
                  <Text style={styles.itemQty}>Qty: {item.quantity} × Rs. {item.price.toLocaleString()}</Text>
                </View>
                <Text style={styles.itemTotal}>Rs. {(item.price * item.quantity).toLocaleString()}</Text>
              </View>
            );
          })}
        </View>

        {/* Price Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Summary</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Subtotal</Text>
            <Text style={styles.priceValue}>Rs. {order.subtotal.toLocaleString()}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Tax</Text>
            <Text style={styles.priceValue}>Rs. {order.tax.toLocaleString()}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Shipping</Text>
            <Text style={styles.priceValue}>Rs. {order.shippingCost.toLocaleString()}</Text>
          </View>
          <View style={[styles.priceRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>Rs. {order.total.toLocaleString()}</Text>
          </View>
          <View style={styles.paymentMethodRow}>
            <Text style={styles.paymentMethodLabel}>💳 {order.paymentMethod?.replace(/_/g, ' ')}</Text>
          </View>
        </View>

        {/* Shipping Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Shipping Address</Text>
          {addr.fullName && <Text style={styles.addrName}>{addr.fullName}</Text>}
          {addr.phone && <Text style={styles.addrText}>{addr.phone}</Text>}
          {(addr.street || addr.address) && <Text style={styles.addrText}>{addr.street || addr.address}</Text>}
          {(addr.city || addr.state) && (
            <Text style={styles.addrText}>{[addr.city, addr.state].filter(Boolean).join(', ')}</Text>
          )}
          {addr.zipCode && <Text style={styles.addrText}>{addr.zipCode}</Text>}
        </View>

        {/* Notes */}
        {order.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 Notes</Text>
            <Text style={styles.notesText}>{order.notes}</Text>
          </View>
        )}

        {/* Cancel Button */}
        {canCancel && (
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancelOrder}>
            <Text style={styles.cancelButtonText}>Cancel Order</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' },
  header: {
    backgroundColor: '#1a1a2e', paddingTop: 50, paddingBottom: 14,
    paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  backButton: { padding: 4 },
  backText: { color: '#fff', fontSize: 16 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },
  content: { flex: 1 },

  section: {
    backgroundColor: '#fff', marginHorizontal: 12, marginTop: 12,
    borderRadius: 14, padding: 16, elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', marginBottom: 14 },

  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  statusBadgeText: { fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  orderDate: { fontSize: 13, color: '#888' },

  // Tracker
  tracker: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  trackerStep: { alignItems: 'center', flex: 1, position: 'relative' },
  trackerDot: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#f0f0f0',
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#ddd',
  },
  trackerDotDone: { backgroundColor: '#d4edda', borderColor: '#27ae60' },
  trackerDotActive: { borderColor: '#3498db', backgroundColor: '#e8f4fd' },
  trackerIcon: { fontSize: 18 },
  trackerLabel: { fontSize: 11, color: '#999', marginTop: 4, textAlign: 'center' },
  trackerLabelActive: { color: '#333', fontWeight: '600' },
  trackerLine: {
    position: 'absolute', top: 20, left: '70%', right: '-30%', height: 2, backgroundColor: '#e0e0e0',
  },
  trackerLineDone: { backgroundColor: '#27ae60' },

  trackingBox: {
    flexDirection: 'row', alignItems: 'center', marginTop: 14,
    backgroundColor: '#f0f8ff', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#c3e2f7',
  },
  trackingLabel: { fontSize: 13, color: '#555' },
  trackingNumber: { fontSize: 13, fontWeight: '700', color: '#1a1a2e', fontFamily: 'monospace' },

  // Items
  itemRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  itemImage: { width: 56, height: 56, borderRadius: 8, overflow: 'hidden', marginRight: 12 },
  itemImg: { width: '100%', height: '100%' },
  itemImgPlaceholder: {
    width: '100%', height: '100%', backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center',
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600', color: '#333' },
  itemVariant: { fontSize: 12, color: '#888', marginTop: 2 },
  itemQty: { fontSize: 12, color: '#888', marginTop: 2 },
  itemTotal: { fontSize: 14, fontWeight: '700', color: '#1a1a2e', alignSelf: 'center' },

  // Price summary
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  priceLabel: { fontSize: 14, color: '#666' },
  priceValue: { fontSize: 14, color: '#333' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#eee', marginTop: 8, paddingTop: 10 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#1a1a2e' },
  totalValue: { fontSize: 18, fontWeight: '800', color: '#1a1a2e' },
  paymentMethodRow: { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  paymentMethodLabel: { fontSize: 13, color: '#666', textTransform: 'capitalize' },

  // Address
  addrName: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 2 },
  addrText: { fontSize: 13, color: '#666', lineHeight: 20 },

  notesText: { fontSize: 14, color: '#555', lineHeight: 20 },

  cancelButton: {
    marginHorizontal: 12, marginTop: 16, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, borderColor: '#e74c3c', alignItems: 'center',
  },
  cancelButtonText: { color: '#e74c3c', fontSize: 15, fontWeight: '600' },
});
