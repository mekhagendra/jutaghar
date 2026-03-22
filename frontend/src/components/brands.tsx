import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import BrandSlider, { Brand } from '@/components/BrandSlider';

const Brands: React.FC = () => {
  const { data: brandsData } = useQuery<{ data: Array<{ _id: string; name: string; logo?: string; slug: string }> }>({
    queryKey: ['brands', 'active'],
    queryFn: async () => {
      const response = await api.get('/api/catalog/brands?status=active');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const brands: Brand[] = React.useMemo(() => {
    if (!brandsData?.data) return [];
    return brandsData.data.map(brand => ({
      id: brand._id,
      name: brand.name,
      logo: brand.logo || `https://via.placeholder.com/150?text=${brand.name}`,
      slug: brand.slug,
    }));
  }, [brandsData]);

  if (brands.length === 0) return null;

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Shop By Brands
          </h2>
          <p className="text-gray-600">Shop your favorite footwear brands</p>
        </div>
        <BrandSlider brands={brands} itemsPerView={9} />
      </div>
    </section>
  );
};

export default Brands;
