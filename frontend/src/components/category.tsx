import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import api from '@/lib/api';

const Category: React.FC = () => {
  const { data: categoriesData } = useQuery<{ data: Array<{ _id: string; name: string; slug: string; image?: string }> }>({
    queryKey: ['categories', 'active'],
    queryFn: async () => {
      const response = await api.get('/api/catalog/categories?status=active');
      return response.data;
    },
  });

  const categories = React.useMemo(() => {
    if (!categoriesData?.data) return [];
    return categoriesData.data.slice(0, 6).map(category => ({
      name: category.name,
      image: category.image || 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=400&q=80',
      link: `/products?category=${category.name}`,
    }));
  }, [categoriesData]);

  if (categories.length === 0) return null;

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 text-center">
          Shop by Category
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((category) => (
            <Link
              key={category.name}
              to={category.link}
              className="group relative aspect-square rounded-lg overflow-hidden"
            >
              <img
                src={category.image}
                alt={category.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
                <div className="p-4 w-full">
                  <h3 className="text-white font-semibold text-lg flex items-center justify-between">
                    {category.name}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </h3>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Category;
