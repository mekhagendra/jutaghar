import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getTotalItems, subscribeCart } from '../lib/cartStore';

export type TabName = 'home' | 'products' | 'cart' | 'wishlist' | 'profile';

interface FooterProps {
  activeTab: TabName;
  onNavigate: (tab: TabName) => void;
  isLoggedIn: boolean;
}

const TABS: { key: TabName; label: string; icon: string; guestLabel?: string }[] = [
  { key: 'home', label: 'Home', icon: '🏠' },
  { key: 'products', label: 'Products', icon: '🛍️' },
  { key: 'cart', label: 'Cart', icon: '🛒' },
  { key: 'wishlist', label: 'Wishlist', icon: '❤️' },
  { key: 'profile', label: 'Profile', icon: '👤', guestLabel: 'Login' },
];

export default function Footer({ activeTab, onNavigate, isLoggedIn }: FooterProps) {
  const [cartCount, setCartCount] = useState(getTotalItems());

  useEffect(() => {
    const unsubscribe = subscribeCart(() => {
      setCartCount(getTotalItems());
    });
    setCartCount(getTotalItems());
    return unsubscribe;
  }, []);

  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        const displayLabel =
          tab.key === 'profile' && !isLoggedIn
            ? tab.guestLabel || tab.label
            : tab.label;

        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => onNavigate(tab.key)}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <Text style={[styles.icon, isActive && styles.iconActive]}>
                {tab.icon}
              </Text>
              {tab.key === 'cart' && cartCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {cartCount > 99 ? '99+' : cartCount}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {displayLabel}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingBottom: 24,
    paddingTop: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 2,
  },
  icon: {
    fontSize: 22,
    opacity: 0.45,
  },
  iconActive: {
    opacity: 1,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -12,
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 11,
    color: '#95a5a6',
    fontWeight: '500',
  },
  labelActive: {
    color: '#3498db',
    fontWeight: '700',
  },
});
