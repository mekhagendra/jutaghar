import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import ProductSlider from '@/components/ProductSlider';
import { Product } from '@/types';

const NewArrival: React.FC = () => {
  const { data: newArrivals, isLoading } = useQuery<{ data: { products: Product[] } }>({
    queryKey: ['products', 'new-arrivals'],
    queryFn: async () => {
      const response = await api.get('/api/products?sort=-createdAt&limit=12');
      return response.data;
    },
  });

  return (
    <section className="py-16 bg-white">
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
            products={newArrivals?.data?.products || []}
            title="New Arrivals"
            subtitle="Check out the latest footwear trends"
            itemsPerView={6}
            showViewAll
            viewAllLink="/products?sort=new"
          />
        )}
      </div>
    </section>
  );
};

export default NewArrival;
