import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import Banner from '@/components/Banner';
import { Product } from '@/types';

const BannerSports: React.FC = () => {
  const { data: allProductsData } = useQuery<{ data: { products: Product[] } }>({
    queryKey: ['products', 'all-categories'],
    queryFn: async () => {
      const response = await api.get('/api/products?limit=100');
      return response.data;
    },
  });

  return (
    <section className="py-8">
      <div className="container mx-auto px-4">
        <Banner
          image={allProductsData?.data?.products?.find(p => p.category === 'sports')?.images?.[0] || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1920&q=80"}
          title="Sports Collection"
          subtitle="Performance Meets Comfort"
          buttonText="View Collection"
          link="/products?category=sports"
          linkType="category"
          height="h-[350px]"
          textPosition="right"
        />
      </div>
    </section>
  );
};

export default BannerSports;
