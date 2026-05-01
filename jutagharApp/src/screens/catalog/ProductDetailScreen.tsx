import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import api, { API_BASE_URL } from '@/api';
import { addToCart } from '@/features/checkout';
import type { Product, ProductsResponse } from '@/types';
import { isInWishlist, subscribeWishlist, toggleWishlist } from '@/features/catalog';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTENT_WIDTH = Math.min(SCREEN_WIDTH, 720);
const HERO_HEIGHT = Math.min(Math.round(SCREEN_WIDTH * 1.05), 480);

// Brand-aligned design tokens — warm leather palette for a footwear store
const C = {
  bg: '#FBF8F4',
  surface: '#FFFFFF',
  ink: '#1A1410',
  inkSoft: '#5A4A3F',
  inkMuted: '#9A8A80',
  line: '#ECE4DA',
  lineSoft: '#F4EEE5',
  brand: '#7B3306',
  brandSoft: '#FBEFE2',
  brandInk: '#5A2604',
  accent: '#C8722A',
  success: '#2F7A4D',
  danger: '#C0392B',
  star: '#E0A106',
  overlayLight: 'rgba(255,255,255,0.92)',
};

interface ProductDetailScreenProps {
  product: Product;
  onBack: () => void;
  onViewCart?: () => void;
}

const getCategoryName = (category: Product['category']) => {
  if (typeof category === 'string') return category;
  return category?.name || '';
};

const normalizeText = (value?: string | null) => String(value || '').trim().toLowerCase();

export default function ProductDetailScreen({ product: initialProduct, onBack, onViewCart }: ProductDetailScreenProps) {
  const imageScrollRef = useRef<ScrollView>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;

  const [activeProductId, setActiveProductId] = useState(initialProduct._id);
  const [product, setProduct] = useState<Product>(initialProduct);
  const [isLoading, setIsLoading] = useState(true);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [isRelatedLoading, setIsRelatedLoading] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [wishlisted, setWishlisted] = useState(isInWishlist(initialProduct._id));
  const [showCartNotice, setShowCartNotice] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeWishlist(() => {
      setWishlisted(isInWishlist(activeProductId));
    });
    return unsubscribe;
  }, [activeProductId]);

  useEffect(() => {
    setWishlisted(isInWishlist(product._id));
  }, [product._id]);

  useEffect(() => {
    fetchProductDetails(activeProductId);
  }, [activeProductId]);

  useEffect(() => {
    if (showCartNotice) {
      Animated.spring(toastAnim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 80 }).start();
      const t = setTimeout(() => {
        Animated.timing(toastAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
          setShowCartNotice(false);
        });
      }, 2400);
      return () => clearTimeout(t);
    }
  }, [showCartNotice, toastAnim]);

  const fetchProductDetails = async (productId: string) => {
    try {
      const res = await api.get<Product>(`/api/products/${productId}`);
      setProduct(res.data);
    } catch {
      // Use the passed product data as fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchRelatedProducts = async () => {
      const gender = normalizeText(product.gender);
      const category = normalizeText(getCategoryName(product.category));

      if (!gender) {
        setRelatedProducts([]);
        return;
      }

      setIsRelatedLoading(true);

      try {
        const related: Product[] = [];
        const seen = new Set<string>([product._id]);

        const appendProducts = (items: Product[]) => {
          for (const item of items) {
            if (!item?._id || seen.has(item._id)) continue;
            seen.add(item._id);
            related.push(item);
            if (related.length >= 8) break;
          }
        };

        if (category) {
          const strictParams = new URLSearchParams({
            gender: product.gender || '',
            category: getCategoryName(product.category),
            sort: 'popular',
            limit: '24',
          });

          const strictRes = await api.get<ProductsResponse>(`/api/products?${strictParams.toString()}`);
          const strictProducts = (strictRes.data?.products || []).filter((item) => {
            return normalizeText(item.gender) === gender && normalizeText(getCategoryName(item.category)) === category;
          });
          appendProducts(strictProducts);
        }

        if (related.length < 8) {
          const fallbackParams = new URLSearchParams({
            gender: product.gender || '',
            sort: 'popular',
            limit: '30',
          });

          const fallbackRes = await api.get<ProductsResponse>(`/api/products?${fallbackParams.toString()}`);
          const fallbackProducts = (fallbackRes.data?.products || []).filter(
            (item) => normalizeText(item.gender) === gender
          );
          appendProducts(fallbackProducts);
        }

        setRelatedProducts(related.slice(0, 8));
      } catch {
        setRelatedProducts([]);
      } finally {
        setIsRelatedLoading(false);
      }
    };

    fetchRelatedProducts();
  }, [product._id, product.gender, product.category]);

  const getImageUrl = (path?: string) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  const getSelectedVariantData = () => {
    if (!product.variants) return null;
    return (
      product.variants.find(
        (v) => (!selectedColor || v.color === selectedColor) && (!selectedSize || v.size === selectedSize)
      ) || null
    );
  };

  const getAllImages = () => {
    const images: string[] = [];
    const variantImage = getSelectedVariantData()?.image;
    if (variantImage) images.push(variantImage);
    if (product.mainImage) images.push(product.mainImage);
    if (product.images) images.push(...product.images.filter((img) => img !== product.mainImage));
    return Array.from(new Set(images));
  };

  const getAvailableColors = () => {
    if (!product.variants) return [];
    return [...new Set(product.variants.filter((v) => v.color).map((v) => v.color!))];
  };

  const getColorOptions = () => {
    return getAvailableColors().map((color) => {
      const variantWithImage = product.variants?.find((v) => v.color === color && v.image);
      const fallback = product.variants?.find((v) => v.color === color);
      return { color, image: variantWithImage?.image || fallback?.image };
    });
  };

  const getAvailableSizes = () => {
    if (!product.variants) return [];
    let variants = product.variants;
    if (selectedColor) variants = variants.filter((v) => v.color === selectedColor);
    return [...new Set(variants.filter((v) => v.size).map((v) => v.size!))];
  };

  const getPrice = () => (product.onSale && product.salePrice ? product.salePrice : product.price);

  const getStock = () => {
    const variant = getSelectedVariantData();
    if (variant) return variant.quantity;
    return product.stock;
  };

  const discountPercent = useMemo(() => {
    if (product.onSale && product.compareAtPrice && product.compareAtPrice > getPrice()) {
      return Math.round(((product.compareAtPrice - getPrice()) / product.compareAtPrice) * 100);
    }
    return 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  const handleAddToCart = () => {
    const stock = getStock();
    if (stock < 10) {
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
    addToCart(
      product,
      quantity,
      variant
        ? { color: variant.color, size: variant.size, sku: product.sku, image: variant.image }
        : undefined
    );
    setShowCartNotice(true);
  };

  const images = getAllImages();
  const colorOptions = getColorOptions();
  const sizes = getAvailableSizes();
  const price = getPrice();
  const stock = getStock();
  const isInStock = stock >= 10;
  const categoryName = getCategoryName(product.category);
  const brandName = typeof product.brand === 'string' ? product.brand : product.brand?.name || '';

  const handleOpenRelatedProduct = (item: Product) => {
    setProduct(item);
    setActiveProductId(item._id);
    setSelectedColor(null);
    setSelectedSize(null);
    setQuantity(1);
    setCurrentImageIndex(0);
    imageScrollRef.current?.scrollTo({ x: 0, animated: false });
  };

  useEffect(() => {
    setCurrentImageIndex(0);
    imageScrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [selectedColor, selectedSize]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.brand} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image Carousel */}
        <View style={styles.heroSection}>
          <ScrollView
            ref={imageScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              setCurrentImageIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH));
            }}
          >
            {images.length > 0 ? (
              images.map((img, idx) => (
                <View key={idx} style={styles.heroImageFrame}>
                  <Image source={{ uri: getImageUrl(img) || undefined }} style={styles.heroImage} resizeMode="contain" />
                </View>
              ))
            ) : (
              <View style={[styles.heroImageFrame, styles.imagePlaceholder]}>
                <Text style={styles.placeholderText}>No Image Available</Text>
              </View>
            )}
          </ScrollView>

          {/* Floating badges over hero */}
          {(product.onSale || discountPercent > 0) && (
            <View style={styles.heroBadgeRow}>
              {discountPercent > 0 && (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountBadgeText}>−{discountPercent}%</Text>
                </View>
              )}
              {product.onSale && (
                <View style={styles.saleBadge}>
                  <Text style={styles.saleBadgeText}>SALE</Text>
                </View>
              )}
            </View>
          )}

          {/* Page indicator */}
          {images.length > 1 && (
            <View style={styles.pageIndicator}>
              <Text style={styles.pageIndicatorText}>
                {currentImageIndex + 1} / {images.length}
              </Text>
            </View>
          )}
        </View>

        {/* Body card overlapping hero */}
        <View style={styles.bodyCard}>
          {/* Drag handle accent */}
          <View style={styles.dragHandle} />

          {/* Title block */}
          <View style={styles.section}>
            {brandName ? <Text style={styles.brandLabel}>{brandName.toUpperCase()}</Text> : null}
            <Text style={styles.productName}>{product.name}</Text>

            {(categoryName || product.gender) && (
              <View style={styles.metaRow}>
                {categoryName ? <Text style={styles.metaTag}>{categoryName}</Text> : null}
                {product.gender ? <Text style={styles.metaTag}>{product.gender}</Text> : null}
              </View>
            )}

            {product.rating && product.rating.count > 0 && (
              <View style={styles.ratingRow}>
                <View style={styles.ratingBadge}>
                  <Text style={styles.ratingStar}>★</Text>
                  <Text style={styles.ratingValue}>{product.rating.average.toFixed(1)}</Text>
                </View>
                <Text style={styles.ratingCount}>{product.rating.count} reviews</Text>
              </View>
            )}
          </View>

          {/* Price block */}
          <View style={styles.priceBlock}>
            <View style={styles.priceRow}>
              <Text style={styles.priceCurrency}>Rs.</Text>
              <Text style={styles.priceValue}>{price.toLocaleString()}</Text>
              {product.onSale && product.compareAtPrice && (
                <Text style={styles.comparePrice}>Rs. {product.compareAtPrice.toLocaleString()}</Text>
              )}
            </View>
            <View style={[styles.stockPill, isInStock ? styles.stockPillIn : styles.stockPillOut]}>
              <View
                style={[
                  styles.stockDot,
                  { backgroundColor: isInStock ? C.success : C.danger },
                ]}
              />
              <Text
                style={[
                  styles.stockPillText,
                  { color: isInStock ? C.success : C.danger },
                ]}
              >
                {isInStock ? 'In Stock' : 'Out of Stock'}
              </Text>
            </View>
          </View>

          {/* Color Selection */}
          {colorOptions.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionLabel}>Color</Text>
                {selectedColor && <Text style={styles.sectionPicked}>{selectedColor}</Text>}
              </View>
              <View style={styles.colorGrid}>
                {colorOptions.map(({ color, image }) => {
                  const active = selectedColor === color;
                  return (
                    <Pressable
                      key={color}
                      onPress={() => {
                        setSelectedColor(color);
                        setSelectedSize(null);
                      }}
                      style={({ pressed }) => [
                        styles.colorTile,
                        active && styles.colorTileActive,
                        pressed && styles.colorTilePressed,
                      ]}
                    >
                      <View style={styles.colorTileImageWrap}>
                        {image ? (
                          <Image
                            source={{ uri: getImageUrl(image) || undefined }}
                            style={styles.colorTileImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.colorTilePlaceholder}>
                            <Text style={styles.colorTilePlaceholderText}>{color.charAt(0).toUpperCase()}</Text>
                          </View>
                        )}
                        {active && (
                          <View style={styles.colorTileCheck}>
                            <Text style={styles.colorTileCheckText}>✓</Text>
                          </View>
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Size Selection */}
          {sizes.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionLabel}>Size</Text>
                {selectedSize && <Text style={styles.sectionPicked}>{selectedSize}</Text>}
              </View>
              <View style={styles.sizeGrid}>
                {sizes.map((size) => {
                  const active = selectedSize === size;
                  return (
                    <Pressable
                      key={size}
                      onPress={() => setSelectedSize(size)}
                      style={({ pressed }) => [
                        styles.sizeChip,
                        active && styles.sizeChipActive,
                        pressed && !active && styles.sizeChipPressed,
                      ]}
                    >
                      <Text style={[styles.sizeChipText, active && styles.sizeChipTextActive]}>{size}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Quantity */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Quantity</Text>
            <View style={styles.qtyRow}>
              <View style={styles.qtyStepper}>
                <Pressable
                  onPress={() => setQuantity(Math.max(1, quantity - 1))}
                  style={({ pressed }) => [styles.qtyBtn, pressed && styles.qtyBtnPressed]}
                  disabled={quantity <= 1 || !isInStock}
                >
                  <Text style={[styles.qtyBtnText, quantity <= 1 && styles.qtyBtnTextDisabled]}>−</Text>
                </Pressable>
                <Text style={styles.qtyValue}>{quantity}</Text>
                <Pressable
                  onPress={() => setQuantity(Math.min(stock || 1, quantity + 1))}
                  style={({ pressed }) => [styles.qtyBtn, pressed && styles.qtyBtnPressed]}
                  disabled={quantity >= stock || !isInStock}
                >
                  <Text style={[styles.qtyBtnText, quantity >= stock && styles.qtyBtnTextDisabled]}>+</Text>
                </Pressable>
              </View>
              <Text style={styles.qtyHint}>Max {stock}</Text>
            </View>
          </View>

          {/* Description */}
          {!!product.description && (
            <View style={styles.sectionDivided}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.descriptionText}>{product.description}</Text>
            </View>
          )}

          {/* Specifications */}
          {product.specifications && Object.keys(product.specifications).length > 0 && (
            <View style={styles.sectionDivided}>
              <Text style={styles.sectionTitle}>Specifications</Text>
              <View style={styles.specsCard}>
                {Object.entries(product.specifications).map(([key, value], idx, arr) => (
                  <View
                    key={key}
                    style={[styles.specRow, idx === arr.length - 1 && { borderBottomWidth: 0 }]}
                  >
                    <Text style={styles.specKey}>{key}</Text>
                    <Text style={styles.specValue}>{String(value)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Vendor */}
          {product.vendor && (
            <View style={styles.sectionDivided}>
              <Text style={styles.sectionTitle}>Sold by</Text>
              <View style={styles.vendorCard}>
                <View style={styles.vendorAvatar}>
                  <Text style={styles.vendorAvatarText}>
                    {(product.vendor.businessName || product.vendor.fullName || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.vendorName}>
                    {product.vendor.businessName || product.vendor.fullName}
                  </Text>
                  <Text style={styles.vendorMeta}>Verified seller</Text>
                </View>
              </View>
            </View>
          )}

          {/* You may like */}
          <View style={styles.sectionDivided}>
            <Text style={styles.sectionTitle}>You may like</Text>

            {isRelatedLoading ? (
              <View style={styles.relatedLoadingWrap}>
                <ActivityIndicator size="small" color={C.brand} />
              </View>
            ) : relatedProducts.length === 0 ? (
              <Text style={styles.relatedEmptyText}>No related products found right now.</Text>
            ) : (
              <View style={styles.relatedGrid}>
                {relatedProducts.map((item) => {
                  const itemImage = getImageUrl(item.mainImage || item.images?.[0]);
                  const itemCategory = getCategoryName(item.category);
                  const itemPrice = item.onSale && item.salePrice ? item.salePrice : item.price;

                  return (
                    <Pressable
                      key={item._id}
                      onPress={() => handleOpenRelatedProduct(item)}
                      style={({ pressed }) => [styles.relatedCard, pressed && styles.relatedCardPressed]}
                    >
                      <View style={styles.relatedImageWrap}>
                        {itemImage ? (
                          <Image source={{ uri: itemImage }} style={styles.relatedImage} resizeMode="cover" />
                        ) : (
                          <View style={styles.relatedImagePlaceholder}>
                            <Text style={styles.relatedImagePlaceholderText}>No Image</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.relatedInfo}>
                        <Text style={styles.relatedName} numberOfLines={2}>{item.name}</Text>
                        <Text style={styles.relatedMeta} numberOfLines={1}>
                          {[itemCategory, item.gender].filter(Boolean).join(' · ')}
                        </Text>
                        <Text style={styles.relatedPrice}>Rs. {itemPrice.toLocaleString()}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          <View style={{ height: 24 }} />
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomBarInner}>
          <Pressable
            onPress={() => toggleWishlist(product)}
            style={({ pressed }) => [styles.wishlistBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.wishlistBtnIcon}>{wishlisted ? '♥' : '♡'}</Text>
          </Pressable>

          <View style={styles.bottomPriceCol}>
            <Text style={styles.bottomPriceLabel}>Total</Text>
            <Text style={styles.bottomPriceValue}>Rs. {(price * quantity).toLocaleString()}</Text>
          </View>

          <Pressable
            onPress={handleAddToCart}
            disabled={!isInStock}
            style={({ pressed }) => [
              styles.ctaBtn,
              !isInStock && styles.ctaBtnDisabled,
              pressed && isInStock && styles.ctaBtnPressed,
            ]}
          >
            <Text style={styles.ctaBtnText}>{isInStock ? 'Add to Cart' : 'Unavailable'}</Text>
          </Pressable>
        </View>
      </View>

      {/* Toast-style cart notice */}
      <Modal visible={showCartNotice} transparent animationType="none" onRequestClose={() => setShowCartNotice(false)}>
        <TouchableWithoutFeedback onPress={() => setShowCartNotice(false)}>
          <View style={styles.toastOverlay}>
            <TouchableWithoutFeedback>
              <Animated.View
                style={[
                  styles.toastCard,
                  {
                    opacity: toastAnim,
                    transform: [
                      {
                        translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }),
                      },
                    ],
                  },
                ]}
              >
                <View style={styles.toastIcon}>
                  <Text style={styles.toastIconText}>✓</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toastTitle}>Added to cart</Text>
                  <Text style={styles.toastMessage} numberOfLines={1}>
                    {product.name}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setShowCartNotice(false);
                    onViewCart?.();
                  }}
                  style={styles.toastAction}
                >
                  <Text style={styles.toastActionText}>View</Text>
                </TouchableOpacity>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const SAFE_TOP = Platform.OS === 'ios' ? 50 : 28;
const SAFE_BOTTOM = Platform.OS === 'ios' ? 28 : 16;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },

  // Header
  headerWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SAFE_TOP,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: C.ink,
    marginHorizontal: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.overlayLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.line,
  },
  iconBtnPressed: { backgroundColor: C.lineSoft, transform: [{ scale: 0.94 }] },
  iconBtnText: { fontSize: 20, color: C.ink, fontWeight: '600' },

  // Content
  content: { flex: 1 },
  contentContainer: { paddingBottom: 120 },

  // Hero
  heroSection: {
    height: HERO_HEIGHT,
    backgroundColor: C.lineSoft,
    position: 'relative',
  },
  heroImageFrame: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: { width: '100%', height: '100%' },
  imagePlaceholder: { backgroundColor: C.lineSoft },
  placeholderText: { color: C.inkMuted, fontSize: 15 },
  heroBadgeRow: {
    position: 'absolute',
    top: SAFE_TOP + 60,
    left: 16,
    flexDirection: 'row',
    gap: 8,
  },
  discountBadge: {
    backgroundColor: C.danger,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  discountBadgeText: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
  saleBadge: {
    backgroundColor: C.ink,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  saleBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  pageIndicator: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(26,20,16,0.7)',
  },
  pageIndicatorText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  // Body card
  bodyCard: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
    paddingTop: 8,
    paddingHorizontal: 20,
    width: '100%',
    maxWidth: CONTENT_WIDTH,
    alignSelf: 'center',
  },
  dragHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.line,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 12,
  },

  section: { marginTop: 16 },
  sectionDivided: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: C.lineSoft,
  },

  brandLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.brand,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  productName: {
    fontSize: 24,
    fontWeight: '800',
    color: C.ink,
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 6,
  },
  metaTag: {
    backgroundColor: C.lineSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 12,
    color: C.inkSoft,
    fontWeight: '500',
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#FFF6DD',
  },
  ratingStar: { color: C.star, fontSize: 13 },
  ratingValue: { color: C.ink, fontSize: 13, fontWeight: '700' },
  ratingCount: { fontSize: 13, color: C.inkMuted },

  // Price
  priceBlock: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  priceCurrency: { fontSize: 14, color: C.inkSoft, fontWeight: '600' },
  priceValue: { fontSize: 30, fontWeight: '800', color: C.brand, letterSpacing: -0.5 },
  comparePrice: {
    fontSize: 15,
    color: C.inkMuted,
    textDecorationLine: 'line-through',
    marginLeft: 6,
  },
  stockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  stockPillIn: { backgroundColor: '#EAF6EE', borderColor: '#CFE7D7' },
  stockPillLow: { backgroundColor: '#FFF1E0', borderColor: '#F5DBB7' },
  stockPillOut: { backgroundColor: '#FBECEA', borderColor: '#F1C9C4' },
  stockDot: { width: 6, height: 6, borderRadius: 3 },
  stockPillText: { fontSize: 12, fontWeight: '700' },

  // Section helpers
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: C.ink },
  sectionPicked: { fontSize: 13, color: C.inkSoft, fontWeight: '500' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.ink, marginBottom: 10 },

  // Color
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  colorTile: {
    width: 64,
    height: 64,
    borderRadius: 16,
    padding: 3,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: C.surface,
  },
  colorTileActive: { borderColor: C.brand },
  colorTilePressed: { transform: [{ scale: 0.95 }] },
  colorTileImageWrap: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: C.lineSoft,
    position: 'relative',
  },
  colorTileImage: { width: '100%', height: '100%' },
  colorTilePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.lineSoft,
  },
  colorTilePlaceholderText: { fontSize: 22, fontWeight: '800', color: C.inkSoft },
  colorTileCheck: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorTileCheckText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  // Size
  sizeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sizeChip: {
    minWidth: 56,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.line,
    backgroundColor: C.surface,
    alignItems: 'center',
  },
  sizeChipActive: {
    backgroundColor: C.ink,
    borderColor: C.ink,
  },
  sizeChipPressed: { backgroundColor: C.lineSoft },
  sizeChipText: { fontSize: 14, fontWeight: '600', color: C.ink },
  sizeChipTextActive: { color: '#fff' },

  // Qty
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  qtyStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.lineSoft,
    borderRadius: 14,
    padding: 4,
  },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnPressed: { backgroundColor: C.line },
  qtyBtnText: { fontSize: 20, fontWeight: '700', color: C.ink, lineHeight: 22 },
  qtyBtnTextDisabled: { color: C.inkMuted },
  qtyValue: {
    fontSize: 16,
    fontWeight: '700',
    color: C.ink,
    minWidth: 36,
    textAlign: 'center',
  },
  qtyHint: { fontSize: 12, color: C.inkMuted },

  // Description
  descriptionText: { fontSize: 14, color: C.inkSoft, lineHeight: 22 },

  // Specs
  specsCard: {
    backgroundColor: C.lineSoft,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  specRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  specKey: { flex: 1, fontSize: 13, color: C.inkSoft, fontWeight: '500' },
  specValue: { flex: 1.4, fontSize: 13, color: C.ink, fontWeight: '600', textAlign: 'right' },

  // Vendor
  vendorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: C.brandSoft,
    borderRadius: 14,
  },
  vendorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vendorAvatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  vendorName: { fontSize: 15, fontWeight: '700', color: C.ink },
  vendorMeta: { fontSize: 12, color: C.inkSoft, marginTop: 2 },

  // Related products
  relatedLoadingWrap: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  relatedEmptyText: {
    fontSize: 13,
    color: C.inkMuted,
  },
  relatedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  relatedCard: {
    width: '48%',
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    overflow: 'hidden',
    marginBottom: 12,
  },
  relatedCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  relatedImageWrap: {
    height: 120,
    backgroundColor: C.lineSoft,
  },
  relatedImage: {
    width: '100%',
    height: '100%',
  },
  relatedImagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  relatedImagePlaceholderText: {
    color: C.inkMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  relatedInfo: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 4,
  },
  relatedName: {
    fontSize: 13,
    color: C.ink,
    fontWeight: '700',
    lineHeight: 18,
  },
  relatedMeta: {
    fontSize: 11,
    color: C.inkMuted,
  },
  relatedPrice: {
    marginTop: 2,
    fontSize: 13,
    color: C.brand,
    fontWeight: '800',
  },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.line,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 12,
  },
  bottomBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    paddingBottom: SAFE_BOTTOM,
    width: '100%',
    maxWidth: CONTENT_WIDTH,
    alignSelf: 'center',
  },
  wishlistBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: C.lineSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wishlistBtnIcon: { fontSize: 22, color: C.brand },
  bottomPriceCol: { flex: 1 },
  bottomPriceLabel: { fontSize: 11, color: C.inkMuted, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  bottomPriceValue: { fontSize: 18, fontWeight: '800', color: C.ink, marginTop: 2 },
  ctaBtn: {
    backgroundColor: C.brand,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    minWidth: 140,
    alignItems: 'center',
  },
  ctaBtnPressed: { backgroundColor: C.brandInk, transform: [{ scale: 0.98 }] },
  ctaBtnDisabled: { backgroundColor: C.inkMuted },
  ctaBtnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },

  // Toast
  toastOverlay: {
    flex: 1,
    paddingTop: SAFE_TOP + 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  toastCard: {
    width: '100%',
    maxWidth: 460,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: C.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: C.line,
  },
  toastIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastIconText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  toastTitle: { fontSize: 14, fontWeight: '700', color: C.ink },
  toastMessage: { fontSize: 12, color: C.inkSoft, marginTop: 1 },
  toastAction: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: C.brand,
  },
  toastActionText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
