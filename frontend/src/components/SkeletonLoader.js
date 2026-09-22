import React from 'react';

const SkeletonBox = ({ className = '', animate = true }) => (
  <div 
    className={`
      bg-gray-200 rounded
      ${animate ? 'animate-pulse' : ''}
      ${className}
    `.trim()}
  />
);

// Card skeleton
export const CardSkeleton = ({ className = '' }) => (
  <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
    <div className="space-y-4">
      <SkeletonBox className="h-6 w-3/4" />
      <SkeletonBox className="h-4 w-full" />
      <SkeletonBox className="h-4 w-5/6" />
      <div className="flex space-x-2">
        <SkeletonBox className="h-8 w-20" />
        <SkeletonBox className="h-8 w-16" />
      </div>
    </div>
  </div>
);

// Table skeleton
export const TableSkeleton = ({ rows = 5, columns = 4, className = '' }) => (
  <div className={`bg-white rounded-lg shadow overflow-hidden ${className}`}>
    {/* Table header */}
    <div className="bg-gray-50 px-6 py-3 border-b">
      <div className="flex space-x-4">
        {Array.from({ length: columns }).map((_, index) => (
          <SkeletonBox key={index} className="h-4 flex-1" />
        ))}
      </div>
    </div>
    
    {/* Table rows */}
    <div className="divide-y">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="px-6 py-4">
          <div className="flex space-x-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <SkeletonBox key={colIndex} className="h-4 flex-1" />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// List skeleton
export const ListSkeleton = ({ items = 5, className = '' }) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: items }).map((_, index) => (
      <div key={index} className="flex items-center space-x-3 p-3 bg-white rounded-lg shadow">
        <SkeletonBox className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <SkeletonBox className="h-4 w-3/4" />
          <SkeletonBox className="h-3 w-1/2" />
        </div>
        <SkeletonBox className="h-8 w-16" />
      </div>
    ))}
  </div>
);

// Form skeleton
export const FormSkeleton = ({ fields = 4, className = '' }) => (
  <div className={`space-y-6 ${className}`}>
    {Array.from({ length: fields }).map((_, index) => (
      <div key={index} className="space-y-2">
        <SkeletonBox className="h-4 w-1/4" />
        <SkeletonBox className="h-10 w-full" />
      </div>
    ))}
    <div className="flex space-x-3">
      <SkeletonBox className="h-10 w-24" />
      <SkeletonBox className="h-10 w-20" />
    </div>
  </div>
);

// Dashboard stats skeleton
export const StatsSkeleton = ({ className = '' }) => (
  <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
    {Array.from({ length: 4 }).map((_, index) => (
      <div key={index} className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <SkeletonBox className="w-12 h-12 rounded-lg" />
          <div className="ml-4 flex-1">
            <SkeletonBox className="h-4 w-20 mb-2" />
            <SkeletonBox className="h-6 w-16" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

// Chart skeleton
export const ChartSkeleton = ({ className = '' }) => (
  <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
    <div className="space-y-4">
      <SkeletonBox className="h-6 w-1/3" />
      <div className="h-64 flex items-end space-x-2">
        {Array.from({ length: 7 }).map((_, index) => (
          <SkeletonBox 
            key={index} 
            className="flex-1 bg-gray-300" 
            style={{ height: `${Math.random() * 100 + 20}%` }}
          />
        ))}
      </div>
      <div className="flex justify-center space-x-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <SkeletonBox key={index} className="h-4 w-16" />
        ))}
      </div>
    </div>
  </div>
);

// Profile skeleton
export const ProfileSkeleton = ({ className = '' }) => (
  <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
    <div className="flex items-center space-x-4">
      <SkeletonBox className="w-20 h-20 rounded-full" />
      <div className="flex-1 space-y-2">
        <SkeletonBox className="h-6 w-1/3" />
        <SkeletonBox className="h-4 w-1/2" />
        <SkeletonBox className="h-4 w-1/4" />
      </div>
    </div>
    <div className="mt-6 space-y-4">
      <SkeletonBox className="h-4 w-full" />
      <SkeletonBox className="h-4 w-5/6" />
      <SkeletonBox className="h-4 w-4/6" />
    </div>
  </div>
);

// Exam card skeleton
export const ExamCardSkeleton = ({ className = '' }) => (
  <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <SkeletonBox className="h-6 w-3/4" />
          <SkeletonBox className="h-4 w-1/2" />
        </div>
        <SkeletonBox className="w-16 h-6 rounded-full" />
      </div>
      <SkeletonBox className="h-4 w-full" />
      <SkeletonBox className="h-4 w-4/5" />
      <div className="flex items-center justify-between pt-4">
        <div className="flex space-x-2">
          <SkeletonBox className="h-6 w-12" />
          <SkeletonBox className="h-6 w-16" />
        </div>
        <SkeletonBox className="h-8 w-20" />
      </div>
    </div>
  </div>
);

// Question skeleton
export const QuestionSkeleton = ({ className = '' }) => (
  <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
    <div className="space-y-4">
      <SkeletonBox className="h-6 w-1/4" />
      <SkeletonBox className="h-4 w-full" />
      <SkeletonBox className="h-4 w-5/6" />
      <div className="space-y-3 mt-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex items-center space-x-3">
            <SkeletonBox className="w-4 h-4 rounded" />
            <SkeletonBox className="h-4 flex-1" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Generic skeleton wrapper
export const SkeletonWrapper = ({ 
  children, 
  loading, 
  skeleton, 
  className = '' 
}) => {
  if (loading) {
    return <div className={className}>{skeleton}</div>;
  }
  return children;
};

export default SkeletonBox;
