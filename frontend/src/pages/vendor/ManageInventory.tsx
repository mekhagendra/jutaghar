import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Package, Plus, Edit, Trash2, X, Upload } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { isImageDataUrl, uploadProductDataUrls } from '@/lib/uploads';

interface ProductVariant {
  _id?: string;
  color: string;
  size: string;
  quantity: number;
  status?: string;
  image?: string;
}

interface Product {
  _id: string;
  name: string;
  brand: string;
  sku?: string;
  category: string;
  mainImage?: string;
  price: number;
  stock: number;
  variants?: ProductVariant[];
}

const ManageInventory: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showInventoryView, setShowInventoryView] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [variantForm, setVariantForm] = useState<ProductVariant>({
    color: '',
    size: '',
    quantity: 0,
    status: 'active',
    image: ''
  });

  // Fetch vendor products
  const { data: productsData, isLoading, error } = useQuery({
    queryKey: ['vendor-products-inventory'],
    queryFn: async () => {
      const response = await api.get('/api/products/vendor/my-products');
      return response.data;
    }
  });

  // Add/Update variant mutation
  const saveVariantMutation = useMutation({
    mutationFn: async ({ productId, variant }: { productId: string; variant: ProductVariant }) => {
      const product = await api.get(`/api/products/${productId}`);
      const existingVariants = product.data.data.variants || [];

      let uploadedVariant = { ...variant };
      if (isImageDataUrl(uploadedVariant.image)) {
        const [uploadedVariantImage] = await uploadProductDataUrls([uploadedVariant.image as string]);
        uploadedVariant = { ...uploadedVariant, image: uploadedVariantImage };
      }
      
      let updatedVariants;
      if (editingVariant && editingVariant._id) {
        // Update existing variant
        updatedVariants = existingVariants.map((v: ProductVariant) => 
          v._id === editingVariant._id ? { ...v, ...uploadedVariant } : v
        );
      } else {
        // Add new variant
        updatedVariants = [...existingVariants, uploadedVariant];
      }

      const response = await api.put(`/api/products/${productId}`, {
        variants: updatedVariants
      });
      return response.data;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-products-inventory'] });
      // Update the selected product with fresh data
      if (selectedProduct) {
        const updatedProduct = await api.get(`/api/products/${selectedProduct._id}`);
        setSelectedProduct(updatedProduct.data.data);
      }
      toast.success(editingVariant ? 'Variant updated successfully' : 'Variant added successfully');
      setShowVariantModal(false);
      setEditingVariant(null);
    },
    onError: (error: unknown) => {
      const message = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to save variant'
        : 'Failed to save variant';
      toast.error(message);
    }
  });

  // Delete variant mutation
  const deleteVariantMutation = useMutation({
    mutationFn: async ({ productId, variantId }: { productId: string; variantId: string }) => {
      const product = await api.get(`/api/products/${productId}`);
      const existingVariants = product.data.data.variants || [];
      const updatedVariants = existingVariants.filter((v: ProductVariant) => v._id !== variantId);

      const response = await api.put(`/api/products/${productId}`, {
        variants: updatedVariants
      });
      return response.data;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-products-inventory'] });
      // Update the selected product with fresh data
      if (selectedProduct) {
        const updatedProduct = await api.get(`/api/products/${selectedProduct._id}`);
        setSelectedProduct(updatedProduct.data.data);
      }
      toast.success('Variant deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete variant');
    }
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setVariantForm(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const openVariantModal = (product: Product, variant?: ProductVariant) => {
    setSelectedProduct(product);
    if (variant) {
      setEditingVariant(variant);
      setVariantForm({ ...variant });
    } else {
      setEditingVariant(null);
      setVariantForm({
        color: '',
        size: '',
        quantity: 0,
        status: 'active',
        image: ''
      });
    }
    setShowVariantModal(true);
  };

  const resetVariantForm = () => {
    setVariantForm({
      color: '',
      size: '',
      quantity: 0,
      status: 'active',
      image: ''
    });
    setEditingVariant(null);
  };

  const handleSaveVariant = () => {
    if (!selectedProduct) return;

    if (!variantForm.color || !variantForm.size) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (variantForm.quantity < 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    saveVariantMutation.mutate({
      productId: selectedProduct._id,
      variant: variantForm
    });
  };

  const handleDeleteVariant = (productId: string, variantId: string) => {
    if (window.confirm('Are you sure you want to delete this variant?')) {
      deleteVariantMutation.mutate({ productId, variantId });
    }
  };

  const handleManageInventory = (product: Product) => {
    setSelectedProduct(product);
    setShowInventoryView(true);
  };

  const handleBackToList = () => {
    setShowInventoryView(false);
    setSelectedProduct(null);
    setShowVariantModal(false);
    resetVariantForm();
  };

  const products = productsData?.data?.products || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Package className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Products</h2>
          <p className="text-gray-600 mb-4">
            {error instanceof Error ? error.message : 'Failed to fetch products'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {!showInventoryView ? (
        /* Product List View */
        <>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Manage Inventory</h1>
              <p className="text-gray-600 mt-1">Select a product to manage its inventory variants</p>
            </div>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Products to Manage</h3>
              <p className="text-gray-600 mb-4">You need to create products first before managing inventory.</p>
              <Link to="/products/new" className="btn-primary">
                Create Your First Product
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product: Product) => (
                <div key={product._id} className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden">
                  {product.mainImage && (
                    <img
                      src={product.mainImage}
                      alt={product.name}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{product.name}</h3>
                    <p className="text-sm text-gray-600 mb-1">
                      {product.brand
                        ? (typeof product.brand === 'object' && product.brand !== null && 'name' in product.brand
                            ? (product.brand as { _id: string; name: string }).name
                            : product.brand)
                        : 'N/A'}
                    </p>
                    <p className="text-xs text-gray-500 mb-3">Category: {typeof product.category === 'object' && product.category !== null && 'name' in product.category ? (product.category as { _id: string; name: string }).name : product.category}</p>
                    
                    <div className="flex justify-between items-center mb-4 text-sm">
                      <span className="text-gray-700">Price: NPR {product.price}</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        product.stock > 10 ? 'bg-green-100 text-green-800' :
                        product.stock > 0 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        Stock: {product.stock || 0}
                      </span>
                    </div>

                    {product.variants && product.variants.length > 0 && (
                      <p className="text-sm text-gray-600 mb-4">
                        {product.variants.length} variant{product.variants.length !== 1 ? 's' : ''}
                      </p>
                    )}

                    <button
                      onClick={() => handleManageInventory(product)}
                      className="w-full btn-primary flex items-center justify-center gap-2"
                    >
                      <Package className="w-4 h-4" />
                      Manage Inventory
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Inventory Management View for Selected Product */
        selectedProduct && (
          <>
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={handleBackToList}
                className="text-gray-600 hover:text-gray-900"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900">
                  Manage Inventory: {selectedProduct.name}
                </h1>
                <p className="text-gray-600 mt-1">Add and manage product variants</p>
              </div>
              <button
                onClick={() => openVariantModal(selectedProduct)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Variant
              </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              {/* Product Info Header */}
              <div className="p-6 border-b border-gray-200 bg-gray-50">
                <div className="flex items-start gap-4">
                  {selectedProduct.mainImage && (
                    <img
                      src={selectedProduct.mainImage}
                      alt={selectedProduct.name}
                      className="w-24 h-24 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{selectedProduct.name}</h3>
                    <p className="text-sm text-gray-600">
                      {selectedProduct.brand
                        ? (typeof selectedProduct.brand === 'object' && selectedProduct.brand !== null && 'name' in selectedProduct.brand
                            ? (selectedProduct.brand as { _id: string; name: string }).name
                            : selectedProduct.brand)
                        : 'N/A'}
                    </p>
                    <div className="flex gap-4 mt-2 text-sm">
                      <span className="text-gray-700">Base Price: NPR {selectedProduct.price}</span>
                      <span className="text-gray-700">SKU: {selectedProduct.sku || 'N/A'}</span>
                      <span className="text-gray-700">Total Stock: {selectedProduct.stock || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Variants List */}
              <div className="p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Variants</h4>
                {selectedProduct.variants && selectedProduct.variants.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Image</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Color</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedProduct.variants.map((variant) => (
                          <tr key={variant._id}>
                            <td className="px-4 py-3">
                              {variant.image ? (
                                <img src={variant.image} alt={variant.color} className="w-10 h-10 object-cover rounded" />
                              ) : (
                                <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                                  <Package className="w-5 h-5 text-gray-400" />
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">{variant.color || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{variant.size || '-'}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                variant.quantity > 10 ? 'bg-green-100 text-green-800' :
                                variant.quantity > 0 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {variant.quantity}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                variant.status === 'active' ? 'bg-green-100 text-green-800' :
                                variant.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                                variant.status === 'out_of_stock' ? 'bg-red-100 text-red-800' :
                                'bg-orange-100 text-orange-800'
                              }`}>
                                {variant.status || 'active'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => openVariantModal(selectedProduct, variant)}
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteVariant(selectedProduct._id, variant._id!)}
                                  className="text-red-600 hover:text-red-800"
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
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 text-sm mb-3">No variants added yet</p>
                    <button
                      onClick={() => openVariantModal(selectedProduct)}
                      className="btn-primary inline-flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add First Variant
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )
      )}

      {/* Variant Modal */}
      {showVariantModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold">
                {editingVariant ? 'Edit Variant' : 'Add New Variant'}
              </h2>
              <button
                onClick={() => {
                  setShowVariantModal(false);
                  resetVariantForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Variant Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Variant Image
                </label>
                {variantForm.image ? (
                  <div className="relative inline-block">
                    <img
                      src={variantForm.image}
                      alt="Variant"
                      className="w-32 h-32 object-cover rounded border"
                    />
                    <button
                      type="button"
                      onClick={() => setVariantForm(prev => ({ ...prev, image: '' }))}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="w-32 h-32 flex flex-col items-center justify-center border-2 border-dashed rounded cursor-pointer hover:border-primary-500">
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">Upload Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color *
                  </label>
                  <input
                    type="text"
                    value={variantForm.color}
                    onChange={(e) => setVariantForm(prev => ({ ...prev, color: e.target.value }))}
                    className="input"
                    placeholder="e.g., Red, Blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Size *
                  </label>
                  <input
                    type="text"
                    value={variantForm.size}
                    onChange={(e) => setVariantForm(prev => ({ ...prev, size: e.target.value }))}
                    className="input"
                    placeholder="e.g., S, M, L, XL"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock Quantity *
                  </label>
                  <input
                    type="number"
                    value={variantForm.quantity}
                    onChange={(e) => setVariantForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                    className="input"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status *
                  </label>
                  <select
                    value={variantForm.status || 'active'}
                    onChange={(e) => setVariantForm(prev => ({ ...prev, status: e.target.value }))}
                    className="input"
                  >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="out_of_stock">Out of Stock</option>
                    <option value="discontinued">Discontinued</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Control variant visibility and availability</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t">
              <button
                onClick={() => {
                  setShowVariantModal(false);
                  resetVariantForm();
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveVariant}
                disabled={saveVariantMutation.isPending}
                className="btn-primary"
              >
                {saveVariantMutation.isPending ? 'Saving...' : 'Save Variant'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageInventory;
