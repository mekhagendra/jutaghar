import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import api from '../lib/api';
import { getAuthState } from '../lib/authStore';
import { clearCart, getCartItems, getTotalPrice } from '../lib/cartStore';
import type { CartItem, DeliverySettings } from '../lib/types';

interface CheckoutScreenProps {
  onBack: () => void;
  onOrderSuccess: (orderId: string) => void;
}

export default function CheckoutScreen({ onBack, onOrderSuccess }: CheckoutScreenProps) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('cash_on_delivery');
  const [notes, setNotes] = useState('');

  const [address, setAddress] = useState({
    fullName: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
  });

  useEffect(() => {
    setItems(getCartItems());
    fetchDeliverySettings();
    loadUserInfo();
    fetchTaxEstimate();
  }, []);

  const loadUserInfo = () => {
    const auth = getAuthState();
    if (auth.user) {
      setAddress(prev => ({
        ...prev,
        fullName: auth.user?.fullName || '',
        phone: auth.user?.phone || '',
      }));
    }
  };

  const fetchDeliverySettings = async () => {
    try {
      const res = await api.get<DeliverySettings>('/api/delivery-settings');
      setDeliverySettings(res.data);
    } catch {
      // Use defaults
    }
  };

  const fetchTaxEstimate = async () => {
    const cartItems = getCartItems();
    if (cartItems.length === 0) return;
    try {
      const res = await api.post<{ tax: number }>('/api/payment/tax-estimate', {
        items: cartItems.map(i => ({
          product: i.product._id,
          quantity: i.quantity,
          variant: i.selectedVariant,
        })),
      });
      setTax(res.data?.tax ?? 0);
    } catch {
      // Fall back to 0 tax
    }
  };

  const subtotal = getTotalPrice();
  const shippingFee = (() => {
    if (!deliverySettings) return 0;
    const { minDeliveryFee, deliveryFeeRate, freeDeliveryThreshold } = deliverySettings;
    if (freeDeliveryThreshold > 0 && subtotal >= freeDeliveryThreshold) return 0;
    return Math.max(minDeliveryFee, subtotal * deliveryFeeRate / 100);
  })();
  const [tax, setTax] = useState(0);
  const total = subtotal + shippingFee + tax;

  const paymentOptions = [
    { value: 'cash_on_delivery', label: 'Cash on Delivery', icon: '💵' },
    { value: 'esewa', label: 'eSewa', icon: '📱' },
    { value: 'khalti', label: 'Khalti', icon: '📲' },
  ];

  const handleEsewaPayment = async (paymentData: { orderId: string; amount: number; taxAmount: number; shippingCost: number; total: number }, orderId: string) => {
    try {
      const totalAmount = paymentData.total;
      const productCode = 'EPAYTEST';

      // Get signature from backend
      const sigRes = await api.post<{ signature: string; signed_field_names: string }>('/api/payment/esewa/signature', {
        transaction_uuid: orderId,
        total_amount: totalAmount.toFixed(2),
        product_code: productCode,
      });

      const returnUrl = Linking.createURL('payment/esewa/success');
      const failureUrl = Linking.createURL('payment/esewa/failure');

      // Build eSewa form URL with query params (since we can't POST a form from RN)
      const params = new URLSearchParams({
        amount: paymentData.amount.toFixed(2),
        tax_amount: paymentData.taxAmount.toFixed(2),
        total_amount: totalAmount.toFixed(2),
        transaction_uuid: orderId,
        product_code: productCode,
        product_service_charge: '0',
        product_delivery_charge: paymentData.shippingCost.toFixed(2),
        success_url: returnUrl,
        failure_url: failureUrl,
        signed_field_names: sigRes.data.signed_field_names,
        signature: sigRes.data.signature,
      });

      const esewaUrl = `https://rc-epay.esewa.com.np/api/epay/main/v2/form?${params.toString()}`;

      const result = await WebBrowser.openAuthSessionAsync(esewaUrl, returnUrl);

      if (result.type === 'success' && result.url) {
        // Parse the returned URL for verification data
        const url = new URL(result.url);
        const data = url.searchParams.get('data');
        if (data) {
          const verifyRes = await api.get<{ success: boolean; data: { orderId: string } }>(`/api/payment/esewa/verify?data=${data}`);
          if (verifyRes.data?.success) {
            await clearCart();
            Alert.alert('Payment Successful!', 'Your order has been confirmed.', [
              { text: 'View Order', onPress: () => onOrderSuccess(orderId) },
            ]);
            return;
          }
        }
        Alert.alert('Payment Error', 'Could not verify payment. Please check your orders.', [
          { text: 'View Order', onPress: () => onOrderSuccess(orderId) },
        ]);
      } else {
        Alert.alert('Payment Cancelled', 'Payment was cancelled. Your order is saved as pending.', [
          { text: 'View Order', onPress: () => onOrderSuccess(orderId) },
        ]);
      }
    } catch (error: any) {
      Alert.alert('Payment Error', error.message || 'eSewa payment failed. Your order is saved as pending.', [
        { text: 'View Order', onPress: () => onOrderSuccess(orderId) },
      ]);
    }
  };

  const handleKhaltiPayment = async (paymentData: { orderId: string; total: number; orderNumber: string }, orderId: string) => {
    try {
      const returnUrl = Linking.createURL('payment/khalti/callback');

      const khaltiRes = await api.post<{ payment_url: string }>('/api/payment/khalti/initiate', {
        return_url: returnUrl,
        website_url: Linking.createURL(''),
        amount: Math.round(paymentData.total * 100), // Khalti uses paisa
        purchase_order_id: orderId,
        purchase_order_name: `Order ${paymentData.orderNumber}`,
      });

      const paymentUrl = khaltiRes.data?.payment_url;
      if (!paymentUrl) {
        throw new Error('Failed to get Khalti payment URL');
      }

      const result = await WebBrowser.openAuthSessionAsync(paymentUrl, returnUrl);

      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);
        const pidx = url.searchParams.get('pidx');
        const purchase_order_id = url.searchParams.get('purchase_order_id');
        const transaction_id = url.searchParams.get('transaction_id');
        const amount = url.searchParams.get('amount');
        const status = url.searchParams.get('status');

        if (pidx && purchase_order_id && status === 'Completed') {
          const verifyRes = await api.post<{ success: boolean }>('/api/payment/khalti/verify', {
            pidx,
            purchase_order_id,
            transaction_id,
            amount: parseInt(amount || '0'),
          });
          if (verifyRes.data?.success) {
            await clearCart();
            Alert.alert('Payment Successful!', 'Your order has been confirmed.', [
              { text: 'View Order', onPress: () => onOrderSuccess(orderId) },
            ]);
            return;
          }
        }
        Alert.alert('Payment Error', 'Could not verify payment. Please check your orders.', [
          { text: 'View Order', onPress: () => onOrderSuccess(orderId) },
        ]);
      } else {
        Alert.alert('Payment Cancelled', 'Payment was cancelled. Your order is saved as pending.', [
          { text: 'View Order', onPress: () => onOrderSuccess(orderId) },
        ]);
      }
    } catch (error: any) {
      Alert.alert('Payment Error', error.message || 'Khalti payment failed. Your order is saved as pending.', [
        { text: 'View Order', onPress: () => onOrderSuccess(orderId) },
      ]);
    }
  };

  const handlePlaceOrder = async () => {
    if (!address.fullName.trim() || !address.phone.trim() || !address.street.trim() || !address.city.trim()) {
      Alert.alert('Missing Info', 'Please fill in all required shipping details.');
      return;
    }
    if (items.length === 0) {
      Alert.alert('Empty Cart', 'Your cart is empty.');
      return;
    }

    setIsLoading(true);
    try {
      const orderData = {
        items: items.map(item => ({
          product: item.product._id,
          quantity: item.quantity,
          variant: item.selectedVariant ? {
            color: item.selectedVariant.color,
            size: item.selectedVariant.size,
            sku: item.selectedVariant.sku,
          } : undefined,
        })),
        shippingAddress: {
          fullName: address.fullName,
          phone: address.phone,
          address: address.street,
          city: address.city,
          state: address.state,
          zipCode: address.zipCode,
        },
        paymentMethod,
        notes,
      };

      const res = await api.post<{ order: { _id: string; total: number; orderNumber: string }; paymentData: { orderId: string; amount: number; taxAmount: number; shippingCost: number; total: number; orderNumber: string } }>('/api/payment/initiate', orderData);
      const orderId = res.data?.paymentData?.orderId || res.data?.order?._id || '';
      const paymentData = res.data?.paymentData;

      if (paymentMethod === 'cash_on_delivery') {
        await clearCart();
        Alert.alert('Order Placed!', 'Your order has been placed successfully.', [
          { text: 'View Order', onPress: () => onOrderSuccess(orderId) },
        ]);
      } else if (paymentMethod === 'esewa' && paymentData) {
        await handleEsewaPayment(paymentData, orderId);
      } else if (paymentMethod === 'khalti' && paymentData) {
        await handleKhaltiPayment(paymentData, orderId);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to place order');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Shipping Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📦 Shipping Address</Text>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              value={address.fullName}
              onChangeText={(t) => setAddress(p => ({ ...p, fullName: t }))}
              placeholder="Enter full name"
            />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Phone *</Text>
            <TextInput
              style={styles.input}
              value={address.phone}
              onChangeText={(t) => setAddress(p => ({ ...p, phone: t }))}
              placeholder="Phone number"
              keyboardType="phone-pad"
            />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Street Address *</Text>
            <TextInput
              style={styles.input}
              value={address.street}
              onChangeText={(t) => setAddress(p => ({ ...p, street: t }))}
              placeholder="Street address"
            />
          </View>
          <View style={styles.rowInputs}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>City *</Text>
              <TextInput
                style={styles.input}
                value={address.city}
                onChangeText={(t) => setAddress(p => ({ ...p, city: t }))}
                placeholder="City"
              />
            </View>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>State</Text>
              <TextInput
                style={styles.input}
                value={address.state}
                onChangeText={(t) => setAddress(p => ({ ...p, state: t }))}
                placeholder="State"
              />
            </View>
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Zip Code</Text>
            <TextInput
              style={styles.input}
              value={address.zipCode}
              onChangeText={(t) => setAddress(p => ({ ...p, zipCode: t }))}
              placeholder="Zip code"
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💳 Payment Method</Text>
          {paymentOptions.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.paymentOption, paymentMethod === opt.value && styles.paymentOptionActive]}
              onPress={() => setPaymentMethod(opt.value)}
            >
              <Text style={styles.paymentIcon}>{opt.icon}</Text>
              <Text style={[styles.paymentLabel, paymentMethod === opt.value && styles.paymentLabelActive]}>
                {opt.label}
              </Text>
              {paymentMethod === opt.value && <Text style={styles.paymentCheck}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>

        {/* Order Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Order Notes</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any special instructions? (optional)"
            multiline
          />
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Order Summary</Text>
          {items.map((item, i) => {
            const price = item.selectedVariant?.price || item.product.salePrice || item.product.price;
            return (
              <View key={i} style={styles.summaryItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.summaryItemName} numberOfLines={1}>{item.product.name}</Text>
                  {item.selectedVariant && (
                    <Text style={styles.summaryVariant}>
                      {[item.selectedVariant.color, item.selectedVariant.size].filter(Boolean).join(' / ')}
                    </Text>
                  )}
                  <Text style={styles.summaryQty}>Qty: {item.quantity}</Text>
                </View>
                <Text style={styles.summaryItemPrice}>Rs. {(price * item.quantity).toLocaleString()}</Text>
              </View>
            );
          })}

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>Rs. {subtotal.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Shipping</Text>
            <Text style={[styles.summaryValue, shippingFee === 0 && { color: '#27ae60' }]}>
              {shippingFee === 0 ? 'FREE' : `Rs. ${shippingFee.toLocaleString()}`}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax (13% VAT)</Text>
            <Text style={styles.summaryValue}>Rs. {tax.toLocaleString()}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>Rs. {total.toLocaleString()}</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Place Order Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.placeOrderButton, isLoading && styles.disabledButton]}
          onPress={handlePlaceOrder}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.placeOrderText}>Place Order — Rs. {total.toLocaleString()}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    backgroundColor: '#1a1a2e', paddingTop: 50, paddingBottom: 14,
    paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  backButton: { padding: 4 },
  backText: { color: '#fff', fontSize: 16 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  content: { flex: 1 },

  section: {
    backgroundColor: '#fff', marginHorizontal: 12, marginTop: 12,
    borderRadius: 14, padding: 16, elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', marginBottom: 14 },

  formGroup: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#333', backgroundColor: '#fafafa',
  },
  rowInputs: { flexDirection: 'row', gap: 10 },

  paymentOption: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14,
    borderWidth: 1, borderColor: '#e8e8e8', borderRadius: 12, marginBottom: 8,
  },
  paymentOptionActive: { borderColor: '#3498db', backgroundColor: '#f0f8ff' },
  paymentIcon: { fontSize: 22, marginRight: 12 },
  paymentLabel: { fontSize: 15, color: '#333', flex: 1 },
  paymentLabelActive: { fontWeight: '700', color: '#3498db' },
  paymentCheck: { fontSize: 18, color: '#3498db', fontWeight: 'bold' },

  summaryItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8,
  },
  summaryItemName: { fontSize: 14, fontWeight: '500', color: '#333' },
  summaryVariant: { fontSize: 12, color: '#888', marginTop: 2 },
  summaryQty: { fontSize: 12, color: '#888' },
  summaryItemPrice: { fontSize: 14, fontWeight: '600', color: '#1a1a2e' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryLabel: { fontSize: 14, color: '#666' },
  summaryValue: { fontSize: 14, color: '#333', fontWeight: '500' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#eee', marginTop: 6, paddingTop: 10 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#1a1a2e' },
  totalValue: { fontSize: 18, fontWeight: '800', color: '#1a1a2e' },

  bottomBar: {
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: '#eee', paddingBottom: 30,
  },
  placeOrderButton: {
    backgroundColor: '#3498db', borderRadius: 12, paddingVertical: 16, alignItems: 'center',
  },
  disabledButton: { opacity: 0.6 },
  placeOrderText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
