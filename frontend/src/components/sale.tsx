import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import ProductSlider from '@/components/ProductSlider';
import { Product } from '@/types';

const Sale: React.FC = () => {
  const { data, isLoading } = useQuery<{ data: { products: Product[] } }>({
    queryKey: ['products', 'on-sale'],
    queryFn: async () => {
      const response = await api.get('/api/products?onSale=true&limit=12');
      return response.data;
    },
  });

  const products = data?.data?.products || [];

  if (!isLoading && products.length === 0) return null;

  return (
    <section className="py-16 bg-olive-300">
      <div className="container mx-auto px-4">
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-olive-200 rounded w-64" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-96 bg-red-100 rounded-lg" />
              ))}
            </div>
          </div>
        ) : (
          <ProductSlider
            products={products}
            title="🔥 On Sale"
            subtitle="Limited time deals — grab them before they're gone!"
            itemsPerView={6}
            showViewAll
            viewAllLink="/sale"
          />
        )}
      </div>
    </section>
  );
};

export default Sale;