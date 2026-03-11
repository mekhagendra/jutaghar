import React from 'react';
import Banner from '@/components/Banner';

const BannerPremium: React.FC = () => {
  return (
    <section className="py-8">
      <div className="container mx-auto px-4">
        <Banner
          image="https://images.unsplash.com/photo-1605348532760-6753d2c43329?w=1920&q=80"
          title="Premium Collection"
          subtitle="Discover Quality Footwear"
          buttonText="Shop Now"
          link="/products?sort=-price"
          linkType="category"
          height="h-[350px]"
          textPosition="left"
        />
      </div>
    </section>
  );
};

export default BannerPremium;
