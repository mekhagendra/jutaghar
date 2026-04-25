import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import { Product } from '@/types';

const Sale: React.FC = () => {
  const { data, isLoading } = useQuery<{ data: { products: Product[] } }>({
    queryKey: ['products', 'on-sale'],
    queryFn: async () => {
      const response = await api.get('/api/products?onSale=true&limit=6');
      return response.data;
    },
  });

  const products = (data?.data?.products || []).slice(0, 6);

  if (!isLoading && products.length === 0) return null;

  return (
    <section className="py-16 bg-olive-300">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">🔥 On Sale</h2>
            <p className="text-gray-700 mt-1">Grab them before they're gone!</p>
          </div>
          <Link
            to="/sale"
            className="text-primary-700 hover:text-primary-800 font-medium"
          >
            View All
          </Link>
        </div>

        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-96 bg-red-100 rounded-lg" />
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Sale;