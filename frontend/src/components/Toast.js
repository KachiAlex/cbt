import React, { useState, useEffect, createContext, useContext } from 'react';

// Toast Context
const ToastContext = createContext();

// Toast Provider
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (toast) => {
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      type: 'info',
      duration: 5000,
      ...toast
    };
    
    setToasts(prev => [...prev, newToast]);
    
    // Auto remove toast after duration
    if (newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }
    
    return id;
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const clearAllToasts = () => {
    setToasts([]);
  };

  // Convenience methods
  const success = (message, options = {}) => 
    addToast({ type: 'success', message, ...options });
  
  const error = (message, options = {}) => 
    addToast({ type: 'error', message, ...options });
  
  const warning = (message, options = {}) => 
    addToast({ type: 'warning', message, ...options });
  
  const info = (message, options = {}) => 
    addToast({ type: 'info', message, ...options });

  const value = {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    success,
    error,
    warning,
    info
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

// Toast Hook
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Individual Toast Component
const Toast = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleRemove = () => {
    setIsLeaving(true);
    setTimeout(() => onRemove(toast.id), 300);
  };

  const typeStyles = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: '✅',
      iconBg: 'bg-green-100'
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: '❌',
      iconBg: 'bg-red-100'
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: '⚠️',
      iconBg: 'bg-yellow-100'
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: 'ℹ️',
      iconBg: 'bg-blue-100'
    }
  };

  const styles = typeStyles[toast.type] || typeStyles.info;

  return (
    <div
      className={`
        max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto border-l-4
        ${styles.border}
        transform transition-all duration-300 ease-in-out
        ${isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className={`flex-shrink-0 w-8 h-8 rounded-full ${styles.iconBg} flex items-center justify-center`}>
            <span className="text-sm">{styles.icon}</span>
          </div>
          
          <div className="ml-3 w-0 flex-1">
            {toast.title && (
              <p className="text-sm font-medium text-gray-900">
                {toast.title}
              </p>
            )}
            <p className={`text-sm ${styles.text}`}>
              {toast.message}
            </p>
            
            {toast.action && (
              <div className="mt-2">
                <button
                  onClick={toast.action.onClick}
                  className={`text-sm font-medium ${styles.text} hover:underline`}
                >
                  {toast.action.label}
                </button>
              </div>
            )}
          </div>
          
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={handleRemove}
              className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <span className="sr-only">Close</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Toast Container
const ToastContainer = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          toast={toast}
          onRemove={removeToast}
        />
      ))}
    </div>
  );
};

// Toast Button Component
export const ToastButton = ({ 
  type = 'info', 
  message, 
  title,
  duration = 5000,
  action,
  children,
  className = '',
  ...props
}) => {
  const { addToast } = useToast();

  const handleClick = (e) => {
    e.preventDefault();
    addToast({
      type,
      message,
      title,
      duration,
      action
    });
  };

  return (
    <button
      onClick={handleClick}
      className={className}
      {...props}
    >
      {children}
    </button>
  );
};

// Pre-configured Toast Buttons
export const SuccessToastButton = (props) => (
  <ToastButton type="success" {...props} />
);

export const ErrorToastButton = (props) => (
  <ToastButton type="error" {...props} />
);

export const WarningToastButton = (props) => (
  <ToastButton type="warning" {...props} />
);

export const InfoToastButton = (props) => (
  <ToastButton type="info" {...props} />
);

// Toast for API responses
export const useApiToast = () => {
  const toast = useToast();

  const handleApiResponse = (response, options = {}) => {
    const { 
      successMessage = 'Operation completed successfully',
      errorMessage = 'An error occurred',
      showSuccess = true,
      showError = true
    } = options;

    if (response.success && showSuccess) {
      toast.success(successMessage);
    } else if (!response.success && showError) {
      toast.error(response.message || errorMessage);
    }
  };

  const handleApiError = (error, options = {}) => {
    const { 
      errorMessage = 'An error occurred',
      showError = true
    } = options;

    if (showError) {
      let message = errorMessage;
      
      if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.message) {
        message = error.message;
      }
      
      toast.error(message);
    }
  };

  return {
    handleApiResponse,
    handleApiError,
    ...toast
  };
};

export default Toast;
