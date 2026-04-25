import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import { Product } from '@/types';

const NewArrival: React.FC = () => {
  const { data: newArrivals, isLoading } = useQuery<{ data: { products: Product[] } }>({
    queryKey: ['products', 'new-arrivals'],
    queryFn: async () => {
      const response = await api.get('/api/products?sort=-createdAt&limit=6');
      return response.data;
    },
  });

  const products = (newArrivals?.data?.products || []).slice(0, 6);

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">New Arrivals</h2>
            <p className="text-gray-600 mt-1">Check out the latest footwear trends</p>
          </div>
          <Link
            to="/products?sort=new"
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            View All
          </Link>
        </div>

        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-96 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default NewArrival;
