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
  autoScroll?: boolean;
  autoScrollInterval?: number;
  autoScrollSpeed?: number;
}

const ProductSlider: React.FC<ProductSliderProps> = ({
  products,
  title,
  subtitle,
  itemsPerView = 4,
  showViewAll = false,
  viewAllLink = '/products',
  autoScroll = false,
  autoScrollInterval = 3500,
  autoScrollSpeed = 45,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(true);
  const [isHovered, setIsHovered] = React.useState(false);
  const CARD_GAP_PX = 16;
  const isCircularLoop = autoScroll && products.length > 1;
  const loopProducts = isCircularLoop ? [...products, ...products, ...products] : products;
  const singleSetRef = useRef(0);

  const checkScrollButtons = () => {
    if (isCircularLoop) {
      setCanScrollLeft(true);
      setCanScrollRight(true);
      return;
    }

    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const normalizeLoopPosition = () => {
    const container = scrollContainerRef.current;
    if (!container || !isCircularLoop) return;

    const singleSetWidth = singleSetRef.current;
    if (singleSetWidth <= 0) return;

    // Keep viewport around middle copy so we never reach visual edges.
    if (container.scrollLeft >= singleSetWidth * 2) {
      container.scrollLeft -= singleSetWidth;
    } else if (container.scrollLeft <= singleSetWidth * 0.5) {
      container.scrollLeft += singleSetWidth;
    }
  };

  const getScrollStep = () => {
    const container = scrollContainerRef.current;
    if (!container) return 0;
    const firstCard = container.firstElementChild as HTMLElement | null;
    if (!firstCard) return Math.max(1, container.clientWidth * 0.8);
    return firstCard.offsetWidth + CARD_GAP_PX;
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = getScrollStep();
      const newScrollLeft =
        scrollContainerRef.current.scrollLeft +
        (direction === 'left' ? -scrollAmount : scrollAmount);

      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth',
      });

      setTimeout(() => {
        normalizeLoopPosition();
        checkScrollButtons();
      }, 320);
    }
  };

  React.useEffect(() => {
    checkScrollButtons();
    const container = scrollContainerRef.current;
    if (container && isCircularLoop) {
      singleSetRef.current = container.scrollWidth / 3;
      container.scrollLeft = singleSetRef.current;
    }
    window.addEventListener('resize', checkScrollButtons);
    return () => window.removeEventListener('resize', checkScrollButtons);
  }, [products, isCircularLoop]);

  React.useEffect(() => {
    if (!autoScroll || isHovered || products.length <= 1 || !scrollContainerRef.current) {
      return;
    }

    const container = scrollContainerRef.current;
    let rafId = 0;
    let lastTs = 0;

    const tick = (timestamp: number) => {
      if (!container) return;

      if (!lastTs) {
        lastTs = timestamp;
      }

      const delta = timestamp - lastTs;
      lastTs = timestamp;

      // Move horizontally at a stable px/sec speed independent of frame rate.
      const distance = (autoScrollSpeed * delta) / 1000;
      container.scrollLeft += distance;
      normalizeLoopPosition();
      checkScrollButtons();

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(rafId);
  }, [autoScroll, autoScrollInterval, autoScrollSpeed, isHovered, products.length]);

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
      <div
        className="relative group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
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
          {loopProducts.map((product, index) => (
            <div
              key={`${product._id}-${index}`}
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
