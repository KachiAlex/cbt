import { useState, useCallback, useRef, useEffect } from 'react';

// Loading state manager hook
export const useLoadingState = (initialState = false) => {
  const [loading, setLoading] = useState(initialState);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const timeoutRef = useRef(null);

  const startLoading = useCallback(() => {
    setLoading(true);
    setError(null);
    
    // Set a timeout to prevent infinite loading
    timeoutRef.current = setTimeout(() => {
      setLoading(false);
      setError('Request timed out. Please try again.');
    }, 30000); // 30 second timeout
  }, []);

  const stopLoading = useCallback((error = null, data = null) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    setLoading(false);
    setError(error);
    setData(data);
  }, []);

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    loading,
    error,
    data,
    startLoading,
    stopLoading,
    reset,
    setLoading,
    setError,
    setData
  };
};

// Async operation wrapper
export const useAsyncOperation = () => {
  const { loading, error, data, startLoading, stopLoading, reset } = useLoadingState();

  const execute = useCallback(async (asyncFunction, options = {}) => {
    const { 
      onSuccess, 
      onError, 
      onFinally,
      timeout = 30000 
    } = options;

    try {
      startLoading();
      
      const result = await Promise.race([
        asyncFunction(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Operation timed out')), timeout)
        )
      ]);
      
      stopLoading(null, result);
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
    } catch (err) {
      stopLoading(err);
      
      if (onError) {
        onError(err);
      }
      
      throw err;
    } finally {
      if (onFinally) {
        onFinally();
      }
    }
  }, [startLoading, stopLoading]);

  return {
    loading,
    error,
    data,
    execute,
    reset
  };
};

// Multiple loading states manager
export const useMultipleLoadingStates = (stateKeys = []) => {
  const [states, setStates] = useState(() => {
    const initialStates = {};
    stateKeys.forEach(key => {
      initialStates[key] = {
        loading: false,
        error: null,
        data: null
      };
    });
    return initialStates;
  });

  const setLoading = useCallback((key, loading) => {
    setStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        loading,
        error: loading ? null : prev[key].error
      }
    }));
  }, []);

  const setError = useCallback((key, error) => {
    setStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        loading: false,
        error
      }
    }));
  }, []);

  const setData = useCallback((key, data) => {
    setStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        loading: false,
        error: null,
        data
      }
    }));
  }, []);

  const reset = useCallback((key = null) => {
    if (key) {
      setStates(prev => ({
        ...prev,
        [key]: {
          loading: false,
          error: null,
          data: null
        }
      }));
    } else {
      const resetStates = {};
      stateKeys.forEach(key => {
        resetStates[key] = {
          loading: false,
          error: null,
          data: null
        };
      });
      setStates(resetStates);
    }
  }, [stateKeys]);

  const getState = useCallback((key) => {
    return states[key] || { loading: false, error: null, data: null };
  }, [states]);

  const isAnyLoading = useCallback(() => {
    return Object.values(states).some(state => state.loading);
  }, [states]);

  const hasAnyError = useCallback(() => {
    return Object.values(states).some(state => state.error);
  }, [states]);

  return {
    states,
    setLoading,
    setError,
    setData,
    reset,
    getState,
    isAnyLoading,
    hasAnyError
  };
};

// Debounced loading state
export const useDebouncedLoading = (delay = 300) => {
  const [loading, setLoading] = useState(false);
  const [debouncedLoading, setDebouncedLoading] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (loading) {
      // Start debounced loading after delay
      timeoutRef.current = setTimeout(() => {
        setDebouncedLoading(true);
      }, delay);
    } else {
      // Stop debounced loading immediately
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setDebouncedLoading(false);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [loading, delay]);

  return {
    loading,
    debouncedLoading,
    setLoading
  };
};

// Loading state with retry functionality
export const useRetryableLoading = (maxRetries = 3) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [data, setData] = useState(null);

  const executeWithRetry = useCallback(async (asyncFunction, options = {}) => {
    const { onRetry, onMaxRetriesReached } = options;
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await asyncFunction();
      setData(result);
      setRetryCount(0);
      setLoading(false);
      
      return result;
    } catch (err) {
      setError(err);
      
      if (retryCount < maxRetries) {
        setRetryCount(prev => prev + 1);
        
        if (onRetry) {
          onRetry(retryCount + 1, err);
        }
        
        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, retryCount) * 1000;
        setTimeout(() => {
          executeWithRetry(asyncFunction, options);
        }, delay);
      } else {
        setLoading(false);
        
        if (onMaxRetriesReached) {
          onMaxRetriesReached(err);
        }
      }
      
      throw err;
    }
  }, [retryCount, maxRetries]);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setRetryCount(0);
    setData(null);
  }, []);

  return {
    loading,
    error,
    retryCount,
    data,
    executeWithRetry,
    reset,
    canRetry: retryCount < maxRetries
  };
};

// Loading state for form submissions
export const useFormLoading = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const submit = useCallback(async (submitFunction, options = {}) => {
    const { onSuccess, onError, onFinally } = options;
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);
      
      const result = await submitFunction();
      
      setSuccess(true);
      setLoading(false);
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
    } catch (err) {
      setError(err);
      setLoading(false);
      
      if (onError) {
        onError(err);
      }
      
      throw err;
    } finally {
      if (onFinally) {
        onFinally();
      }
    }
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setSuccess(false);
  }, []);

  return {
    loading,
    error,
    success,
    submit,
    reset
  };
};

export default useLoadingState;
