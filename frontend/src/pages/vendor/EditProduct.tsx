import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import ProductForm, { ProductFormData } from '@/components/ProductForm';
import api from '@/lib/api';

const EditProduct: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const response = await api.get(`/api/products/${id}`);
      return response.data.data;
    },
    enabled: !!id
  });

  const updateProductMutation = useMutation({
    mutationFn: async (productData: ProductFormData) => {
      const response = await api.put(`/api/products/${id}`, productData);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Product updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      navigate('/products/manage');
    },
    onError: (error: unknown) => {
      const message = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : 'Failed to update product';
      toast.error(message || 'Failed to update product');
    }
  });

  const handleSubmit = async (data: ProductFormData) => {
    await updateProductMutation.mutateAsync(data);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading product...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-red-600">Product not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Edit Product</h1>
        <p className="text-gray-600 mt-2">Update product information</p>
      </div>

      <ProductForm
        initialData={product}
        onSubmit={handleSubmit}
        isLoading={updateProductMutation.isPending}
        submitLabel="Update Product"
      />
    </div>
  );
};

export default EditProduct;
