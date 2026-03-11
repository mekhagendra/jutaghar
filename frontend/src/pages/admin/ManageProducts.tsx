import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Package, Edit, Trash2, Eye, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  status: string;
  category: string | { _id: string; name: string };
  brand?: string | { _id: string; name: string };
  gender?: string;
  mainImage?: string;
  createdBy?: {
    _id: string;
    fullName: string;
    businessName?: string;
  };
  vendor?: {
    _id: string;
    fullName: string;
    businessName?: string;
  };
  variants: Array<{
    color: string;
    size: string;
    quantity: number;
    price?: number;
    sku?: string;
  }>;
  images: string[];
}

const AdminManageProducts: React.FC = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  const { data: products, isLoading } = useQuery({
    queryKey: ['admin-products', filter, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('status', filter);
      if (search) params.append('search', search);
      
      const response = await api.get(`/api/products?${params.toString()}`);
      return response.data.data.products || [];
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      await api.delete(`/api/products/${productId}`);
    },
    onSuccess: () => {
      toast.success('Product deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
    onError: () => {
      toast.error('Failed to delete product');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ productId, status }: { productId: string; status: string }) => {
      await api.patch(`/api/products/${productId}`, { status });
    },
    onSuccess: () => {
      toast.success('Product status updated');
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
    onError: () => {
      toast.error('Failed to update product status');
    },
  });

  const handleDeleteProduct = (productId: string, productName: string) => {
    if (window.confirm(`Are you sure you want to delete "${productName}"?`)) {
      deleteProductMutation.mutate(productId);
    }
  };

  const handleStatusChange = (productId: string, newStatus: string) => {
    updateStatusMutation.mutate({ productId, status: newStatus });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { icon: CheckCircle, className: 'bg-green-100 text-green-800', label: 'Active' },
      draft: { icon: XCircle, className: 'bg-gray-100 text-gray-800', label: 'Draft' },
      out_of_stock: { icon: AlertCircle, className: 'bg-red-100 text-red-800', label: 'Out of Stock' },
      discontinued: { icon: XCircle, className: 'bg-yellow-100 text-yellow-800', label: 'Discontinued' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center">
          <Package className="w-8 h-8 mr-3 text-primary-600" />
          Manage Products
        </h1>
        <p className="text-gray-600 mt-2">View and manage all products from vendors</p>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search products..."
              className="input w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`btn ${filter === 'active' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Active
            </button>
            <button
              onClick={() => setFilter('draft')}
              className={`btn ${filter === 'draft' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Draft
            </button>
            <button
              onClick={() => setFilter('out_of_stock')}
              className={`btn ${filter === 'out_of_stock' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Out of Stock
            </button>
          </div>
        </div>
      </div>

      {/* Products List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      ) : products && products.length > 0 ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category/Brand
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gender
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product: Product) => (
                  <tr key={product._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {(product.mainImage || (product.images && product.images.length > 0)) ? (
                            <img
                              className="h-10 w-10 rounded object-cover"
                              src={product.mainImage || product.images[0]}
                              alt={product.name}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded bg-gray-200 flex items-center justify-center">
                              <Package className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-500">{product.variants?.length || 0} variants</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {typeof product.category === 'object' && product.category !== null && 'name' in product.category
                          ? product.category.name 
                          : product.category}
                      </div>
                      <div className="text-sm text-gray-500">
                        {product.brand 
                          ? (typeof product.brand === 'object' && product.brand !== null && 'name' in product.brand
                              ? product.brand.name 
                              : product.brand)
                          : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{product.gender || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{formatCurrency(product.price)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <span className={product.stock === 0 ? 'text-red-600 font-medium' : ''}>
                          {product.stock} units
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {product.vendor?.businessName || product.vendor?.fullName || product.createdBy?.businessName || product.createdBy?.fullName || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(product.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <Link
                          to={`/products/${product._id}`}
                          className="text-blue-600 hover:text-blue-900"
                          title="View"
                        >
                          <Eye className="w-5 h-5" />
                        </Link>
                        <Link
                          to={`/products/${product._id}/edit`}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Edit"
                        >
                          <Edit className="w-5 h-5" />
                        </Link>
                        <button
                          onClick={() => handleDeleteProduct(product._id, product.name)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="mt-2">
                        <select
                          value={product.status}
                          onChange={(e) => handleStatusChange(product._id, e.target.value)}
                          className="text-xs border border-gray-300 rounded px-2 py-1"
                        >
                          <option value="active">Active</option>
                          <option value="draft">Draft</option>
                          <option value="out_of_stock">Out of Stock</option>
                          <option value="discontinued">Discontinued</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card text-center py-12">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-500">
            {search || filter !== 'all' ? 'Try adjusting your filters.' : 'No products have been added yet.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default AdminManageProducts;
