import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import api from '@/lib/api';

export interface ProductFormData {
  name: string;
  description: string;
  price: number;
  category: string;
  brand: string;
  gender: string;
  mainImage?: string;
  images?: string[];
  onSale?: boolean;
  salePrice?: number;
  variants?: Array<{
    color: string;
    size: string;
    sku: string;
    price: number;
    quantity: number;
    status?: string;
    image?: string;
  }>;
  stock?: number;
}

interface ProductInitialData {
  name?: string;
  description?: string;
  price?: number;
  category?: string | { _id: string; name: string };
  brand?: string | { _id: string; name: string };
  gender?: string;
  mainImage?: string;
  images?: string[];
  onSale?: boolean;
  salePrice?: number;
  variants?: Array<{
    color: string;
    size: string;
    sku: string;
    price: number;
    quantity: number;
    status?: string;
    image?: string;
  }>;
  stock?: number;
}

interface ProductFormProps {
  initialData?: ProductInitialData;
  onSubmit: (data: ProductFormData) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
}

const ProductForm: React.FC<ProductFormProps> = ({
  initialData,
  onSubmit,
  isLoading = false,
  submitLabel = 'Create Product'
}) => {
  
  // Size options from 6 to 13
  const sizeOptions = ['6', '7', '8', '9', '10', '11', '12', '13'];
  
  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/api/catalog/categories?status=active');
      return response.data.data;
    }
  });

  // Fetch brands
  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const response = await api.get('/api/catalog/brands?status=active');
      return response.data.data;
    }
  });
  
  const [formData, setFormData] = useState<ProductFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    price: initialData?.price || 0,
    category: initialData?.category 
      ? (typeof initialData.category === 'object' && 'name' in initialData.category 
          ? initialData.category._id 
          : initialData.category)
      : '',
    brand: initialData?.brand 
      ? (typeof initialData.brand === 'object' && 'name' in initialData.brand 
          ? initialData.brand._id 
          : initialData.brand)
      : '',
    gender: initialData?.gender || 'Unisex',
    mainImage: initialData?.mainImage || '',
    images: initialData?.images || [],
    onSale: initialData?.onSale || false,
    salePrice: initialData?.salePrice,
    variants: initialData?.variants || [],
    stock: initialData?.stock || 0
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormData, string>>>({});
  const [mainImagePreview, setMainImagePreview] = useState<string>(initialData?.mainImage || '');
  const [imagePreviews, setImagePreviews] = useState<string[]>(initialData?.images || []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? (value === '' ? 0 : Number(value)) : value
    }));
    
    if (errors[name as keyof ProductFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setMainImagePreview(result);
        setFormData(prev => ({ ...prev, mainImage: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreviews(prev => [...prev, result]);
        setFormData(prev => ({
          ...prev,
          images: [...(prev.images || []), result]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    setFormData(prev => ({
      ...prev,
      images: prev.images?.filter((_, i) => i !== index)
    }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ProductFormData, string>> = {};

    if (!formData.name.trim()) newErrors.name = 'Product name is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.price || formData.price <= 0) newErrors.price = 'Price must be greater than 0';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.brand.trim()) newErrors.brand = 'Brand is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`input ${errors.name ? 'border-red-500' : ''}`}
              placeholder="Enter product name"
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className={`input ${errors.description ? 'border-red-500' : ''}`}
              placeholder="Enter product description"
            />
            {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category *
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className={`input ${errors.category ? 'border-red-500' : ''}`}
            >
              <option value="">Select category</option>
              {categories.map((cat: { _id: string; name: string }) => (
                <option key={cat._id} value={cat._id}>{cat.name}</option>
              ))}
            </select>
            {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Brand *
            </label>
            <select
              name="brand"
              value={formData.brand}
              onChange={handleChange}
              className={`input ${errors.brand ? 'border-red-500' : ''}`}
            >
              <option value="">Select brand</option>
              {brands.map((brand: { _id: string; name: string }) => (
                <option key={brand._id} value={brand._id}>{brand.name}</option>
              ))}
            </select>
            {errors.brand && <p className="text-red-500 text-sm mt-1">{errors.brand}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gender *
            </label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="input"
            >
              <option value="Unisex">Unisex</option>
              <option value="Men">Men</option>
              <option value="Women">Women</option>
              <option value="Kids">Kids</option>
            </select>
          </div>
        </div>
      </div>

      {/* Product Images */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Product Images</h3>
        
        <div className="space-y-4">
          {/* Main Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Main Image *
            </label>
            <div className="flex items-start gap-4">
              {mainImagePreview ? (
                <div className="relative">
                  <img
                    src={mainImagePreview}
                    alt="Main product"
                    className="w-32 h-32 object-cover rounded-lg border-2 border-primary-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setMainImagePreview('');
                      setFormData(prev => ({ ...prev, mainImage: '' }));
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="w-32 h-32 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-500 transition">
                  <Upload className="w-8 h-8 text-gray-400" />
                  <span className="text-xs text-gray-500 mt-2">Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleMainImageChange}
                    className="hidden"
                  />
                </label>
              )}
              <div className="flex-1">
                <p className="text-sm text-gray-600">
                  Upload the main product image. This will be the primary image shown in listings.
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Recommended: 800x800px, JPG or PNG, max 5MB
                </p>
              </div>
            </div>
          </div>

          {/* Additional Images */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Images
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative">
                  <img
                    src={preview}
                    alt={`Product ${index + 1}`}
                    className="w-full aspect-square object-cover rounded-lg border"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {imagePreviews.length < 5 && (
                <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-500 transition">
                  <ImageIcon className="w-6 h-6 text-gray-400" />
                  <span className="text-xs text-gray-500 mt-1">Add</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImagesChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Upload up to 5 additional product images
            </p>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Pricing</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price (NPR) *
            </label>
            <input
              type="number"
              name="price"
              value={formData.price || ''}
              onChange={handleChange}
              min="0"
              step="0.01"
              className={`input ${errors.price ? 'border-red-500' : ''}`}
              placeholder="0.00"
            />
            {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
            <p className="text-sm text-gray-500 mt-1">Base retail price for this product</p>
          </div>
        </div>
      </div>

      {/* Product Variants (Size, Color, Stock) */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Product Variants</h3>
        <p className="text-sm text-gray-600 mb-4">Add different size and color combinations for this product</p>
        
        {/* Variant List */}
        <div className="space-y-3">
          {formData.variants && formData.variants.length > 0 ? (
            formData.variants.map((variant, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Size *
                    </label>
                    <select
                      value={variant.size}
                      onChange={(e) => {
                        const newVariants = [...formData.variants!];
                        newVariants[index].size = e.target.value;
                        setFormData(prev => ({ ...prev, variants: newVariants }));
                      }}
                      className="input text-sm"
                      required
                    >
                      <option value="">Select</option>
                      {sizeOptions.map(size => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Color *
                    </label>
                    <input
                      type="text"
                      value={variant.color}
                      onChange={(e) => {
                        const newVariants = [...formData.variants!];
                        newVariants[index].color = e.target.value;
                        setFormData(prev => ({ ...prev, variants: newVariants }));
                      }}
                      className="input text-sm"
                      placeholder="e.g. Black"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      SKU
                    </label>
                    <input
                      type="text"
                      value={variant.sku}
                      onChange={(e) => {
                        const newVariants = [...formData.variants!];
                        newVariants[index].sku = e.target.value;
                        setFormData(prev => ({ ...prev, variants: newVariants }));
                      }}
                      className="input text-sm"
                      placeholder="e.g. SH-BLK-10"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Price (NPR) *
                    </label>
                    <input
                      type="number"
                      value={variant.price || ''}
                      onChange={(e) => {
                        const newVariants = [...formData.variants!];
                        newVariants[index].price = e.target.value === '' ? 0 : Number(e.target.value);
                        setFormData(prev => ({ ...prev, variants: newVariants }));
                      }}
                      className="input text-sm"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      value={variant.quantity || ''}
                      onChange={(e) => {
                        const newVariants = [...formData.variants!];
                        newVariants[index].quantity = e.target.value === '' ? 0 : Number(e.target.value);
                        setFormData(prev => ({ ...prev, variants: newVariants }));
                      }}
                      className="input text-sm"
                      min="0"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Status *
                    </label>
                    <select
                      value={variant.status || 'active'}
                      onChange={(e) => {
                        const newVariants = [...formData.variants!];
                        newVariants[index].status = e.target.value;
                        setFormData(prev => ({ ...prev, variants: newVariants }));
                      }}
                      className="input text-sm"
                      required
                    >
                      <option value="active">Active</option>
                      <option value="draft">Draft</option>
                      <option value="out_of_stock">Out of Stock</option>
                      <option value="discontinued">Discontinued</option>
                    </select>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    const newVariants = formData.variants!.filter((_, i) => i !== index);
                    setFormData(prev => ({ ...prev, variants: newVariants }));
                  }}
                  className="text-red-600 hover:text-red-800 p-2"
                  title="Remove variant"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No variants added yet. Click "Add Variant" to get started.</p>
          )}
        </div>
        
        {/* Add Variant Button */}
        <button
          type="button"
          onClick={() => {
            const newVariant = {
              color: '',
              size: '',
              sku: '',
              price: formData.price,
              quantity: 0,
              status: 'active'
            };
            setFormData(prev => ({
              ...prev,
              variants: [...(prev.variants || []), newVariant]
            }));
          }}
          className="btn-secondary mt-4 w-full"
        >
          + Add Variant
        </button>
        
        {/* Or simple stock for single variant products */}
        {(!formData.variants || formData.variants.length === 0) && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-600 mb-3">Or manage as a single product without variants:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock Quantity
                </label>
                <input
                  type="number"
                  name="stock"
                  value={formData.stock || ''}
                  onChange={handleChange}
                  min="0"
                  className="input"
                  placeholder="0"
                />
                <p className="text-xs text-gray-500 mt-1">Total available quantity</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="btn-secondary"
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn-primary"
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
};

export default ProductForm;
