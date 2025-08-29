

// Configuration - TEMPORARILY DISABLED FOR LOADING FIX
const USE_API = false; // process.env.REACT_APP_USE_API === 'true' || process.env.NODE_ENV === 'production';
const API_BASE = process.env.REACT_APP_API_URL || 'https://cbt-rew7.onrender.com';

// LocalStorage keys
const LS_KEYS = {
  EXAMS: "cbt_exams_v1",
  QUESTIONS: "cbt_questions_v1", 
  RESULTS: "cbt_results_v1",
  USERS: "cbt_users_v1",
  STUDENT_REGISTRATIONS: "cbt_student_registrations_v1"
};

// Default admin user (referenced in comments)
// username: "admin"
// password: "admin123"
// role: "admin"
// fullName: "System Administrator"
// email: "admin@healthschool.com"



// Helper functions for localStorage
const getFromLS = (key) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

const setToLS = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
};

// Initialize localStorage with fallback data if empty
const initializeLocalStorage = () => {
  // Completely disabled fallback data initialization
  // This ensures a truly clean start when database is cleared
  console.log('🚫 Fallback data initialization disabled - keeping localStorage clean');
};

// API wrapper with fallback to localStorage
const apiCall = async (endpoint, options = {}) => {
  if (!USE_API) {
    console.log('Using localStorage fallback for:', endpoint);
    return null; // Will trigger localStorage fallback
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.warn('API call failed, falling back to localStorage:', error.message);
    return null; // Will trigger localStorage fallback
  }
};

// Data service functions
export const dataService = {
  // User management
  loadUsers: async () => {
    initializeLocalStorage(); // Ensure data exists
    const apiData = await apiCall('/api/users');
    if (apiData) return apiData;

    // Fallback to localStorage
    const saved = getFromLS(LS_KEYS.USERS);
    return saved || [];
  },

  saveUsers: async (users) => {
    // For now, only save to localStorage
    // TODO: Implement API POST/PUT for users
    return setToLS(LS_KEYS.USERS, users);
  },

  // Exam management
  loadExams: async () => {
    initializeLocalStorage(); // Ensure data exists
    const apiData = await apiCall('/api/exams');
    if (apiData) return apiData;

    // Fallback to localStorage
    const saved = getFromLS(LS_KEYS.EXAMS);
    return saved || [];
  },

  saveExams: async (exams) => {
    // For now, only save to localStorage
    // TODO: Implement API POST/PUT for exams
    return setToLS(LS_KEYS.EXAMS, exams);
  },

  // Questions management
  loadQuestions: async () => {
    initializeLocalStorage(); // Ensure data exists
    const apiData = await apiCall('/api/questions');
    if (apiData) return apiData;

    // Fallback to localStorage
    const saved = getFromLS(LS_KEYS.QUESTIONS);
    return saved || [];
  },

  saveQuestions: async (questions) => {
    // For now, only save to localStorage
    // TODO: Implement API POST/PUT for questions
    return setToLS(LS_KEYS.QUESTIONS, questions);
  },

  // Results management
  loadResults: async () => {
    initializeLocalStorage(); // Ensure data exists
    const apiData = await apiCall('/api/results');
    if (apiData) return apiData;

    // Fallback to localStorage
    const saved = getFromLS(LS_KEYS.RESULTS);
    return saved || [];
  },

  saveResults: async (results) => {
    // For now, only save to localStorage
    // TODO: Implement API POST/PUT for results
    return setToLS(LS_KEYS.RESULTS, results);
  },

  // Student registrations
  loadStudentRegistrations: async () => {
    // This is typically only stored locally
    const saved = getFromLS(LS_KEYS.STUDENT_REGISTRATIONS);
    return saved || [];
  },

  saveStudentRegistrations: async (registrations) => {
    return setToLS(LS_KEYS.STUDENT_REGISTRATIONS, registrations);
  },

  // Authentication
  authenticateUser: async (username, password) => {
    const users = await dataService.loadUsers();
    const normalized = (username || "").trim().toLowerCase();
    const user = users.find(u => (u.username || "").toLowerCase() === normalized);
    
    if (!user) return null;
    if (user.password !== password) return null;
    
    return { 
      username: user.username, 
      role: user.role, 
      fullName: user.fullName, 
      email: user.email 
    };
  },

  // Utility functions
  createExam: async (examData) => {
    const exams = await dataService.loadExams();
    const newExam = {
      id: crypto.randomUUID(),
      ...examData,
      createdAt: new Date().toISOString(),
      isActive: false
    };
    exams.push(newExam);
    await dataService.saveExams(exams);
    return newExam;
  },

  // Active exam management
  getActiveExam: () => {
    const saved = getFromLS(LS_KEYS.ACTIVE_EXAM);
    return saved || null;
  },

  setActiveExam: (examId) => {
    return setToLS(LS_KEYS.ACTIVE_EXAM, examId);
  },

  clearActiveExam: () => {
    localStorage.removeItem(LS_KEYS.ACTIVE_EXAM);
  },

  updateExam: async (examId, updates) => {
    const exams = await dataService.loadExams();
    const updatedExams = exams.map(exam => 
      exam.id === examId ? { ...exam, ...updates } : exam
    );
    await dataService.saveExams(updatedExams);
  },

  deleteExam: async (examId) => {
    const exams = await dataService.loadExams();
    const filteredExams = exams.filter(exam => exam.id !== examId);
    await dataService.saveExams(filteredExams);
  },

  // Health check
  healthCheck: async () => {
    try {
      const response = await fetch(`${API_BASE}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
};

export default dataService; 