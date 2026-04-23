import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '@/api';
import type { Brand, Category } from '@/types';

interface SellerAddProductScreenProps {
  onDone: () => void;
}

export default function SellerAddProductScreen({ onDone }: SellerAddProductScreenProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('1');
  const [gender, setGender] = useState('Unisex');
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [mainImageUri, setMainImageUri] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const [catsRes, brandsRes] = await Promise.all([
          api.get<Category[]>('/api/catalog/categories?status=active'),
          api.get<Brand[]>('/api/catalog/brands?status=active').catch(() => ({ data: [] as Brand[] })),
        ]);
        const cats = Array.isArray(catsRes.data) ? catsRes.data : [];
        const b = Array.isArray(brandsRes.data) ? brandsRes.data : [];
        setCategories(cats);
        setBrands(b);
        if (cats[0]?._id) setCategoryId(cats[0]._id);
      } catch {
        // ignore fetch errors for optional metadata
      }
    };
    init();
  }, []);

  const handleSubmit = async () => {
    if (!name.trim() || !description.trim() || !price.trim() || !categoryId) {
      Alert.alert('Missing Fields', 'Name, description, price and category are required.');
      return;
    }

    const parsedPrice = Number(price);
    const parsedStock = Number(stock || '0');
    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      Alert.alert('Invalid Price', 'Enter a valid price greater than 0.');
      return;
    }

    if (Number.isNaN(parsedStock) || parsedStock < 0) {
      Alert.alert('Invalid Stock', 'Stock cannot be negative.');
      return;
    }

    setIsSubmitting(true);

    try {
      const uploadedImageUrls = mainImageUri ? await api.uploadProductImages([mainImageUri]) : [];
      await api.post('/api/products', {
        name: name.trim(),
        description: description.trim(),
        price: parsedPrice,
        stock: parsedStock,
        category: categoryId,
        brand: brandId || undefined,
        gender,
        mainImage: uploadedImageUrls[0] || undefined,
        images: uploadedImageUrls,
        status: 'active',
      });

      Alert.alert('Success', 'Product added successfully.', [
        {
          text: 'OK',
          onPress: onDone,
        },
      ]);
    } catch (error: any) {
      Alert.alert('Failed', error.message || 'Failed to add product.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const pickMainImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photos to upload product images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.85,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setMainImageUri(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Add Product</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Product Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Nike Air Max" />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            multiline
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your product"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Main Image (Optional)</Text>
          {mainImageUri ? <Image source={{ uri: mainImageUri }} style={styles.previewImage} /> : null}
          <TouchableOpacity style={styles.pickImageButton} onPress={pickMainImage}>
            <Text style={styles.pickImageText}>{mainImageUri ? 'Change Image' : 'Pick Image'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <View style={[styles.fieldGroup, styles.halfField]}>
            <Text style={styles.label}>Price</Text>
            <TextInput style={styles.input} keyboardType="decimal-pad" value={price} onChangeText={setPrice} placeholder="0" />
          </View>
          <View style={[styles.fieldGroup, styles.halfField]}>
            <Text style={styles.label}>Stock</Text>
            <TextInput style={styles.input} keyboardType="number-pad" value={stock} onChangeText={setStock} placeholder="1" />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorRow}>
            {categories.map((c) => (
              <TouchableOpacity
                key={c._id}
                style={[styles.selectorChip, categoryId === c._id && styles.selectorChipActive]}
                onPress={() => setCategoryId(c._id)}
              >
                <Text style={[styles.selectorText, categoryId === c._id && styles.selectorTextActive]}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {brands.length > 0 && (
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Brand (Optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorRow}>
              <TouchableOpacity
                style={[styles.selectorChip, brandId === '' && styles.selectorChipActive]}
                onPress={() => setBrandId('')}
              >
                <Text style={[styles.selectorText, brandId === '' && styles.selectorTextActive]}>None</Text>
              </TouchableOpacity>
              {brands.map((b) => (
                <TouchableOpacity
                  key={b._id}
                  style={[styles.selectorChip, brandId === b._id && styles.selectorChipActive]}
                  onPress={() => setBrandId(b._id)}
                >
                  <Text style={[styles.selectorText, brandId === b._id && styles.selectorTextActive]}>{b.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Gender</Text>
          <View style={styles.selectorRow}>
            {['Men', 'Women', 'Kids', 'Unisex'].map((g) => (
              <TouchableOpacity key={g} style={[styles.selectorChip, gender === g && styles.selectorChipActive]} onPress={() => setGender(g)}>
                <Text style={[styles.selectorText, gender === g && styles.selectorTextActive]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Create Product</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    backgroundColor: '#1a1a2e',
    paddingTop: 50,
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  content: { flex: 1 },
  contentContainer: { padding: 14, paddingBottom: 120 },
  fieldGroup: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#333',
    backgroundColor: '#fff',
  },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 10 },
  halfField: { flex: 1 },
  selectorRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  selectorChip: {
    borderWidth: 1,
    borderColor: '#d9dee5',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  selectorChipActive: { borderColor: '#3498db', backgroundColor: '#eef7ff' },
  selectorText: { fontSize: 12, color: '#4b5563', fontWeight: '600' },
  selectorTextActive: { color: '#3498db' },
  submitButton: {
    backgroundColor: '#3498db',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  pickImageButton: {
    borderWidth: 1,
    borderColor: '#d9dee5',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  pickImageText: {
    color: '#1f2937',
    fontSize: 14,
    fontWeight: '600',
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
    marginBottom: 8,
  },
  submitButtonDisabled: { opacity: 0.65 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
