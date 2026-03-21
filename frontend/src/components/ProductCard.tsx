import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Package } from 'lucide-react';
import { Product } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { useWishlistStore } from '@/stores/wishlistStore';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  const { addItem } = useCartStore();
  const { user } = useAuthStore();
  const { toggleItem, isInWishlist } = useWishlistStore();
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const wishlisted = isInWishlist(product._id);

  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
  const discountPercent = hasDiscount 
    ? Math.round(((product.compareAtPrice! - product.price) / product.compareAtPrice!) * 100)
    : 0;

  // Check if user is a seller who can see wholesale prices
  const isSeller = user?.role === 'seller' || user?.businessType === 'seller';
  const hasWholesalePrice = product.wholesalePrice && product.wholesalePrice > 0;
  const wholesaleSavings = hasWholesalePrice && product.wholesalePrice 
    ? Math.round(((product.price - product.wholesalePrice) / product.price) * 100)
    : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    addItem(product, 1);
    
    if (onAddToCart) {
      onAddToCart(product);
    }
  };

  // Check if product has special tags
  const isNew = product.tags?.includes('new-arrival');
  const isFeatured = product.tags?.includes('featured');
  const isBestSeller = product.tags?.includes('best-seller');
  const isLimitedStock = product.stock > 0 && product.stock < 10;
  const isOutOfStock = product.stock === 0;

  return (
    <Link
      to={`/products/${product._id}`}
      className="group block bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        {/* Skeleton loader */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse" />
        )}
        
        {/* Product Image */}
        <img
          src={product.mainImage || product.images?.[0] || 'https://via.placeholder.com/400'}
          alt={product.name}
          className={`w-full h-full object-cover transition-all duration-500 ${
            isHovered ? 'scale-110' : 'scale-100'
          } ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          loading="lazy"
          decoding="async"
          onLoad={() => setImageLoaded(true)}
        />

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.isWholesaleOnly && (
            <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-500 text-white flex items-center gap-1">
              <Package className="w-3 h-3" />
              Wholesale Only
            </span>
          )}
          {isNew && (
            <span className="px-2 py-1 text-xs font-semibold rounded bg-green-500 text-white">
              New
            </span>
          )}
          {isFeatured && (
            <span className="px-2 py-1 text-xs font-semibold rounded bg-purple-500 text-white">
              Featured
            </span>
          )}
          {isBestSeller && (
            <span className="px-2 py-1 text-xs font-semibold rounded bg-yellow-500 text-white">
              Best Seller
            </span>
          )}
          {isLimitedStock && (
            <span className="px-2 py-1 text-xs font-semibold rounded bg-orange-500 text-white">
              Only {product.stock} Left
            </span>
          )}
          {hasDiscount && (
            <span className="px-2 py-1 text-xs font-semibold rounded bg-red-500 text-white">
              -{discountPercent}%
            </span>
          )}
          {isSeller && hasWholesalePrice && (
            <span className="px-2 py-1 text-xs font-semibold rounded bg-indigo-500 text-white">
              Save {wholesaleSavings}%
            </span>
          )}
        </div>

        {/* Quick Actions */}
        <div
          className={`absolute top-2 right-2 flex flex-col gap-2 transition-all duration-300 ${
            isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'
          }`}
        >
          <button
            className="p-2 bg-white rounded-full shadow-md hover:bg-red-50 transition"
            aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleItem(product);
            }}
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                wishlisted ? 'fill-red-500 text-red-500' : 'text-gray-700 hover:text-red-500'
              }`}
            />
          </button>
          {!isOutOfStock && (
            <button
              className="p-2 bg-white rounded-full shadow-md hover:bg-primary-50 transition"
              aria-label="Add to cart"
              onClick={handleAddToCart}
            >
              <ShoppingCart className="w-4 h-4 text-gray-700 hover:text-primary-600" />
            </button>
          )}
        </div>

        {/* Out of Stock Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <span className="px-4 py-2 bg-white text-gray-900 font-semibold rounded">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4">
        {/* Brand */}
        {product.brand && (
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
            {typeof product.brand === 'object' && product.brand !== null && 'name' in product.brand
              ? product.brand.name
              : product.brand}
          </p>
        )}

        {/* Product Name */}
        <h3 className="font-medium text-gray-900 line-clamp-2 mb-1 group-hover:text-primary-600 transition">
          {product.name}
        </h3>

        {/* Category & Gender */}
        <p className="text-xs text-gray-500 mb-2">
          {typeof product.category === 'object' && product.category !== null && 'name' in product.category 
            ? product.category.name 
            : product.category}
          {product.gender && ` • ${product.gender}`}
        </p>

        {/* Price */}
        <div className="mb-2">
          {isSeller && hasWholesalePrice ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-indigo-600">
                  {formatCurrency(product.wholesalePrice!)}
                </span>
                <span className="text-xs text-gray-500 line-through">
                  {formatCurrency(product.price)}
                </span>
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  Wholesale
                </span>
              </div>
              {product.minWholesaleQuantity && product.minWholesaleQuantity > 1 && (
                <p className="text-xs text-gray-500 mt-1">
                  Min order: {product.minWholesaleQuantity} units
                </p>
              )}
            </>
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-gray-900">
                {formatCurrency(product.price)}
              </span>
              {hasDiscount && (
                <span className="text-sm text-gray-500 line-through">
                  {formatCurrency(product.compareAtPrice!)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Rating */}
        {product.rating && product.rating.count > 0 && (
          <div className="flex items-center gap-1 mb-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={`w-4 h-4 ${
                    star <= Math.round(product.rating.average)
                      ? 'text-yellow-400'
                      : 'text-gray-300'
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-xs text-gray-600">
              ({product.rating.count})
            </span>
          </div>
        )}

        {/* Stock Status */}
        {product.stock > 0 && product.stock < 20 && (
          <p className="text-xs text-orange-600">
            {product.stock} in stock
          </p>
        )}
      </div>
    </Link>
  );
};

export default ProductCard;
