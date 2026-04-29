import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import api, { API_BASE_URL } from '@/api';
import { addToCart } from '@/features/checkout';
import type { Product } from '@/types';
import { isInWishlist, subscribeWishlist, toggleWishlist } from '@/features/catalog';

const { width } = Dimensions.get('window');

interface ProductDetailScreenProps {
  product: Product;
  onBack: () => void;
  onViewCart?: () => void;
}

export default function ProductDetailScreen({ product: initialProduct, onBack, onViewCart }: ProductDetailScreenProps) {
  const imageScrollRef = useRef<ScrollView>(null);
  const [product, setProduct] = useState<Product>(initialProduct);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [wishlisted, setWishlisted] = useState(isInWishlist(initialProduct._id));
  const [showCartNotice, setShowCartNotice] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeWishlist(() => {
      setWishlisted(isInWishlist(initialProduct._id));
    });
    return unsubscribe;
  }, [initialProduct._id]);

  useEffect(() => {
    fetchProductDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProductDetails = async () => {
    try {
      const res = await api.get<Product>(`/api/products/${initialProduct._id}`);
      setProduct(res.data);
    } catch {
      // Use the passed product data as fallback
    } finally {
      setIsLoading(false);
    }
  };

  const getImageUrl = (path?: string) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  const getAllImages = () => {
    const images: string[] = [];
    const variantImage = getSelectedVariantData()?.image;
    if (variantImage) images.push(variantImage);
    if (product.mainImage) images.push(product.mainImage);
    if (product.images) images.push(...product.images.filter(img => img !== product.mainImage));
    return Array.from(new Set(images));
  };

  const getAvailableColors = () => {
    if (!product.variants) return [];
    const colors = [...new Set(product.variants.filter(v => v.color).map(v => v.color!))];
    return colors;
  };

  const getColorOptions = () => {
    const colors = getAvailableColors();
    return colors.map((color) => {
      const variantWithImage = product.variants?.find((v) => v.color === color && v.image);
      const fallbackVariant = product.variants?.find((v) => v.color === color);

      return {
        color,
        image: variantWithImage?.image || fallbackVariant?.image,
      };
    });
  };

  const getAvailableSizes = () => {
    if (!product.variants) return [];
    let variants = product.variants;
    if (selectedColor) {
      variants = variants.filter(v => v.color === selectedColor);
    }
    const sizes = [...new Set(variants.filter(v => v.size).map(v => v.size!))];
    return sizes;
  };

  const getSelectedVariantData = () => {
    if (!product.variants) return null;
    return product.variants.find(v =>
      (!selectedColor || v.color === selectedColor) &&
      (!selectedSize || v.size === selectedSize)
    ) || null;
  };

  const getPrice = () => {
    if (product.onSale && product.salePrice) return product.salePrice;
    return product.price;
  };

  const getStock = () => {
    const variant = getSelectedVariantData();
    if (variant) return variant.quantity;
    return product.stock;
  };

  const handleAddToCart = () => {
    const stock = getStock();
    if (stock <= 0) {
      Alert.alert('Out of Stock', 'This product is currently unavailable.');
      return;
    }

    if (product.variants && product.variants.length > 0) {
      const needsColor = getAvailableColors().length > 0;
      const needsSize = getAvailableSizes().length > 0;
      if ((needsColor && !selectedColor) || (needsSize && !selectedSize)) {
        const missing: string[] = [];
        if (needsColor && !selectedColor) missing.push('color');
        if (needsSize && !selectedSize) missing.push('size');
        Alert.alert('Select Variant', `Please select ${missing.join(' and ')} before adding to cart.`);
        return;
      }
    }

    const variant = getSelectedVariantData();
    addToCart(product, quantity, variant ? {
      color: variant.color,
      size: variant.size,
      sku: product.sku,
      image: variant.image,
    } : undefined);

    setShowCartNotice(true);
  };

  const images = getAllImages();
  const colors = getAvailableColors();
  const colorOptions = getColorOptions();
  const sizes = getAvailableSizes();
  const price = getPrice();
  const stock = getStock();
  const categoryName = typeof product.category === 'string' ? product.category : product.category?.name || '';
  const brandName = typeof product.brand === 'string' ? product.brand : product.brand?.name || '';

  useEffect(() => {
    setCurrentImageIndex(0);
    imageScrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [selectedColor, selectedSize]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: '#7b3306' }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Product Details</Text>
        <TouchableOpacity onPress={() => toggleWishlist(product)} style={styles.wishlistButton}>
          <Text style={styles.wishlistIcon}>{wishlisted ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Product Images */}
        <View style={styles.imageSection}>
          <ScrollView
            ref={imageScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              setCurrentImageIndex(Math.round(e.nativeEvent.contentOffset.x / width));
            }}
          >
            {images.length > 0 ? images.map((img, idx) => (
              <Image
                key={idx}
                source={{ uri: getImageUrl(img) || undefined }}
                style={styles.productImage}
                resizeMode="contain"
              />
            )) : (
              <View style={[styles.productImage, styles.imagePlaceholder]}>
                <Text style={styles.placeholderText}>No Image Available</Text>
              </View>
            )}
          </ScrollView>
          {images.length > 1 && (
            <View style={styles.imageDots}>
              {images.map((_, idx) => (
                <View key={idx} style={[styles.dot, idx === currentImageIndex && styles.dotActive]} />
              ))}
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.infoSection}>
          <Text style={styles.productName}>{product.name}</Text>
          
          <View style={styles.metaRow}>
            {categoryName ? <Text style={styles.metaTag}>{categoryName}</Text> : null}
            {brandName ? <Text style={styles.metaTag}>{brandName}</Text> : null}
            {product.gender ? <Text style={styles.metaTag}>{product.gender}</Text> : null}
          </View>

          {/* Rating */}
          {product.rating && product.rating.count > 0 && (
            <View style={styles.ratingRow}>
              <Text style={styles.ratingStars}>
                {'★'.repeat(Math.round(product.rating.average))}{'☆'.repeat(5 - Math.round(product.rating.average))}
              </Text>
              <Text style={styles.ratingCount}> ({product.rating.count} reviews)</Text>
            </View>
          )}

          {/* Price */}
          <View style={styles.priceSection}>
            <Text style={styles.price}>Rs. {price.toLocaleString()}</Text>
            {product.onSale && product.compareAtPrice && (
              <Text style={styles.comparePrice}>Rs. {product.compareAtPrice.toLocaleString()}</Text>
            )}
            {product.onSale && <Text style={styles.saleLabel}>SALE</Text>}
          </View>

          {/* Stock */}
          <Text style={[styles.stockText, stock <= 0 && styles.outOfStockText]}>
            {stock > 0 ? `${stock} in stock` : 'Out of Stock'}
          </Text>

          {/* Color Selection */}
          {colors.length > 0 && (
            <View style={styles.variantSection}>
              <Text style={styles.variantLabel}>Color</Text>
              <View style={styles.colorSwatchGrid}>
                {colorOptions.map(({ color, image }) => (
                  <TouchableOpacity
                    key={color}
                    style={[styles.colorSwatchCard, selectedColor === color && styles.colorSwatchCardActive]}
                    onPress={() => {
                      setSelectedColor(color);
                      setSelectedSize(null); // Reset size when color changes
                    }}
                    activeOpacity={0.9}
                  >
                    <View style={styles.colorSwatchImageFrame}>
                      {image ? (
                        <Image
                          source={{ uri: getImageUrl(image) || undefined }}
                          style={styles.colorSwatchImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.colorSwatchPlaceholder}>
                          <Text style={styles.colorSwatchPlaceholderText}>{color.charAt(0).toUpperCase()}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.colorSwatchText, selectedColor === color && styles.colorSwatchTextActive]} numberOfLines={1}>
                      {color}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Size Selection */}
          {sizes.length > 0 && (
            <View style={styles.variantSection}>
              <Text style={styles.variantLabel}>Size</Text>
              <View style={styles.variantOptions}>
                {sizes.map((size) => (
                  <TouchableOpacity
                    key={size}
                    style={[styles.variantChip, selectedSize === size && styles.variantChipActive]}
                    onPress={() => setSelectedSize(size)}
                  >
                    <Text style={[styles.variantChipText, selectedSize === size && styles.variantChipTextActive]}>
                      {size}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Quantity */}
          <View style={styles.quantitySection}>
            <Text style={styles.variantLabel}>Quantity</Text>
            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={styles.qtyButton}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Text style={styles.qtyButtonText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qtyValue}>{quantity}</Text>
              <TouchableOpacity
                style={styles.qtyButton}
                onPress={() => setQuantity(Math.min(stock, quantity + 1))}
              >
                <Text style={styles.qtyButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Description */}
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{product.description}</Text>
          </View>

          {/* Specifications */}
          {product.specifications && Object.keys(product.specifications).length > 0 && (
            <View style={styles.specsSection}>
              <Text style={styles.sectionTitle}>Specifications</Text>
              {Object.entries(product.specifications).map(([key, value]) => (
                <View key={key} style={styles.specRow}>
                  <Text style={styles.specKey}>{key}</Text>
                  <Text style={styles.specValue}>{value}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Vendor */}
          {product.vendor && (
            <View style={styles.vendorSection}>
              <Text style={styles.sectionTitle}>Sold by</Text>
              <Text style={styles.vendorName}>{product.vendor.businessName || product.vendor.fullName}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomPrice}>
          <Text style={styles.bottomPriceLabel}>Total</Text>
          <Text style={styles.bottomPriceValue}>Rs. {(price * quantity).toLocaleString()}</Text>
        </View>
        <TouchableOpacity
          style={[styles.addToCartButton, stock <= 0 && styles.disabledButton]}
          onPress={handleAddToCart}
          disabled={stock <= 0}
        >
          <Text style={styles.addToCartText}>
            {stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showCartNotice}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCartNotice(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowCartNotice(false)}>
          <View style={styles.cartNoticeOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.cartNoticeCard}>
                <Text style={styles.cartNoticeTitle}>Added to Cart</Text>
                <Text style={styles.cartNoticeMessage} numberOfLines={2}>
                  {product.name} added to your cart.
                </Text>
                <View style={styles.cartNoticeActions}>
                  <TouchableOpacity
                    style={styles.cartNoticeSecondaryBtn}
                    onPress={() => setShowCartNotice(false)}
                  >
                    <Text style={styles.cartNoticeSecondaryText}>Continue</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cartNoticePrimaryBtn}
                    onPress={() => {
                      setShowCartNotice(false);
                      onViewCart?.();
                    }}
                  >
                    <Text style={styles.cartNoticePrimaryText}>View Cart</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 60,
  },
  backText: {
    color: '#fff',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  imageSection: {
    backgroundColor: '#f8f9fa',
  },
  productImage: {
    width,
    height: 320,
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ecf0f1',
  },
  placeholderText: {
    color: '#bbb',
    fontSize: 16,
  },
  imageDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#bdc3c7',
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: '#3498db',
    width: 20,
  },
  infoSection: {
    padding: 16,
  },
  productName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
    gap: 8,
  },
  metaTag: {
    backgroundColor: '#ecf0f1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 13,
    color: '#555',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingStars: {
    fontSize: 18,
    color: '#f39c12',
  },
  ratingCount: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  price: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  comparePrice: {
    fontSize: 18,
    color: '#95a5a6',
    textDecorationLine: 'line-through',
  },
  saleLabel: {
    backgroundColor: '#e74c3c',
    color: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 'bold',
  },
  stockText: {
    fontSize: 14,
    color: '#27ae60',
    marginBottom: 16,
  },
  outOfStockText: {
    color: '#e74c3c',
  },
  variantSection: {
    marginBottom: 16,
  },
  variantLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  variantOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorSwatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorSwatchCard: {
    width: 96,
    padding: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dfe4ea',
    backgroundColor: '#fff',
  },
  colorSwatchCardActive: {
    borderColor: '#3498db',
    backgroundColor: '#eef7ff',
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  colorSwatchImageFrame: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#edf1f4',
    marginBottom: 6,
  },
  colorSwatchImage: {
    width: '100%',
    height: '100%',
  },
  colorSwatchPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8edf2',
  },
  colorSwatchPlaceholderText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#7f8c8d',
  },
  colorSwatchText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2c3e50',
    textAlign: 'center',
  },
  colorSwatchTextActive: {
    color: '#1d6fa5',
  },
  variantChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  variantChipImage: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#ecf0f1',
  },
  variantChipActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  variantChipText: {
    fontSize: 14,
    color: '#333',
  },
  variantChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  quantitySection: {
    marginBottom: 16,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  qtyButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#ecf0f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  qtyValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    minWidth: 30,
    textAlign: 'center',
  },
  descriptionSection: {
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
  },
  specsSection: {
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  specRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  specKey: {
    flex: 1,
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  specValue: {
    flex: 1,
    fontSize: 14,
    color: '#2c3e50',
  },
  vendorSection: {
    marginBottom: 80,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  vendorName: {
    fontSize: 15,
    color: '#3498db',
    fontWeight: '500',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 30,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  bottomPrice: {
    flex: 1,
  },
  bottomPriceLabel: {
    fontSize: 12,
    color: '#95a5a6',
  },
  bottomPriceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  addToCartButton: {
    backgroundColor: '#3498db',
    borderRadius: 10,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  disabledButton: {
    backgroundColor: '#bdc3c7',
  },
  addToCartText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  wishlistButton: {
    width: 60,
    alignItems: 'flex-end',
  },
  wishlistIcon: {
    fontSize: 22,
  },
  cartNoticeOverlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 88,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  cartNoticeCard: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e7edf3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  cartNoticeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2937',
  },
  cartNoticeMessage: {
    marginTop: 4,
    fontSize: 13,
    color: '#4b5563',
  },
  cartNoticeActions: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  cartNoticeSecondaryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  cartNoticeSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  cartNoticePrimaryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#3498db',
  },
  cartNoticePrimaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
});
