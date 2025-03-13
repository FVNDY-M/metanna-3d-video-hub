
import React from 'react';
import { Link } from 'react-router-dom';

interface MetannaLogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'auth';
}

const MetannaLogo: React.FC<MetannaLogoProps> = ({ 
  size = 'md',
  variant = 'default'
}) => {
  const sizeClasses = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-12'
  };

  return (
    <Link to="/" className={`flex items-center gap-2 ${variant === 'auth' ? 'justify-center' : ''}`}>
      <div className={`relative ${variant === 'auth' ? 'w-16 h-16' : 'w-10 h-10'} bg-metanna-blue rounded-xl flex items-center justify-center overflow-hidden`}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`w-7 h-7 ${variant === 'auth' ? 'scale-150' : 'scale-100'} text-white`}
        >
          <path
            d="M12 2L20 7V17L12 22L4 17V7L12 2Z"
            stroke="currentColor"
            strokeWidth="2"
            fill="rgba(255,255,255,0.1)"
          />
          <path
            d="M12 6L16 8.5V13.5L12 16L8 13.5V8.5L12 6Z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="0.5"
          />
        </svg>
      </div>
      <span className={`font-semibold tracking-wider ${variant === 'auth' ? 'text-2xl' : 'text-xl'} ${variant === 'default' ? sizeClasses[size] : ''}`}>
        METANNA
      </span>
    </Link>
  );
};

export default MetannaLogo;
