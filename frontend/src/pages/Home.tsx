import React from 'react';
import Why from '@/components/why';
import Hero from '@/components/hero';
import NewArrival from '@/components/NewArrival';
import Featured from '@/components/Featured';
import Sale from '@/components/sale';
import Brands from '@/components/brands';
import BestSeller from '@/components/bestSeller';
import Category from '@/components/category';
import BannerPremium from '@/components/bannerPremium';
import BannerSports from '@/components/bannerSports';
import BannerPromotion from '@/components/bannerPromotion';

const Home: React.FC = () => {
  return (
    <div className="min-h-screen">
      <Hero />

      <BannerPromotion />

      <Featured />

      <NewArrival />

      <Brands />

      <Sale />

      <BannerPremium />

      <BestSeller />

      <BannerSports />

      <Category />

      <Why />
    </div>
  );
};

export default Home;
