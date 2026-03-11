import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from './ProductCard';
import { Product } from '@/types';

interface ProductSliderProps {
  products: Product[];
  title?: string;
  subtitle?: string;
  itemsPerView?: number;
  showViewAll?: boolean;
  viewAllLink?: string;
}

const ProductSlider: React.FC<ProductSliderProps> = ({
  products,
  title,
  subtitle,
  itemsPerView = 4,
  showViewAll = false,
  viewAllLink = '/products',
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(true);

  const checkScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = scrollContainerRef.current.clientWidth * 0.8;
      const newScrollLeft =
        scrollContainerRef.current.scrollLeft +
        (direction === 'left' ? -scrollAmount : scrollAmount);

      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth',
      });

      setTimeout(checkScrollButtons, 300);
    }
  };

  React.useEffect(() => {
    checkScrollButtons();
    window.addEventListener('resize', checkScrollButtons);
    return () => window.removeEventListener('resize', checkScrollButtons);
  }, [products]);

  if (products.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      {/* Header */}
      {(title || subtitle) && (
        <div className="flex justify-between items-end mb-6">
          <div>
            {title && <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{title}</h2>}
            {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
          </div>
          {showViewAll && (
            <a
              href={viewAllLink}
              className="text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
            >
              View All <ChevronRight className="w-4 h-4" />
            </a>
          )}
        </div>
      )}

      {/* Slider */}
      <div className="relative group">
        {/* Left Arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-white shadow-lg rounded-full p-3 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </button>
        )}

        {/* Products Container */}
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
          onScroll={checkScrollButtons}
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {products.map((product) => (
            <div
              key={product._id}
              className="flex-shrink-0"
              style={{
                width: `calc((100% - ${(itemsPerView - 1) * 16}px) / ${itemsPerView})`,
                minWidth: '250px',
              }}
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>

        {/* Right Arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-white shadow-lg rounded-full p-3 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-6 h-6 text-gray-700" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ProductSlider;
