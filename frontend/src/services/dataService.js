import { apiRequest } from '../config/api';

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

// Default admin user
const DEFAULT_ADMIN = {
  username: "admin",
  password: "admin123",
  role: "admin",
  fullName: "System Administrator",
  email: "admin@healthschool.com"
};

// Fallback data from your MongoDB Atlas backup
const FALLBACK_DATA = {
  users: [
    {
      username: "admin",
      password: "admin123",
      role: "admin",
      fullName: "System Administrator",
      email: "admin@healthschool.com"
    },
    {
      username: "Kachianietie",
      password: "dikaoliver2660",
      fullName: "Onyedikachi Akoma",
      email: "onyedika.akoma@gmail.com",
      role: "student",
      registeredAt: "2025-08-27T10:33:14.936Z"
    },
    {
      username: "Xsta",
      password: "dikaoliver2660",
      fullName: "Esther Isioma Akoma",
      email: "isither22@gmail.com",
      role: "student",
      registeredAt: "2025-08-28T07:51:49.650Z"
    }
  ],
  exams: [
    {
      id: "5140c4a5-9fa9-4d45-b6c9-6da3623140a0",
      title: "Physics Midterm Exam",
      description: "",
      duration: 60,
      questionCount: 50,
      createdAt: "2025-08-27T12:25:51.679Z",
      isActive: true
    },
    {
      id: "345b1112-5512-41c8-a502-3ee544e37e0c",
      title: "English Exam 2nd Semester",
      description: "",
      duration: 60,
      questionCount: 30,
      createdAt: "2025-08-27T13:59:14.202Z",
      isActive: false
    },
    {
      id: "db2a5a11-2976-4783-a7a8-12bf931899f4",
      title: "Nigeria Water Corporation CBT Exam",
      description: "This exam is to test your proficiency in Current Affairs, General Knowledge, and general IQ",
      duration: 60,
      questionCount: 20,
      createdAt: "2025-08-28T08:00:12.373Z",
      isActive: false
    },
    {
      id: "0f72b06b-3c6f-4ab7-ac07-990a5e5deea3",
      title: "CON Exam",
      description: "Upgrade Exam",
      duration: 60,
      questionCount: 43,
      createdAt: "2025-08-28T14:40:16.949Z",
      isActive: false
    }
  ],
  questions: [
    {
      id: "d8e37b4c-3ba5-4800-a4c0-1ec6226d470d",
      text: "If a tank is filled by a pipe in 6 hours and emptied by another pipe in 9 hours, how long will it take to fill the tank if both pipes are opened together?",
      options: ["18 hours", "12 hours", "9 hours", "18/5 hours"],
      correctIndex: 1
    },
    {
      id: "485a58d0-a7e2-489b-bfc5-d9c55625a089",
      text: "What is 25% of 240?",
      options: ["60", "80", "100", "120"],
      correctIndex: 0
    }
  ],
  results: [
    {
      username: "Kachianietie",
      score: 38,
      total: 43,
      percent: 88,
      submittedAt: "2025-08-27T12:31:43.504Z",
      examTitle: "Physics Midterm Exam"
    }
  ]
};

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
  const users = getFromLS(LS_KEYS.USERS);
  const exams = getFromLS(LS_KEYS.EXAMS);
  const questions = getFromLS(LS_KEYS.QUESTIONS);
  const results = getFromLS(LS_KEYS.RESULTS);

  // Only initialize if explicitly requested (not automatically)
  // This allows for a truly clean start when database is cleared
  if (!users && process.env.REACT_APP_INITIALIZE_DATA === 'true') {
    setToLS(LS_KEYS.USERS, FALLBACK_DATA.users);
    console.log('📦 Initialized users in localStorage');
  }
  if (!exams && process.env.REACT_APP_INITIALIZE_DATA === 'true') {
    setToLS(LS_KEYS.EXAMS, FALLBACK_DATA.exams);
    console.log('📦 Initialized exams in localStorage');
  }
  if (!questions && process.env.REACT_APP_INITIALIZE_DATA === 'true') {
    setToLS(LS_KEYS.QUESTIONS, FALLBACK_DATA.questions);
    console.log('📦 Initialized questions in localStorage');
  }
  if (!results && process.env.REACT_APP_INITIALIZE_DATA === 'true') {
    setToLS(LS_KEYS.RESULTS, FALLBACK_DATA.results);
    console.log('📦 Initialized results in localStorage');
  }
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