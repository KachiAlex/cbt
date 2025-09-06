

// Configuration - Local Database for CBTlocal
const USE_API = process.env.REACT_APP_USE_API === 'true'; // Controlled via environment variable
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
  console.log('🔧 Initializing localStorage...');
  
  // Check if admin user exists, create if not
  const users = getFromLS(LS_KEYS.USERS) || [];
  const adminExists = users.some(user => user.username === 'admin' && user.role === 'admin');
  const studentExists = users.some(user => user.username === 'student1' && user.role === 'student');
  
  if (!adminExists) {
    console.log('👤 Creating default admin user in localStorage...');
    const defaultAdmin = {
      username: "admin",
      password: "admin123",
      role: "admin",
      fullName: "System Administrator",
      email: "admin@healthschool.com",
      createdAt: new Date().toISOString(),
      isDefaultAdmin: true,
      canDeleteDefaultAdmin: true
    };
    
    users.push(defaultAdmin);
    console.log('✅ Default admin user created in localStorage');
  } else {
    console.log('👤 Admin user already exists in localStorage');
  }
  
  if (!studentExists) {
    console.log('👤 Creating test student user in localStorage...');
    const testStudent = {
      username: "student1",
      password: "student123",
      role: "student",
      fullName: "Test Student",
      email: "student1@healthschool.com",
      createdAt: new Date().toISOString(),
      isDefaultAdmin: false
    };
    
    users.push(testStudent);
    console.log('✅ Test student user created in localStorage');
  } else {
    console.log('👤 Test student user already exists in localStorage');
  }
  
  setToLS(LS_KEYS.USERS, users);
};

// Connection status tracking
let connectionStatus = {
  apiAvailable: false,
  databaseConnected: false,
  lastChecked: null,
  error: null
};

// API wrapper with enhanced error handling and fallback to localStorage
const apiCall = async (endpoint, options = {}) => {
  console.log('🔧 API Configuration:', { USE_API, API_BASE });
  
  if (!USE_API) {
    console.log('Using localStorage fallback for:', endpoint);
    connectionStatus.apiAvailable = false;
    return null; // Will trigger localStorage fallback
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    console.log(`🌐 Making API call to: ${API_BASE}${endpoint}`);
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      signal: controller.signal,
      ...options
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`❌ API call failed with status: ${response.status} ${response.statusText}`);
      
      // Update connection status based on error type
      if (response.status >= 500) {
        connectionStatus.databaseConnected = false;
        connectionStatus.error = `Server error: ${response.status}`;
      } else if (response.status === 404) {
        connectionStatus.apiAvailable = true;
        connectionStatus.error = 'Endpoint not found';
      }
      
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ API call successful: ${endpoint}`, data);
    
    // Update connection status on success
    connectionStatus.apiAvailable = true;
    connectionStatus.databaseConnected = true;
    connectionStatus.error = null;
    connectionStatus.lastChecked = new Date().toISOString();
    
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Update connection status based on error type
    if (error.name === 'AbortError') {
      connectionStatus.error = 'Request timeout';
    } else if (error.message.includes('Failed to fetch')) {
      connectionStatus.apiAvailable = false;
      connectionStatus.error = 'Network error - API server unreachable';
    } else {
      connectionStatus.error = error.message;
    }
    
    connectionStatus.lastChecked = new Date().toISOString();
    
    console.warn(`❌ API call failed for ${endpoint}, falling back to localStorage:`, error.message);
    return null; // Will trigger localStorage fallback
  }
};

// Data service functions
export const dataService = {
  // Connection status management
  checkApiConnection: async () => {
    console.log('🔍 Checking API connection status...');
    try {
      const response = await fetch(`${API_BASE}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (response.ok) {
        const healthData = await response.json();
        connectionStatus.apiAvailable = true;
        connectionStatus.databaseConnected = healthData.database?.status?.connected || false;
        connectionStatus.error = null;
        connectionStatus.lastChecked = new Date().toISOString();
        
        console.log('✅ API connection check successful:', healthData);
        return {
          status: 'connected',
          apiAvailable: true,
          databaseConnected: connectionStatus.databaseConnected,
          healthData
        };
      } else {
        throw new Error(`Health check failed: ${response.status}`);
      }
    } catch (error) {
      connectionStatus.apiAvailable = false;
      connectionStatus.databaseConnected = false;
      connectionStatus.error = error.message;
      connectionStatus.lastChecked = new Date().toISOString();
      
      console.warn('❌ API connection check failed:', error.message);
      return {
        status: 'disconnected',
        apiAvailable: false,
        databaseConnected: false,
        error: error.message
      };
    }
  },

  getConnectionStatus: () => {
    return { ...connectionStatus };
  },

  // User management
  loadUsers: async () => {
    console.log('📋 Loading users...');
    initializeLocalStorage(); // Ensure data exists
    const apiData = await apiCall('/api/users');
    
    if (apiData) {
      console.log('🌐 Loaded users from API:', apiData.length);
      // Check if any admin exists in cloud data
      const adminExists = apiData.some(user => user.role === 'admin');
      console.log('👤 Admin exists in cloud data:', adminExists);
      return apiData;
    }

    // Fallback to localStorage
    console.log('💾 Loading users from localStorage...');
    const saved = getFromLS(LS_KEYS.USERS);
    let users = saved || [];
    console.log('💾 Users from localStorage:', users.length);
    
    // Check if any admin exists in localStorage
    const adminExists = users.some(user => user.role === 'admin');
    console.log('👤 Admin exists in localStorage:', adminExists);
    
    if (!adminExists) {
      const defaultAdmin = {
        username: "admin",
        password: "admin123",
        role: "admin",
        fullName: "System Administrator",
        email: "admin@healthschool.com",
        createdAt: new Date().toISOString(),
        isDefaultAdmin: true,
        canDeleteDefaultAdmin: true
      };
      users.push(defaultAdmin);
      setToLS(LS_KEYS.USERS, users);
      console.log('👤 Default admin user created in localStorage (fallback)');
    }
    
    console.log('📋 Final users array:', users.map(u => ({ username: u.username, role: u.role })));
    return users;
  },

  saveUsers: async (users) => {
    // Try API first, fallback to localStorage
    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE}/api/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(users)
        });
        if (response.ok) {
          console.log('✅ Users saved to cloud database');
          return true;
        }
      } catch (error) {
        console.warn('Failed to save users to API, using localStorage:', error.message);
      }
    }
    return setToLS(LS_KEYS.USERS, users);
  },

  // Exam management
  loadExams: async () => {
    console.log('📋 Loading exams...');
    initializeLocalStorage(); // Ensure data exists
    const apiData = await apiCall('/api/exams');
    if (apiData) {
      console.log('📋 Loaded exams from API:', apiData);
      return apiData;
    }

    // Fallback to localStorage
    const saved = getFromLS(LS_KEYS.EXAMS);
    console.log('📋 Loaded exams from localStorage:', saved);
    return saved || [];
  },

  saveExams: async (exams) => {
    console.log('💾 Saving exams:', exams);
    
    // Try API first, fallback to localStorage
    if (USE_API) {
      try {
        console.log('🌐 Attempting to save exams to API...');
        const response = await fetch(`${API_BASE}/api/exams`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(exams)
        });
        if (response.ok) {
          console.log('✅ Exams saved to cloud database');
          return true;
        } else {
          console.warn('❌ API save failed with status:', response.status);
        }
      } catch (error) {
        console.warn('Failed to save exams to API, using localStorage:', error.message);
      }
    }
    
    console.log('💾 Falling back to localStorage save...');
    const result = setToLS(LS_KEYS.EXAMS, exams);
    console.log('💾 localStorage save result:', result);
    return result;
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
    // Try API first, fallback to localStorage
    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE}/api/questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(questions)
        });
        if (response.ok) {
          console.log('✅ Questions saved to cloud database');
          return true;
        }
      } catch (error) {
        console.warn('Failed to save questions to API, using localStorage:', error.message);
      }
    }
    return setToLS(LS_KEYS.QUESTIONS, questions);
  },

  // Per-exam questions management
  loadQuestionsForExam: async (examId) => {
    console.log('📋 Loading questions for exam:', examId);
    try {
      const allQuestions = await dataService.loadQuestions();
      console.log('📋 All questions loaded:', allQuestions.length);
      console.log('📋 Sample questions:', allQuestions.slice(0, 2).map(q => ({ id: q.id, examId: q.examId, text: q.text?.substring(0, 50) })));
      
      const examQuestions = allQuestions.filter(q => q.examId === examId);
      console.log(`📋 Found ${examQuestions.length} questions for exam ${examId}`);
      
      // If no questions found, try to find questions without examId (fallback for old data)
      if (examQuestions.length === 0) {
        console.log('⚠️ No questions found with examId, checking for questions without examId...');
        const questionsWithoutExamId = allQuestions.filter(q => !q.examId);
        console.log(`📋 Found ${questionsWithoutExamId.length} questions without examId`);
        
        // If there are questions without examId, assume they belong to this exam
        if (questionsWithoutExamId.length > 0) {
          console.log('📋 Using questions without examId as fallback');
          return questionsWithoutExamId;
        }
      }
      
      return examQuestions;
    } catch (error) {
      console.error('❌ Error loading questions for exam:', error);
      return [];
    }
  },

  saveQuestionsForExam: async (examId, questions) => {
    console.log('💾 Saving questions for exam:', examId, 'Count:', questions.length);
    try {
      // Load all questions first
      const allQuestions = await dataService.loadQuestions();
      console.log('💾 Current total questions:', allQuestions.length);
      
      // Remove existing questions for this exam
      const otherQuestions = allQuestions.filter(q => q.examId !== examId);
      console.log('💾 Questions not for this exam:', otherQuestions.length);
      
      // Add examId to each question
      const examQuestionsWithId = questions.map(q => ({
        ...q,
        examId: examId,
        id: q.id || Date.now().toString(36) + Math.random().toString(36).substr(2)
      }));
      
      console.log('💾 Questions with examId added:', examQuestionsWithId.length);
      console.log('💾 Sample question with examId:', examQuestionsWithId[0]);
      
      // Combine and save
      const updatedQuestions = [...otherQuestions, ...examQuestionsWithId];
      console.log('💾 Total questions after combining:', updatedQuestions.length);
      
      const result = await dataService.saveQuestions(updatedQuestions);
      
      console.log('💾 Questions saved for exam:', examId, 'Result:', result);
      return result;
    } catch (error) {
      console.error('❌ Error saving questions for exam:', error);
      return false;
    }
  },

  // Results management
  loadResults: async () => {
    console.log('📊 dataService: Loading results...');
    initializeLocalStorage(); // Ensure data exists
    const apiData = await apiCall('/api/results');
    if (apiData) {
      console.log('📊 dataService: Loaded results from API:', apiData.length);
      return apiData;
    }

    // Fallback to localStorage
    const saved = getFromLS(LS_KEYS.RESULTS);
    console.log('📊 dataService: Loaded results from localStorage:', saved?.length || 0);
    return saved || [];
  },

  saveResults: async (results) => {
    console.log('💾 dataService: Saving results:', results?.length || 0);
    // Try API first, fallback to localStorage
    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE}/api/results`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(results)
        });
        if (response.ok) {
          console.log('✅ Results saved to cloud database');
          return true;
        }
      } catch (error) {
        console.warn('Failed to save results to API, using localStorage:', error.message);
      }
    }
    const result = setToLS(LS_KEYS.RESULTS, results);
    console.log('💾 dataService: Results saved to localStorage:', result);
    return result;
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



  // Utility functions
  createExam: async (examData) => {
    try {
      console.log('📝 Creating exam with data:', examData);
      
      const exams = await dataService.loadExams();
      console.log('📋 Current exams:', exams);
      
      // Generate a unique ID (compatible with all browsers)
      const generateId = () => {
        // Use timestamp + random for better compatibility across all environments
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
      };
      
      const newExam = {
        id: generateId(),
        ...examData,
        createdAt: new Date().toISOString(),
        isActive: false
      };
      
      console.log('🆔 Generated exam ID:', newExam.id);
      console.log('📝 New exam object:', newExam);
      
      exams.push(newExam);
      console.log('📋 Updated exams array:', exams);
      
      const saveResult = await dataService.saveExams(exams);
      console.log('💾 Save result:', saveResult);
      
      if (saveResult) {
        console.log('✅ Exam created and saved successfully');
        return newExam;
      } else {
        throw new Error('Failed to save exam');
      }
    } catch (error) {
      console.error('❌ Error in createExam:', error);
      throw error;
    }
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
      console.log('🔍 Checking API health...');
      const response = await fetch(`${API_BASE}/health`);
      const isHealthy = response.ok;
      console.log(`API health check: ${isHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);
      return isHealthy;
    } catch (error) {
      console.log('❌ API health check failed:', error.message);
      return false;
    }
  },

  // Check API connection and configuration
  checkApiConnection: async () => {
    try {
      console.log('🔍 Checking API connection...');
      console.log('API Base URL:', API_BASE);
      console.log('USE_API setting:', USE_API);
      
      if (!USE_API) {
        console.log('ℹ️ API is disabled, using localStorage only');
        return { connected: false, reason: 'API disabled' };
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      const response = await fetch(`${API_BASE}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const healthData = await response.json();
        console.log('✅ API connection successful:', healthData);
        return { connected: true, data: healthData };
      } else {
        console.log('❌ API health check failed:', response.status, response.statusText);
        return { connected: false, reason: `HTTP ${response.status}` };
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('❌ API connection timed out');
        return { connected: false, reason: 'Connection timeout' };
      } else {
        console.log('❌ API connection error:', error.message);
        return { connected: false, reason: error.message };
      }
    }
  },

  // Manual admin user creation for testing
  createAdminUser: () => {
    const defaultAdmin = {
      username: "admin",
      password: "admin123",
      role: "admin",
      fullName: "System Administrator",
      email: "admin@healthschool.com",
      createdAt: new Date().toISOString(),
      isDefaultAdmin: true,
      canDeleteDefaultAdmin: true
    };
    
    const saved = getFromLS(LS_KEYS.USERS);
    let users = saved || [];
    
    // Check if admin already exists
    const adminExists = users.some(user => user.role === 'admin');
    if (!adminExists) {
      users.push(defaultAdmin);
      setToLS(LS_KEYS.USERS, users);
      console.log('👤 Admin user manually created in localStorage');
      return true;
    } else {
      console.log('👤 Admin user already exists');
      return false;
    }
  },

  // Authentication
  authenticateUser: async (username, password, tenantSlug = null) => {
    console.log('🔐 Authenticating user:', username, 'for tenant:', tenantSlug);
    console.log('🔧 USE_API setting:', USE_API);
    console.log('🌐 API_BASE:', API_BASE);
    
    if (USE_API) {
      try {
        console.log('🌐 Attempting API authentication...');
        const response = await fetch(`${API_BASE}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            username, 
            password, 
            tenant_slug: tenantSlug 
          })
        });

        if (response.ok) {
          const responseData = await response.json();
          console.log('✅ API authentication successful:', responseData);
          console.log('🔍 Response structure analysis:', {
            hasSuccess: !!responseData.success,
            hasUser: !!responseData.user,
            hasRole: !!responseData.role,
            responseKeys: Object.keys(responseData)
          });
          
          // Handle different response structures
          if (responseData.success && responseData.user) {
            // Institution-specific login response
            console.log('📋 Returning user from institution response');
            return responseData.user;
          } else if (responseData.success && responseData.role) {
            // Direct admin login response (no tenant)
            console.log('📋 Returning direct admin response');
            return responseData;
          } else {
            // Fallback to direct response
            console.log('📋 Returning fallback response');
            return responseData;
          }
        } else {
          const error = await response.json();
          console.log('❌ API authentication failed:', error);
          throw new Error(error.error || 'Invalid credentials');
        }
      } catch (error) {
        console.warn('API authentication failed, falling back to localStorage:', error.message);
        // Fall through to localStorage authentication
      }
    }

    // Fallback to localStorage authentication
    console.log('💾 Using localStorage authentication...');
    const users = await dataService.loadUsers();
    console.log('👥 Total users loaded:', users.length);
    console.log('👥 Users in localStorage:', users.map(u => ({ username: u.username, role: u.role })));
    
    const user = users.find(u => {
      const usernameMatch = u.username.toLowerCase() === username.toLowerCase();
      const emailMatch = u.email && u.email.toLowerCase() === username.toLowerCase();
      const passwordMatch = u.password === password;
      console.log(`🔍 Checking user ${u.username}: usernameMatch=${usernameMatch}, emailMatch=${emailMatch}, passwordMatch=${passwordMatch}`);
      return (usernameMatch || emailMatch) && passwordMatch;
    });

    if (user) {
      console.log('✅ localStorage authentication successful:', user);
      return user;
    } else {
      console.log('❌ localStorage authentication failed - user not found');
      console.log('🔍 Searched for username:', username.toLowerCase());
      console.log('🔍 Available users:', users.map(u => u.username.toLowerCase()));
      throw new Error('Invalid credentials');
    }
  },

  // Admin management functions
  createNewAdmin: async (adminData, requestingAdmin) => {
    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE}/api/admin/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...adminData, requestingAdmin })
        });

        if (response.ok) {
          const result = await response.json();
          console.log('✅ New admin created via API');
          return result;
        } else {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create admin');
        }
      } catch (error) {
        console.warn('API admin creation failed, falling back to localStorage:', error.message);
        throw error;
      }
    }

    // Fallback to localStorage
    const users = await dataService.loadUsers();
    const newAdmin = {
      ...adminData,
      role: 'admin',
      createdAt: new Date().toISOString(),
      isDefaultAdmin: false,
      createdBy: requestingAdmin,
      canDeleteDefaultAdmin: false
    };
    
    users.push(newAdmin);
    await dataService.saveUsers(users);
    console.log('✅ New admin created in localStorage');
    return { user: newAdmin };
  },

  listAdminUsers: async (requestingAdmin) => {
    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE}/api/admin/list?requestingAdmin=${encodeURIComponent(requestingAdmin)}`);
        
        if (response.ok) {
          const admins = await response.json();
          console.log('✅ Admin list retrieved via API');
          return admins;
        } else {
          const error = await response.json();
          throw new Error(error.error || 'Failed to get admin list');
        }
      } catch (error) {
        console.warn('API admin list failed, falling back to localStorage:', error.message);
        throw error;
      }
    }

    // Fallback to localStorage
    const users = await dataService.loadUsers();
    const admins = users.filter(user => user.role === 'admin');
    console.log('✅ Admin list retrieved from localStorage');
    return admins;
  },

  deleteAdminUser: async (username, requestingAdmin) => {
    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE}/api/admin/${encodeURIComponent(username)}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestingAdmin })
        });

        if (response.ok) {
          const result = await response.json();
          console.log('✅ Admin deleted via API');
          return result;
        } else {
          const error = await response.json();
          throw new Error(error.error || 'Failed to delete admin');
        }
      } catch (error) {
        console.warn('API admin deletion failed, falling back to localStorage:', error.message);
        throw error;
      }
    }

    // Fallback to localStorage
    const users = await dataService.loadUsers();
    const filteredUsers = users.filter(user => 
      !(user.username.toLowerCase() === username.toLowerCase() && user.role === 'admin')
    );
    
    if (filteredUsers.length === users.length) {
      throw new Error('Admin user not found');
    }
    
    await dataService.saveUsers(filteredUsers);
    console.log('✅ Admin deleted from localStorage');
    return { message: 'Admin user deleted successfully' };
  },

  // Student registration (API first, then local fallback)
  registerStudent: async (studentData, tenantSlug = null) => {
    const { username, password, fullName, email } = studentData || {};
    if (!username || !password || !fullName || !email) {
      throw new Error('Please fill in all required fields');
    }
    if (String(password).length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    if (USE_API) {
      try {
        const response = await fetch(`${API_BASE}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, fullName, email, tenant_slug: tenantSlug })
        });
        if (response.ok) {
          const data = await response.json();
          return data.user || data; // accept either structure
        } else {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.error || error.message || 'Registration failed');
        }
      } catch (e) {
        console.warn('API registration failed, falling back to localStorage:', e.message);
      }
    }

    // Fallback to localStorage
    const users = await dataService.loadUsers();
    const newName = (username || '').trim().toLowerCase();
    if (users.find(u => (u.username || '').toLowerCase() === newName)) {
      throw new Error('Username already exists. Please choose a different username.');
    }
    if (users.find(u => (u.email || '').toLowerCase() === (email || '').toLowerCase())) {
      throw new Error('Email already registered. Please use a different email.');
    }
    const newStudent = {
      username,
      password,
      fullName,
      email,
      role: 'student',
      registeredAt: new Date().toISOString()
    };
    users.push(newStudent);
    await dataService.saveUsers(users);

    // Track registrations locally
    const regs = (await dataService.loadStudentRegistrations()) || [];
    regs.push(newStudent);
    await dataService.saveStudentRegistrations(regs);

    return newStudent;
  }
};

export default dataService; 