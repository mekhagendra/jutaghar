import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import ProductSlider from '@/components/ProductSlider';
import { Product } from '@/types';

const BestSeller: React.FC = () => {
  const { data: bestSellers, isLoading } = useQuery<{ data: { products: Product[] } }>({
    queryKey: ['products', 'best-sellers'],
    queryFn: async () => {
      const response = await api.get('/api/products?sort=-rating&limit=12');
      return response.data;
    },
  });

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-96 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        ) : (
          <ProductSlider
            products={bestSellers?.data?.products || []}
            title="Best Sellers"
            subtitle="Most popular choices by customers"
            itemsPerView={4}
            showViewAll
            viewAllLink="/products?tag=best-seller"
          />
        )}
      </div>
    </section>
  );
};

export default BestSeller;
