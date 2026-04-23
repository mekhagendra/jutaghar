import React, { useState } from 'react';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { triggerHomeNavigation } from '@/shared/navigation/homeNavigation';

interface HeaderProps {
  onSearch?: (query: string) => void;
  onLogoPress?: () => void;
}

export default function Header({ onSearch, onLogoPress }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const submitSearch = () => {
    onSearch?.(searchQuery.trim());
  };

  const clearSearch = () => {
    setSearchQuery('');
    onSearch?.('');
  };

  const handleLogoPress = () => {
    if (onLogoPress) {
      onLogoPress();
      return;
    }
    triggerHomeNavigation();
  };

  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.logoContainer} onPress={handleLogoPress} activeOpacity={0.8}>
        <Image
          source={require('../../../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </TouchableOpacity>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchBar}
          placeholder="Search products, brands and more..."
          placeholderTextColor="#5d2700"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={submitSearch}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
            <Text style={styles.clearText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 40,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  logo: {
    width: 60,
    height: 40,
  },
  logoText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 6,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#ac3c00',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  
  },
  searchBar: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 16,
    color: '#5d2700',
  },
  clearButton: {
    padding: 4,
    marginLeft: 4,
  },
  clearText: {
    color: '#e25e00',
    fontSize: 16,
  },
});
