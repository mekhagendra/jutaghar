import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import ProductSlider from '@/components/ProductSlider';
import { Product } from '@/types';

const Featured: React.FC = () => {
  const { data: featured, isLoading } = useQuery<{ data: { products: Product[] } }>({
    queryKey: ['products', 'featured'],
    queryFn: async () => {
      const response = await api.get('/api/products?sort=-views&limit=8');
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
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-96 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        ) : (
          <ProductSlider
            products={featured?.data?.products || []}
            title="Featured Products"
            subtitle="Handpicked for you"
            itemsPerView={4}
            showViewAll
            viewAllLink="/products?tag=featured"
          />
        )}
      </div>
    </section>
  );
};

export default Featured;
