import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Trash2, ShoppingCart } from 'lucide-react';
import { useWishlistStore } from '@/stores/wishlistStore';
import { formatCurrency } from '@/lib/utils';

const UserWishlist: React.FC = () => {
  const { items, removeItem } = useWishlistStore();

  const mainImage = (product: { mainImage?: string; images?: string[] }) =>
    product.mainImage || product.images?.[0] || '';

  if (items.length === 0) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Wishlist</h1>
          <p className="text-gray-500 text-sm mt-1">Items you&apos;ve saved for later</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center py-20 text-center">
          <Heart className="w-12 h-12 text-gray-300 mb-4" />
          <p className="text-gray-600 font-medium">Your wishlist is empty</p>
          <Link to="/products" className="mt-3 text-sm text-primary-600 hover:underline">
            Browse products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Wishlist</h1>
          <p className="text-gray-500 text-sm mt-1">{items.length} saved item{items.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {items.map((product) => (
          <div key={product._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden group">
            {/* Image */}
            <Link to={`/products/${product._id}`} className="block relative overflow-hidden aspect-square bg-gray-50">
              {mainImage(product) ? (
                <img
                  src={mainImage(product)}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <ShoppingCart className="w-10 h-10" />
                </div>
              )}
            </Link>

            {/* Info */}
            <div className="p-3">
              <Link
                to={`/products/${product._id}`}
                className="text-sm font-medium text-gray-800 hover:text-primary-600 line-clamp-2"
              >
                {product.name}
              </Link>
              <p className="text-sm font-semibold text-primary-700 mt-1">{formatCurrency(product.price)}</p>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => removeItem(product._id)}
                  className="w-full p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-300 transition-colors"
                  aria-label="Remove from wishlist"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserWishlist;
