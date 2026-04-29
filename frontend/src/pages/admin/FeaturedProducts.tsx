import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Star, Search, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

interface AdminProduct {
  _id: string;
  name: string;
  price: number;
  mainImage?: string;
  images?: string[];
  status: string;
  tags?: string[];
  isFeatured?: boolean;
  vendor?: {
    fullName?: string;
    businessName?: string;
  };
}

const FeaturedProducts: React.FC = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-featured-products', search],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('limit', '100');
      if (search.trim()) params.append('search', search.trim());
      const response = await api.get(`/api/admin/products?${params.toString()}`);
      return response.data.data;
    },
  });

  const products: AdminProduct[] = useMemo(() => data?.products ?? [], [data]);

  const featuredCount = useMemo(
    () => products.filter((product) => product.isFeatured || product.tags?.includes('featured')).length,
    [products]
  );

  const toggleFeaturedMutation = useMutation({
    mutationFn: async ({ productId, featured }: { productId: string; featured: boolean }) => {
      const response = await api.patch(`/api/admin/products/${productId}/featured`, { featured });
      return response.data;
    },
    onSuccess: (_, variables) => {
      toast.success(variables.featured ? 'Marked as featured' : 'Removed from featured');
      queryClient.invalidateQueries({ queryKey: ['admin-featured-products'] });
      queryClient.invalidateQueries({ queryKey: ['products', 'featured'] });
    },
    onError: () => {
      toast.error('Failed to update featured status');
    },
  });

  if (user?.role !== 'admin') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="card text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900">Access denied</h1>
          <p className="text-gray-600 mt-2">Only admins can manage featured products.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Star className="w-8 h-8 text-yellow-500" />
            Featured Products
          </h1>
          <p className="text-gray-600 mt-2">
            Search products and choose which ones appear in the homepage featured section.
          </p>
        </div>
        <div className="text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2">
          Currently featured: <span className="font-semibold text-yellow-800">{featuredCount}</span>
        </div>
      </div>

      <div className="card mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Search Products</label>
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product name, description, or tags"
            className="input w-full pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="card text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-600" />
          <p className="text-gray-600 mt-3">Loading products...</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Featured</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => {
                  const isFeatured = product.isFeatured || product.tags?.includes('featured');
                  const image = product.mainImage || product.images?.[0];
                  return (
                    <tr key={product._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {image ? (
                            <img src={image} alt={product.name} className="w-12 h-12 rounded-lg object-cover" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-gray-100" />
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{product.name}</p>
                            <p className="text-sm text-gray-500">NPR {product.price}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {product.vendor?.businessName || product.vendor?.fullName || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                          {product.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          disabled={toggleFeaturedMutation.isPending}
                          onClick={() =>
                            toggleFeaturedMutation.mutate({
                              productId: product._id,
                              featured: !isFeatured,
                            })
                          }
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            isFeatured
                              ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          } ${toggleFeaturedMutation.isPending ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <Star className={`w-4 h-4 ${isFeatured ? 'fill-yellow-500 text-yellow-500' : 'text-gray-500'}`} />
                          {isFeatured ? 'Featured' : 'Mark Featured'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {products.length === 0 && (
            <div className="text-center py-12 text-gray-500">No matching products found.</div>
          )}
          {isFetching && (
            <div className="px-6 py-3 text-xs text-gray-500 border-t border-gray-100">Refreshing results...</div>
          )}
        </div>
      )}
    </div>
  );
};

export default FeaturedProducts;
