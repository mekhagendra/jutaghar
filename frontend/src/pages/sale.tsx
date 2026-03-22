import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Flame, Tag, ChevronDown } from 'lucide-react';
import api from '@/lib/api';
import { Product } from '@/types';
import ProductCard from '@/components/ProductCard';

const Sale: React.FC = () => {
  const [sort, setSort] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['sale-products', sort],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('onSale', 'true');
      if (sort) params.append('sort', sort);
      const response = await api.get(`/api/products?${params.toString()}`);
      return response.data.data;
    },
  });

  const products: Product[] = data?.products || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Banner */}
      <div className="relative bg-gradient-to-r from-red-600 via-red-500 to-orange-500 overflow-hidden">
        {/* Animated background shapes */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-10 -left-10 w-72 h-72 bg-white rounded-full animate-pulse" />
          <div className="absolute top-20 right-10 w-48 h-48 bg-white rounded-full animate-pulse delay-300" />
          <div className="absolute -bottom-10 left-1/3 w-56 h-56 bg-white rounded-full animate-pulse delay-700" />
        </div>

        <div className="relative container mx-auto px-4 py-16 md:py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
            <Flame className="w-5 h-5 text-yellow-300" />
            <span className="text-white font-semibold text-sm tracking-wide uppercase">
              Hot Deals
            </span>
          </div>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto mb-6">
            Grab the best deals on your favorite footwear — limited time offers you don't want to miss!
          </p>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <span className="bg-white text-red-600 font-bold text-lg px-5 py-2 rounded-full shadow-lg">
              Up to {products.length > 0
                ? Math.max(
                    ...products
                      .filter((p) => p.onSale && p.salePrice && p.salePrice < p.price)
                      .map((p) => Math.round(((p.price - p.salePrice!) / p.price) * 100))
                  ) || 0
                : 0}% OFF
            </span>
            <span className="flex items-center gap-1 text-white/80 text-sm">
              <Tag className="w-4 h-4" />
              {products.length} {products.length === 1 ? 'deal' : 'deals'} available
            </span>
          </div>
        </div>
      </div>

      {/* Products Section */}
      <div className="container mx-auto px-4 py-10">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Sale Items
          </h2>

          {/* Sort */}
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value="">Sort by</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="new">Newest First</option>
              <option value="popular">Most Popular</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg overflow-hidden shadow-sm animate-pulse">
                <div className="aspect-square bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-center py-16">
            <p className="text-red-500 text-lg">Failed to load sale products. Please try again later.</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && products.length === 0 && (
          <div className="text-center py-20">
            <Tag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No sale items right now
            </h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Check back soon — we frequently add new deals and discounts!
            </p>
          </div>
        )}

        {/* Product Grid */}
        {!isLoading && !error && products.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {products.slice(0, 12).map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Sale;