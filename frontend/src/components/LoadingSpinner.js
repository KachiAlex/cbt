import React from 'react';

const LoadingSpinner = ({ 
  size = 'medium', 
  color = 'blue', 
  text = '', 
  className = '',
  fullScreen = false 
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
    xlarge: 'w-16 h-16'
  };

  const colorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    red: 'text-red-600',
    yellow: 'text-yellow-600',
    gray: 'text-gray-600',
    white: 'text-white'
  };

  const spinnerClasses = `
    animate-spin rounded-full border-2 border-gray-300 border-t-current
    ${sizeClasses[size]}
    ${colorClasses[color]}
    ${className}
  `.trim();

  const content = (
    <div className="flex flex-col items-center justify-center space-y-2">
      <div className={spinnerClasses}></div>
      {text && (
        <p className={`text-sm ${colorClasses[color]} animate-pulse`}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  return content;
};

// Specialized loading spinners
export const ButtonSpinner = ({ className = '' }) => (
  <svg 
    className={`animate-spin -ml-1 mr-3 h-5 w-5 text-white ${className}`} 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24"
  >
    <circle 
      className="opacity-25" 
      cx="12" 
      cy="12" 
      r="10" 
      stroke="currentColor" 
      strokeWidth="4"
    ></circle>
    <path 
      className="opacity-75" 
      fill="currentColor" 
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
);

export const PageSpinner = ({ text = 'Loading...' }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <LoadingSpinner size="large" text={text} />
  </div>
);

export const InlineSpinner = ({ text = '', className = '' }) => (
  <div className={`flex items-center space-x-2 ${className}`}>
    <LoadingSpinner size="small" />
    {text && <span className="text-sm text-gray-600">{text}</span>}
  </div>
);

export const CardSpinner = ({ text = 'Loading...' }) => (
  <div className="p-8 flex items-center justify-center">
    <LoadingSpinner size="medium" text={text} />
  </div>
);

export default LoadingSpinner;
