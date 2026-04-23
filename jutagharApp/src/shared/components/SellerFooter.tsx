import Feather from '@expo/vector-icons/Feather';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const FOOTER_BRAND_COLOR = '#ac3c00';

export type SellerTabName = 'seller-home' | 'seller-products' | 'seller-add-product' | 'seller-orders' | 'seller-account';

interface SellerFooterProps {
  activeTab: SellerTabName;
  onNavigate: (tab: SellerTabName) => void;
}

const TABS: { key: SellerTabName; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: 'seller-home', label: 'Home', icon: 'home' },
  { key: 'seller-products', label: 'Products', icon: 'package' },
  { key: 'seller-add-product', label: 'Add', icon: 'plus-circle' },
  { key: 'seller-orders', label: 'Orders', icon: 'shopping-bag' },
  { key: 'seller-account', label: 'Account', icon: 'user' },
];

export default function SellerFooter({ activeTab, onNavigate }: SellerFooterProps) {
  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;

        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => onNavigate(tab.key)}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <Feather
                name={tab.icon}
                size={22}
                style={[styles.icon, isActive && styles.iconActive]}
                color={FOOTER_BRAND_COLOR}
              />
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
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
    opacity: 0.45,
  },
  iconActive: {
    opacity: 1,
  },
  label: {
    fontSize: 11,
    color: FOOTER_BRAND_COLOR,
    fontWeight: '500',
    opacity: 0.65,
  },
  labelActive: {
    color: FOOTER_BRAND_COLOR,
    opacity: 1,
    fontWeight: '700',
  },
});
