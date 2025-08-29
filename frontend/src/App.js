import React, { useEffect, useState, useRef } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell } from "docx";
import mammoth from "mammoth";
import dataService from "./services/dataService";

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

  useEffect(() => {
    const saved = localStorage.getItem("cbt_logged_in_user");
    if (saved) {
      setUser(JSON.parse(saved));
      setView("home");
    }
  }, []);

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

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <Header user={user} onLogout={onLogout} onLogoClick={handleLogoClick} />
      <main className="max-w-5xl mx-auto w-full px-3 sm:px-8 py-4 sm:py-8">
        {user ? (
          user.role === "admin" ? (
            <AdminPanel />
          ) : (
            <StudentPanel user={user} />
          )
        ) : (
          <>
            {view !== "admin-login" && (
              <Login onLogin={(u)=>{setUser(u); localStorage.setItem("cbt_logged_in_user", JSON.stringify(u)); setView("home");}} />
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
              />
            )}
          </>
        )}
      </main>
      <footer className="text-center text-xs text-gray-500 py-6">
        © {new Date().getFullYear()} College of Nursing, Eku, Delta State
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
  try {
    return await dataService.authenticateUser(username, password);
  } catch (error) {
    console.error('Error authenticating user:', error);
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



// Results management functions
async function loadResults() {
  try {
    const data = await dataService.loadResults();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error loading results:', error);
    return [];
  }
}

async function saveResults(results) {
  try {
    return await dataService.saveResults(results);
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

function Login({onLogin}){
  const [mode, setMode] = useState("login"); // "login" or "register"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirm, setShowRegisterConfirm] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!username || !password) {
      setError("Please enter both username and password");
      return;
    }

    try {
      // Only student authentication - admin access is separate
      const user = await authenticateUser(username, password);
      if (user) {
        onLogin(user);
      } else {
        setError("Invalid username or password. Please check your credentials or register as a new student.");
      }
    } catch (error) {
      console.error('Error during student login:', error);
      setError("Login failed. Please try again.");
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
          <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2.5 font-semibold">
            Login as Student
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

function AdminLogin({onLogin, onBack}){
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!username || !password) {
      setError("Please enter both username and password");
      return;
    }

    try {
      // Admin authentication using stored password
      const users = await loadUsers();
      const adminUser = users.find(u => u.username === "admin");
      
      if (adminUser && adminUser.password === password) {
        onLogin({
          username, 
          role: "admin", 
          fullName: "System Administrator", 
          email: "admin@healthschool.com"
        });
      } else {
        setError("Invalid admin credentials. Please check your username and password.");
      }
    } catch (error) {
      console.error('Error during admin login:', error);
      setError("Login failed. Please try again.");
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg p-8 border">
      <div className="text-center mb-6">
        <div className="text-3xl mb-2">🔐</div>
        <h1 className="text-2xl font-bold text-gray-800">Admin Access</h1>
        <p className="text-gray-600 mt-2">System Administrator Login</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label htmlFor="admin-username" className="block text-sm font-medium mb-1">Username</label>
          <input 
            id="admin-username"
            name="username"
            type="text"
            value={username} 
            onChange={e=>setUsername(e.target.value)} 
            className="w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500" 
            placeholder="Enter admin username"
            autoComplete="username"
          />
        </div>
        <div>
          <label htmlFor="admin-password" className="block text-sm font-medium mb-1">Password</label>
          <div className="relative">
            <input 
              id="admin-password"
              name="password"
              type={showAdminPassword ? "text" : "password"} 
              value={password} 
              onChange={e=>setPassword(e.target.value)} 
              className="w-full border rounded-xl px-3 py-2 pr-10 focus:ring-2 focus:ring-red-500 focus:border-red-500" 
              placeholder="Enter admin password"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={()=>setShowAdminPassword(s=>!s)}
              className="absolute inset-y-0 right-2 text-xs text-gray-500"
              aria-label={showAdminPassword ? "Hide password" : "Show password"}
                          >
                {showAdminPassword ? (
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
        <button className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl py-2.5 font-semibold transition-colors">
          Access Admin Panel
        </button>
      </form>

      <div className="mt-6 text-center">
        <button 
          onClick={onBack}
          className="text-gray-500 hover:text-gray-700 text-sm underline"
        >
          ← Back to Student Login
        </button>
      </div>

      <div className="mt-6 text-xs text-gray-500 text-center">
        <p><b>Admin Credentials:</b> admin / admin123</p>
        <p className="mt-1">This is a secure admin-only access point.</p>
      </div>
    </div>
  );
}

function AdminPanel(){
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
          saveQuestionsForExam(selectedExam.id, parsed);
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
          saveQuestionsForExam(selectedExam.id, parsed);
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



  const exportResultsToExcel = () => {
    const wsData = [["Username","Exam Title","Score","Total","Percent","Submitted At","Answers"]];
    for (const r of results) {
      wsData.push([r.username, r.examTitle, r.score, r.total, r.percent, r.submittedAt, r.answers.join(", ")]);
    }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Results");
    const wbout = XLSX.write(wb, {bookType:"xlsx", type:"array"});
    const blob = new Blob([wbout], {type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
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

  const handleCreateExam = (examData) => {
    const newExam = createExam(examData);
    setExams(loadExams());
    setShowCreateExam(false);
    setSelectedExam(newExam);
    setActiveTab("questions");
  };

  const handleActivateExam = (examId) => {
    setActiveExam(examId);
    setExams(loadExams());
  };

  const handleDeleteExam = (examId) => {
    if (window.confirm("Are you sure you want to delete this exam? This action cannot be undone.")) {
      deleteExam(examId);
      setExams(loadExams());
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
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to clear ALL data? This will remove all exams, questions, results, and user data. This action cannot be undone.')) {
                // Clear all localStorage data
                const LS_KEYS = {
                  EXAMS: "cbt_exams_v1",
                  QUESTIONS: "cbt_questions_v1", 
                  RESULTS: "cbt_results_v1",
                  USERS: "cbt_users_v1",
                  STUDENT_REGISTRATIONS: "cbt_student_registrations_v1",
                  SHARED_DATA: "cbt_shared_data_v1",
                  ACTIVE_EXAM: "cbt_active_exam_v1"
                };

                // Clear all CBT-related localStorage items
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

                // Reset state
                setExams([]);
                setQuestions([]);
                setResults([]);

                alert('All data cleared successfully! The page will refresh.');
                window.location.reload();
              }
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 text-sm"
          >
            🗑️ Clear All Data
          </button>
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
              <label htmlFor="exam-selection" className="block text-sm font-medium mb-2">Choose Exam:</label>
              <select 
                id="exam-selection"
                name="selectedExam"
                value={selectedExam?.id || ""} 
                onChange={(e) => {
                  const examId = e.target.value;
                  if (examId) {
                    const exam = exams.find(ex => ex.id === examId);
                    setSelectedExam(exam);
                    // Load questions for this specific exam
                    const examQuestions = loadQuestionsForExam(examId);
                    setQuestions(examQuestions);
                  } else {
                    setSelectedExam(null);
                    setQuestions([]);
                  }
                }}
                className="w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Select an exam --</option>
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
                    onClick={() => {
                      if (window.confirm("Are you sure you want to delete all questions for this exam?")) {
                        setQuestions([]);
                        saveQuestionsForExam(selectedExam.id, []);
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
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <p className="text-sm text-emerald-800">
                      <strong>🔄 Randomization Active:</strong> Questions and answer options are automatically randomized for each student to prevent cheating.
                    </p>
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
                <p>Please select an exam from the dropdown above to manage its questions.</p>
                <p className="text-sm mt-2">You can upload questions, edit existing ones, or clear all questions for the selected exam.</p>
                <div className="mt-4">
                  <button
                    onClick={() => setActiveTab("exams")}
                    className="px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 text-sm"
                  >
                    ← Back to Exams
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
                <button onClick={exportResultsToExcel} className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700">
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
            <AdminSettings onClearData={() => {
              // Clear all localStorage data
              const LS_KEYS = {
                EXAMS: "cbt_exams_v1",
                QUESTIONS: "cbt_questions_v1", 
                RESULTS: "cbt_results_v1",
                USERS: "cbt_users_v1",
                STUDENT_REGISTRATIONS: "cbt_student_registrations_v1",
                SHARED_DATA: "cbt_shared_data_v1",
                ACTIVE_EXAM: "cbt_active_exam_v1"
              };

              // Clear all CBT-related localStorage items
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

              // Reset state
              setExams([]);
              setQuestions([]);
              setResults([]);

              alert('All data cleared successfully! The page will refresh.');
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

  const exportStudentsToExcel = () => {
    const wsData = [["Full Name", "Username", "Email", "Registration Date"]];
    for (const student of students) {
      wsData.push([
        student.fullName,
        student.username,
        student.email,
        new Date(student.registeredAt).toLocaleDateString()
      ]);
    }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    const wbout = XLSX.write(wb, {bookType:"xlsx", type:"array"});
    const blob = new Blob([wbout], {type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
    saveAs(blob, "CBT_Students.xlsx");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-600">Total Registered Students: <strong>{students.length}</strong></p>
        </div>
        <button 
          onClick={exportStudentsToExcel} 
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

function AdminSettings({ onClearData }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // "success" or "error"
  const [showCurr, setShowCurr] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const fileInputRef = useRef(null);

  const handlePasswordChange = (e) => {
    e.preventDefault();
    setMessage("");
    setMessageType("");

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage("Please fill in all fields");
      setMessageType("error");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("New passwords do not match");
      setMessageType("error");
      return;
    }

    if (newPassword.length < 8) {
      setMessage("New password must be at least 8 characters long");
      setMessageType("error");
      return;
    }

    // Check if current password is correct
    const users = loadUsers();
    const adminUser = users.find(u => u.username === "admin");
    
    if (!adminUser || adminUser.password !== currentPassword) {
      setMessage("Current password is incorrect");
      setMessageType("error");
      return;
    }

    // Update admin password
    adminUser.password = newPassword;
    saveUsers(users);
    
    setMessage("Password updated successfully! Please logout and login with your new password.");
    setMessageType("success");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const validatePasswordStrength = (password) => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    
    const score = Object.values(checks).filter(Boolean).length;
    return { checks, score, strength: score < 3 ? "weak" : score < 4 ? "medium" : "strong" };
  };

  const passwordStrength = validatePasswordStrength(newPassword);

  const exportAllData = () => {
    const allData = {
      exams: loadExams(),
      results: loadResults(),
      users: loadUsers(),
      studentRegistrations: loadStudentRegistrations(),
      questions: loadQuestions(),
      activeExam: dataService.getActiveExam(),
      exportDate: new Date().toISOString(),
      version: "1.0.0"
    };

    const dataStr = JSON.stringify(allData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    saveAs(dataBlob, `CBT_Data_Backup_${new Date().toISOString().split('T')[0]}.json`);
  };

  const importAllData = (event) => {
    const file = event.target.files[0];
    if (!file) {
      console.log("No file selected");
      return;
    }

    console.log("Importing file:", file.name, "Size:", file.size);

    // Check file type
    if (!file.name.toLowerCase().endsWith('.json')) {
      alert("Please select a valid JSON file (.json extension)");
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        console.log("File read successfully, parsing JSON...");
        const data = JSON.parse(e.target.result);
        
        console.log("Parsed data structure:", Object.keys(data));
        
        // Validate the data structure - check if required fields exist (can be empty arrays)
        if (data.exams === undefined || data.results === undefined || data.users === undefined) {
          alert("Invalid backup file format. Please use a valid CBT backup file.\n\nExpected fields: exams, results, users");
          console.error("Missing required fields:", { 
            hasExams: data.exams !== undefined, 
            hasResults: data.results !== undefined, 
            hasUsers: data.users !== undefined 
          });
          event.target.value = '';
          return;
        }

        // Additional validation - ensure arrays exist (can be empty)
        if (!Array.isArray(data.exams) || !Array.isArray(data.results) || !Array.isArray(data.users)) {
          alert("Invalid backup file format. The exams, results, and users fields must be arrays.");
          console.error("Invalid field types:", { 
            examsType: typeof data.exams, 
            resultsType: typeof data.results, 
            usersType: typeof data.users
          });
          event.target.value = '';
          return;
        }

        console.log("Data validation passed, merging data...");

        // Merge imported data with existing data instead of replacing
        let mergedCount = { exams: 0, results: 0, users: 0, studentRegistrations: 0, questions: 0 };
        
        if (data.exams && data.exams.length > 0) {
          const existingExams = loadExams();
          const existingIds = new Set(existingExams.map(e => e.id));
          const newExams = data.exams.filter(exam => !existingIds.has(exam.id));
          if (newExams.length > 0) {
            const mergedExams = [...existingExams, ...newExams];
            saveExams(mergedExams);
            mergedCount.exams = newExams.length;
            console.log("Merged exams:", newExams.length, "new exams added");
          } else {
            console.log("No new exams to merge (all already exist)");
          }
        }
        
        if (data.results && data.results.length > 0) {
          const existingResults = loadResults();
          // For results, we'll merge based on unique combination of username, examTitle, and submittedAt
          const existingKeys = new Set(existingResults.map(r => `${r.username}_${r.examTitle}_${r.submittedAt}`));
          const newResults = data.results.filter(result => {
            const key = `${result.username}_${result.examTitle}_${result.submittedAt}`;
            return !existingKeys.has(key);
          });
          if (newResults.length > 0) {
            const mergedResults = [...existingResults, ...newResults];
            localStorage.setItem(LS_KEYS.RESULTS, JSON.stringify(mergedResults));
            mergedCount.results = newResults.length;
            console.log("Merged results:", newResults.length, "new results added");
          } else {
            console.log("No new results to merge (all already exist)");
          }
        }
        
        if (data.users && data.users.length > 0) {
          const existingUsers = loadUsers();
          const existingUsernames = new Set(existingUsers.map(u => u.username));
          const newUsers = data.users.filter(user => !existingUsernames.has(user.username));
          if (newUsers.length > 0) {
            const mergedUsers = [...existingUsers, ...newUsers];
            saveUsers(mergedUsers);
            mergedCount.users = newUsers.length;
            console.log("Merged users:", newUsers.length, "new users added");
          } else {
            console.log("No new users to merge (all usernames already exist)");
          }
        }
        
        if (data.studentRegistrations && data.studentRegistrations.length > 0) {
          const existingRegistrations = loadStudentRegistrations();
          const existingUsernames = new Set(existingRegistrations.map(s => s.username));
          const newRegistrations = data.studentRegistrations.filter(reg => !existingUsernames.has(reg.username));
          if (newRegistrations.length > 0) {
            const mergedRegistrations = [...existingRegistrations, ...newRegistrations];
            localStorage.setItem(LS_KEYS.STUDENT_REGISTRATIONS, JSON.stringify(mergedRegistrations));
            mergedCount.studentRegistrations = newRegistrations.length;
            console.log("Merged student registrations:", newRegistrations.length, "new registrations added");
          } else {
            console.log("No new student registrations to merge (all already exist)");
          }
        }
        
        if (data.questions && data.questions.length > 0) {
          const existingQuestions = loadQuestions();
          const existingIds = new Set(existingQuestions.map(q => q.id));
          const newQuestions = data.questions.filter(question => !existingIds.has(question.id));
          if (newQuestions.length > 0) {
            const mergedQuestions = [...existingQuestions, ...newQuestions];
            localStorage.setItem(LS_KEYS.QUESTIONS, JSON.stringify(mergedQuestions));
            mergedCount.questions = newQuestions.length;
            console.log("Merged questions:", newQuestions.length, "new questions added");
          } else {
            console.log("No new questions to merge (all already exist)");
          }
        }
        
        // Only update active exam if there isn't one already set
        if (data.activeExam && !dataService.getActiveExam()) {
          localStorage.setItem(LS_KEYS.ACTIVE_EXAM, JSON.stringify(data.activeExam));
          console.log("Set active exam (no existing active exam)");
        }

        const message = `✅ Data merged successfully!\n\n📊 Added (new items only):\n• ${mergedCount.exams} new exams\n• ${mergedCount.results} new results\n• ${mergedCount.users} new users\n• ${mergedCount.studentRegistrations} new student registrations\n• ${mergedCount.questions} new questions\n\n💡 Existing data was preserved and not overwritten.`;
        
        alert(message);
        console.log("Import completed successfully");
        
        // Clear the file input
        event.target.value = '';
      } catch (error) {
        console.error('Import error:', error);
        alert(`Failed to import data: ${error.message}\n\nPlease check that the file is a valid CBT backup file.`);
        event.target.value = '';
      }
    };

    reader.onerror = (error) => {
      console.error('File read error:', error);
      alert("Failed to read the file. Please try again.");
      event.target.value = '';
    };

    console.log("Starting file read...");
    reader.readAsText(file);
  };

  const syncSharedData = () => {
    // This function can be extended to sync with a cloud service
    // For now, it will show a message about the current limitation
    alert("Shared data sync feature is coming soon! For now, use the export/import feature to share data between admin users.");
  };

  return (
    <div className="space-y-6">
      {/* Password Change Section */}
      <div className="bg-white rounded-xl border p-6">
        <h4 className="text-lg font-semibold mb-4">🔐 Change Admin Password</h4>
        <p className="text-sm text-gray-600 mb-4">
          Update your admin password to something more secure. The new password should be at least 8 characters long.
        </p>

        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${
            messageType === "success" 
              ? "bg-green-50 border border-green-200 text-green-700" 
              : "bg-red-50 border border-red-200 text-red-700"
          }`}>
            {message}
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label htmlFor="current-password" className="block text-sm font-medium mb-1">Current Password</label>
            <div className="relative">
              <input
                id="current-password"
                name="currentPassword"
                type={showCurr ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter current password"
                autoComplete="current-password"
                required
              />
              <button type="button" onClick={()=>setShowCurr(s=>!s)} className="absolute inset-y-0 right-2 text-xs text-gray-500">
                {showCurr ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="new-password" className="block text-sm font-medium mb-1">New Password</label>
            <div className="relative">
              <input
                id="new-password"
                name="newPassword"
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter new password"
                autoComplete="new-password"
                required
              />
              <button type="button" onClick={()=>setShowNew(s=>!s)} className="absolute inset-y-0 right-2 text-xs text-gray-500">
                {showNew ? "Hide" : "Show"}
              </button>
            </div>
            {/* Password Strength Indicator */}
            {newPassword && (
              <div className="mt-2">
                <div className="flex gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded ${
                        level <= passwordStrength.score
                          ? passwordStrength.strength === "weak"
                            ? "bg-red-500"
                            : passwordStrength.strength === "medium"
                            ? "bg-yellow-500"
                            : "bg-green-500"
                          : "bg-gray-200"
                      }`}
                    />
                  ))}
                </div>
                <div className="text-xs text-gray-600">
                  <span className={`font-medium ${
                    passwordStrength.strength === "weak" ? "text-red-600" :
                    passwordStrength.strength === "medium" ? "text-yellow-600" :
                    "text-green-600"
                  }`}>
                    {passwordStrength.strength.charAt(0).toUpperCase() + passwordStrength.strength.slice(1)} password
                  </span>
                  <div className="mt-1 space-y-1">
                    <div className={`flex items-center gap-1 ${passwordStrength.checks.length ? "text-green-600" : "text-gray-400"}`}>
                      <span>✓</span> <span>At least 8 characters</span>
                    </div>
                    <div className={`flex items-center gap-1 ${passwordStrength.checks.uppercase ? "text-green-600" : "text-gray-400"}`}>
                      <span>✓</span> <span>Uppercase letter</span>
                    </div>
                    <div className={`flex items-center gap-1 ${passwordStrength.checks.lowercase ? "text-green-600" : "text-gray-400"}`}>
                      <span>✓</span> <span>Lowercase letter</span>
                    </div>
                    <div className={`flex items-center gap-1 ${passwordStrength.checks.number ? "text-green-600" : "text-gray-400"}`}>
                      <span>✓</span> <span>Number</span>
                    </div>
                    <div className={`flex items-center gap-1 ${passwordStrength.checks.special ? "text-green-600" : "text-gray-400"}`}>
                      <span>✓</span> <span>Special character</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium mb-1">Confirm New Password</label>
            <div className="relative">
              <input
                id="confirm-password"
                name="confirmPassword"
                type={showConf ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Confirm new password"
                autoComplete="new-password"
                required
              />
              <button type="button" onClick={()=>setShowConf(s=>!s)} className="absolute inset-y-0 right-2 text-xs text-gray-500">
                {showConf ? "Hide" : "Show"}
              </button>
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-red-600 text-xs mt-1">Passwords do not match</p>
            )}
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Update Password
          </button>
        </form>
      </div>

      {/* Security Tips */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
        <h4 className="text-lg font-semibold mb-3 text-blue-800">🔒 Security Tips</h4>
        <ul className="text-sm text-blue-700 space-y-2">
          <li>• Use a strong password with at least 8 characters</li>
          <li>• Include uppercase and lowercase letters, numbers, and special characters</li>
          <li>• Avoid using personal information like names or birthdays</li>
          <li>• Don't share your password with anyone</li>
          <li>• Consider using a password manager for better security</li>
        </ul>
      </div>

      {/* Data Management */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
        <h4 className="text-lg font-semibold mb-3 text-blue-800">🔄 Data Management</h4>
        <p className="text-sm text-blue-700 mb-4">
          Export and import data to share between different admin users or backup your data.
        </p>
        <div className="space-y-3">
          <button
            onClick={exportAllData}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            📤 Export All Data (Backup)
          </button>
          <div className="relative">
            <input
              ref={fileInputRef}
              type="file"
              id="import-data"
              accept=".json"
              onChange={importAllData}
              className="hidden"
            />
            <button
              onClick={() => {
                console.log("Import button clicked");
                if (fileInputRef.current) {
                  console.log("File input ref found, triggering click");
                  fileInputRef.current.click();
                } else {
                  console.error("File input ref not found");
                }
              }}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              📥 Import Data (Restore)
            </button>
          </div>
          <button
            onClick={syncSharedData}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
          >
            🔄 Sync Shared Data
          </button>
          <button
            onClick={onClearData}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
          >
            🗑️ Clear All Data (Reset)
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={importAllData}
            className="hidden"
          />
        </div>
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-xs text-yellow-800">
            <strong>💡 Note:</strong> Data is stored locally in your browser. To share data between different admin users, 
            use the export/import feature or sync with shared storage.
          </p>
        </div>
      </div>

      {/* System Information */}
      <div className="bg-gray-50 rounded-xl border p-6">
        <h4 className="text-lg font-semibold mb-3">ℹ️ System Information</h4>
        <div className="text-sm text-gray-600 space-y-2">
          <p><strong>Current Admin:</strong> admin</p>
          <p><strong>Default Password:</strong> admin123 (change this immediately)</p>
          <p><strong>System Version:</strong> CBT v1.0.0</p>
          <p><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>
          <p><strong>Data Location:</strong> Browser Local Storage</p>
        </div>
      </div>
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

function UploadQuestions({onFile}){
  return (
    <div className="border-2 border-dashed border-blue-300 rounded-2xl p-6 text-center bg-blue-50">
      <div className="mb-4">
        <svg className="mx-auto h-12 w-12 text-blue-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p className="text-lg font-semibold text-gray-700 mb-2">Upload Your Questions</p>
      <p className="text-sm text-gray-600 mb-4">Drag and drop a .docx or .xlsx file here, or click to browse</p>
      <input 
        id="question-file-upload"
        name="questionFile"
        type="file" 
        accept=".docx,.xlsx" 
        onChange={e=>{ if (e.target.files && e.target.files[0]) onFile(e.target.files[0]); }}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />
      <p className="text-xs text-gray-500 mt-3">
        💡 Supports Word (.docx) and Excel (.xlsx) formats - see format guide below
      </p>
    </div>
  );
}

function FormatHelp(){
  return (
    <details className="mt-4 text-sm cursor-pointer">
      <summary className="font-semibold">📄 Flexible Question Upload Formats (Word & Excel) - Download Templates Above</summary>
      <div className="mt-2 bg-gray-50 border rounded-xl p-3">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-green-700">✅ Complete Example with Multiple Questions</h4>
            <pre className="whitespace-pre-wrap text-xs bg-white p-2 rounded">{`1) What is the normal adult resting heart rate?
A) 10-20 bpm
B) 30-40 bpm
C) 60-100 bpm
D) 120-160 bpm
Answer: C

2) Which vitamin is primarily synthesized by sunlight exposure?
A) Vitamin A
B) Vitamin C
C) Vitamin D
D) Vitamin K
Answer: C

3) What is the primary function of red blood cells?
A) Fight infection
B) Carry oxygen
C) Form blood clots
D) Produce antibodies
Answer: B

4) What does CBT stand for?
A) Computer Based Training
B) Computer Based Testing
C) Computer Based Technology
D) Computer Based Teaching
Answer: B`}</pre>
          </div>
          
          <div>
            <h4 className="font-semibold text-blue-700">✅ Word Document (.docx) Formats</h4>
            <pre className="whitespace-pre-wrap text-xs bg-white p-2 rounded">{`Q1. Question with Q prefix?
A. Option A
B. Option B
C. Option C
D. Option D
Answer: C

2. Question with parentheses?
A) Option A
B) Option B
C) Option C
D) Option D
Answer: C

3. Question with numbers?
1. Option 1
2. Option 2
3. Option 3
4. Option 4
Answer: 3

4. Question with number parentheses?
1) Option 1
2) Option 2
3) Option 3
4) Option 4
Answer: 3

5. Mixed formats work too:
a. Option a
b) Option b
C. Option C
D) Option D
Answer: C`}</pre>
          </div>

          <div>
            <h4 className="font-semibold text-green-700">✅ Excel (.xlsx) Format</h4>
            <p className="text-xs text-gray-600 mb-2">Create an Excel file with these columns:</p>
            <pre className="whitespace-pre-wrap text-xs bg-white p-2 rounded">{`Question | Option A | Option B | Option C | Option D | Correct Answer
What is the normal heart rate? | 60-100 bpm | 120-160 bpm | 40-60 bpm | 80-120 bpm | A
Which vitamin is from sunlight? | Vitamin A | Vitamin C | Vitamin D | Vitamin K | C
What does CBT stand for? | Computer Based Training | Computer Based Testing | Computer Based Technology | Computer Based Teaching | B`}</pre>
            <p className="text-xs text-gray-600 mt-2">
              <strong>Note:</strong> First row can be headers (Question, Option A, etc.) or data. 
              Correct Answer should be A, B, C, or D (case insensitive).
            </p>
          </div>
          
          <div className="mt-3 p-2 bg-yellow-50 border-l-4 border-yellow-400">
            <p className="text-xs text-yellow-800">
              <strong>💡 Smart Parser:</strong> The system automatically detects multiple questions in your document. 
              Each question must have exactly 4 options and an answer line. Questions can be separated by blank lines.
            </p>
            <p className="text-xs text-yellow-800 mt-1">
              <strong>✅ Supported Formats:</strong> A, A., A), a, a., a), 1, 1., 1), 2, 2., 2), etc.
            </p>
          </div>
          
          <div className="mt-3 p-2 bg-blue-50 border-l-4 border-blue-400">
            <p className="text-xs text-blue-800">
              <strong>🔍 Debugging:</strong> Check the browser console (F12) to see detailed parsing information 
              when you upload a document.
            </p>
          </div>
          
          <div className="mt-3 p-2 bg-green-50 border-l-4 border-green-400">
            <p className="text-xs text-green-800">
              <strong>💡 Pro Tip:</strong> Use the "Download Sample Excel Template" or "Download Sample Word Template" 
              buttons above to get properly formatted templates that you can fill with your own questions!
            </p>
          </div>
        </div>
      </div>
    </details>
  );
}

function QuestionsEditor({questions, setQuestions, selectedExam}){
  const updateQ = (i, patch) => {
    const updatedQuestions = questions.map((q,idx)=> idx===i ? {...q, ...patch} : q);
    setQuestions(updatedQuestions);
    // Save changes to the specific exam
    if (selectedExam) {
      saveQuestionsForExam(selectedExam.id, updatedQuestions);
      // Update exam question count
      const updatedExams = loadExams().map(ex => 
        ex.id === selectedExam.id ? { ...ex, questionCount: updatedQuestions.length } : ex
      );
      saveExams(updatedExams);
    }
  };
  
  const removeQ = (i) => {
    const updatedQuestions = questions.filter((_,idx)=>idx!==i);
    setQuestions(updatedQuestions);
    // Save changes to the specific exam
    if (selectedExam) {
      saveQuestionsForExam(selectedExam.id, updatedQuestions);
      // Update exam question count
      const updatedExams = loadExams().map(ex => 
        ex.id === selectedExam.id ? { ...ex, questionCount: updatedQuestions.length } : ex
      );
      saveExams(updatedExams);
    }
  };
  
  const add = () => {
    const newQuestion = {id:crypto.randomUUID(), text:"New question text", options:["Option A","Option B","Option C","Option D"], correctIndex:0};
    const updatedQuestions = [...questions, newQuestion];
    setQuestions(updatedQuestions);
    // Save changes to the specific exam
    if (selectedExam) {
      saveQuestionsForExam(selectedExam.id, updatedQuestions);
      // Update exam question count
      const updatedExams = loadExams().map(ex => 
        ex.id === selectedExam.id ? { ...ex, questionCount: updatedQuestions.length } : ex
      );
      saveExams(updatedExams);
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
    const originalQuestions = loadQuestionsForExam(selectedExam.id);
    if (originalQuestions.length > 0) {
      const limitedQuestions = originalQuestions.slice(0, selectedExam.questionCount);
      const randomizedQuestions = randomizeQuestions(limitedQuestions);
      setQuestions(randomizedQuestions);
      setAnswers(Array(randomizedQuestions.length).fill(-1));
    } else {
      setQuestions([]);
      setAnswers([]);
    }
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



// Load questions for a specific exam
function loadQuestionsForExam(examId) {
  const raw = localStorage.getItem(`cbt_questions_${examId}`);
  if (!raw) return [];
  try {
    const q = JSON.parse(raw);
    return Array.isArray(q) ? q : [];
  } catch { return []; }
}

// Save questions for a specific exam
function saveQuestionsForExam(examId, questions) {
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

// Excel parser for .xlsx files
// Expected format: Question | Option A | Option B | Option C | Option D | Correct Answer
function parseQuestionsFromExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        const questions = [];
        
        // Skip header row if it exists
        const startRow = jsonData[0] && jsonData[0][0] && 
                        (jsonData[0][0].toString().toLowerCase().includes('question') || 
                         jsonData[0][0].toString().toLowerCase().includes('q')) ? 1 : 0;
        
        for (let i = startRow; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length < 6) continue; // Need at least 6 columns
          
          const questionText = row[0]?.toString().trim();
          const optionA = row[1]?.toString().trim();
          const optionB = row[2]?.toString().trim();
          const optionC = row[3]?.toString().trim();
          const optionD = row[4]?.toString().trim();
          const correctAnswer = row[5]?.toString().trim().toUpperCase();
          
          if (!questionText || !optionA || !optionB || !optionC || !optionD || !correctAnswer) {
            console.log(`Skipping invalid row ${i + 1}:`, row);
            continue;
          }
          
          // Convert answer to index (A=0, B=1, C=2, D=3)
          const answerIndex = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 }[correctAnswer];
          if (answerIndex === undefined) {
            console.log(`Invalid answer in row ${i + 1}:`, correctAnswer);
            continue;
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
        }
        
        console.log(`Parsed ${questions.length} questions from Excel file`);
        resolve(questions);
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        reject(new Error('Failed to parse Excel file. Please check the format.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

export default App;