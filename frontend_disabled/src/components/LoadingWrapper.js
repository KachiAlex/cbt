import React from 'react';
import { PageSpinner, CardSpinner } from './LoadingSpinner';
import { CardSkeleton, TableSkeleton, ListSkeleton, FormSkeleton, StatsSkeleton } from './SkeletonLoader';

const LoadingWrapper = ({
  loading,
  error,
  children,
  skeleton,
  spinner,
  spinnerText = 'Loading...',
  errorMessage = 'Something went wrong. Please try again.',
  onRetry,
  className = '',
  showError = true,
  showSkeleton = true,
  minHeight = '200px'
}) => {
  // Show error state
  if (error && showError) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 ${className}`} style={{ minHeight }}>
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
          <p className="text-gray-600 mb-4">
            {typeof error === 'string' ? error : errorMessage}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  // Show loading state
  if (loading) {
    if (skeleton) {
      return (
        <div className={className} style={{ minHeight }}>
          {skeleton}
        </div>
      );
    }

    if (spinner) {
      return (
        <div className={`flex items-center justify-center ${className}`} style={{ minHeight }}>
          {spinner}
        </div>
      );
    }

    // Default loading state
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ minHeight }}>
        <CardSpinner text={spinnerText} />
      </div>
    );
  }

  // Show content
  return <div className={className}>{children}</div>;
};

// Specialized loading wrappers
export const PageLoadingWrapper = ({ loading, error, children, onRetry }) => (
  <LoadingWrapper
    loading={loading}
    error={error}
    onRetry={onRetry}
    spinner={<PageSpinner />}
    showSkeleton={false}
    minHeight="100vh"
  >
    {children}
  </LoadingWrapper>
);

export const CardLoadingWrapper = ({ loading, error, children, onRetry, className = '' }) => (
  <LoadingWrapper
    loading={loading}
    error={error}
    onRetry={onRetry}
    skeleton={<CardSkeleton />}
    className={className}
  >
    {children}
  </LoadingWrapper>
);

export const TableLoadingWrapper = ({ loading, error, children, onRetry, rows = 5, columns = 4 }) => (
  <LoadingWrapper
    loading={loading}
    error={error}
    onRetry={onRetry}
    skeleton={<TableSkeleton rows={rows} columns={columns} />}
  >
    {children}
  </LoadingWrapper>
);

export const ListLoadingWrapper = ({ loading, error, children, onRetry, items = 5 }) => (
  <LoadingWrapper
    loading={loading}
    error={error}
    onRetry={onRetry}
    skeleton={<ListSkeleton items={items} />}
  >
    {children}
  </LoadingWrapper>
);

export const FormLoadingWrapper = ({ loading, error, children, onRetry, fields = 4 }) => (
  <LoadingWrapper
    loading={loading}
    error={error}
    onRetry={onRetry}
    skeleton={<FormSkeleton fields={fields} />}
  >
    {children}
  </LoadingWrapper>
);

// Stats loading wrapper
export const StatsLoadingWrapper = ({ loading, error, children, onRetry }) => (
  <LoadingWrapper
    loading={loading}
    error={error}
    onRetry={onRetry}
    skeleton={<StatsSkeleton />}
  >
    {children}
  </LoadingWrapper>
);

// Async data wrapper
export const AsyncDataWrapper = ({ 
  data, 
  loading, 
  error, 
  children, 
  onRetry,
  emptyMessage = 'No data available',
  showEmpty = true,
  className = ''
}) => {
  if (loading) {
    return <LoadingWrapper loading={true} skeleton={<CardSkeleton />} className={className} />;
  }

  if (error) {
    return (
      <LoadingWrapper 
        error={error} 
        onRetry={onRetry} 
        className={className}
      />
    );
  }

  if (!data || (Array.isArray(data) && data.length === 0)) {
    if (!showEmpty) return null;
    
    return (
      <div className={`flex flex-col items-center justify-center p-8 text-gray-500 ${className}`}>
        <div className="text-4xl mb-4">📭</div>
        <p className="text-lg font-medium mb-2">No Data</p>
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return <div className={className}>{children}</div>;
};

// Conditional loading wrapper
export const ConditionalLoadingWrapper = ({ 
  condition, 
  loading, 
  error, 
  children, 
  fallback,
  onRetry,
  className = ''
}) => {
  if (condition) {
    return (
      <LoadingWrapper
        loading={loading}
        error={error}
        onRetry={onRetry}
        className={className}
      >
        {children}
      </LoadingWrapper>
    );
  }

  return fallback || null;
};

// HOC for adding loading states to components
export const withLoadingState = (WrappedComponent, options = {}) => {
  const {
    skeleton = <CardSkeleton />,
    spinner = <CardSpinner />,
    errorMessage = 'Something went wrong',
    showError = true
  } = options;

  return function WithLoadingStateComponent(props) {
    const { loading, error, onRetry, ...restProps } = props;

    return (
      <LoadingWrapper
        loading={loading}
        error={error}
        onRetry={onRetry}
        skeleton={skeleton}
        spinner={spinner}
        errorMessage={errorMessage}
        showError={showError}
      >
        <WrappedComponent {...restProps} />
      </LoadingWrapper>
    );
  };
};

export default LoadingWrapper;
