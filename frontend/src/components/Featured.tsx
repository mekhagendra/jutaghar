import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Product } from '@/types';

const FEATURED_BREAKPOINTS = [
  { query: '(min-width: 1024px)', visibleCount: 4 },
  { query: '(min-width: 768px)', visibleCount: 3 },
  { query: '(min-width: 640px)', visibleCount: 2 },
] as const;

const AUTOPLAY_INTERVAL_MS = 3000;
const MANUAL_PAUSE_MS = 8000;
const SWIPE_THRESHOLD_PX = 50;

const chunkProducts = (products: Product[], size: number) => {
  if (size <= 0) return [];
  const pages: Product[][] = [];
  for (let index = 0; index < products.length; index += size) {
    pages.push(products.slice(index, index + size));
  }
  return pages;
};

const useVisibleCount = () => {
  const [visibleCount, setVisibleCount] = React.useState<number>(() => {
    if (typeof window === 'undefined') return 1;
    return (
      FEATURED_BREAKPOINTS.find(({ query }) => window.matchMedia(query).matches)?.visibleCount ?? 1
    );
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const compute = () =>
      FEATURED_BREAKPOINTS.find(({ query }) => window.matchMedia(query).matches)?.visibleCount ?? 1;

    const lists = FEATURED_BREAKPOINTS.map(({ query }) => window.matchMedia(query));
    const handler = () => setVisibleCount(compute());

    lists.forEach((mql) => mql.addEventListener('change', handler));
    return () => lists.forEach((mql) => mql.removeEventListener('change', handler));
  }, []);

  return visibleCount;
};

const Featured: React.FC = () => {
  const { data: featured, isLoading } = useQuery<{ data: { products: Product[] } }>({
    queryKey: ['products', 'featured'],
    queryFn: async () => {
      const response = await api.get('/api/products?tag=featured&limit=8');
      return response.data;
    },
  });

  const products = React.useMemo(() => featured?.data?.products ?? [], [featured?.data?.products]);
  const visibleCount = useVisibleCount();
  const pages = React.useMemo(() => chunkProducts(products, visibleCount), [products, visibleCount]);

  const [currentPage, setCurrentPage] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);
  const manualPauseTimer = React.useRef<number | null>(null);

  // Re-anchor on breakpoint change: keep the first visible product visible after re-paging.
  const firstVisibleIndexRef = React.useRef(0);
  React.useEffect(() => {
    firstVisibleIndexRef.current = currentPage * visibleCount;
    // We deliberately track this only when currentPage changes; visibleCount changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  React.useEffect(() => {
    if (pages.length === 0) {
      setCurrentPage(0);
      return;
    }
    const targetPage = Math.min(
      Math.floor(firstVisibleIndexRef.current / Math.max(visibleCount, 1)),
      pages.length - 1,
    );
    setCurrentPage(Math.max(targetPage, 0));
  }, [pages.length, visibleCount]);

  // Autoplay
  React.useEffect(() => {
    if (isPaused || pages.length <= 1) return;
    const id = window.setInterval(() => {
      setCurrentPage((p) => (p + 1) % pages.length);
    }, AUTOPLAY_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [isPaused, pages.length]);

  const pauseBriefly = React.useCallback(() => {
    setIsPaused(true);
    if (manualPauseTimer.current) window.clearTimeout(manualPauseTimer.current);
    manualPauseTimer.current = window.setTimeout(() => setIsPaused(false), MANUAL_PAUSE_MS);
  }, []);

  React.useEffect(() => {
    return () => {
      if (manualPauseTimer.current) window.clearTimeout(manualPauseTimer.current);
    };
  }, []);

  const goToPage = React.useCallback(
    (next: number) => {
      if (pages.length === 0) return;
      const wrapped = ((next % pages.length) + pages.length) % pages.length;
      setCurrentPage(wrapped);
      pauseBriefly();
    },
    [pages.length, pauseBriefly],
  );

  const goPrev = React.useCallback(() => goToPage(currentPage - 1), [currentPage, goToPage]);
  const goNext = React.useCallback(() => goToPage(currentPage + 1), [currentPage, goToPage]);

  // Touch swipe
  const touchStartX = React.useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = (e.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
    if (Math.abs(delta) > SWIPE_THRESHOLD_PX) {
      if (delta < 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
  };

  // Keyboard
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goPrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      goNext();
    }
  };

  return (
    <section className="bg-white py-16">
      <div className="container mx-auto px-4">
        {isLoading ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="h-3 w-40 animate-pulse rounded bg-gray-200" />
              <div className="h-9 w-72 animate-pulse rounded bg-gray-200" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="overflow-hidden rounded-[28px] border border-gray-100 bg-white"
                >
                  <div className="aspect-[4/5] animate-pulse bg-gray-100" />
                  <div className="space-y-3 p-5">
                    <div className="h-3 w-20 animate-pulse rounded bg-gray-200" />
                    <div className="h-5 w-3/4 animate-pulse rounded bg-gray-200" />
                    <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
                    <div className="h-6 w-24 animate-pulse rounded bg-gray-200" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : products.length === 0 ? null : (
          <div className="space-y-6">
            <div className="space-y-1">
              <div className="space-y-1">
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                  Featured
                </h2>
                <p className="text-sm font-medium uppercase tracking-[0.28em] text-gray-500">
                  Handpicked for you
                </p>
              </div>
            </div>

            <div className="relative">
              {pages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={goPrev}
                    className="absolute left-0 top-1/2 z-10 hidden h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-md transition-all duration-200 hover:border-gray-300 hover:text-gray-900 hover:shadow-lg active:scale-95 sm:flex"
                    aria-label="Show previous featured products"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    className="absolute right-0 top-1/2 z-10 hidden h-11 w-11 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-md transition-all duration-200 hover:border-gray-300 hover:text-gray-900 hover:shadow-lg active:scale-95 sm:flex"
                    aria-label="Show next featured products"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}

              <div
              className="overflow-hidden focus:outline-none"
              role="region"
              aria-roledescription="carousel"
              aria-label="Featured products"
              tabIndex={0}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
              onFocus={() => setIsPaused(true)}
              onBlur={() => setIsPaused(false)}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
              onKeyDown={onKeyDown}
            >
              <div
                className="flex"
                style={{
                  transform: `translate3d(-${currentPage * 100}%, 0, 0)`,
                  transition: 'transform 700ms cubic-bezier(0.22, 1, 0.36, 1)',
                  willChange: 'transform',
                }}
                aria-live="polite"
              >
                {pages.map((page, pageIndex) => {
                  const isActivePage = pageIndex === currentPage;
                  return (
                    <div
                      key={pageIndex}
                      className="w-full flex-shrink-0"
                      role="group"
                      aria-roledescription="slide"
                      aria-label={`Page ${pageIndex + 1} of ${pages.length}`}
                      aria-hidden={!isActivePage}
                    >
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-2">
                        {page.map((product) => {
                          const imageSrc = product.mainImage || product.images?.[0] || '';
                          const displayPrice = product.salePrice ?? product.price;
                          const hasCampaignPrice =
                            product.onSale === true &&
                            typeof product.salePrice === 'number' &&
                            product.salePrice < product.price;
                          const discountPct = hasCampaignPrice
                            ? Math.round(((product.price - (product.salePrice as number)) / product.price) * 100)
                            : 0;
                          const brandLabel =
                            typeof product.brand === 'string'
                              ? product.brand
                              : product.brand?.name || 'Jutaghar';

                          return (
                            <Link
                              key={product._id}
                              to={`/products/${product._id}`}
                              tabIndex={isActivePage ? 0 : -1}
                              className="group flex flex-col overflow-hidden rounded-[28px] border border-gray-100 bg-white shadow-[0_18px_45px_-28px_rgba(15,23,42,0.45)] transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_24px_60px_-28px_rgba(15,23,42,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                            >
                              <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden bg-gradient-to-br from-stone-50 via-white to-stone-100 p-4 sm:p-5 lg:p-6">
                                {imageSrc ? (
                                  <img
                                    src={imageSrc}
                                    alt={product.name}
                                    className="h-full w-full object-contain transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                                    loading="lazy"
                                    decoding="async"
                                    draggable={false}
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center rounded-2xl border border-dashed border-gray-200 text-sm text-gray-400">
                                    Image unavailable
                                  </div>
                                )}

                                {hasCampaignPrice && (
                                  <span className="absolute left-4 top-4 rounded-full bg-rose-600 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white shadow-sm">
                                    {discountPct}% off
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-col gap-2.5 p-4 sm:p-5">
                                <div className="space-y-2">
                                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">
                                    {brandLabel}
                                  </p>
                                  <h3 className="line-clamp-1 text-base font-semibold leading-6 text-gray-900 sm:text-lg">
                                    {product.name}
                                  </h3>
                                </div>

                                <div className="flex items-end justify-between gap-3 border-t border-gray-100 pt-3">
                                  <div className="space-y-1">
                                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-gray-400">
                                      Starting at
                                    </p>
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                      <span className="text-lg font-bold text-gray-900 sm:text-xl">
                                        {formatCurrency(displayPrice)}
                                      </span>
                                      {hasCampaignPrice && (
                                        <span className="text-sm text-gray-400 line-through">
                                          {formatCurrency(product.price)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            </div>

          </div>
        )}
      </div>
    </section>
  );
};

export default Featured;
