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
import api from '../lib/api';

interface SellerHomeScreenProps {
  onLogout: () => void;
  onGoToLogin: () => void;
  userData?: any;
}

export default function SellerHomeScreen({ onLogout, onGoToLogin, userData }: SellerHomeScreenProps) {
  const [stats, setStats] = useState({ listings: 0, orders: 0, revenue: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchVendorStats();
  }, []);

  const fetchVendorStats = async () => {
    try {
      const [productsRes, ordersRes] = await Promise.all([
        api.get<any>('/api/products/vendor/my?limit=1'),
        api.get<any>('/api/orders/vendor?limit=1'),
      ]);
      setStats({
        listings: productsRes.data?.pagination?.total || 0,
        orders: ordersRes.data?.pagination?.total || 0,
        revenue: 0,
      });
    } catch {
      // Stats are non-critical
    } finally {
      setIsLoading(false);
    }
  };
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout from seller account?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          onPress: () => {
            onLogout();
          },
        },
      ]
    );
  };

  const handleAddProduct = () => {
    Alert.alert('Add Product', 'Product listing functionality will be implemented soon.');
  };

  const handleManageListings = () => {
    Alert.alert('Manage Listings', 'Listing management functionality will be implemented soon.');
  };

  const handleViewOrders = () => {
    Alert.alert('Orders', 'Order management functionality will be implemented soon.');
  };

  const handleViewAnalytics = () => {
    Alert.alert('Analytics', 'Business analytics functionality will be implemented soon.');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome, {userData?.fullName || 'Seller'}!</Text>
        <Text style={styles.subtitle}>Seller Dashboard</Text>
        <Text style={styles.emailText}>{userData?.email}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#e67e22" style={{ marginTop: 20 }} />
        ) : (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.listings}</Text>
            <Text style={styles.statLabel}>Active Listings</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.orders}</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>—</Text>
            <Text style={styles.statLabel}>Revenue</Text>
          </View>
        </View>
        )}

        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.primaryActionCard} onPress={handleAddProduct}>
            <Text style={styles.actionIcon}>📦</Text>
            <Text style={styles.primaryActionTitle}>Add New Product</Text>
            <Text style={styles.actionDescription}>List a new product for sale</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={handleManageListings}>
            <Text style={styles.actionIcon}>📋</Text>
            <Text style={styles.actionTitle}>Manage Listings</Text>
            <Text style={styles.actionDescription}>Edit or remove your product listings</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={handleViewOrders}>
            <Text style={styles.actionIcon}>🛒</Text>
            <Text style={styles.actionTitle}>View Orders</Text>
            <Text style={styles.actionDescription}>Manage customer orders</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={handleViewAnalytics}>
            <Text style={styles.actionIcon}>📊</Text>
            <Text style={styles.actionTitle}>View Analytics</Text>
            <Text style={styles.actionDescription}>Track performance and insights</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.loginNavigateButton} onPress={onGoToLogin}>
          <Text style={styles.loginNavigateButtonText}>Go to Login Page</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#1a1a2e',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    marginBottom: 4,
  },
  emailText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3498db',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  actionsContainer: {
    marginBottom: 20,
  },
  primaryActionCard: {
    backgroundColor: '#3498db',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  primaryActionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
    flex: 1,
  },
  actionDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  bottomActions: {
    padding: 20,
    paddingBottom: 30,
  },
  loginNavigateButton: {
    backgroundColor: '#3498db',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  loginNavigateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  logoutButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});
