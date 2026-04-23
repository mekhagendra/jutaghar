import React from 'react';
import { Link } from 'react-router-dom';
import { Store, Package } from 'lucide-react';

const BannerPromotion: React.FC = () => {
  return (
    <section className="bg-gradient-to-r from-amber-600 to-amber-900 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              Discover Your Perfect Pair
            </h2>
            <p className="text-primary-100 text-lg">
              Shop from thousands of styles across all categories
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              to="/products"
              className="bg-white text-primary-600 px-8 py-4 rounded-lg font-semibold hover:bg-primary-50 transition text-center flex items-center gap-2 justify-center"
            >
              <Package className="w-5 h-5" />
              Start Shopping
            </Link>
            <Link
              to="/register"
              className="bg-primary-700 text-white px-8 py-4 rounded-lg font-semibold hover:bg-primary-900 transition border-2 border-white text-center flex items-center gap-2 justify-center"
            >
              <Store className="w-5 h-5" />
              Become Vendor
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BannerPromotion;
