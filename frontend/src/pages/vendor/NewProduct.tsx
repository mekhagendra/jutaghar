import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import ProductForm, { ProductFormData } from '@/components/ProductForm';
import api from '@/lib/api';
import { isImageDataUrl, uploadProductDataUrls } from '@/lib/uploads';

const NewProduct: React.FC = () => {
  const navigate = useNavigate();

  const createProductMutation = useMutation({
    mutationFn: async (productData: ProductFormData) => {
      const payload: ProductFormData = { ...productData };

      if (isImageDataUrl(payload.mainImage)) {
        const [uploadedMainImage] = await uploadProductDataUrls([payload.mainImage as string]);
        payload.mainImage = uploadedMainImage;
      }

      const existingImages = (payload.images || []).filter((image) => !isImageDataUrl(image));
      const newImages = (payload.images || []).filter((image) => isImageDataUrl(image));
      if (newImages.length) {
        const uploadedImages = await uploadProductDataUrls(newImages);
        payload.images = [...existingImages, ...uploadedImages];
      }

      if (payload.variants?.length) {
        payload.variants = await Promise.all(
          payload.variants.map(async (variant) => {
            if (!isImageDataUrl(variant.image)) return variant;
            const [uploadedVariantImage] = await uploadProductDataUrls([variant.image as string]);
            return { ...variant, image: uploadedVariantImage };
          })
        );
      }

      const response = await api.post('/api/products', payload);
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
