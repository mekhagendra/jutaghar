import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface NavbarSubmenuItem {
  label: string;
  onPress: () => void;
}

export interface NavbarItem {
  key: string;
  label: string;
  icon: string;
  onPress: () => void;
  submenu?: NavbarSubmenuItem[];
}

interface NavbarProps {
  items: NavbarItem[];
}

export default function Navbar({ items }: NavbarProps) {
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);

  const handleItemPress = (item: NavbarItem) => {
    if (item.submenu && item.submenu.length > 0) {
      setOpenSubmenu(item.key);
    } else {
      item.onPress();
    }
  };

  const closeSubmenu = () => setOpenSubmenu(null);

  const activeItem = items.find((i) => i.key === openSubmenu);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {items.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.item,
              item.key === 'sale' && styles.saleItem,
            ]}
            onPress={() => handleItemPress(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.icon}>{item.icon}</Text>
            <Text style={[styles.label, item.key === 'sale' && styles.saleLabel]}>
              {item.label}
            </Text>
            {item.submenu && item.submenu.length > 0 && (
              <Text style={styles.chevron}>▾</Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Submenu Modal */}
      <Modal
        visible={!!openSubmenu && !!activeItem}
        transparent
        animationType="fade"
        onRequestClose={closeSubmenu}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={closeSubmenu}
        >
          <View style={styles.submenuContainer}>
            <Text style={styles.submenuTitle}>{activeItem?.label}</Text>
            <View style={styles.submenuDivider} />
            <ScrollView style={styles.submenuScroll}>
              {activeItem?.submenu?.map((sub, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.submenuItem}
                  onPress={() => {
                    closeSubmenu();
                    sub.onPress();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.submenuLabel}>{sub.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 6,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  saleItem: {
    backgroundColor: '#fef2f2',
  },
  icon: {
    fontSize: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  saleLabel: {
    color: '#dc2626',
    fontWeight: '700',
  },
  chevron: {
    fontSize: 12,
    color: '#999',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submenuContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '80%',
    maxHeight: '60%',
    paddingVertical: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  submenuTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  submenuDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  submenuScroll: {
    paddingTop: 4,
  },
  submenuItem: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  submenuLabel: {
    fontSize: 14,
    color: '#444',
    fontWeight: '500',
  },
});
