import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { ShoppingCart, Star, AlertCircle, Trash2 } from 'lucide-react';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';
import type { Product, ProductVariant } from '@/types';

const getCategoryName = (category?: Product['category']) => {
  if (typeof category === 'string') return category;
  return category?.name || '';
};

const normalizeText = (value?: string | null) => String(value || '').trim().toLowerCase();

const ProductDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCartStore();
  const { isAuthenticated, user } = useAuthStore();
  const queryClient = useQueryClient();
  
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');
  const [activeImage, setActiveImage] = useState<string>('');

  // Review form state
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewComment, setReviewComment] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const response = await api.get(`/api/products/${id}`);
      return response.data.data;
    },
  });

  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ['reviews', id],
    queryFn: async () => {
      const response = await api.get(`/api/reviews/product/${id}?limit=20`);
      return response.data.data;
    },
    enabled: !!id,
  });

  const { data: canReviewData } = useQuery({
    queryKey: ['can-review', id],
    queryFn: async () => {
      const response = await api.get(`/api/reviews/product/${id}/can-review`);
      return response.data.data;
    },
    enabled: !!id && isAuthenticated,
  });

  const product = data;

  const { data: relatedProducts = [], isLoading: relatedLoading } = useQuery({
    queryKey: ['related-products', product?._id, product?.gender, getCategoryName(product?.category)],
    enabled: !!product?._id && !!product?.gender,
    queryFn: async () => {
      const gender = normalizeText(product?.gender);
      const category = normalizeText(getCategoryName(product?.category));

      if (!gender) return [] as Product[];

      const related: Product[] = [];
      const seen = new Set<string>([product._id]);

      const append = (items: Product[]) => {
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
        const strictRes = await api.get(`/api/products?${strictParams.toString()}`);
        const strictItems = (strictRes.data?.data?.products || []).filter((item: Product) => (
          normalizeText(item.gender) === gender && normalizeText(getCategoryName(item.category)) === category
        ));
        append(strictItems);
      }

      if (related.length < 8) {
        const fallbackParams = new URLSearchParams({
          gender: product.gender || '',
          sort: 'popular',
          limit: '30',
        });
        const fallbackRes = await api.get(`/api/products?${fallbackParams.toString()}`);
        const fallbackItems = (fallbackRes.data?.data?.products || []).filter(
          (item: Product) => normalizeText(item.gender) === gender
        );
        append(fallbackItems);
      }

      return related.slice(0, 8);
    },
  });

  const submitReviewMutation = useMutation({
    mutationFn: async (payload: { productId: string; rating: number; comment: string }) => {
      const response = await api.post('/api/reviews', payload);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Review submitted!');
      setReviewRating(0);
      setReviewComment('');
      queryClient.invalidateQueries({ queryKey: ['reviews', id] });
      queryClient.invalidateQueries({ queryKey: ['can-review', id] });
      queryClient.invalidateQueries({ queryKey: ['product', id] });
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || 'Failed to submit review');
    },
  });

  const deleteReviewMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      await api.delete(`/api/reviews/${reviewId}`);
    },
    onSuccess: () => {
      toast.success('Review deleted');
      queryClient.invalidateQueries({ queryKey: ['reviews', id] });
      queryClient.invalidateQueries({ queryKey: ['can-review', id] });
      queryClient.invalidateQueries({ queryKey: ['product', id] });
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || 'Failed to delete review');
    },
  });

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (reviewRating === 0) { toast.error('Please select a rating'); return; }
    submitReviewMutation.mutate({ productId: id!, rating: reviewRating, comment: reviewComment });
  };

  // Extract unique colors and sizes from variants
  const availableColors = useMemo(() => {
    if (!product?.variants || product.variants.length === 0) return [];
    return [...new Set(product.variants.map((v: ProductVariant) => v.color).filter(Boolean))] as string[];
  }, [product]);

  const colorOptions = useMemo(() => {
    if (!product?.variants || product.variants.length === 0) return [];

    return availableColors.map((color) => {
      const variantWithImage = product.variants.find(
        (v: ProductVariant) => v.color === color && v.image
      );
      const fallbackVariant = product.variants.find((v: ProductVariant) => v.color === color);

      return {
        color,
        image: variantWithImage?.image || fallbackVariant?.image || '',
      };
    });
  }, [availableColors, product]);

  const availableSizes = useMemo(() => {
    if (!product?.variants || product.variants.length === 0) return [];
    const sizes = [...new Set(
      product.variants
        .filter((v: ProductVariant) => !selectedColor || v.color === selectedColor)
        .map((v: ProductVariant) => v.size)
        .filter(Boolean)
    )];
    return sizes as string[];
  }, [product, selectedColor]);

  // Find selected variant
  const selectedVariant = useMemo(() => {
    if (!product?.variants || product.variants.length === 0) return null;
    return product.variants.find(
      (v: ProductVariant) =>
        (!selectedColor || v.color === selectedColor) &&
        (!selectedSize || v.size === selectedSize)
    );
  }, [product, selectedColor, selectedSize]);

  // Get available stock for selected variant
  const availableStock = useMemo(() => {
    if (selectedVariant) {
      return selectedVariant.quantity;
    }
    return product?.stock || 0;
  }, [selectedVariant, product]);

  const isInStock = availableStock >= 10;

  const galleryImages = useMemo(() => {
    if (!product) return [];

    const images = [selectedVariant?.image, product.mainImage, ...(product.images || [])].filter(Boolean) as string[];
    return Array.from(new Set(images));
  }, [product, selectedVariant]);

  useEffect(() => {
    if (selectedVariant?.image) {
      setActiveImage(selectedVariant.image);
      return;
    }

    setActiveImage('');
  }, [selectedVariant?.image]);

  const handleAddToCart = () => {
    setError('');

    if (!isInStock) {
      setError('Out of stock');
      return;
    }
    
    // Check if product has variants
    const hasVariants = product?.variants && product.variants.length > 0;
    
    if (hasVariants) {
      if (availableColors.length > 0 && !selectedColor) {
        setError('Please select a color');
        return;
      }
      if (availableSizes.length > 0 && !selectedSize) {
        setError('Please select a size');
        return;
      }
      if (!selectedVariant) {
        setError('Selected variant is not available');
        return;
      }
      if (selectedVariant.quantity < quantity) {
        setError(`Only ${selectedVariant.quantity} items available`);
        return;
      }
    } else {
      if (product.stock < quantity) {
        setError(`Only ${product.stock} items available`);
        return;
      }
    }

    addItem(product, quantity, selectedVariant || undefined);
    navigate('/cart');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">Loading product...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">Product not found</div>
      </div>
    );
  }

  const basePrice = product.price;
  const displayPrice = product.onSale && product.salePrice ? product.salePrice : product.price;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Images */}
        <div>
          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4">
            {(() => {
              const displayImage = activeImage || galleryImages[0];
              return displayImage ? (
                <img
                  src={displayImage}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No Image
                </div>
              );
            })()}
          </div>
          {/* Thumbnail gallery */}
          {(() => {
            if (galleryImages.length <= 1) return null;
            return (
              <div className="grid grid-cols-5 gap-2">
                {galleryImages.map((img: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(img)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition ${
                      (activeImage || galleryImages[0]) === img
                        ? 'border-primary-600'
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <img src={img} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Details */}
        <div>
          <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center">
              <Star className="w-5 h-5 text-yellow-400 fill-current" />
              <span className="ml-1 text-sm">
                {product.rating.average.toFixed(1)} ({product.rating.count} reviews)
              </span>
            </div>
            <span className="text-sm text-gray-600">{product.sales} sold</span>
          </div>

          <div className="mb-6">
            <div className="flex items-baseline gap-4">
              {product.onSale && product.salePrice ? (
                <>
                  <span className="text-4xl font-bold text-red-600">
                    {formatCurrency(product.salePrice)}
                  </span>
                  <span className="text-xl text-gray-500 line-through">
                    {formatCurrency(basePrice)}
                  </span>
                  <span className="text-sm font-semibold text-white bg-red-500 px-2 py-0.5 rounded">
                    {Math.round(((basePrice - product.salePrice) / basePrice) * 100)}% OFF
                  </span>
                </>
              ) : (
                <>
                  <span className="text-4xl font-bold text-primary-600">
                    {formatCurrency(displayPrice)}
                  </span>
                  {product.compareAtPrice && (
                    <span className="text-xl text-gray-500 line-through">
                      {formatCurrency(product.compareAtPrice)}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="mb-6">
            <span className={`badge ${isInStock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {isInStock ? 'In Stock' : 'Out of Stock'}
            </span>
          </div>

          {/* Variant Selection */}
          {product.variants && product.variants.length > 0 && (
            <div className="mb-6 space-y-4">
              {availableColors.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color {selectedColor && <span className="text-gray-500">- {selectedColor}</span>}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {colorOptions.map(({ color, image }) => (
                      <button
                        key={color}
                        onClick={() => {
                          setSelectedColor(color);
                          setSelectedSize('');
                        }}
                        className={`flex items-center gap-3 px-3 py-2 border-2 rounded-lg transition ${
                          selectedColor === color
                            ? 'border-primary-600 bg-primary-50 text-primary-700'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {image ? (
                          <img
                            src={image}
                            alt={`${color} variant`}
                            className="w-10 h-10 rounded-md object-cover border border-gray-200"
                          />
                        ) : null}
                        <span>{color}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {availableSizes.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Size {selectedSize && <span className="text-gray-500">- {selectedSize}</span>}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableSizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`px-4 py-2 border-2 rounded-lg transition ${
                          selectedSize === size
                            ? 'border-primary-600 bg-primary-50 text-primary-700'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quantity Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="btn btn-secondary px-3 py-2"
                disabled={quantity <= 1 || !isInStock}
              >
                -
              </button>
              <input
                type="number"
                min="1"
                max={Math.max(1, availableStock)}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(availableStock, parseInt(e.target.value) || 1)))}
                className="input w-20 text-center"
                disabled={!isInStock}
              />
              <button
                onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}
                className="btn btn-secondary px-3 py-2"
                disabled={quantity >= availableStock || !isInStock}
              >
                +
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <span className="text-red-600 text-sm">{error}</span>
            </div>
          )}

          <div className="mb-6">
            <h3 className="font-semibold mb-2">Sold by</h3>
            <p className="text-gray-700">{product.vendor.businessName || product.vendor.fullName}</p>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{product.description}</p>
          </div>

          {product.specifications && Object.keys(product.specifications).length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-2">Specifications</h3>
              <div className="space-y-2">
                {Object.entries(product.specifications).map(([key, value]) => (
                  <div key={key} className="flex">
                    <span className="font-medium w-1/3">{key}:</span>
                    <span className="text-gray-700">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={handleAddToCart}
              disabled={!isInStock}
              className="btn btn-primary flex-1 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              Add to Cart
            </button>
          </div>
        </div>
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6">You may like</h2>

        {relatedLoading ? (
          <div className="text-gray-500 py-4">Loading related products...</div>
        ) : relatedProducts.length === 0 ? (
          <div className="text-gray-500 py-6 border border-dashed rounded-lg text-center">
            No related products found right now.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {relatedProducts.map((item: Product) => {
              const itemPrice = item.onSale && item.salePrice ? item.salePrice : item.price;
              const itemCategory = getCategoryName(item.category);
              return (
                <button
                  key={item._id}
                  type="button"
                  onClick={() => navigate(`/products/${item._id}`)}
                  className="text-left bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition"
                >
                  <div className="aspect-square bg-gray-100">
                    {item.mainImage || item.images?.[0] ? (
                      <img
                        src={item.mainImage || item.images?.[0]}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No Image</div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold text-gray-900 line-clamp-2">{item.name}</p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                      {[itemCategory, item.gender].filter(Boolean).join(' • ')}
                    </p>
                    <p className="text-sm font-bold text-primary-700 mt-2">{formatCurrency(itemPrice)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Reviews Section ─── */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6">
          Customer Reviews
          <span className="ml-3 text-base font-normal text-gray-500">
            ({product.rating?.count || 0} reviews)
          </span>
        </h2>

        {/* Average rating bar */}
        {(product.rating?.count || 0) > 0 && (
          <div className="flex items-center gap-3 mb-8 p-4 bg-gray-50 rounded-lg w-fit">
            <span className="text-5xl font-bold">{(product.rating?.average || 0).toFixed(1)}</span>
            <div>
              <div className="flex">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={`w-5 h-5 ${s <= Math.round(product.rating?.average || 0) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-1">{product.rating?.count} reviews</p>
            </div>
          </div>
        )}

        {/* Write a review form */}
        {isAuthenticated && canReviewData?.canReview && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold mb-4">Write a Review</h3>
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Rating *</label>
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      onMouseEnter={() => setReviewHover(star)}
                      onMouseLeave={() => setReviewHover(0)}
                      className="focus:outline-none"
                    >
                      <Star className={`w-8 h-8 transition-colors ${star <= (reviewHover || reviewRating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comment (optional)</label>
                <textarea
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="Share your experience with this product..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{reviewComment.length}/1000</p>
              </div>
              <button
                type="submit"
                disabled={submitReviewMutation.isPending || reviewRating === 0}
                className="btn btn-primary disabled:opacity-50"
              >
                {submitReviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>
          </div>
        )}

        {isAuthenticated && canReviewData && !canReviewData.canReview && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            {canReviewData.reason === 'already_reviewed'
              ? 'You have already reviewed this product.'
              : 'Only customers who have purchased and received this product can leave a review.'}
          </div>
        )}

        {!isAuthenticated && (
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
            <button onClick={() => navigate('/login')} className="text-primary-600 underline font-medium">Log in</button>
            {' '}to leave a review after purchasing this product.
          </div>
        )}

        {/* Reviews list */}
        {reviewsLoading ? (
          <div className="text-gray-500 py-4">Loading reviews...</div>
        ) : reviewsData?.reviews?.length === 0 ? (
          <div className="text-gray-500 py-8 text-center border border-dashed rounded-lg">
            No reviews yet. Be the first to review this product!
          </div>
        ) : (
          <div className="space-y-4">
            {reviewsData?.reviews?.map((review: { _id: string; user: { _id: string; fullName: string }; rating: number; comment: string; createdAt: string }) => (
              <div key={review._id} className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm">
                        {review.user.fullName.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-sm">{review.user.fullName}</span>
                      <span className="text-gray-400 text-xs">
                        {new Date(review.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex gap-0.5 mb-2">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className={`w-4 h-4 ${s <= review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                      ))}
                    </div>
                    {review.comment && <p className="text-gray-700 text-sm">{review.comment}</p>}
                  </div>
                  {/* Delete button for owner or admin */}
                  {isAuthenticated && (user?._id === review.user._id || user?.role === 'admin' || user?.role === 'manager') && (
                    <button
                      onClick={() => deleteReviewMutation.mutate(review._id)}
                      disabled={deleteReviewMutation.isPending}
                      className="text-gray-400 hover:text-red-500 transition-colors ml-4 flex-shrink-0"
                      aria-label="Delete review"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;
