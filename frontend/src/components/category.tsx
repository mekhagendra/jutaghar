import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
    return categoriesData.data.slice(0, 9).map(category => ({
      name: category.name,
      image: category.image || 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=400&q=80',
      link: `/products?category=${category.name}`,
    }));
  }, [categoriesData]);

  if (categories.length === 0) return null;

  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 text-center">
          Shop by Category
        </h2>
        <div
          className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {categories.map((category) => (
            <Link
              key={category.name}
              to={category.link}
              className="group flex-shrink-0 flex flex-col items-center gap-2 w-[calc((100%-16px)/3)] sm:w-[calc((100%-32px)/5)] md:w-[calc((100%-48px)/7)] xl:w-[calc((100%-64px)/9)]"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full overflow-hidden transition-transform duration-300 group-hover:scale-[1.2]">
                <img
                  src={category.image}
                  alt={category.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <span className="text-xs sm:text-sm font-medium text-gray-700 text-center truncate w-full group-hover:text-primary-600 transition-colors">
                {category.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Category;
