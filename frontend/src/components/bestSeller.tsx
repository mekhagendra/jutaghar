import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import { Product } from '@/types';

const BestSeller: React.FC = () => {
  const { data: bestSellers, isLoading } = useQuery<{ data: { products: Product[] } }>({
    queryKey: ['products', 'best-sellers'],
    queryFn: async () => {
      const response = await api.get('/api/products?sort=-rating&limit=6');
      return response.data;
    },
  });

  const products = (bestSellers?.data?.products || []).slice(0, 6);

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Best Sellers</h2>
            <p className="text-gray-600 mt-1">Most popular choices by customers</p>
          </div>
          <Link
            to="/products?tag=best-seller"
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

export default BestSeller;
