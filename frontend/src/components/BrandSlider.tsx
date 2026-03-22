import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface Brand {
  id: string;
  name: string;
  logo: string;
  slug: string;
}

interface BrandSliderProps {
  brands: Brand[];
  itemsPerView?: number;
  autoScroll?: boolean;
  scrollInterval?: number;
}

const BrandSlider: React.FC<BrandSliderProps> = ({
  brands,
  itemsPerView = 9,
  autoScroll = false,
  scrollInterval = 3000,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const throttleRef = useRef<number | null>(null);

  const checkScrollButtons = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (throttleRef.current) return;
    throttleRef.current = requestAnimationFrame(() => {
      checkScrollButtons();
      throttleRef.current = null;
    });
  }, [checkScrollButtons]);

  const scroll = useCallback((direction: 'left' | 'right') => {
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
  }, [checkScrollButtons]);

  useEffect(() => {
    checkScrollButtons();
    window.addEventListener('resize', checkScrollButtons);
    return () => window.removeEventListener('resize', checkScrollButtons);
  }, [brands, checkScrollButtons]);

  useEffect(() => {
    return () => {
      if (throttleRef.current) cancelAnimationFrame(throttleRef.current);
    };
  }, []);

  useEffect(() => {
    if (autoScroll && brands.length > itemsPerView) {
      const interval = setInterval(() => {
        if (scrollContainerRef.current) {
          const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
          if (scrollLeft >= scrollWidth - clientWidth - 10) {
            scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
          } else {
            scroll('right');
          }
        }
      }, scrollInterval);
      return () => clearInterval(interval);
    }
  }, [autoScroll, scrollInterval, brands.length, itemsPerView, scroll]);

  const itemWidth = useMemo(
    () => `calc((100% - ${(itemsPerView - 1) * 16}px) / ${itemsPerView})`,
    [itemsPerView]
  );

  return (
    <div className="relative group">
      {/* Left Arrow */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-6 h-6 text-gray-700" />
        </button>
      )}

      {/* Brands Container */}
      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
        onScroll={handleScroll}
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {brands.map((brand) => (
          <Link
            key={brand.id}
            to={`/products?brand=${encodeURIComponent(brand.name)}`}
            className="flex-shrink-0 rounded-lg p-6 hover:shadow-lg transition-shadow flex items-center justify-center"
            style={{
              width: itemWidth,
              minWidth: '120px',
            }}
          >
            <img
              src={brand.logo}
              alt={brand.name}
              className="max-w-full max-h-16 object-contain grayscale hover:grayscale-0 transition-all"
              loading="lazy"
              decoding="async"
            />
          </Link>
        ))}
      </div>

      {/* Right Arrow */}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-6 h-6 text-gray-700" />
        </button>
      )}
    </div>
  );
};

export default React.memo(BrandSlider);
