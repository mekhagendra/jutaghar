import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import Carousel, { CarouselSlide } from '@/components/Carousel';

interface HeroSlide {
  _id: string;
  collectionName: string;
  title: string;
  shopNowUrl: string;
  image: string;
  order: number;
  isActive: boolean;
}

const Hero: React.FC = () => {
  const { data: slidesData } = useQuery<{ data: HeroSlide[] }>({
    queryKey: ['hero-slides'],
    queryFn: async () => {
      const response = await api.get('/api/hero-slides');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const heroSlides: CarouselSlide[] = React.useMemo(() => {
    const slides = slidesData?.data;
    if (!slides || slides.length === 0) return [];

    return slides.map((slide) => ({
      id: slide._id,
      image: slide.image,
      title: slide.title,
      subtitle: slide.collectionName,
      buttonText: 'Shop Now',
      link: slide.shopNowUrl,
      linkType: 'category' as const,
    }));
  }, [slidesData]);

  return (
    <section>
      <Carousel slides={heroSlides} autoPlay interval={5000} />
    </section>
  );
};

export default Hero;
