import React from 'react';
import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';

const BannerPromotion: React.FC = () => {
  return (
    <section className="bg-gradient-to-r from-amber-600 to-amber-900 text-white py-3 md:py-4">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8">
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-xl sm:text-2xl md:text-4xl font-bold mb-1 md:mb-3">
              Discover Your Perfect Pair
            </h2>
            <p className="text-primary-100 text-sm sm:text-base md:text-lg">
              Footwear & Accessories for Every Step
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
            <Link
              to="/products"
              className="bg-white text-primary-600 px-5 py-2.5 md:px-8 md:py-4 rounded-lg font-semibold hover:bg-primary-50 transition text-center flex items-center gap-2 justify-center text-sm md:text-base"
            >
              <Package className="w-5 h-5" />
              Start Shopping
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BannerPromotion;
