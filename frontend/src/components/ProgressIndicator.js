import React, { useState, useEffect } from 'react';

const ProgressIndicator = ({ 
  progress = 0, 
  total = 100, 
  showPercentage = true, 
  showSteps = false,
  steps = [],
  currentStep = 0,
  color = 'blue',
  size = 'medium',
  animated = true,
  className = ''
}) => {
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setDisplayProgress(progress);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setDisplayProgress(progress);
    }
  }, [progress, animated]);

  const percentage = Math.min(Math.max((displayProgress / total) * 100, 0), 100);

  const sizeClasses = {
    small: 'h-2',
    medium: 'h-3',
    large: 'h-4'
  };

  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    red: 'bg-red-600',
    yellow: 'bg-yellow-600',
    gray: 'bg-gray-600',
    purple: 'bg-purple-600'
  };

  const progressBarClasses = `
    w-full bg-gray-200 rounded-full overflow-hidden
    ${sizeClasses[size]}
    ${className}
  `.trim();

  const progressFillClasses = `
    h-full transition-all duration-500 ease-out
    ${colorClasses[color]}
    ${animated ? 'animate-pulse' : ''}
  `.trim();

  return (
    <div className="w-full">
      {/* Progress Bar */}
      <div className={progressBarClasses}>
        <div 
          className={progressFillClasses}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Progress Info */}
      <div className="flex justify-between items-center mt-2">
        {showPercentage && (
          <span className="text-sm text-gray-600">
            {Math.round(percentage)}%
          </span>
        )}
        
        {showSteps && steps.length > 0 && (
          <span className="text-sm text-gray-600">
            Step {currentStep + 1} of {steps.length}
          </span>
        )}
      </div>

      {/* Steps */}
      {showSteps && steps.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={index} className="flex flex-col items-center">
                <div 
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${index <= currentStep 
                      ? `${colorClasses[color]} text-white` 
                      : 'bg-gray-200 text-gray-500'
                    }
                  `}
                >
                  {index < currentStep ? '✓' : index + 1}
                </div>
                <span 
                  className={`
                    text-xs mt-1 text-center
                    ${index <= currentStep ? 'text-gray-900' : 'text-gray-500'}
                  `}
                >
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Circular Progress Indicator
export const CircularProgress = ({ 
  progress = 0, 
  total = 100, 
  size = 120, 
  strokeWidth = 8,
  color = 'blue',
  showPercentage = true,
  text = '',
  className = ''
}) => {
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayProgress(progress);
    }, 100);
    return () => clearTimeout(timer);
  }, [progress]);

  const percentage = Math.min(Math.max((displayProgress / total) * 100, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const colorClasses = {
    blue: 'stroke-blue-600',
    green: 'stroke-green-600',
    red: 'stroke-red-600',
    yellow: 'stroke-yellow-600',
    gray: 'stroke-gray-600',
    purple: 'stroke-purple-600'
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative">
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-gray-200"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className={`${colorClasses[color]} transition-all duration-500 ease-out`}
            strokeLinecap="round"
          />
        </svg>
        
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {showPercentage && (
            <span className="text-2xl font-bold text-gray-900">
              {Math.round(percentage)}%
            </span>
          )}
          {text && (
            <span className="text-sm text-gray-600 mt-1">
              {text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Step Progress Indicator
export const StepProgress = ({ 
  steps = [], 
  currentStep = 0, 
  color = 'blue',
  className = ''
}) => {
  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    red: 'bg-red-600',
    yellow: 'bg-yellow-600',
    gray: 'bg-gray-600',
    purple: 'bg-purple-600'
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={index} className="flex flex-col items-center flex-1">
            {/* Step circle */}
            <div className="relative">
              <div 
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium border-2
                  ${index <= currentStep 
                    ? `${colorClasses[color]} text-white border-transparent` 
                    : 'bg-white text-gray-500 border-gray-300'
                  }
                `}
              >
                {index < currentStep ? '✓' : index + 1}
              </div>
              
              {/* Connecting line */}
              {index < steps.length - 1 && (
                <div 
                  className={`
                    absolute top-5 left-10 w-full h-0.5 -z-10
                    ${index < currentStep ? colorClasses[color] : 'bg-gray-300'}
                  `}
                />
              )}
            </div>
            
            {/* Step label */}
            <div className="mt-2 text-center">
              <div 
                className={`
                  text-sm font-medium
                  ${index <= currentStep ? 'text-gray-900' : 'text-gray-500'}
                `}
              >
                {step.title}
              </div>
              {step.description && (
                <div className="text-xs text-gray-500 mt-1">
                  {step.description}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// File Upload Progress
export const FileUploadProgress = ({ 
  progress = 0, 
  fileName = '', 
  status = 'uploading',
  onCancel,
  className = ''
}) => {
  const statusColors = {
    uploading: 'blue',
    success: 'green',
    error: 'red',
    cancelled: 'gray'
  };

  const statusIcons = {
    uploading: '⏳',
    success: '✅',
    error: '❌',
    cancelled: '⏹️'
  };

  return (
    <div className={`bg-white rounded-lg border p-4 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{statusIcons[status]}</span>
          <span className="text-sm font-medium text-gray-900 truncate">
            {fileName}
          </span>
        </div>
        
        {status === 'uploading' && onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>
      
      <ProgressIndicator 
        progress={progress} 
        color={statusColors[status]}
        showPercentage={true}
      />
      
      {status === 'error' && (
        <p className="text-sm text-red-600 mt-2">
          Upload failed. Please try again.
        </p>
      )}
    </div>
  );
};

export default ProgressIndicator;
