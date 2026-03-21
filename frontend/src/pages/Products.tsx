import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import api from '@/lib/api';
import { Product } from '@/types';
import { Search, SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import ProductCard from '../components/ProductCard';

interface Category {
  _id: string;
  name: string;
  slug: string;
}

interface Brand {
  _id: string;
  name: string;
  slug: string;
}

interface Vendor {
  _id: string;
  businessName?: string;
  fullName: string;
  role: string;
}

const Products: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  
  // Extract params cleanly from URL
  const gender = searchParams.get('gender') || '';
  const category = searchParams.get('category') || '';
  const brand = searchParams.get('brand') || '';
  const search = searchParams.get('search') || '';
  const sort = searchParams.get('sort') || '';
  const vendor = searchParams.get('vendor') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const size = searchParams.get('size') || '';
  const color = searchParams.get('color') || '';
  const inStock = searchParams.get('inStock') === 'true';
  
  // Split comma-separated values for multi-select filters
  const selectedGender = gender.split(',').filter(Boolean);
  const selectedCategories = category.split(',').filter(Boolean);
  const selectedBrands = brand.split(',').filter(Boolean);
  const selectedSizes = size.split(',').filter(Boolean);
  const selectedColors = color.split(',').filter(Boolean);

  // Debug logging on URL change
  useEffect(() => {
    console.log('🛍️ Products page - URL params changed');
    console.log('📍 Params:', { gender, category, brand, search, sort });
  }, [gender, category, brand, search, sort]);

  // Helper function to update URL params
  const updateSearchParams = (updates: Record<string, string | string[] | null>) => {
    const params = new URLSearchParams(searchParams);
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
        params.delete(key);
      } else if (Array.isArray(value)) {
        params.set(key, value.join(','));
      } else {
        params.set(key, value);
      }
    });
    
    setSearchParams(params, { replace: true });
  };

  // Fetch categories from API (all active for comprehensive filtering)
  const { data: categoriesData } = useQuery({
    queryKey: ['categories', 'active'],
    queryFn: async () => {
      const response = await api.get('/api/catalog/categories?status=active');
      console.log('📦 Categories response:', response.data);
      return response.data;
    },
  });

  // Fetch brands from API (only brands with products)
  const { data: brandsData } = useQuery({
    queryKey: ['brands', 'withInventory'],
    queryFn: async () => {
      const response = await api.get('/api/catalog/brands?withInventory=true');
      console.log('📦 Brands response:', response.data);
      return response.data;
    },
  });

  // Fetch vendors (sellers, outlets, manufacturers, importers)
  const { data: vendorsData } = useQuery({
    queryKey: ['vendors', 'active'],
    queryFn: async () => {
      const response = await api.get('/api/outlets?isApproved=true');
      console.log('📦 Vendors response:', response.data);
      return response.data;
    },
  });

  const genderOptions = ['Men', 'Women', 'Kids', 'Unisex'];
  const categoryOptions = (Array.isArray(categoriesData?.data) ? categoriesData.data : []).map((cat: Category) => ({ id: cat._id, name: cat.name }));
  const brandOptions = (Array.isArray(brandsData?.data) ? brandsData.data : []).map((brand: Brand) => ({ id: brand._id, name: brand.name }));
  const vendorOptions = (Array.isArray(vendorsData?.data?.vendors) ? vendorsData.data.vendors : []).map((vendor: Vendor) => ({ 
    id: vendor._id, 
    name: vendor.businessName || vendor.fullName,
    role: vendor.role 
  }));
  const sizeOptions = ['6', '7', '8', '9', '10', '11', '12', '13'];

  // Fetch unique colors from product variants
  const { data: colorsData } = useQuery({
    queryKey: ['productColors'],
    queryFn: async () => {
      const response = await api.get('/api/products/colors');
      return response.data;
    },
  });
  const colorOptions: string[] = Array.isArray(colorsData?.data) ? colorsData.data : [];

  const { data, isLoading, error } = useQuery({
    queryKey: ['products', gender, category, brand, search, sort, vendor, minPrice, maxPrice, size, color, inStock],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (gender) params.append('gender', gender);
      
      // Convert category names/slugs to IDs if needed
      if (selectedCategories.length && categoryOptions.length > 0) {
        const categoryIds = selectedCategories
          .map(name => {
            const cat = categoryOptions.find((c: { id: string; name: string }) => c.name === name);
            return cat?.id;
          })
          .filter(Boolean);
        if (categoryIds.length) params.append('category', categoryIds.join(','));
      }
      
      // Convert brand names to IDs
      if (selectedBrands.length && brandOptions.length > 0) {
        const brandIds = selectedBrands
          .map(name => brandOptions.find((b: { id: string; name: string }) => b.name === name)?.id)
          .filter(Boolean);
        if (brandIds.length) params.append('brand', brandIds.join(','));
      }
      
      if (vendor) params.append('vendor', vendor);
      if (minPrice) params.append('minPrice', minPrice);
      if (maxPrice) params.append('maxPrice', maxPrice);
      if (size) params.append('size', size);
      if (color) params.append('color', color);
      if (sort) params.append('sort', sort);
      if (inStock) params.append('inStock', 'true');
      
      console.log('🔄 Fetching products with params:', params.toString());
      const response = await api.get(`/api/products?${params.toString()}`);
      console.log('✅ Products fetched:', response.data.data?.products?.length || 0, 'items');
      return response.data.data;
    },
  });

  const products = data?.products || [];

  console.log('📦 Products data:', { 
    isLoading, 
    hasError: !!error, 
    productsCount: products.length 
  });

  // Filter change handlers
  const handleFilterChange = (
    filterType: 'gender' | 'category' | 'brand' | 'size' | 'color',
    value: string
  ) => {
    const currentValues = {
      gender: selectedGender,
      category: selectedCategories,
      brand: selectedBrands,
      size: selectedSizes,
      color: selectedColors,
    }[filterType];

    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];

    updateSearchParams({ [filterType]: newValues });
  };

  const clearAllFilters = () => {
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const activeFiltersCount = 
    selectedGender.length + 
    selectedCategories.length + 
    selectedBrands.length + 
    selectedSizes.length + 
    selectedColors.length +
    (vendor ? 1 : 0) +
    (minPrice || maxPrice ? 1 : 0) +
    (inStock ? 1 : 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">All Products</h1>
          <p className="text-gray-600 mt-1">
            Discover the perfect footwear for every occasion
          </p>
        </div>

        {/* Search Bar and Sort */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search for shoes, brands, styles..."
                value={search}
                onChange={(e) => updateSearchParams({ search: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Filter Toggle (Mobile) */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden btn btn-secondary flex items-center gap-2"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
            </button>

            {/* Sort */}
            <select
              value={sort}
              onChange={(e) => updateSearchParams({ sort: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            >
              <option value="">Default (Newest)</option>
              <option value="new">Newest First</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="popular">Most Popular</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>

          {/* Active Filters */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t">
              <span className="text-sm text-gray-600 font-medium">Active Filters:</span>
              {selectedGender.map((g) => (
                <span key={g} className="badge bg-primary-100 text-primary-800 flex items-center gap-1">
                  {g}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => handleFilterChange('gender', g)}
                  />
                </span>
              ))}
              {selectedCategories.map((c) => (
                <span key={c} className="badge bg-blue-100 text-blue-800 flex items-center gap-1">
                  {c}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => handleFilterChange('category', c)}
                  />
                </span>
              ))}
              {selectedBrands.map((b) => (
                <span key={b} className="badge bg-green-100 text-green-800 flex items-center gap-1">
                  {b}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => handleFilterChange('brand', b)}
                  />
                </span>
              ))}
              {vendor && (
                <span className="badge bg-indigo-100 text-indigo-800 flex items-center gap-1">
                  Seller: {vendorOptions.find((v: { id: string; name: string }) => v.id === vendor)?.name}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => updateSearchParams({ vendor: null })}
                  />
                </span>
              )}
              {selectedSizes.map((s) => (
                <span key={s} className="badge bg-purple-100 text-purple-800 flex items-center gap-1">
                  Size {s}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => handleFilterChange('size', s)}
                  />
                </span>
              ))}
              {selectedColors.map((c) => (
                <span key={c} className="badge bg-gray-100 text-gray-800 flex items-center gap-1">
                  {c}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => handleFilterChange('color', c)}
                  />
                </span>
              ))}
              {(minPrice || maxPrice) && (
                <span className="badge bg-yellow-100 text-yellow-800 flex items-center gap-1">
                  ${minPrice || '0'} - ${maxPrice || '∞'}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => updateSearchParams({ minPrice: null, maxPrice: null })}
                  />
                </span>
              )}
              {inStock && (
                <span className="badge bg-green-100 text-green-800 flex items-center gap-1">
                  In Stock Only
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => updateSearchParams({ inStock: null })}
                  />
                </span>
              )}
              <button
                onClick={clearAllFilters}
                className="text-sm text-red-600 hover:text-red-700 font-medium ml-2"
              >
                Clear All
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-6">
          {/* Sidebar Filters (Desktop) */}
          <aside className={`${showFilters ? 'block' : 'hidden'} md:block w-full md:w-64 flex-shrink-0`}>
            <div className="bg-white rounded-lg shadow-sm p-4 space-y-6 sticky top-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Filters</h3>
                <button
                  onClick={() => setShowFilters(false)}
                  className="md:hidden text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Gender Filter */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center justify-between">
                  Gender
                  <ChevronDown className="w-4 h-4" />
                </h4>
                <div className="space-y-2">
                  {genderOptions.map((gender) => (
                    <label key={gender} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedGender.includes(gender)}
                        onChange={() => handleFilterChange('gender', gender)}
                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700 capitalize">{gender}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Category Filter */}
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center justify-between">
                  Category
                  <ChevronDown className="w-4 h-4" />
                </h4>
                <div className="space-y-2">
                  {categoryOptions.map((category: { id: string; name: string }) => (
                    <label key={category.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category.name)}
                        onChange={() => handleFilterChange('category', category.name)}
                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700 capitalize">{category.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Brand Filter */}
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center justify-between">
                  Brand
                  <ChevronDown className="w-4 h-4" />
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {brandOptions.map((brand: { id: string; name: string }) => (
                    <label key={brand.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedBrands.includes(brand.name)}
                        onChange={() => handleFilterChange('brand', brand.name)}
                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">{brand.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Vendor/Seller Filter */}
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center justify-between">
                  Select Seller
                  <ChevronDown className="w-4 h-4" />
                </h4>
                <select
                  value={vendor}
                  onChange={(e) => updateSearchParams({ vendor: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm bg-white"
                >
                  <option value="">All Sellers</option>
                  {vendorOptions.map((vendor: { id: string; name: string; role: string }) => {
                    const roleLabels: Record<string, string> = {
                      outlet: '🏪',
                      seller: '🏬',
                      manufacturer: '🏭',
                      importer: '✈️'
                    };
                    const roleIcon = roleLabels[vendor.role] || '🏢';
                    return (
                      <option key={vendor.id} value={vendor.id}>
                        {roleIcon} {vendor.name}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Price Range */}
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-3">Price Range</h4>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => updateSearchParams({ minPrice: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <span className="text-gray-500">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => updateSearchParams({ maxPrice: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  />
                </div>
              </div>

              {/* Size Filter */}
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-3">Size</h4>
                <div className="grid grid-cols-4 gap-2">
                  {sizeOptions.map((size) => (
                    <button
                      key={size}
                      onClick={() => handleFilterChange('size', size)}
                      className={`py-2 text-sm font-medium rounded-lg border transition ${
                        selectedSizes.includes(size)
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Filter */}
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-3">Color</h4>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleFilterChange('color', color)}
                      className={`px-3 py-1 text-sm rounded-full border transition ${
                        selectedColors.includes(color)
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stock Filter */}
              <div className="border-t pt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inStock}
                    onChange={(e) => updateSearchParams({ inStock: e.target.checked ? 'true' : null })}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">In Stock Only</span>
                </label>
              </div>
            </div>
          </aside>

          {/* Products Grid */}
          <main className="flex-1">
            {error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <h3 className="text-lg font-semibold text-red-800 mb-2">Error loading products</h3>
                <p className="text-red-600 mb-4">{error instanceof Error ? error.message : 'Unknown error'}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="btn btn-primary"
                >
                  Reload Page
                </button>
              </div>
            ) : isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg overflow-hidden shadow-sm animate-pulse">
                    <div className="aspect-square bg-gray-200"></div>
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
                  <p className="text-gray-600 mb-6">
                    Try adjusting your filters or search query to find what you're looking for.
                  </p>
                  <button
                    onClick={clearAllFilters}
                    className="btn btn-primary"
                  >
                    Clear All Filters
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-4 text-sm text-gray-600">
                  Showing {products.length} {products.length === 1 ? 'product' : 'products'}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product: Product) => (
                    <ProductCard key={product._id} product={product} />
                  ))}
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Products;
