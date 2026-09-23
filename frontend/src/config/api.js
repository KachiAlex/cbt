// API Configuration
const API_CONFIG = {
  // Get API URL from environment variable or use default
  BASE_URL: import.meta.env.VITE_API_URL || '',
  
  // API endpoints
  ENDPOINTS: {
    // Health check
    HEALTH: '/health',
    
    // API info
    API_INFO: '/api',
    
    // Authentication (when you add them)
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    
    // Exams (when you add them)
    EXAMS: '/api/exams',
    EXAM_BY_ID: (id) => `/api/exams/${id}`,
    
    // Questions (when you add them)
    QUESTIONS: '/api/questions',
    QUESTION_BY_ID: (id) => `/api/questions/${id}`,
    
    // Results (when you add them)
    RESULTS: '/api/results',
    RESULT_BY_ID: (id) => `/api/results/${id}`,
    
    // Users (when you add them)
    USERS: '/api/users',
    USER_BY_ID: (id) => `/api/users/${id}`,
  },
  
  // Request configuration
  REQUEST_CONFIG: {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 10000, // 10 seconds
  }
};

// Helper function to build full API URL
export const buildApiUrl = (endpoint) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Helper function to get auth headers
export const getAuthHeaders = (token) => {
  return {
    ...API_CONFIG.REQUEST_CONFIG.headers,
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

// API request helper
export const apiRequest = async (endpoint, options = {}) => {
  const url = buildApiUrl(endpoint);
  const config = {
    ...API_CONFIG.REQUEST_CONFIG,
    ...options,
    headers: {
      ...API_CONFIG.REQUEST_CONFIG.headers,
      ...options.headers,
    },
  };

  const response = await fetch(url, config);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `HTTP error! status: ${response.status}`);
  }
  return payload;
};

export default API_CONFIG; 