import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import ProductForm, { ProductFormData } from '@/components/ProductForm';
import api from '@/lib/api';

const NewProduct: React.FC = () => {
  const navigate = useNavigate();

  const createProductMutation = useMutation({
    mutationFn: async (productData: ProductFormData) => {
      const response = await api.post('/api/products', productData);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Product created successfully!');
      navigate('/vendor/dashboard');
    },
    onError: (error: unknown) => {
      const message = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : 'Failed to create product';
      toast.error(message || 'Failed to create product');
    }
  });

  const handleSubmit = async (data: ProductFormData) => {
    await createProductMutation.mutateAsync(data);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Add New Product</h1>
        <p className="text-gray-600 mt-2">Create a new product listing</p>
      </div>

      <ProductForm
        onSubmit={handleSubmit}
        isLoading={createProductMutation.isPending}
        submitLabel="Create Product"
      />
    </div>
  );
};

export default NewProduct;
