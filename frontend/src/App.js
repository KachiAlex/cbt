import React, { useEffect, useState, useRef } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell } from "docx";
import mammoth from "mammoth";
import dataService from "./services/dataService";
import InstitutionLoginPage from "./components/InstitutionLoginPage";
import MultiTenantAdmin from "./components/MultiTenantAdmin";
import RouteDebug from "./components/RouteDebug";

// -------------------------
// Advanced In-Browser CBT System
// Features:
// - Login (Admin / Student)
// - Admin creates multiple exam events with flexible question counts
// - Admin uploads .docx with MCQs (smart auto-parsed) or creates questions manually
// - Flexible CBT delivery for students (1-100 questions per exam)
// - Auto-grading, Results dashboard
// - Export results to Excel (.xlsx) and Word (.docx)
// - Student registration and management
// - Question and answer randomization
// - Tailwind styles
// Default Admin: username: admin  | password: admin123
// Build timestamp: 2025-01-01
// -------------------------

const LS_KEYS = {
  EXAMS: "cbt_exams_v1",
  QUESTIONS: "cbt_questions_v1",
  RESULTS: "cbt_results_v1",
  ACTIVE_EXAM: "cbt_active_exam_v1",
  USERS: "cbt_users_v1",
  STUDENT_REGISTRATIONS: "cbt_student_registrations_v1",
  SHARED_DATA: "cbt_shared_data_v1"
};

const DEFAULT_EXAM_TITLE = "College of Nursing, Eku, Delta State";

// Default admin user (referenced in comments)
// username: "admin"
// password: "admin123"
// role: "admin"
// fullName: "System Administrator"
// email: "admin@healthschool.com"

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("login");
  const [showAdminLink, setShowAdminLink] = useState(false);
  const [institutionData, setInstitutionData] = useState(null);



  useEffect(() => {
    console.log('🔍 Current URL:', window.location.href);
    console.log('🔍 Pathname:', window.location.pathname);
    console.log('🔍 Search:', window.location.search);
    
    // Get URL parameters first
    const urlParams = new URLSearchParams(window.location.search);
    
    // Check if this is a multi-tenant admin route
    if (window.location.pathname === '/admin' || window.location.pathname === '/admin/' || urlParams.get('admin') === 'true') {
      console.log('🏢 Multi-tenant admin route detected');
      setView("multi-tenant-admin");
      return; // Exit early for admin routes
    }
    
    // Check if this is an institution-specific route
    const slug = urlParams.get('slug');
    
    console.log('🔍 Checking URL parameters:', { slug, search: window.location.search, href: window.location.href });
    
    if (slug) {
      console.log('🏫 Institution route detected:', slug);
      // Load institution data and show dedicated institution login page
      loadInstitutionData(slug);
      setView("institution-login");
      return; // Exit early for institution routes
    } else {
      console.log('🏠 Regular route detected');
      // Check if user is already logged in with institution context
      const saved = localStorage.getItem("cbt_logged_in_user");
      const institutionSlug = localStorage.getItem("institution_slug");
      
      if (saved && institutionSlug) {
        // Load institution data for logged-in user
        loadInstitutionData(institutionSlug);
        setUser(JSON.parse(saved));
        setView("home");
      } else if (saved) {
        setUser(JSON.parse(saved));
        setView("home");
      }
    }
    
    // Ensure admin user exists in localStorage
    try {
      console.log('🔧 Ensuring admin user exists...');
      const users = JSON.parse(localStorage.getItem("cbt_users_v1") || "[]");
      console.log('📋 Current users:', users.length);
      
      const adminExists = users.some(user => user.username === "admin" && user.role === "admin");
      console.log('👤 Admin exists:', adminExists);
      
      if (!adminExists) {
        console.log('👤 Creating default admin user...');
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
        localStorage.setItem("cbt_users_v1", JSON.stringify(users));
        console.log('✅ Default admin user created successfully');
        console.log('🔐 Login credentials: admin / admin123');
      } else {
        console.log('✅ Admin user already exists');
      }
    } catch (error) {
      console.error('❌ Error ensuring admin user exists:', error);
    }
    
    // Check API connection on app load
    const checkConnection = async () => {
      try {
        const connectionStatus = await dataService.checkApiConnection();
        console.log('🔍 App startup - API connection status:', connectionStatus);
      } catch (error) {
        console.error('Error checking API connection:', error);
      }
    };
    
    checkConnection();
  }, []);

  // Load institution data for institution-specific routes
  const loadInstitutionData = async (slug) => {
    try {
      const response = await fetch(`https://cbt-rew7.onrender.com/api/tenant/${slug}/profile`);
      
      if (!response.ok) {
        throw new Error('Institution not found or suspended');
      }
      
      const data = await response.json();
      setInstitutionData(data);
      
      // Store institution data in localStorage for use throughout the app
      localStorage.setItem('institution_data', JSON.stringify(data));
      localStorage.setItem('institution_slug', slug);
      
    } catch (error) {
      console.error('Failed to load institution data:', error);
      // If institution not found, show error or redirect
      console.error('Institution not found or suspended');
    }
  };

  const onLogout = () => {
    setUser(null);
    localStorage.removeItem("cbt_logged_in_user");
    setView("login");
  };

  // Hidden admin access - click on the logo
  const handleLogoClick = () => {
    if (!user) {
      setShowAdminLink(false);
      setView("admin-login");
    }
  };

  // Keyboard shortcut for admin access (Ctrl + Alt + A)
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!user && e.ctrlKey && e.altKey && e.key === 'A') {
        e.preventDefault();
        setShowAdminLink(true);
        setTimeout(() => setShowAdminLink(false), 5000);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [user]);



  // Simple direct check for institution route
  const urlParams = new URLSearchParams(window.location.search);
  const slug = urlParams.get('slug');
  
  if (slug) {
    console.log('🏫 Direct slug detection:', slug);
    return <InstitutionLoginPage />;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <RouteDebug />
      <Header user={user} onLogout={onLogout} onLogoClick={handleLogoClick} institutionData={institutionData} />
      <main className="max-w-5xl mx-auto w-full px-3 sm:px-8 py-4 sm:py-8">
        {user ? (
          user.role === "admin" ? (
            <AdminPanel user={user} />
          ) : (
            <StudentPanel user={user} />
          )
        ) : (
          <>
            {view === "multi-tenant-admin" ? (
              <MultiTenantAdmin />
            ) : view === "institution-login" ? (
              <InstitutionLoginPage />
            ) : (
              <>
                {view !== "admin-login" && (
                  <Login 
                    onLogin={(u)=>{setUser(u); localStorage.setItem("cbt_logged_in_user", JSON.stringify(u)); setView("home");}}
                    institutionData={institutionData}
                  />
                )}
                {showAdminLink && (
                  <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="text-center">
                      <p className="text-red-700 font-semibold mb-2">🔐 Admin Access</p>
                      <button 
                        onClick={() => setView("admin-login")}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Access Admin Panel
                      </button>
                    </div>
                  </div>
                )}
                {view === "admin-login" && (
                  <AdminLogin 
                    onLogin={(u)=>{setUser(u); localStorage.setItem("cbt_logged_in_user", JSON.stringify(u)); setView("home");}}
                    onBack={() => setView("login")}
                    institutionData={institutionData}
                  />
                )}
              </>
            )}
          </>
        )}
      </main>
      <footer className="text-center text-xs text-gray-500 py-6">
        © {new Date().getFullYear()} {institutionData ? institutionData.name : 'College of Nursing, Eku, Delta State'}
        {!user && (
          <div className="mt-1 text-gray-400">
            <span className="opacity-30 hover:opacity-100 transition-opacity cursor-help" title="Admin Access: Click logo or press Ctrl+Alt+A">
              🔐
            </span>
          </div>
        )}
      </footer>
    </div>
  );
}

// User management functions - now using dataService
async function loadUsers() {
  try {
    const data = await dataService.loadUsers();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error loading users:', error);
    return [];
  }
}

async function saveUsers(users) {
  try {
    return await dataService.saveUsers(users);
  } catch (error) {
    console.error('Error saving users:', error);
    return false;
  }
}

async function authenticateUser(username, password) {
  console.log('🔐 Authenticating user:', username);
  
  try {
    // Use dataService to load users (handles both cloud and localStorage)
    const users = await dataService.loadUsers();
    console.log('👥 Total users loaded:', users.length);
    
    // Find the user
    const user = users.find(u => 
      u.username.toLowerCase() === username.toLowerCase() && 
      u.password === password
    );
    
    if (user) {
      // Make this admin the default admin if they're logging in
      if (user.role === "admin" && !user.isDefaultAdmin) {
        console.log('👑 Making current admin the default admin...');
        user.isDefaultAdmin = true;
        user.canDeleteDefaultAdmin = true;
        
        // Update the user in the database
        const updatedUsers = users.map(u => 
          u.username === user.username ? user : u
        );
        await dataService.saveUsers(updatedUsers);
        console.log('✅ Current admin is now the default admin');
      }
      
      console.log('✅ Authentication successful:', user.username, user.role);
      return user;
    } else {
      console.log('❌ Authentication failed - user not found or wrong password');
      console.log('🔍 Searched for:', username.toLowerCase());
      console.log('🔍 Available users:', users.map(u => u.username.toLowerCase()));
      return null;
    }
  } catch (error) {
    console.error('❌ Authentication error:', error);
    return null;
  }
}

// Exam management functions - now using dataService
async function loadExams() {
  try {
    const data = await dataService.loadExams();
    // Ensure we always return an array
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error loading exams:', error);
    return [];
  }
}

async function saveExams(exams) {
  try {
    return await dataService.saveExams(exams);
  } catch (error) {
    console.error('Error saving exams:', error);
    return false;
  }
}

// eslint-disable-next-line no-unused-vars
async function createExam(examData) {
  try {
    return await dataService.createExam(examData);
  } catch (error) {
    console.error('Error creating exam:', error);
    return null;
  }
}



async function deleteExam(examId) {
  try {
    return await dataService.deleteExam(examId);
  } catch (error) {
    console.error('Error deleting exam:', error);
    return false;
  }
}

// Questions management functions
async function loadQuestions() {
  try {
    const data = await dataService.loadQuestions();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error loading questions:', error);
    return [];
  }
}

// eslint-disable-next-line no-unused-vars
async function saveQuestions(questions) {
  try {
    return await dataService.saveQuestions(questions);
  } catch (error) {
    console.error('Error saving questions:', error);
    return false;
  }
}

async function loadQuestionsForExam(examId) {
  try {
    const data = await dataService.loadQuestionsForExam(examId);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error loading questions for exam:', error);
    return [];
  }
}

async function saveQuestionsForExam(examId, questions) {
  try {
    return await dataService.saveQuestionsForExam(examId, questions);
  } catch (error) {
    console.error('Error saving questions for exam:', error);
    return false;
  }
}

// Results management functions
async function loadResults() {
  try {
    console.log('📊 Loading results...');
    const data = await dataService.loadResults();
    console.log('📊 Results loaded:', data?.length || 0, 'results');
    if (data && data.length > 0) {
      console.log('📊 Sample result:', data[0]);
    }
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error loading results:', error);
    return [];
  }
}

async function saveResults(results) {
  try {
    console.log('💾 Saving results:', results?.length || 0, 'results');
    if (results && results.length > 0) {
      console.log('💾 Sample result being saved:', results[results.length - 1]);
    }
    const result = await dataService.saveResults(results);
    console.log('💾 Save result:', result);
    return result;
  } catch (error) {
    console.error('Error saving results:', error);
    return false;
  }
}

async function setActiveExam(examId) {
  try {
    const exams = await loadExams();
    // Toggle the active state of the selected exam (allow multiple active exams)
    const updatedExams = exams.map(exam => 
      exam.id === examId ? { ...exam, isActive: !exam.isActive } : exam
    );
    await saveExams(updatedExams);
    
    // Update active exams in localStorage (store array of active exam IDs)
    const activeExams = updatedExams.filter(exam => exam.isActive);
    localStorage.setItem(LS_KEYS.ACTIVE_EXAM, JSON.stringify(activeExams));
  } catch (error) {
    console.error('Error setting active exam:', error);
  }
}



async function registerStudent(studentData) {
  try {
    const users = await loadUsers();
    
    // Check if username already exists (case-insensitive)
    const newName = (studentData.username || "").trim().toLowerCase();
    if (users.find(u => (u.username || "").toLowerCase() === newName)) {
      throw new Error("Username already exists. Please choose a different username.");
    }
    
    // Check if email already exists
    if (users.find(u => u.email === studentData.email)) {
      throw new Error("Email already registered. Please use a different email.");
    }
    
    const newStudent = {
      ...studentData,
      role: "student",
      registeredAt: new Date().toISOString()
    };
    
    users.push(newStudent);
    await saveUsers(users);
    
    // Also save to registrations for admin tracking
    const registrations = loadStudentRegistrations();
    registrations.push(newStudent);
    localStorage.setItem(LS_KEYS.STUDENT_REGISTRATIONS, JSON.stringify(registrations));
    
    return newStudent;
  } catch (error) {
    console.error('Error registering student:', error);
    throw error;
  }
}

function loadStudentRegistrations() {
  const saved = localStorage.getItem(LS_KEYS.STUDENT_REGISTRATIONS);
  return saved ? JSON.parse(saved) : [];
}

function Header({user, onLogout, onLogoClick}){
  return (
    <div className="bg-white border-b">
      <div className="max-w-5xl mx-auto flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={onLogoClick}
            className="flex items-center gap-2 text-left hover:text-blue-600 transition-colors cursor-pointer"
            title={!user ? "Click to reveal admin access" : ""}
          >
            <img 
              src="/logo-eku.png"
              alt="College of Nursing Science, Eku"
              className="h-10 md:h-12 w-auto object-contain"
              onError={(e)=>{ e.currentTarget.onerror=null; e.currentTarget.src='/logo-eku.jpg'; }}
            />
            <span className="text-base sm:text-lg font-bold whitespace-nowrap">College of Nursing, Eku, Delta State</span>
          </button>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="text-sm">Logged in as <b>{user.fullName || user.username}</b> ({user.role})</span>
              <button onClick={onLogout} className="px-3 py-1.5 rounded-xl bg-gray-800 text-white text-sm hover:bg-black">Logout</button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AdminLogin({onLogin, onBack}){
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    
    if (!username || !password) {
      setError("Please enter both username and password");
      setIsLoading(false);
      return;
    }

    try {
      console.log('🔐 Attempting admin login for username:', username);
      
      const user = await authenticateUser(username, password);
      console.log('🔐 Authentication result:', user);
      
      if (user && user.role === "admin") {
        console.log('✅ Admin login successful');
        onLogin(user);
      } else {
        console.log('❌ Admin login failed - invalid credentials or role');
        setError("Invalid admin credentials. Please check your username and password.");
      }
    } catch (error) {
      console.error('❌ Error during admin login:', error);
      setError(`Login failed: ${error.message || 'Please try again.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white p-6 rounded-xl shadow-lg border">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">🔐 Admin Login</h2>
          <p className="text-gray-600">Access the admin panel</p>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter admin username"
              autoComplete="username"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter admin password"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-2 px-4 rounded-lg transition-colors font-medium ${
              isLoading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Authenticating...
              </span>
            ) : (
              'Sign In as Admin'
            )}
          </button>
        </form>
        
        <div className="mt-4 text-center">
          <button
            onClick={onBack}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            ← Back to Student Login
          </button>
        </div>
      </div>
    </div>
  );
}

function Login({onLogin}){
  const [mode, setMode] = useState("login"); // "login" or "register"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirm, setShowRegisterConfirm] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    
    if (!username || !password) {
      setError("Please enter both username and password");
      setIsLoading(false);
      return;
    }

    try {
      // Only student authentication - admin access is separate
      const user = await authenticateUser(username, password);
      if (user && user.role === "student") {
        onLogin(user);
      } else if (user && user.role === "admin") {
        setError("This is an admin account. Please use the admin login instead.");
      } else {
        setError("Invalid username or password. Please check your credentials or register as a new student.");
      }
    } catch (error) {
      console.error('Error during student login:', error);
      setError("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validation
    if (!username || !password || !fullName || !email) {
      setError("Please fill in all required fields");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    try {
      const studentData = {
        username,
        password,
        fullName,
        email
      };
      
      await registerStudent(studentData);
      setSuccess("Registration successful! You can now login with your credentials.");
      setMode("login");
      setUsername("");
      setPassword("");
      setFullName("");
      setEmail("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl shadow p-6 mt-10">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Student Portal</h2>
        <p className="text-gray-600 text-sm">Login or register to take exams</p>
      </div>
      
      <div className="flex mb-6">
        <button 
          onClick={() => {setMode("login"); setError(""); setSuccess("");}} 
          className={`flex-1 py-2 text-sm font-medium ${mode === "login" ? "text-emerald-600 border-b-2 border-emerald-600" : "text-gray-500"}`}
        >
          Login
        </button>
        <button 
          onClick={() => {setMode("register"); setError(""); setSuccess("");}} 
          className={`flex-1 py-2 text-sm font-medium ${mode === "register" ? "text-emerald-600 border-b-2 border-emerald-600" : "text-gray-500"}`}
        >
          Register
        </button>
      </div>

      {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl">{error}</div>}
      {success && <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-600 text-sm rounded-xl">{success}</div>}

      {mode === "login" ? (
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="student-username" className="block text-sm mb-1">Username</label>
            <input 
              id="student-username"
              name="username"
              type="text"
              value={username} 
              onChange={e=>setUsername(e.target.value)} 
              className="w-full border rounded-xl px-3 py-2" 
              placeholder="Enter your username"
              autoComplete="username"
            />
          </div>
          <div>
            <label htmlFor="student-password" className="block text-sm mb-1">Password</label>
            <div className="relative">
              <input 
                id="student-password"
                name="password"
                type={showLoginPassword ? "text" : "password"} 
                value={password} 
                onChange={e=>setPassword(e.target.value)} 
                className="w-full border rounded-xl px-3 py-2 pr-10" 
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={()=>setShowLoginPassword(s=>!s)}
                className="absolute inset-y-0 right-2 text-xs text-gray-500"
                aria-label={showLoginPassword ? "Hide password" : "Show password"}
              >
                {showLoginPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 15.338 6.244 18 12 18c1.91 0 3.547-.276 4.93-.757M6.228 6.228A10.45 10.45 0 0112 6c5.756 0 8.774 2.662 10.066 6a10.523 10.523 0 01-4.26 4.52M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.577 3.01 9.964 7.183.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.577-3.01-9.964-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <button 
            type="submit"
            disabled={isLoading}
            className={`w-full rounded-xl py-2.5 font-semibold ${
              isLoading 
                ? 'bg-gray-400 cursor-not-allowed text-white' 
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Authenticating...
              </span>
            ) : (
              'Login as Student'
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label htmlFor="student-fullname" className="block text-sm mb-1">Full Name *</label>
            <input 
              id="student-fullname"
              name="fullName"
              type="text"
              value={fullName} 
              onChange={e=>setFullName(e.target.value)} 
              className="w-full border rounded-xl px-3 py-2" 
              placeholder="Enter your full name"
              autoComplete="name"
            />
          </div>
          <div>
            <label htmlFor="student-email" className="block text-sm mb-1">Email *</label>
            <input 
              id="student-email"
              name="email"
              type="email" 
              value={email} 
              onChange={e=>setEmail(e.target.value)} 
              className="w-full border rounded-xl px-3 py-2" 
              placeholder="Enter your email address"
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="student-register-username" className="block text-sm mb-1">Username *</label>
            <input 
              id="student-register-username"
              name="username"
              type="text"
              value={username} 
              onChange={e=>setUsername(e.target.value)} 
              className="w-full border rounded-xl px-3 py-2" 
              placeholder="Choose a username"
              autoComplete="username"
            />
          </div>
          <div>
            <label htmlFor="student-register-password" className="block text-sm mb-1">Password *</label>
            <div className="relative">
              <input 
                id="student-register-password"
                name="password"
                type={showRegisterPassword ? "text" : "password"} 
                value={password} 
                onChange={e=>setPassword(e.target.value)} 
                className="w-full border rounded-xl px-3 py-2 pr-10" 
                placeholder="Choose a password (min 6 characters)"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={()=>setShowRegisterPassword(s=>!s)}
                className="absolute inset-y-0 right-2 text-xs text-gray-500"
                aria-label={showRegisterPassword ? "Hide password" : "Show password"}
              >
                {showRegisterPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 15.338 6.244 18 12 18c1.91 0 3.547-.276 4.93-.757M6.228 6.228A10.45 10.45 0 0112 6c5.756 0 8.774 2.662 10.066 6a10.523 10.523 0 01-4.26 4.52M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.577 3.01 9.964 7.183.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.577-3.01-9.964-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="student-confirm-password" className="block text-sm mb-1">Confirm Password *</label>
            <div className="relative">
              <input 
                id="student-confirm-password"
                name="confirmPassword"
                type={showRegisterConfirm ? "text" : "password"} 
                value={confirmPassword} 
                onChange={e=>setConfirmPassword(e.target.value)} 
                className="w-full border rounded-xl px-3 py-2 pr-10" 
                placeholder="Confirm your password"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={()=>setShowRegisterConfirm(s=>!s)}
                className="absolute inset-y-0 right-2 text-xs text-gray-500"
                aria-label={showRegisterConfirm ? "Hide password" : "Show password"}
              >
                {showRegisterConfirm ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 15.338 6.244 18 12 18c1.91 0 3.547-.276 4.93-.757M6.228 6.228A10.45 10.45 0 0112 6c5.756 0 8.774 2.662 10.066 6a10.523 10.523 0 01-4.26 4.52M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.577 3.01 9.964 7.183.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.577-3.01-9.964-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 font-semibold">
            Register as Student
          </button>
        </form>
      )}

      <div className="mt-6 text-xs text-gray-500">
        <p>Students must register first before they can login and take exams.</p>
      </div>
    </div>
  );
}



function AdminPanel({ user }){
  const [activeTab, setActiveTab] = useState("exams"); // "exams", "questions", "results", "students"
  const [exams, setExams] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [results, setResults] = useState([]);
  const [importError, setImportError] = useState("");
  const [showCreateExam, setShowCreateExam] = useState(false);
  const [showEditExam, setShowEditExam] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);


  useEffect(()=>{
    const loadData = async () => {
      try {
        const [examsData, questionsData, resultsData] = await Promise.all([
          loadExams(),
          loadQuestions(),
          loadResults()
        ]);
        setExams(examsData || []);
        setQuestions(questionsData || []);
        setResults(resultsData || []);
      } catch (error) {
        console.error('Error loading data:', error);
        setExams([]);
        setQuestions([]);
        setResults([]);
      }
    };
    loadData();
  }, []);

  // Reload results when switching to results tab
  useEffect(() => {
    if (activeTab === "results") {
      const reloadResults = async () => {
        try {
          console.log('🔄 Reloading results for admin panel...');
          const resultsData = await loadResults();
          setResults(resultsData || []);
          console.log('🔄 Results reloaded:', resultsData?.length || 0);
        } catch (error) {
          console.error('Error reloading results:', error);
        }
      };
      reloadResults();
    }
  }, [activeTab]);

  useEffect(()=>{
    localStorage.setItem(LS_KEYS.QUESTIONS, JSON.stringify(questions));
  }, [questions]);

  useEffect(()=>{
    localStorage.setItem(LS_KEYS.RESULTS, JSON.stringify(results));
  }, [results]);









  const handleFileUpload = async (file) => {
    setImportError("");
    try {
      const fileExtension = file.name.toLowerCase().split('.').pop();
      
      if (fileExtension === 'docx') {
        // Handle Word document
        const arrayBuffer = await file.arrayBuffer();
        const { value: markdown } = await mammoth.convertToMarkdown({ arrayBuffer });
        
        console.log("Raw markdown from document:", markdown.substring(0, 500) + "...");
        
        const parsed = parseQuestionsFromMarkdown(markdown);
        console.log("Parsed questions:", parsed.length, parsed);
        
        if (parsed.length === 0) {
          throw new Error("No questions found. Please check the document format. Make sure each question starts with a number (1, 2, 3...) or Q, has 4 options (A, B, C, D), and ends with 'Answer: X'.");
        }
        
        setQuestions(parsed);
        if (selectedExam) {
          await saveQuestionsForExam(selectedExam.id, parsed);
          // Update exam question count
          try {
            const updatedExams = exams.map(ex => 
              ex.id === selectedExam.id ? { ...ex, questionCount: parsed.length } : ex
            );
            setExams(updatedExams);
            await saveExams(updatedExams);
          } catch (error) {
            console.error('Error updating exam question count:', error);
          }
        }
        setImportError(`Successfully imported ${parsed.length} questions from Word document!`);
        setTimeout(() => setImportError(""), 3000);
      } else if (fileExtension === 'xlsx') {
        // Handle Excel file
        const parsed = await parseQuestionsFromExcel(file);
        
        if (parsed.length === 0) {
          throw new Error("No questions found. Please check the Excel format. Expected columns: Question | Option A | Option B | Option C | Option D | Correct Answer");
        }
        
        setQuestions(parsed);
        if (selectedExam) {
          await saveQuestionsForExam(selectedExam.id, parsed);
          // Update exam question count
          try {
            const updatedExams = exams.map(ex => 
              ex.id === selectedExam.id ? { ...ex, questionCount: parsed.length } : ex
            );
            setExams(updatedExams);
            await saveExams(updatedExams);
          } catch (error) {
            console.error('Error updating exam question count:', error);
          }
        }
        setImportError(`Successfully imported ${parsed.length} questions from Excel file!`);
        setTimeout(() => setImportError(""), 3000);
      } else {
        throw new Error("Unsupported file format. Please upload a .docx or .xlsx file.");
      }
    } catch (e) {
      console.error("Upload error:", e);
      setImportError(e.message || "Failed to import file");
    }
  };



  const exportResultsToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Results');
    
    // Add headers
    worksheet.addRow(['Username', 'Exam Title', 'Score', 'Total', 'Percent', 'Submitted At', 'Answers']);
    
    // Add data rows
    for (const r of results) {
      worksheet.addRow([r.username, r.examTitle, r.score, r.total, r.percent, r.submittedAt, r.answers.join(", ")]);
    }
    
    // Generate and download file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, "CBT_Results.xlsx");
  };

  const exportResultsToWord = async () => {
    const rows = [
      new TableRow({
        children:["Username","Exam Title","Score","Total","Percent","Submitted At","Answers"].map(h=> new TableCell({children:[new Paragraph({children:[new TextRun({text:h, bold:true})]})]}))
      }),
      ...results.map(r => new TableRow({
        children:[r.username, r.examTitle, String(r.score), String(r.total), String(r.percent), r.submittedAt, r.answers.join(", ")]
          .map(t => new TableCell({children:[new Paragraph(String(t))]}))
      }))
    ];
    const doc = new Document({
      sections:[{properties:{}, children:[
        new Paragraph({children:[new TextRun({text:"CBT Results", bold:true, size:28})]}),
        new Paragraph(" "),
        new Table({rows})
      ]}]
    });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, "CBT_Results.docx");
  };

  const handleCreateExam = async (examData) => {
    try {
      console.log('📝 Creating new exam:', examData);
      const newExam = await dataService.createExam(examData);
      console.log('✅ Exam created successfully:', newExam);
      
      // Reload exams to get the updated list
      const updatedExams = await loadExams();
      setExams(updatedExams);
      
      setShowCreateExam(false);
      setSelectedExam(newExam);
      setActiveTab("questions");
      
      // Show success message
      setTimeout(() => {
        alert(`✅ Exam "${newExam.title}" created successfully!\n\nNext steps:\n1. Go to the Questions tab\n2. Upload questions from Word/Excel files\n3. Or add questions manually\n4. Activate the exam when ready`);
      }, 100);
    } catch (error) {
      console.error('❌ Error creating exam:', error);
      alert('Failed to create exam. Please try again.');
    }
  };

  const handleActivateExam = async (examId) => {
    try {
      await setActiveExam(examId);
      const updatedExams = await loadExams();
      setExams(updatedExams);
    } catch (error) {
      console.error('❌ Error activating exam:', error);
      alert('Failed to activate exam. Please try again.');
    }
  };

  const handleDeleteExam = async (examId) => {
    if (window.confirm("Are you sure you want to delete this exam? This action cannot be undone.")) {
      try {
        await deleteExam(examId);
        const updatedExams = await loadExams();
        setExams(updatedExams);
      } catch (error) {
        console.error('❌ Error deleting exam:', error);
        alert('Failed to delete exam. Please try again.');
      }
    }
  };



  return (
    <div className="space-y-8">
      {/* Admin Panel Header */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Admin Panel</h2>
            <p className="text-sm text-gray-600">Manage exams, questions, and student results</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl">
        {[
          { id: "exams", label: "📋 Exam Management", icon: "📋" },
          { id: "questions", label: "❓ Questions", icon: "❓" },
          { id: "results", label: "📊 Results", icon: "📊" },
          { id: "students", label: "👥 Students", icon: "👥" },
          { id: "settings", label: "⚙️ Settings", icon: "⚙️" }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Exam Management Tab */}
      {activeTab === "exams" && (
        <div className="space-y-6">
          <Section title="Exam Management">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold">Available Exams</h3>
                <p className="text-sm text-gray-600">Create and manage exam events for students</p>
              </div>
              <button
                onClick={() => setShowCreateExam(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
              >
                + Create New Exam
              </button>
            </div>

            {(!exams || !Array.isArray(exams) || exams.length === 0) ? (
              <div className="text-center py-8 text-gray-500">
                <p>No exams created yet.</p>
                <p className="text-sm mt-2">Create your first exam to get started.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {exams.map(exam => (
                  <div key={exam.id} className="border rounded-xl p-4 bg-white">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg">{exam.title}</h4>
                        <p className="text-sm text-gray-600">{exam.description}</p>
                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                          <span>Questions: {exam.questionCount || 0}</span>
                          <span>Duration: {exam.duration} minutes</span>
                          <span>Created: {new Date(exam.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleActivateExam(exam.id)}
                          className={`px-3 py-1 rounded-lg text-xs ${
                            exam.isActive 
                              ? "bg-orange-600 text-white hover:bg-orange-700" 
                              : "bg-blue-600 text-white hover:bg-blue-700"
                          }`}
                        >
                          {exam.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => handleDeleteExam(exam.id)}
                          className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {(() => {
            const safeExams = Array.isArray(exams) ? exams : [];
            const activeExams = safeExams.filter(exam => exam.isActive);
            return activeExams.length > 0 && (
              <Section title={`Active Exams (${activeExams.length})`}>
                <div className="space-y-3">
                  {activeExams.map(exam => (
                    <div key={exam.id} className="p-4 bg-green-50 border border-green-200 rounded-xl">
                      <h4 className="font-semibold text-green-800">{exam.title}</h4>
                      <p className="text-sm text-green-700">{exam.description}</p>
                      <div className="flex gap-4 mt-2 text-sm text-green-600">
                        <span>Questions: {exam.questionCount || 0}</span>
                        <span>Duration: {exam.duration} minutes</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            );
          })()}
        </div>
      )}

      {/* Questions Tab */}
      {activeTab === "questions" && (
        <div className="space-y-6">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <button 
              onClick={() => setActiveTab("exams")}
              className="hover:text-blue-600 underline"
            >
              Exam Management
            </button>
            <span>›</span>
            <span className="text-gray-900 font-medium">Question Management</span>
            {selectedExam && (
              <>
                <span>›</span>
                <span className="text-blue-600 font-medium">{selectedExam.title}</span>
              </>
            )}
          </div>

          {/* Exam Selection */}
          <Section title="Select Exam for Question Management">
            <div className="mb-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl mb-4">
                <p className="text-sm text-blue-800">
                  <strong>📋 Exam-Specific Questions:</strong> Each exam has its own set of questions. 
                  Select an exam below to manage its questions, upload new ones, or edit existing ones.
                </p>
              </div>
              <label htmlFor="exam-selection" className="block text-sm font-medium mb-2">Choose Exam:</label>
              <select 
                id="exam-selection"
                name="selectedExam"
                value={selectedExam?.id || ""} 
                onChange={async (e) => {
                  const examId = e.target.value;
                  if (examId) {
                    const exam = exams.find(ex => ex.id === examId);
                    setSelectedExam(exam);
                    // Load questions for this specific exam
                    const examQuestions = await loadQuestionsForExam(examId);
                    setQuestions(examQuestions);
                  } else {
                    setSelectedExam(null);
                    setQuestions([]);
                  }
                }}
                className="w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Select an exam to manage its questions --</option>
                {Array.isArray(exams) && exams.map(exam => (
                  <option key={exam.id} value={exam.id}>
                    {exam.title} ({exam.questionCount || 0} questions)
                  </option>
                ))}
              </select>
            </div>
            
            {selectedExam && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold text-blue-800">{selectedExam.title}</h4>
                    <p className="text-sm text-blue-700">{selectedExam.description}</p>
                    <div className="flex gap-4 mt-2 text-sm text-blue-600">
                      <span>Questions: {questions.length}</span>
                      <span>Duration: {selectedExam.duration} minutes</span>
                      <span>Status: {selectedExam.isActive ? "Active" : "Inactive"}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab("exams")}
                    className="px-3 py-1 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700"
                  >
                    ← Back to Exams
                  </button>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowEditExam(true)}
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                  >
                    Edit Exam Details
                  </button>
                  <button 
                    onClick={async () => {
                      if (window.confirm("Are you sure you want to delete all questions for this exam?")) {
                        setQuestions([]);
                        await saveQuestionsForExam(selectedExam.id, []);
                      }
                    }}
                    className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                  >
                    Clear All Questions
                  </button>
                </div>
              </div>
            )}
          </Section>

          {selectedExam && (
            <>
              <Section title="Upload Questions from Word (.docx) or Excel (.xlsx)">
                <UploadQuestions onFile={handleFileUpload} />
                {importError && <div className="text-red-600 text-sm mt-2">{importError}</div>}
                <FormatHelp />
              </Section>

              <Section title={`Questions for ${selectedExam.title} (${questions.length})`}>
                <div className="mb-4 flex justify-between items-center">
                  <div className="flex gap-3">
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <p className="text-sm text-emerald-800">
                        <strong>🔄 Randomization Active:</strong> Questions and answer options are automatically randomized for each student to prevent cheating.
                      </p>
                    </div>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                      <p className="text-sm text-blue-800">
                        <strong>📋 Exam-Linked:</strong> Questions are specifically linked to this exam and will only appear for students taking this exam.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedExam(null)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 text-sm"
                  >
                    ← Back to Exam Selection
                  </button>
                </div>
                <QuestionsEditor questions={questions} setQuestions={setQuestions} selectedExam={selectedExam} />
              </Section>
            </>
          )}

          {!selectedExam && (
            <Section title="No Exam Selected">
              <div className="text-center py-8 text-gray-500">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Select an Exam to Manage Questions</h3>
                <p className="text-sm mb-4">
                  Each exam has its own dedicated question bank. Select an exam from the dropdown above to:
                </p>
                <ul className="text-sm text-gray-600 mb-6 space-y-1">
                  <li>• Upload questions from Word (.docx) or Excel (.xlsx) files</li>
                  <li>• Edit existing questions manually</li>
                  <li>• Clear all questions for that exam</li>
                  <li>• View and manage question randomization settings</li>
                </ul>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setActiveTab("exams")}
                    className="px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 text-sm"
                  >
                    ← Back to Exams
                  </button>
                  <button
                    onClick={() => setShowCreateExam(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm"
                  >
                    + Create New Exam
                  </button>
                </div>
              </div>
            </Section>
          )}
        </div>
      )}

      {/* Results Tab */}
      {activeTab === "results" && (
        <div className="space-y-6">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <button 
              onClick={() => setActiveTab("exams")}
              className="hover:text-blue-600 underline"
            >
              Exam Management
            </button>
            <span>›</span>
            <span className="text-gray-900 font-medium">Results & Reports</span>
          </div>
          
          <Section title="Exam Results">
            <div className="mb-4 flex justify-between items-center">
              <div className="flex gap-2">
                <button onClick={() => exportResultsToExcel()} className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700">
                  Export to Excel
                </button>
                <button onClick={exportResultsToWord} className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700">
                  Export to Word
                </button>
              </div>
              <button
                onClick={() => setActiveTab("exams")}
                className="px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 text-sm"
              >
                ← Back to Exams
              </button>
            </div>
            <ResultsTable results={results} setResults={setResults} />
          </Section>
        </div>
      )}

      {/* Students Tab */}
      {activeTab === "students" && (
        <div className="space-y-6">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <button 
              onClick={() => setActiveTab("exams")}
              className="hover:text-blue-600 underline"
            >
              Exam Management
            </button>
            <span>›</span>
            <span className="text-gray-900 font-medium">Student Management</span>
          </div>
          
          <Section title="Student Management">
            <div className="mb-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Registered Students</h3>
              <button
                onClick={() => setActiveTab("exams")}
                className="px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 text-sm"
              >
                ← Back to Exams
              </button>
            </div>
            <StudentManagement />
          </Section>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <button 
              onClick={() => setActiveTab("exams")}
              className="hover:text-blue-600 underline"
            >
              Exam Management
            </button>
            <span>›</span>
            <span className="text-gray-900 font-medium">System Settings</span>
          </div>
          
          <Section title="System Settings">
            <div className="mb-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Admin Configuration</h3>
              <button
                onClick={() => setActiveTab("exams")}
                className="px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 text-sm"
              >
                ← Back to Exams
              </button>
            </div>
            <AdminSettings 
              exams={exams}
              questions={questions}
              results={results}
              exportResultsToExcel={exportResultsToExcel}
              exportResultsToWord={exportResultsToWord}
              dataService={dataService}
              currentUser={user}
              onClearData={() => {
              // First confirmation
              if (!window.confirm('⚠️ WARNING: This will permanently delete ALL data!\n\nThis action will:\n• Remove all exams, questions, and results\n• Delete all student registrations\n• Clear both local and cloud databases\n• The admin user will be preserved\n\nAre you absolutely sure you want to proceed?')) {
                return;
              }

              // Second confirmation for extra safety
              if (!window.confirm('🚨 FINAL CONFIRMATION:\n\nYou are about to permanently delete ALL data from the CBT system.\n\nThis action CANNOT be undone.\n\nType "DELETE" to confirm:')) {
                return;
              }

              // Clear all localStorage data
              const LS_KEYS = {
                EXAMS: "cbt_exams_v1",
                QUESTIONS: "cbt_questions_v1", 
                RESULTS: "cbt_results_v1",
                STUDENT_REGISTRATIONS: "cbt_student_registrations_v1",
                SHARED_DATA: "cbt_shared_data_v1",
                ACTIVE_EXAM: "cbt_active_exam_v1"
              };

              // Clear all CBT-related localStorage items (except USERS)
              Object.values(LS_KEYS).forEach(key => {
                localStorage.removeItem(key);
              });

              // Clear any exam-specific question storage
              for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('cbt_questions_')) {
                  localStorage.removeItem(key);
                }
              }

              // Clear logged in user
              localStorage.removeItem('cbt_logged_in_user');

              // Preserve admin user in localStorage
              const adminUser = {
                username: "admin",
                password: "admin123",
                role: "admin",
                fullName: "System Administrator",
                email: "admin@healthschool.com",
                createdAt: new Date().toISOString()
              };
              localStorage.setItem("cbt_users_v1", JSON.stringify([adminUser]));

              // Clear cloud database data (but preserve admin user)
              const clearCloudData = async () => {
                try {
                  // Clear exams, questions, and results from cloud database
                  const clearPromises = [
                    fetch('https://cbt-rew7.onrender.com/api/exams', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify([]) }),
                    fetch('https://cbt-rew7.onrender.com/api/questions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify([]) }),
                    fetch('https://cbt-rew7.onrender.com/api/results', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify([]) })
                  ];
                  
                  await Promise.all(clearPromises);
                  console.log('✅ Cloud database cleared successfully');
                } catch (error) {
                  console.warn('⚠️ Failed to clear cloud database:', error.message);
                }
              };

              // Clear cloud data
              clearCloudData();

              // Reset state
              setExams([]);
              setQuestions([]);
              setResults([]);

              alert('✅ All data cleared successfully! The page will refresh.');
              window.location.reload();
            }} />
          </Section>
        </div>
      )}

      {/* Create Exam Modal */}
      {showCreateExam && (
        <CreateExamModal onClose={() => setShowCreateExam(false)} onCreate={handleCreateExam} />
      )}

      {/* Edit Exam Modal */}
      {showEditExam && selectedExam && (
        <EditExamModal 
          exam={selectedExam} 
          onClose={() => setShowEditExam(false)} 
          onUpdate={(updatedExam) => {
            const updatedExams = exams.map(ex => 
              ex.id === selectedExam.id ? updatedExam : ex
            );
            setExams(updatedExams);
            saveExams(updatedExams);
            setSelectedExam(updatedExam);
            setShowEditExam(false);
          }} 
        />
      )}
    </div>
  );
}

function CreateExamModal({ onClose, onCreate }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(60);
  const [questionCount, setQuestionCount] = useState(12);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("Please enter an exam title");
      return;
    }
    
    onCreate({
      title: title.trim(),
      description: description.trim(),
      duration: parseInt(duration),
      questionCount: parseInt(questionCount)
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md mx-4 w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Create New Exam</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="create-exam-title" className="block text-sm mb-1">Exam Title *</label>
            <input
              id="create-exam-title"
              name="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded-xl px-3 py-2"
              placeholder="e.g., Midterm Exam - Biology 101"
              required
            />
          </div>
          
          <div>
            <label htmlFor="create-exam-description" className="block text-sm mb-1">Description</label>
            <textarea
              id="create-exam-description"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border rounded-xl px-3 py-2"
              placeholder="Brief description of the exam"
              rows="3"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="create-exam-duration" className="block text-sm mb-1">Duration (minutes)</label>
              <input
                id="create-exam-duration"
                name="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full border rounded-xl px-3 py-2"
                min="15"
                max="300"
                required
              />
            </div>
            
            <div>
              <label htmlFor="create-exam-question-count" className="block text-sm mb-1">Question Count</label>
              <input
                id="create-exam-question-count"
                name="questionCount"
                type="number"
                value={questionCount}
                onChange={(e) => setQuestionCount(e.target.value)}
                className="w-full border rounded-xl px-3 py-2"
                min="1"
                max="100"
                required
              />
            </div>
          </div>
          
          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
            >
              Create Exam
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditExamModal({ exam, onClose, onUpdate }) {
  const [title, setTitle] = useState(exam.title);
  const [description, setDescription] = useState(exam.description);
  const [duration, setDuration] = useState(exam.duration);
  const [questionCount, setQuestionCount] = useState(exam.questionCount);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("Please enter an exam title");
      return;
    }
    
    onUpdate({
      ...exam,
      title: title.trim(),
      description: description.trim(),
      duration: parseInt(duration),
      questionCount: parseInt(questionCount)
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md mx-4 w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Edit Exam</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="edit-exam-title" className="block text-sm mb-1">Exam Title *</label>
            <input
              id="edit-exam-title"
              name="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded-xl px-3 py-2"
              placeholder="e.g., Midterm Exam - Biology 101"
              required
            />
          </div>
          
          <div>
            <label htmlFor="edit-exam-description" className="block text-sm mb-1">Description</label>
            <textarea
              id="edit-exam-description"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border rounded-xl px-3 py-2"
              placeholder="Brief description of the exam"
              rows="3"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-exam-duration" className="block text-sm mb-1">Duration (minutes)</label>
              <input
                id="edit-exam-duration"
                name="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full border rounded-xl px-3 py-2"
                min="15"
                max="300"
                required
              />
            </div>
            
            <div>
              <label htmlFor="edit-exam-question-count" className="block text-sm mb-1">Question Count</label>
              <input
                id="edit-exam-question-count"
                name="questionCount"
                type="number"
                value={questionCount}
                onChange={(e) => setQuestionCount(e.target.value)}
                className="w-full border rounded-xl px-3 py-2"
                min="1"
                max="100"
                required
              />
            </div>
          </div>
          
          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
            >
              Update Exam
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateAdminModal({ onClose, onCreate }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation
    if (!username || !password || !fullName || !email) {
      alert("Please fill in all required fields");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters long");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert("Please enter a valid email address");
      return;
    }

    if (username.toLowerCase() === 'admin') {
      alert("Username 'admin' is reserved for the default administrator");
      return;
    }

    onCreate({
      username: username.trim(),
      password,
      fullName: fullName.trim(),
      email: email.trim()
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md mx-4 w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Create New Admin</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="create-admin-username" className="block text-sm mb-1">Username *</label>
            <input
              id="create-admin-username"
              name="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border rounded-xl px-3 py-2"
              placeholder="Enter username"
              required
            />
          </div>
          
          <div>
            <label htmlFor="create-admin-fullname" className="block text-sm mb-1">Full Name *</label>
            <input
              id="create-admin-fullname"
              name="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border rounded-xl px-3 py-2"
              placeholder="Enter full name"
              required
            />
          </div>
          
          <div>
            <label htmlFor="create-admin-email" className="block text-sm mb-1">Email *</label>
            <input
              id="create-admin-email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-xl px-3 py-2"
              placeholder="Enter email address"
              required
            />
          </div>
          
          <div>
            <label htmlFor="create-admin-password" className="block text-sm mb-1">Password *</label>
            <div className="relative">
              <input
                id="create-admin-password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border rounded-xl px-3 py-2 pr-10"
                placeholder="Enter password (min 6 characters)"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>
          
          <div>
            <label htmlFor="create-admin-confirm-password" className="block text-sm mb-1">Confirm Password *</label>
            <div className="relative">
              <input
                id="create-admin-confirm-password"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border rounded-xl px-3 py-2 pr-10"
                placeholder="Confirm password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showConfirmPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>
          
          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
            >
              Create Admin
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StudentManagement() {
  const [students, setStudents] = useState(loadStudentRegistrations());
  const [users, setUsers] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const loadUsersData = async () => {
      try {
        const usersData = await loadUsers();
        setUsers(usersData);
      } catch (error) {
        console.error('Error loading users:', error);
        setUsers([]);
      }
    };
    loadUsersData();
  }, []);

  const deleteStudent = async (username) => {
    try {
      // Remove from users
      const updatedUsers = users.filter(u => u.username !== username);
      await saveUsers(updatedUsers);
      setUsers(updatedUsers);
      
      // Remove from registrations
      const updatedStudents = students.filter(s => s.username !== username);
      localStorage.setItem(LS_KEYS.STUDENT_REGISTRATIONS, JSON.stringify(updatedStudents));
      setStudents(updatedStudents);
      
      setShowDeleteConfirm(false);
      setSelectedStudent(null);
    } catch (error) {
      console.error('Error deleting student:', error);
    }
  };

  const exportStudentsToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Students');
    
    // Add headers
    worksheet.addRow(['Full Name', 'Username', 'Email', 'Registration Date']);
    
    // Add data rows
    for (const student of students) {
      worksheet.addRow([
        student.fullName,
        student.username,
        student.email,
        new Date(student.registeredAt).toLocaleDateString()
      ]);
    }
    
    // Generate and download file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, "CBT_Students.xlsx");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-600">Total Registered Students: <strong>{students.length}</strong></p>
        </div>
        <button 
          onClick={() => exportStudentsToExcel()} 
          className="px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700"
        >
          Export Students List
        </button>
      </div>

      {students.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No students have registered yet.</p>
          <p className="text-sm mt-2">Students will appear here once they register through the login page.</p>
        </div>
      ) : (
        <div className="overflow-auto border rounded-xl">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-3">Full Name</th>
                <th className="text-left p-3">Username</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Registration Date</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, index) => (
                <tr key={student.username} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="p-3">{student.fullName}</td>
                  <td className="p-3 font-mono text-sm">{student.username}</td>
                  <td className="p-3">{student.email}</td>
                  <td className="p-3">{new Date(student.registeredAt).toLocaleDateString()}</td>
                  <td className="p-3">
                    <button 
                      onClick={() => {
                        setSelectedStudent(student);
                        setShowDeleteConfirm(true);
                      }}
                      className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-bold mb-4">Confirm Deletion</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete student <strong>{selectedStudent.fullName}</strong> ({selectedStudent.username})?
            </p>
            <p className="text-sm text-red-600 mb-4">
              This action cannot be undone. The student will no longer be able to login.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => deleteStudent(selectedStudent.username)}
                className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700"
              >
                Delete Student
              </button>
              <button 
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedStudent(null);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-xl hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



function Section({title, children}){
  return (
    <section className="bg-white rounded-2xl shadow p-6">
      <h3 className="text-lg font-bold mb-4">{title}</h3>
      {children}
    </section>
  );
}

function UploadQuestions({ onFile }) {
  const fileInputRef = useRef(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      onFile(file);
    }
    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadWordTemplate = () => {
    const template = `CBT Question Template (Word Document)

Instructions:
1. Each question should start with a number (1, 2, 3...) or Q1, Q1., Q1), etc.
2. Each question should have exactly 4 options labeled A, B, C, D
3. End each question with "Answer: X" where X is the correct option (A, B, C, or D)
4. Use clear, concise language

Example Format:

1. What is the capital of France?
A. London
B. Berlin
C. Paris
D. Madrid
Answer: C

2. Which planet is closest to the Sun?
A. Venus
B. Mars
C. Mercury
D. Earth
Answer: C

3. What is 2 + 2?
A. 3
B. 4
C. 5
D. 6
Answer: B

Notes:
- Questions and answer options will be automatically randomized for each student
- You can include up to 100 questions per exam
- Make sure each question has exactly 4 options
- The answer must be one of the options (A, B, C, or D)`;

    const blob = new Blob([template], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'CBT_Question_Template_Word.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadExcelTemplate = () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Questions');
    
    // Add headers
    worksheet.addRow(['Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Answer']);
    
    // Add example questions
    worksheet.addRow([
      'What is the capital of France?',
      'London',
      'Berlin', 
      'Paris',
      'Madrid',
      'C'
    ]);
    
    worksheet.addRow([
      'Which planet is closest to the Sun?',
      'Venus',
      'Mars',
      'Mercury', 
      'Earth',
      'C'
    ]);
    
    worksheet.addRow([
      'What is 2 + 2?',
      '3',
      '4',
      '5',
      '6', 
      'B'
    ]);
    
    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 20;
    });
    
    // Generate and download file
    workbook.xlsx.writeBuffer().then(buffer => {
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'CBT_Question_Template_Excel.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="space-y-4">
      {/* Template Downloads */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h4 className="font-semibold text-blue-800 mb-3">📋 Download Question Templates</h4>
        <div className="flex gap-3">
          <button
            onClick={downloadWordTemplate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2"
          >
            📄 Word Template
          </button>
          <button
            onClick={downloadExcelTemplate}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center gap-2"
          >
            📊 Excel Template
          </button>
        </div>
        <p className="text-sm text-blue-700 mt-2">
          Download templates to see the correct format for uploading questions.
        </p>
      </div>

      {/* File Upload */}
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
        <div className="text-4xl mb-4">📁</div>
        <h4 className="font-semibold text-gray-800 mb-2">Upload Questions File</h4>
        <p className="text-sm text-gray-600 mb-4">
          Supported formats: .docx (Word) or .xlsx (Excel)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".docx,.xlsx"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold transition-colors"
        >
          Choose File
        </button>
      </div>
    </div>
  );
}

function FormatHelp() {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
      <h4 className="font-semibold text-yellow-800 mb-3">📝 Question Format Guide</h4>
      
      <div className="space-y-4">
        <div>
          <h5 className="font-medium text-yellow-800 mb-2">Word Document Format (.docx):</h5>
          <div className="bg-white rounded-lg p-3 text-sm">
            <p className="mb-2"><strong>Question Format:</strong></p>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
{`1. What is the capital of France?
A. London
B. Berlin
C. Paris
D. Madrid
Answer: C

2. Which planet is closest to the Sun?
A. Venus
B. Mars
C. Mercury
D. Earth
Answer: C`}
            </pre>
          </div>
        </div>

        <div>
          <h5 className="font-medium text-yellow-800 mb-2">Excel Format (.xlsx):</h5>
          <div className="bg-white rounded-lg p-3 text-sm">
            <p className="mb-2"><strong>Columns:</strong> Question | Option A | Option B | Option C | Option D | Correct Answer</p>
            <div className="overflow-x-auto">
              <table className="text-xs border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-1">Question</th>
                    <th className="border border-gray-300 p-1">Option A</th>
                    <th className="border border-gray-300 p-1">Option B</th>
                    <th className="border border-gray-300 p-1">Option C</th>
                    <th className="border border-gray-300 p-1">Option D</th>
                    <th className="border border-gray-300 p-1">Correct Answer</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 p-1">What is 2 + 2?</td>
                    <td className="border border-gray-300 p-1">3</td>
                    <td className="border border-gray-300 p-1">4</td>
                    <td className="border border-gray-300 p-1">5</td>
                    <td className="border border-gray-300 p-1">6</td>
                    <td className="border border-gray-300 p-1">B</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <h5 className="font-medium text-green-800 mb-2">🔄 Randomization Features:</h5>
          <ul className="text-sm text-green-700 space-y-1">
            <li>• Questions are automatically shuffled for each student</li>
            <li>• Answer options are randomized to prevent cheating</li>
            <li>• Each student gets a unique question order</li>
            <li>• Results track the original question order for analysis</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function QuestionsEditor({questions, setQuestions, selectedExam}){
  const updateQ = async (i, patch) => {
    const updatedQuestions = questions.map((q,idx)=> idx===i ? {...q, ...patch} : q);
    setQuestions(updatedQuestions);
    // Save changes to the specific exam
    if (selectedExam) {
      await saveQuestionsForExam(selectedExam.id, updatedQuestions);
      // Update exam question count
      const updatedExams = await loadExams();
      const finalExams = updatedExams.map(ex => 
        ex.id === selectedExam.id ? { ...ex, questionCount: updatedQuestions.length } : ex
      );
      await saveExams(finalExams);
    }
  };
  
  const removeQ = async (i) => {
    const updatedQuestions = questions.filter((_,idx)=>idx!==i);
    setQuestions(updatedQuestions);
    // Save changes to the specific exam
    if (selectedExam) {
      await saveQuestionsForExam(selectedExam.id, updatedQuestions);
      // Update exam question count
      const updatedExams = await loadExams();
      const finalExams = updatedExams.map(ex => 
        ex.id === selectedExam.id ? { ...ex, questionCount: updatedQuestions.length } : ex
      );
      await saveExams(finalExams);
    }
  };
  
  const add = async () => {
    const newQuestion = {id:crypto.randomUUID(), text:"New question text", options:["Option A","Option B","Option C","Option D"], correctIndex:0};
    const updatedQuestions = [...questions, newQuestion];
    setQuestions(updatedQuestions);
    // Save changes to the specific exam
    if (selectedExam) {
      await saveQuestionsForExam(selectedExam.id, updatedQuestions);
      // Update exam question count
      const updatedExams = await loadExams();
      const finalExams = updatedExams.map(ex => 
        ex.id === selectedExam.id ? { ...ex, questionCount: updatedQuestions.length } : ex
      );
      await saveExams(finalExams);
    }
  };

  return (
    <div className="space-y-4">
      {questions.map((q, i)=> (
        <div key={q.id} className="border rounded-xl p-4">
          <div className="flex items-start gap-2">
            <span className="text-sm font-bold bg-gray-100 px-2 py-1 rounded">{i+1}</span>
            <textarea 
              id={`question-${q.id}`}
              name={`question-${i}`}
              className="w-full border rounded-xl p-2" 
              value={q.text} 
              onChange={e=>updateQ(i,{text:e.target.value})} 
              placeholder="Enter question text"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3 mt-3">
            {q.options.map((opt, oi)=> (
              <div key={oi} className="flex gap-2 items-center">
                <input 
                  id={`option-${q.id}-${oi}`}
                  name={`option-${q.id}-${oi}`}
                  type="text"
                  className="w-full border rounded-xl p-2" 
                  value={opt} 
                  onChange={e=>{
                    const newOpts = [...q.options]; newOpts[oi] = e.target.value; updateQ(i,{options:newOpts});
                  }} 
                  placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                />
                <label className="text-xs flex items-center gap-1">
                  <input 
                    id={`correct-${q.id}-${oi}`}
                    name={`correct-${q.id}`}
                    type="radio" 
                    checked={q.correctIndex===oi} 
                    onChange={()=>updateQ(i,{correctIndex:oi})}
                  />
                  Correct
                </label>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={()=>removeQ(i)} className="px-3 py-1.5 bg-red-600 text-white rounded-xl text-sm">Remove</button>
          </div>
        </div>
      ))}
      <button onClick={add} className="px-4 py-2 rounded-xl bg-emerald-600 text-white">Add Question</button>
    </div>
  );
}

function StudentPanel({user}){
  const [questions, setQuestions] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [allExams, setAllExams] = useState([]);

  useEffect(()=>{
    // Load all exams (active and past), newest first; student must choose one
    const loadExamsData = async () => {
      try {
        const exams = await loadExams();
        const sorted = [...exams].sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));
        setAllExams(sorted);
      } catch (error) {
        console.error('Error loading exams:', error);
        setAllExams([]);
      }
    };
    loadExamsData();
  }, []);

  useEffect(()=>{
    if (!selectedExam) return;
    // Once an exam is selected, load and randomize questions for that specific exam
    const loadExamQuestions = async () => {
      try {
        const originalQuestions = await loadQuestionsForExam(selectedExam.id);
        if (originalQuestions.length > 0) {
          const limitedQuestions = originalQuestions.slice(0, selectedExam.questionCount);
          const randomizedQuestions = randomizeQuestions(limitedQuestions);
          setQuestions(randomizedQuestions);
          setAnswers(Array(randomizedQuestions.length).fill(-1));
        } else {
          setQuestions([]);
          setAnswers([]);
        }
      } catch (error) {
        console.error('Error loading questions for exam:', error);
        setQuestions([]);
        setAnswers([]);
      }
    };
    loadExamQuestions();
  }, [selectedExam]);

  // Function to randomize questions and answer options
  const randomizeQuestions = (originalQuestions) => {
    return originalQuestions.map(q => {
      const questionCopy = { ...q };
      const options = [...q.options];
      const correctAnswer = options[q.correctIndex];
      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
      }
      const newCorrectIndex = options.indexOf(correctAnswer);
      return {
        ...questionCopy,
        options: options,
        correctIndex: newCorrectIndex,
        originalId: q.id
      };
    }).sort(() => Math.random() - 0.5);
  };

  const onSelect = (oi)=>{
    setAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[currentQuestionIndex] = oi;
      return newAnswers;
    });
  };

  const goToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const goToQuestion = (index) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index);
    }
  };

  const onSubmit = async () => {
    let s=0; questions.forEach((q, i)=>{ if (answers[i] === q.correctIndex) s++; });
    setScore(s);
    setSubmitted(true);

    const result = {
      username: user.username,
      score: s,
      total: questions.length,
      percent: Math.round((s/questions.length)*100),
      submittedAt: new Date().toISOString(),
      answers,
      examTitle: selectedExam ? selectedExam.title : DEFAULT_EXAM_TITLE,
      questionOrder: questions.map(q => q.originalId),
    };
    try {
      const old = await loadResults();
      old.push(result);
      await saveResults(old);
    } catch (error) {
      console.error('Error saving result:', error);
      // Fallback to localStorage
      const old = JSON.parse(localStorage.getItem(LS_KEYS.RESULTS) || '[]');
      old.push(result);
      localStorage.setItem(LS_KEYS.RESULTS, JSON.stringify(old));
    }
  };

  // If no exam selected yet, show exams for selection
  if (!selectedExam) {
    return (
      <div className="bg-white rounded-2xl shadow p-6">
        <h3 className="text-lg font-bold mb-2">Available Exams</h3>
        {allExams.length === 0 ? (
          <p className="text-sm text-gray-600">No exams found. Please contact your administrator.</p>
        ) : (
          <div className="space-y-3">
            {allExams.map(exam => (
              <div key={exam.id} className="border rounded-xl p-4 flex items-start justify-between">
                <div>
                  <h4 className="font-semibold">{exam.title}</h4>
                  <p className="text-sm text-gray-600">{exam.description}</p>
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    <span>Questions: {exam.questionCount || 0}</span>
                    <span>Duration: {exam.duration} minutes</span>
                    {exam.isActive ? (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Active</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">Past</span>
                    )}
                    <span>Created: {new Date(exam.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedExam(exam)}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm h-fit"
                >
                  Start Exam
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-bold mb-2">No Questions Available</h3>
            <p className="text-sm text-gray-600">The exam "{selectedExam.title}" has no questions. Please contact your administrator.</p>
          </div>
          <button
            onClick={() => setSelectedExam(null)}
            className="px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 text-sm"
          >
            ← Back to Exams
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-bold mb-2">Submission Successful</h3>
            <p className="mb-2">Exam: <b>{selectedExam.title}</b></p>
            <p className="mb-4">Score: <b>{score}</b> / {questions.length} ({Math.round((score/questions.length)*100)}%)</p>
            <p className="text-sm text-gray-600">You may close this page. Your result has been recorded.</p>
          </div>
          <button
            onClick={() => setSelectedExam(null)}
            className="px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 text-sm"
          >
            ← Back to Exams
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Exam Header */}
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-bold mb-1">{selectedExam.title}</h3>
            <p className="text-sm text-gray-600 mb-2">{selectedExam.description}</p>
            <div className="flex gap-4 text-xs text-gray-500 mb-2">
              <span>Duration: {selectedExam.duration} minutes</span>
              <span>Questions: {questions.length}</span>
              <span>Current: {currentQuestionIndex + 1} of {questions.length}</span>
            </div>
            <p className="text-xs text-emerald-600">⚠️ Questions are randomized for each student</p>
          </div>
          <button
            onClick={() => setSelectedExam(null)}
            className="px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 text-sm"
          >
            ← Back to Exams
          </button>
        </div>
      </div>

      {/* Question Navigation */}
      <div className="bg-white rounded-2xl shadow p-4">
        <div className="flex flex-wrap gap-2 mb-4">
          {questions.map((_, index) => (
            <button
              key={index}
              onClick={() => goToQuestion(index)}
              className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                index === currentQuestionIndex
                  ? 'bg-emerald-600 text-white'
                  : answers[index] !== -1
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={`Question ${index + 1}${answers[index] !== -1 ? ' (Answered)' : ''}`}
            >
              {index + 1}
            </button>
          ))}
        </div>
        <div className="text-xs text-gray-500">
          <span className="inline-block w-3 h-3 bg-emerald-100 border border-emerald-300 rounded mr-1"></span>
          Answered • 
          <span className="inline-block w-3 h-3 bg-gray-100 rounded ml-2 mr-1"></span>
          Not Answered
        </div>
      </div>

      {/* Current Question */}
      {questions.length > 0 && (
        <div className="bg-white rounded-2xl shadow p-6">
          <div className="flex items-start gap-2 mb-4">
            <span className="text-sm font-bold bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
          </div>
          <p className="font-medium text-lg mb-6">{questions[currentQuestionIndex].text}</p>
          <div className="grid sm:grid-cols-2 gap-3 mb-6">
            {questions[currentQuestionIndex].options.map((opt, oi) => (
              <label 
                key={oi} 
                className={`border-2 rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-all hover:border-emerald-300 ${
                  answers[currentQuestionIndex] === oi 
                    ? "border-emerald-500 bg-emerald-50" 
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <input 
                  type="radio" 
                  name={`q-${questions[currentQuestionIndex].id}`} 
                  checked={answers[currentQuestionIndex] === oi} 
                  onChange={() => onSelect(oi)} 
                  className="w-4 h-4 text-emerald-600"
                />
                <span className="font-medium">
                  {String.fromCharCode(65 + oi)}. {opt}
                </span>
              </label>
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center">
            <button 
              onClick={goToPreviousQuestion}
              disabled={currentQuestionIndex === 0}
              className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                currentQuestionIndex === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              ← Previous
            </button>

            <div className="text-sm text-gray-600">
              {answers.filter(a => a !== -1).length} of {questions.length} answered
            </div>

            {currentQuestionIndex === questions.length - 1 ? (
              <button 
                onClick={onSubmit}
                className="px-6 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-semibold transition-colors"
              >
                Submit Exam
              </button>
            ) : (
              <button 
                onClick={goToNextQuestion}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-medium transition-colors"
              >
                Next →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ResultsTable({results, setResults}){
  const clear = () => {
    if (window.confirm("Clear all results?")) {
      setResults([]);
    }
  };
  return (
    <div>
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
        <p className="text-sm text-blue-800">
          <strong>Randomization Active:</strong> Each student receives questions in a different random order with shuffled answer options to prevent cheating.
        </p>
      </div>
      <div className="overflow-auto border rounded-xl">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              {"Username,Exam Title,Score,Total,Percent,Submitted At,Question Order".split(",").map(h=> (
                <th key={h} className="text-left p-2 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map((r, idx)=> (
              <tr key={idx} className="border-t">
                <td className="p-2">{r.username}</td>
                <td className="p-2">{r.examTitle}</td>
                <td className="p-2">{r.score}</td>
                <td className="p-2">{r.total}</td>
                <td className="p-2">{r.percent}%</td>
                <td className="p-2">{new Date(r.submittedAt).toLocaleString()}</td>
                <td className="p-2 text-xs">
                  {r.questionOrder ? 
                    r.questionOrder.slice(0, 3).join(", ") + (r.questionOrder.length > 3 ? "..." : "") :
                    "Randomized"
                  }
                </td>
              </tr>
            ))}
            {results.length===0 && (
              <tr><td colSpan={7} className="p-3 text-center text-gray-500">No results yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={clear} className="px-3 py-1.5 rounded-xl bg-red-600 text-white">Clear Results</button>
      </div>
    </div>
  );
}



// Save questions for a specific exam (localStorage fallback)
// eslint-disable-next-line no-unused-vars
function saveQuestionsForExamLocal(examId, questions) {
  localStorage.setItem(`cbt_questions_${examId}`, JSON.stringify(questions));
}



// Clean up markdown artifacts from text
function cleanMarkdownText(text) {
  if (!text) return text;
  
  return text
    // Remove markdown backslashes and dots
    .replace(/\\\./g, '')
    .replace(/\\/g, '')
    // Remove other markdown artifacts
    .replace(/\*\*/g, '') // Remove bold markers
    .replace(/\*/g, '')   // Remove italic markers
    .replace(/`/g, '')    // Remove code markers
    .replace(/#{1,6}\s/g, '') // Remove heading markers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
    // Remove extra spaces
    .replace(/\s+/g, ' ')
    // Remove leading/trailing spaces
    .trim();
}

// Enhanced document parser with better error handling and format detection
// Supports question formats: 1, 1., 1), Q1, Q1., Q1), etc.
// Supports answer formats: A, A., A), a, a., a), 1, 1., 1), etc.
function parseQuestionsFromMarkdown(md) {
  const text = md.replace(/\r/g, "").trim();
  const questions = [];
  
  // Split the text into lines and clean them
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let currentQuestion = null;
  let currentOptions = [];
  let currentAnswer = null;
  let questionNumber = 0;
  let totalLinesProcessed = 0;
  
  console.log("🚀 Starting enhanced document parsing");
  console.log(`📄 Document has ${lines.length} non-empty lines`);
  console.log("📋 First 10 lines:", lines.slice(0, 10));
  
  // Helper function to save current question
  const saveCurrentQuestion = () => {
    if (currentQuestion && currentOptions.length === 4 && currentAnswer !== null) {
      const question = createQuestionObject(currentQuestion, currentOptions, currentAnswer);
      if (question) {
        questions.push(question);
        console.log(`✅ Successfully saved question ${questionNumber}: "${currentQuestion.substring(0, 50)}..."`);
        return true;
      } else {
        console.log(`❌ Failed to create question object for question ${questionNumber}`);
        return false;
      }
    } else {
      if (currentQuestion) {
        console.log(`⚠️ Incomplete question ${questionNumber}:`);
        console.log(`   📝 Question: "${currentQuestion.substring(0, 50)}..."`);
        console.log(`   📋 Options: ${currentOptions.length}/4 (${currentOptions.map(o => o.letter).join(', ')})`);
        console.log(`   🎯 Answer: ${currentAnswer || 'missing'}`);
      }
      return false;
    }
  };
  
  // Helper function to reset state
  const resetState = () => {
    currentQuestion = null;
    currentOptions = [];
    currentAnswer = null;
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    totalLinesProcessed++;
    
    console.log(`\n🔍 Processing line ${i + 1}/${lines.length}: "${line}"`);
    
    // Enhanced question detection - more flexible patterns
    const questionPatterns = [
      /^(\d+)\s*[.)]?\s*(.+)$/,                    // 1. Question text, 1) Question text, 1 Question text
      /^[Qq](\d*)\s*[.)]?\s*(.+)$/,              // Q1. Question text, Q1) Question text, Q Question text
      /^Question\s*(\d+)\s*[.:-]?\s*(.+)$/i,     // Question 1: Text, Question 1. Text
    ];
    
    let questionMatch = null;
    for (const pattern of questionPatterns) {
      questionMatch = line.match(pattern);
      if (questionMatch) break;
    }
    
    if (questionMatch) {
      // Save previous question before starting new one
      if (currentQuestion) {
        saveCurrentQuestion();
      }
      
      // Start new question
      questionNumber++;
      currentQuestion = cleanMarkdownText(questionMatch[2] || questionMatch[1]).trim();
      currentOptions = [];
      currentAnswer = null;
      
      console.log(`📝 Started new question ${questionNumber}: "${currentQuestion.substring(0, 50)}..."`);
      continue;
    }
    
    // Enhanced answer detection
    const answerPatterns = [
      /^[Aa]nswer\s*[:-]?\s*([A-Da-d1-4])/i,      // Answer: A, Answer - A, answer: a
      /^[Cc]orrect\s*[:-]?\s*([A-Da-d1-4])/i,     // Correct: A, correct - A
      /^[Ss]olution\s*[:-]?\s*([A-Da-d1-4])/i,    // Solution: A
      /^\s*([A-Da-d1-4])\s*$/,                     // Just "A" on its own line
    ];
    
    let answerMatch = null;
    for (const pattern of answerPatterns) {
      answerMatch = line.match(pattern);
      if (answerMatch) break;
    }
    
    if (answerMatch && currentQuestion) {
      currentAnswer = answerMatch[1].toUpperCase();
      console.log(`🎯 Found answer for question ${questionNumber}: ${currentAnswer}`);
      
      // If we have all components, try to save the question
      if (currentOptions.length === 4) {
        saveCurrentQuestion();
        resetState();
      }
      continue;
    }
    
    // Enhanced option detection - more flexible patterns
    const optionPatterns = [
      /^([A-Da-d])\s*[.)]?\s*(.+)$/,              // A. Text, A) Text, A Text
      /^([1-4])\s*[.)]?\s*(.+)$/,                 // 1. Text, 1) Text, 1 Text
      /^Option\s*([A-Da-d1-4])\s*[:-]?\s*(.+)$/i,  // Option A: Text
    ];
    
    let optionMatch = null;
    for (const pattern of optionPatterns) {
      optionMatch = line.match(pattern);
      if (optionMatch) break;
    }
    
    if (optionMatch && currentQuestion && currentOptions.length < 4) {
      let optionLetter = optionMatch[1].toUpperCase();
      const optionText = cleanMarkdownText(optionMatch[2]).trim();
      
      // Convert numbers to letters
      if (optionLetter === '1') optionLetter = 'A';
      else if (optionLetter === '2') optionLetter = 'B';
      else if (optionLetter === '3') optionLetter = 'C';
      else if (optionLetter === '4') optionLetter = 'D';
      
      // Check for duplicate options
      const existingOption = currentOptions.find(opt => opt.letter === optionLetter);
      if (existingOption) {
        console.log(`⚠️ Duplicate option ${optionLetter} found, skipping`);
        continue;
      }
      
      currentOptions.push({ letter: optionLetter, text: optionText });
      console.log(`📋 Added option ${optionLetter} for question ${questionNumber}: "${optionText.substring(0, 30)}..."`);
      
      // If we have all 4 options and an answer, try to save
      if (currentOptions.length === 4 && currentAnswer) {
        saveCurrentQuestion();
        resetState();
      }
      continue;
    }
    
    // If we have a question but no options yet, this might be continuation of question text
    if (currentQuestion && currentOptions.length === 0 && !line.match(/^[A-Da-d1-4]/i)) {
      currentQuestion += ' ' + cleanMarkdownText(line);
      console.log(`📝 Extended question ${questionNumber}: "${currentQuestion.substring(0, 50)}..."`);
      continue;
    }
    
    // Log unrecognized lines for debugging
    console.log(`❓ Unrecognized line format: "${line}"`);
  }
  
  // Save the final question if it exists
  if (currentQuestion) {
    console.log("\n🔚 Processing final question...");
    saveCurrentQuestion();
  }
  
  console.log(`\n🎉 Parsing complete!`);
  console.log(`📊 Total lines processed: ${totalLinesProcessed}`);
  console.log(`✅ Questions successfully parsed: ${questions.length}`);
  console.log(`📋 Question breakdown:`);
  questions.forEach((q, index) => {
    console.log(`   ${index + 1}. "${q.text.substring(0, 40)}..." (Answer: ${String.fromCharCode(65 + q.correctIndex)})`);
  });
  
  return questions;
}

function createQuestionObject(questionText, options, correctAnswer) {
  // Validate we have enough data
  if (!questionText || options.length !== 4 || !correctAnswer) {
    console.log("❌ Invalid question data:", { 
      questionText: questionText?.substring(0, 50), 
      optionsLength: options.length, 
      correctAnswer,
      options: options.map(opt => ({ letter: opt.letter, text: opt.text?.substring(0, 30) }))
    });
    return null;
  }
  
  // Convert answer to index
  const answerIndex = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 }[correctAnswer];
  if (answerIndex === undefined) {
    console.log("❌ Invalid answer:", correctAnswer);
    return null;
  }
  
  // Sort options by A, B, C, D order
  const sortedOptions = ['A', 'B', 'C', 'D'].map(letter => {
    const option = options.find(opt => opt.letter === letter);
    return option ? option.text : '';
  });
  
  // Check if all options are present
  if (sortedOptions.some(opt => !opt)) {
    console.log("❌ Missing options:", sortedOptions);
    console.log("❌ Available options:", options.map(opt => ({ letter: opt.letter, text: opt.text?.substring(0, 30) })));
    return null;
  }
  
  const question = {
    id: crypto.randomUUID(),
    text: cleanMarkdownText(questionText),
    options: sortedOptions.map(opt => cleanMarkdownText(opt)),
    correctIndex: answerIndex
  };
  
  console.log("✅ Created question object:", {
    text: question.text.substring(0, 50),
    options: question.options.map(opt => opt.substring(0, 30)),
    correctIndex: question.correctIndex
  });
  
  return question;
}

// Excel parser for .xlsx files using ExcelJS
// Expected format: Question | Option A | Option B | Option C | Option D | Correct Answer
async function parseQuestionsFromExcel(file) {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    
    const worksheet = workbook.getWorksheet(1); // Get first worksheet
    if (!worksheet) {
      throw new Error('No worksheet found in Excel file');
    }
    
    const questions = [];
    let startRow = 1; // Default start row
    
    // Check if first row is header
    const firstRow = worksheet.getRow(1);
    const firstCell = firstRow.getCell(1).value;
    if (firstCell && firstCell.toString().toLowerCase().includes('question')) {
      startRow = 2; // Skip header row
    }
    
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber < startRow) return; // Skip header rows
      
      const questionText = row.getCell(1).value?.toString().trim();
      const optionA = row.getCell(2).value?.toString().trim();
      const optionB = row.getCell(3).value?.toString().trim();
      const optionC = row.getCell(4).value?.toString().trim();
      const optionD = row.getCell(5).value?.toString().trim();
      const correctAnswer = row.getCell(6).value?.toString().trim().toUpperCase();
      
      if (!questionText || !optionA || !optionB || !optionC || !optionD || !correctAnswer) {
        console.log(`Skipping invalid row ${rowNumber}:`, { questionText, optionA, optionB, optionC, optionD, correctAnswer });
        return;
      }
      
      // Convert answer to index (A=0, B=1, C=2, D=3)
      const answerIndex = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 }[correctAnswer];
      if (answerIndex === undefined) {
        console.log(`Invalid answer in row ${rowNumber}:`, correctAnswer);
        return;
      }
      
      questions.push({
        id: crypto.randomUUID(),
        text: cleanMarkdownText(questionText),
        options: [
          cleanMarkdownText(optionA),
          cleanMarkdownText(optionB),
          cleanMarkdownText(optionC),
          cleanMarkdownText(optionD)
        ],
        correctIndex: answerIndex
      });
    });
    
    console.log(`Parsed ${questions.length} questions from Excel file`);
    return questions;
  } catch (error) {
    console.error('Error parsing Excel file:', error);
    throw new Error('Failed to parse Excel file. Please check the format.');
  }
}

function AdminSettings({ exams, questions, results, exportResultsToExcel, exportResultsToWord, dataService, onClearData, currentUser }) {
  const [adminUsers, setAdminUsers] = useState([]);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load admin users
  useEffect(() => {
    const loadAdminUsers = async () => {
      if (currentUser?.isDefaultAdmin) {
        try {
          setIsLoading(true);
          const admins = await dataService.listAdminUsers(currentUser.username);
          setAdminUsers(admins);
        } catch (error) {
          console.error('Error loading admin users:', error);
          setAdminUsers([]);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadAdminUsers();
  }, [currentUser, dataService]);

  const handleCreateAdmin = async (adminData) => {
    try {
      await dataService.createNewAdmin(adminData, currentUser.username);
      setShowCreateAdmin(false);
      // Reload admin list
      const admins = await dataService.listAdminUsers(currentUser.username);
      setAdminUsers(admins);
      alert('✅ New admin user created successfully!');
    } catch (error) {
      alert(`❌ Failed to create admin: ${error.message}`);
    }
  };

  const handleDeleteAdmin = async (username) => {
    if (!window.confirm(`Are you sure you want to delete admin user "${username}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await dataService.deleteAdminUser(username, currentUser.username);
      // Reload admin list
      const admins = await dataService.listAdminUsers(currentUser.username);
      setAdminUsers(admins);
      alert('✅ Admin user deleted successfully!');
    } catch (error) {
      alert(`❌ Failed to delete admin: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* System Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">System Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p><strong>Database:</strong> MongoDB Atlas (Cloud)</p>
            <p><strong>Version:</strong> CBT System v1.0</p>
            <p><strong>Status:</strong> Operational</p>
          </div>
          <div>
            <p><strong>Total Exams:</strong> {exams?.length || 0}</p>
            <p><strong>Total Questions:</strong> {questions?.length || 0}</p>
            <p><strong>Total Results:</strong> {results?.length || 0}</p>
          </div>
        </div>
      </div>

      {/* Admin User Management */}
      <div className="bg-white border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Admin User Management</h3>
        
        {currentUser?.isDefaultAdmin ? (
          <div className="space-y-4">
            {/* Current Admin Info */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">👑</div>
                <div className="flex-1">
                  <h5 className="font-semibold text-green-800 mb-2">Default Administrator</h5>
                  <p className="text-sm text-green-700 mb-2">
                    You are the default administrator with full system privileges.
                  </p>
                  <p className="text-xs text-green-600">
                    Username: {currentUser.username} | Role: {currentUser.role}
                  </p>
                </div>
              </div>
            </div>

            {/* Create New Admin */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h5 className="font-semibold text-blue-800 mb-2">Create New Admin</h5>
                  <p className="text-sm text-blue-700 mb-3">
                    Create additional administrator accounts. Only you can create and delete admin users.
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateAdmin(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
                >
                  ➕ Create New Admin
                </button>
              </div>
            </div>

            {/* Admin Users List */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h5 className="font-semibold text-gray-800 mb-3">Admin Users ({adminUsers.length})</h5>
              
              {isLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-gray-600 mt-2">Loading admin users...</p>
                </div>
              ) : adminUsers.length === 0 ? (
                <p className="text-sm text-gray-600">No admin users found.</p>
              ) : (
                <div className="space-y-2">
                  {adminUsers.map((admin, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{admin.fullName}</span>
                          {admin.isDefaultAdmin && (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">Default</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          Username: {admin.username}
                        </p>
                        {admin.createdBy && (
                          <p className="text-xs text-gray-500">Created by: {admin.createdBy}</p>
                        )}
                      </div>
                      {!admin.isDefaultAdmin && (
                        <button
                          onClick={() => handleDeleteAdmin(admin.username)}
                          className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl">🔒</div>
              <div className="flex-1">
                <h5 className="font-semibold text-yellow-800 mb-2">Limited Access</h5>
                <p className="text-sm text-yellow-700 mb-2">
                  You are a regular administrator. Only the default administrator can manage admin users.
                </p>
                <p className="text-xs text-yellow-600">
                  Username: {currentUser?.username} | Role: {currentUser?.role}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Admin Modal */}
      {showCreateAdmin && (
        <CreateAdminModal
          onClose={() => setShowCreateAdmin(false)}
          onCreate={handleCreateAdmin}
        />
      )}

      {/* Data Management */}
      <div className="bg-white border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Data Management</h3>
        
        <div className="space-y-4">
          {/* Export Data */}
          <div className="flex gap-2">
            <button
              onClick={exportResultsToExcel}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              📊 Export Results to Excel
            </button>
            <button
              onClick={exportResultsToWord}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              📄 Export Results to Word
            </button>
          </div>

          {/* Clear Data Section */}
          <div className="border-t pt-4 mt-4">
            <h4 className="text-md font-semibold text-red-700 mb-3">⚠️ Dangerous Operations</h4>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">🚨</div>
                <div className="flex-1">
                  <h5 className="font-semibold text-red-800 mb-2">Clear All Data</h5>
                  <p className="text-sm text-red-700 mb-3">
                    This action will permanently delete ALL data from the system including:
                  </p>
                  <ul className="text-sm text-red-700 mb-4 space-y-1">
                    <li>• All exams and questions</li>
                    <li>• All student results</li>
                    <li>• All student registrations</li>
                    <li>• Data from both local and cloud databases</li>
                  </ul>
                  <p className="text-sm text-green-700 mb-3">
                    <strong>✅ Admin user will be preserved</strong>
                  </p>
                  <button
                    onClick={onClearData}
                    className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition-colors"
                  >
                    🗑️ Clear All Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="bg-white border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">System Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-2xl mb-2">✅</div>
            <h4 className="font-semibold text-green-800">Database</h4>
            <p className="text-sm text-green-600">Connected</p>
          </div>
          <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-2xl mb-2">📊</div>
            <h4 className="font-semibold text-blue-800">Storage</h4>
            <p className="text-sm text-blue-600">Cloud + Local</p>
          </div>
          <div className="text-center p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="text-2xl mb-2">🔒</div>
            <h4 className="font-semibold text-purple-800">Security</h4>
            <p className="text-sm text-purple-600">Admin Protected</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;