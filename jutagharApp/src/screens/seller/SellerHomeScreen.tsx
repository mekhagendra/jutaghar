import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import api from '@/api';

interface SellerHomeScreenProps {
  onAddProduct: () => void;
  onManageProducts: () => void;
  onViewOrders: () => void;
  userData?: any;
}

export default function SellerHomeScreen({ onAddProduct, onManageProducts, onViewOrders, userData }: SellerHomeScreenProps) {
  const [stats, setStats] = useState({ listings: 0, orders: 0, revenue: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSellerStats();
  }, []);

  const fetchSellerStats = async () => {
    try {
      const [productsRes, ordersRes] = await Promise.all([
        api.get<any>('/api/products/vendor/my-products?limit=1'),
        api.get<any>('/api/vendors/orders?limit=1'),
      ]);
      setStats({
        listings: productsRes.data?.pagination?.total || productsRes.data?.data?.pagination?.total || 0,
        orders: ordersRes.data?.pagination?.total || ordersRes.data?.data?.pagination?.total || 0,
        revenue: 0,
      });
    } catch {
      // Stats are non-critical
    } finally {
      setIsLoading(false);
    }
  };
  const handleViewAnalytics = () => {
    Alert.alert('Analytics', 'Advanced analytics will be available soon.');
  };

  const topStat = Math.max(stats.listings, stats.orders, 1);
  const listingPct = Math.min(100, Math.round((stats.listings / topStat) * 100));
  const ordersPct = Math.min(100, Math.round((stats.orders / topStat) * 100));
  const efficiency = stats.listings > 0 ? Math.min(100, Math.round((stats.orders / stats.listings) * 100)) : 0;
  const sellerName = userData?.fullName || userData?.businessName || 'Seller';

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerCard}>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>SELLER PORTAL</Text>
          </View>
          <Text style={styles.welcomeText}>Welcome back, {sellerName}</Text>
          <Text style={styles.subtitle}>Track performance and manage your store efficiently.</Text>
          <Text style={styles.emailText}>{userData?.email}</Text>
        </View>

        <View style={styles.overviewCard}>
          <Text style={styles.overviewTitle}>Today&apos;s Overview</Text>
          <Text style={styles.overviewValue}>{stats.orders}</Text>
          <Text style={styles.overviewSub}>Total Orders Managed</Text>
          <View style={styles.overviewMetaRow}>
            <Text style={styles.overviewMetaLabel}>Store efficiency</Text>
            <Text style={styles.overviewMetaValue}>{efficiency}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.max(6, efficiency)}%` }]} />
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#e67e22" style={{ marginTop: 20 }} />
        ) : (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statEyebrow}>Inventory</Text>
              <Text style={styles.statNumber}>{stats.listings}</Text>
              <Text style={styles.statLabel}>Active Listings</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statEyebrow}>Operations</Text>
              <Text style={styles.statNumber}>{stats.orders}</Text>
              <Text style={styles.statLabel}>Orders</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statEyebrow}>Finance</Text>
              <Text style={styles.statNumber}>--</Text>
              <Text style={styles.statLabel}>Revenue</Text>
            </View>
          </View>

        )}

        <View style={styles.insightsCard}>
          <Text style={styles.insightsTitle}>Quick Insights</Text>

          <View style={styles.insightRow}>
            <Text style={styles.insightLabel}>Listings</Text>
            <View style={styles.insightTrack}>
              <View style={[styles.insightFillBlue, { width: `${Math.max(8, listingPct)}%` }]} />
            </View>
            <Text style={styles.insightValue}>{stats.listings}</Text>
          </View>

          <View style={styles.insightRow}>
            <Text style={styles.insightLabel}>Orders</Text>
            <View style={styles.insightTrack}>
              <View style={[styles.insightFillOrange, { width: `${Math.max(8, ordersPct)}%` }]} />
            </View>
            <Text style={styles.insightValue}>{stats.orders}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.primaryActionCard} onPress={onAddProduct}>
            <View style={styles.actionTextWrap}>
              <Text style={styles.primaryActionTitle}>Add New Product</Text>
              <Text style={styles.primaryActionDescription}>List a new product and publish instantly.</Text>
            </View>
            <Text style={styles.actionChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={onManageProducts}>
            <View style={styles.actionTextWrap}>
              <Text style={styles.actionTitle}>Manage Products</Text>
              <Text style={styles.actionDescription}>Update details, sale pricing, and stock.</Text>
            </View>
            <Text style={styles.actionChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={onViewOrders}>
            <View style={styles.actionTextWrap}>
              <Text style={styles.actionTitle}>View Orders</Text>
              <Text style={styles.actionDescription}>Track, process, and complete customer orders.</Text>
            </View>
            <Text style={styles.actionChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={handleViewAnalytics}>
            <View style={styles.actionTextWrap}>
              <Text style={styles.actionTitle}>View Analytics</Text>
              <Text style={styles.actionDescription}>Performance dashboard and trends (coming soon).</Text>
            </View>
            <Text style={styles.actionChevron}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 14,
    paddingBottom: 22,
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 14,
  },
  headerBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  headerBadgeText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 6,
  },
  emailText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  overviewCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  overviewTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  overviewValue: {
    color: '#f8fafc',
    fontSize: 34,
    fontWeight: '800',
    marginTop: 6,
  },
  overviewSub: {
    color: '#cbd5e1',
    fontSize: 13,
    marginTop: 2,
  },
  overviewMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 6,
  },
  overviewMetaLabel: {
    color: '#94a3b8',
    fontSize: 12,
  },
  overviewMetaValue: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '700',
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(148, 163, 184, 0.25)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#38bdf8',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 14,
    alignItems: 'flex-start',
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  statEyebrow: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 6,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  insightsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  insightsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  insightLabel: {
    width: 62,
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  insightTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
    marginHorizontal: 10,
  },
  insightFillBlue: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#2563eb',
  },
  insightFillOrange: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#f59e0b',
  },
  insightValue: {
    width: 34,
    fontSize: 12,
    color: '#0f172a',
    textAlign: 'right',
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '700',
    marginBottom: 10,
    marginLeft: 2,
  },
  actionsContainer: {
    marginBottom: 20,
  },
  primaryActionCard: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  actionCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  actionTextWrap: {
    flex: 1,
    paddingRight: 8,
  },
  primaryActionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: 'white',
    marginBottom: 5,
  },
  primaryActionDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 5,
  },
  actionDescription: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  actionChevron: {
    fontSize: 26,
    color: '#94a3b8',
    marginTop: -2,
  },
});
