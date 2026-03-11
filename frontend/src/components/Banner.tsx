import React from 'react';
import { Link } from 'react-router-dom';

interface BannerProps {
  image: string;
  title?: string;
  subtitle?: string;
  link?: string;
  linkType?: 'product' | 'category' | 'external';
  buttonText?: string;
  height?: string;
  overlay?: boolean;
  textPosition?: 'left' | 'center' | 'right';
}

const Banner: React.FC<BannerProps> = ({
  image,
  title,
  subtitle,
  link,
  linkType = 'category',
  buttonText,
  height = 'h-[300px] md:h-[400px]',
  overlay = true,
  textPosition = 'center',
}) => {
  const [imageLoaded, setImageLoaded] = React.useState(false);

  const textPositionClasses = {
    left: 'items-start text-left',
    center: 'items-center text-center',
    right: 'items-end text-right',
  };

  const BannerContent = () => (
    <div className={`relative w-full ${height} overflow-hidden rounded-lg group`}>
      {/* Skeleton loader */}
      {!imageLoaded && (
        <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse" />
      )}

      {/* Image */}
      <img
        src={image}
        alt={title || 'Banner'}
        className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-105 ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        loading="lazy"
        onLoad={() => setImageLoaded(true)}
      />

      {/* Overlay and content */}
      {overlay && (title || subtitle || buttonText) && (
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent flex items-center">
          <div className={`container mx-auto px-4 max-w-7xl flex flex-col ${textPositionClasses[textPosition]}`}>
            <div className="max-w-xl">
              {subtitle && (
                <p className="text-white/90 text-sm md:text-base mb-2 font-medium">
                  {subtitle}
                </p>
              )}
              {title && (
                <h2 className="text-white text-2xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
                  {title}
                </h2>
              )}
              {buttonText && (
                <button className="bg-white text-gray-900 px-6 py-3 rounded-lg font-semibold hover:bg-primary-600 hover:text-white transition-colors inline-block">
                  {buttonText}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (!link) {
    return <BannerContent />;
  }

  if (linkType === 'external') {
    return (
      <a href={link} target="_blank" rel="noopener noreferrer" className="block">
        <BannerContent />
      </a>
    );
  }

  return (
    <Link to={link} className="block">
      <BannerContent />
    </Link>
  );
};

export default Banner;
