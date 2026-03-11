import React from 'react';
import Why from '@/components/why';
import Hero from '@/components/hero';
import NewArrival from '@/components/NewArrival';
import Featured from '@/components/Featured';
import Brands from '@/components/brands';
import BestSeller from '@/components/bestSeller';
import Category from '@/components/category';
import BannerPromotion from '@/components/bannerPromotion';
import BannerPremium from '@/components/bannerPremium';
import BannerSports from '@/components/bannerSports';

const Home: React.FC = () => {
  return (
    <div className="min-h-screen">
      <Hero />

      <BannerPromotion />

      <Featured />

      <NewArrival />

      <BannerPremium />

      <BestSeller />

      <BannerSports />

      <Brands />

      <Category />

      <Why />
    </div>
  );
};

export default Home;
