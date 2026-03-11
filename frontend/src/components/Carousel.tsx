import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface CarouselSlide {
  id: string;
  image: string;
  title?: string;
  subtitle?: string;
  link?: string;
  linkType?: 'product' | 'category' | 'external';
  buttonText?: string;
}

interface CarouselProps {
  slides: CarouselSlide[];
  autoPlay?: boolean;
  interval?: number;
  showIndicators?: boolean;
  showControls?: boolean;
  height?: string;
}

const Carousel: React.FC<CarouselProps> = ({
  slides,
  autoPlay = true,
  interval = 5000,
  showIndicators = true,
  showControls = true,
  height = 'h-[400px] md:h-[500px] lg:h-[600px]',
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  useEffect(() => {
    if (autoPlay && !isHovered && slides.length > 1) {
      const timer = setInterval(nextSlide, interval);
      return () => clearInterval(timer);
    }
  }, [autoPlay, interval, isHovered, nextSlide, slides.length]);

  if (slides.length === 0) {
    return (
      <div className={`${height} bg-gray-200 flex items-center justify-center`}>
        <p className="text-gray-500">No slides available</p>
      </div>
    );
  }

  const currentSlideData = slides[currentSlide];

  const SlideContent = () => (
    <div className="relative w-full h-full">
      <img
        src={currentSlideData.image}
        alt={currentSlideData.title || `Slide ${currentSlide + 1}`}
        className="w-full h-full object-cover"
        loading="lazy"
        decoding="async"
      />
      
      {/* Overlay with text */}
      {(currentSlideData.title || currentSlideData.subtitle) && (
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex items-center">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="max-w-xl">
              {currentSlideData.subtitle && (
                <p className="text-white/90 text-sm md:text-base mb-2 font-medium">
                  {currentSlideData.subtitle}
                </p>
              )}
              {currentSlideData.title && (
                <h2 className="text-white text-3xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight">
                  {currentSlideData.title}
                </h2>
              )}
              {currentSlideData.buttonText && currentSlideData.link && (
                <button className="bg-white text-gray-900 px-6 py-3 rounded-lg font-semibold hover:bg-primary-600 hover:text-white transition-colors">
                  {currentSlideData.buttonText}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div
      className={`relative ${height} overflow-hidden`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Slides */}
      {currentSlideData.link ? (
        currentSlideData.linkType === 'external' ? (
          <a href={currentSlideData.link} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
            <SlideContent />
          </a>
        ) : (
          <Link to={currentSlideData.link} className="block w-full h-full">
            <SlideContent />
          </Link>
        )
      ) : (
        <SlideContent />
      )}

      {/* Controls */}
      {showControls && slides.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-6 h-6 text-gray-900" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100"
            aria-label="Next slide"
          >
            <ChevronRight className="w-6 h-6 text-gray-900" />
          </button>
        </>
      )}

      {/* Indicators */}
      {showIndicators && slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentSlide
                  ? 'bg-white w-8'
                  : 'bg-white/50 w-2 hover:bg-white/75'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Carousel;
