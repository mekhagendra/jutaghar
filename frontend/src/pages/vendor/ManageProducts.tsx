import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Edit, Trash2, Package } from 'lucide-react';

interface Product {
  _id: string;
  name: string;
  brand?: string | { _id: string; name: string };
  sku?: string;
  category: string | { _id: string; name: string };
  price: number;
  onSale?: boolean;
  salePrice?: number;
  wholesalePrice?: number;
  stock: number;
  status: string;
}

const ManageProducts: React.FC = () => {
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['vendor-products'],
    queryFn: async () => {
      const response = await api.get('/api/products/vendor/my-products');
      return response.data.data;
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      await api.delete(`/api/products/${productId}`);
    },
    onSuccess: () => {
      toast.success('Product deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      setDeleteId(null);
    },
    onError: (error: unknown) => {
      const message = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : 'Failed to delete product';
      toast.error(message || 'Failed to delete product');
    }
  });

  const handleDelete = (productId: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      setDeleteId(productId);
      deleteProductMutation.mutate(productId);
    }
  };

  // Sale management
  const [salePriceInputs, setSalePriceInputs] = useState<Record<string, string>>({});

  const saleMutation = useMutation({
    mutationFn: async ({ productId, onSale, salePrice }: { productId: string; onSale: boolean; salePrice?: number }) => {
      await api.patch(`/api/products/${productId}`, { onSale, salePrice: onSale ? salePrice : undefined });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      toast.success('Sale updated');
    },
    onError: () => {
      toast.error('Failed to update sale');
    },
  });

  const handleSaleToggle = (product: Product) => {
    if (product.onSale) {
      // Turning off sale
      saleMutation.mutate({ productId: product._id, onSale: false });
    } else {
      // Turning on — need a sale price
      const raw = salePriceInputs[product._id];
      const salePrice = raw ? Number(raw) : undefined;
      if (!salePrice || salePrice <= 0 || salePrice >= product.price) {
        toast.error('Enter a valid sale price less than retail price');
        return;
      }
      saleMutation.mutate({ productId: product._id, onSale: true, salePrice });
    }
  };

  const products = data?.products || [];

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Manage Products</h1>
          <p className="text-gray-600 mt-2">View and manage your product listings</p>
        </div>
        <Link to="/products/new" className="btn-primary">
          Add New Product
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="card text-center py-12">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No products yet</h3>
          <p className="text-gray-600 mb-6">Start by adding your first product</p>
          <Link to="/products/new" className="btn-primary inline-block">
            Add Product
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold">Product</th>
                  <th className="text-left py-3 px-4 font-semibold">Category</th>
                  <th className="text-left py-3 px-4 font-semibold">Price</th>
                  <th className="text-left py-3 px-4 font-semibold">Sale</th>
                  <th className="text-left py-3 px-4 font-semibold">Stock</th>
                  <th className="text-left py-3 px-4 font-semibold">Status</th>
                  <th className="text-right py-3 px-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product: Product) => (
                  <tr key={product._id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-gray-600">
                          {product.brand
                            ? (typeof product.brand === 'object' && product.brand !== null && 'name' in product.brand
                                ? product.brand.name
                                : product.brand)
                            : 'N/A'}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm">
                        {typeof product.category === 'object' && product.category !== null && 'name' in product.category
                          ? product.category.name
                          : product.category}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium">{formatCurrency(product.price)}</p>
                        {product.wholesalePrice && (
                          <p className="text-sm text-gray-600">
                            Wholesale: {formatCurrency(product.wholesalePrice)}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={product.onSale || false}
                          onChange={() => handleSaleToggle(product)}
                          disabled={saleMutation.isPending}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                        />
                        {product.onSale ? (
                          <span className="text-sm font-medium text-red-600">
                            {formatCurrency(product.salePrice!)}
                          </span>
                        ) : (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              placeholder="Sale price"
                              value={salePriceInputs[product._id] ?? ''}
                              onChange={(e) => setSalePriceInputs(prev => ({ ...prev, [product._id]: e.target.value }))}
                              className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                              min="0"
                              step="0.01"
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`font-medium ${product.stock === 0 ? 'text-red-600' : product.stock < 10 ? 'text-orange-600' : 'text-green-600'}`}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`badge ${product.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {product.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-2">
                        <Link
                          to={`/products/${product._id}/edit`}
                          className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition"
                          title="Edit product"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(product._id)}
                          className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition"
                          title="Delete product"
                          disabled={deleteId === product._id}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageProducts;
