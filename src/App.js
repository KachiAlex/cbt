import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell } from "docx";
import mammoth from "mammoth";

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
// -------------------------

const LS_KEYS = {
  EXAMS: "cbt_exams_v1",
  QUESTIONS: "cbt_questions_v1",
  RESULTS: "cbt_results_v1",
  ACTIVE_EXAM: "cbt_active_exam_v1",
  USERS: "cbt_users_v1",
  STUDENT_REGISTRATIONS: "cbt_student_registrations_v1"
};

const DEFAULT_EXAM_TITLE = "College of Nursing, Eku, Delta State";

// Default admin user
const DEFAULT_ADMIN = {
  username: "admin",
  password: "admin123",
  role: "admin",
  fullName: "System Administrator",
  email: "admin@healthschool.com"
};

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
      setShowAdminLink(prev => !prev);
      // Auto-hide after 5 seconds
      setTimeout(() => setShowAdminLink(false), 5000);
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
      <main className="max-w-5xl mx-auto p-4 sm:p-8">
        {user ? (
          user.role === "admin" ? (
            <AdminPanel />
          ) : (
            <StudentPanel user={user} />
          )
        ) : (
          <>
            <Login onLogin={(u)=>{setUser(u); localStorage.setItem("cbt_logged_in_user", JSON.stringify(u)); setView("home");}} />
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

// User management functions
function loadUsers() {
  const saved = localStorage.getItem(LS_KEYS.USERS);
  if (!saved) {
    // Initialize with default admin
    const defaultUsers = [DEFAULT_ADMIN];
    localStorage.setItem(LS_KEYS.USERS, JSON.stringify(defaultUsers));
    return defaultUsers;
  }
  return JSON.parse(saved);
}

function saveUsers(users) {
  localStorage.setItem(LS_KEYS.USERS, JSON.stringify(users));
}

function authenticateUser(username, password) {
  const users = loadUsers();
  const user = users.find(u => u.username === username);
  
  if (!user) return null;
  if (user.password !== password) return null;
  
  return { username: user.username, role: user.role, fullName: user.fullName, email: user.email };
}

// Exam management functions
function loadExams() {
  const saved = localStorage.getItem(LS_KEYS.EXAMS);
  if (!saved) return [];
  try {
    return JSON.parse(saved);
  } catch {
    return [];
  }
}

function saveExams(exams) {
  localStorage.setItem(LS_KEYS.EXAMS, JSON.stringify(exams));
}

function createExam(examData) {
  const exams = loadExams();
  const newExam = {
    id: crypto.randomUUID(),
    ...examData,
    createdAt: new Date().toISOString(),
    isActive: false
  };
  exams.push(newExam);
  saveExams(exams);
  return newExam;
}

function updateExam(examId, updates) {
  const exams = loadExams();
  const updatedExams = exams.map(exam => 
    exam.id === examId ? { ...exam, ...updates } : exam
  );
  saveExams(updatedExams);
}

function deleteExam(examId) {
  const exams = loadExams();
  const filteredExams = exams.filter(exam => exam.id !== examId);
  saveExams(filteredExams);
}

function setActiveExam(examId) {
  const exams = loadExams();
  // Deactivate all exams first
  const updatedExams = exams.map(exam => ({ ...exam, isActive: false }));
  // Activate the selected exam
  const finalExams = updatedExams.map(exam => 
    exam.id === examId ? { ...exam, isActive: true } : exam
  );
  saveExams(finalExams);
  
  // Update active exam in localStorage
  const activeExam = finalExams.find(exam => exam.id === examId);
  if (activeExam) {
    localStorage.setItem(LS_KEYS.ACTIVE_EXAM, JSON.stringify(activeExam));
  }
}

function getActiveExam() {
  const saved = localStorage.getItem(LS_KEYS.ACTIVE_EXAM);
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

function registerStudent(studentData) {
  const users = loadUsers();
  
  // Check if username already exists
  if (users.find(u => u.username === studentData.username)) {
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
  saveUsers(users);
  
  // Also save to registrations for admin tracking
  const registrations = loadStudentRegistrations();
  registrations.push(newStudent);
  localStorage.setItem(LS_KEYS.STUDENT_REGISTRATIONS, JSON.stringify(registrations));
  
  return newStudent;
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
          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">Flexible Exams</span>
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

  const handleLogin = (e) => {
    e.preventDefault();
    setError("");
    
    if (!username || !password) {
      setError("Please enter both username and password");
      return;
    }

    // Only student authentication - admin access is separate
    const user = authenticateUser(username, password);
    if (user) {
      onLogin(user);
    } else {
      setError("Invalid username or password. Please check your credentials or register as a new student.");
    }
  };

  const handleRegister = (e) => {
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

    if (!email.includes("@")) {
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
      
      registerStudent(studentData);
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
            <label className="block text-sm mb-1">Username</label>
            <input 
              value={username} 
              onChange={e=>setUsername(e.target.value)} 
              className="w-full border rounded-xl px-3 py-2" 
              placeholder="Enter your username" 
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={e=>setPassword(e.target.value)} 
              className="w-full border rounded-xl px-3 py-2" 
              placeholder="Enter your password" 
            />
          </div>
          <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2.5 font-semibold">
            Login as Student
          </button>
        </form>
      ) : (
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Full Name *</label>
            <input 
              value={fullName} 
              onChange={e=>setFullName(e.target.value)} 
              className="w-full border rounded-xl px-3 py-2" 
              placeholder="Enter your full name" 
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Email *</label>
            <input 
              type="email" 
              value={email} 
              onChange={e=>setEmail(e.target.value)} 
              className="w-full border rounded-xl px-3 py-2" 
              placeholder="Enter your email address" 
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Username *</label>
            <input 
              value={username} 
              onChange={e=>setUsername(e.target.value)} 
              className="w-full border rounded-xl px-3 py-2" 
              placeholder="Choose a username" 
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Password *</label>
            <input 
              type="password" 
              value={password} 
              onChange={e=>setPassword(e.target.value)} 
              className="w-full border rounded-xl px-3 py-2" 
              placeholder="Choose a password (min 6 characters)" 
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Confirm Password *</label>
            <input 
              type="password" 
              value={confirmPassword} 
              onChange={e=>setConfirmPassword(e.target.value)} 
              className="w-full border rounded-xl px-3 py-2" 
              placeholder="Confirm your password" 
            />
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

  const handleLogin = (e) => {
    e.preventDefault();
    setError("");
    
    if (!username || !password) {
      setError("Please enter both username and password");
      return;
    }

    // Admin authentication using stored password
    const users = loadUsers();
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
          <label className="block text-sm font-medium mb-1">Username</label>
          <input 
            value={username} 
            onChange={e=>setUsername(e.target.value)} 
            className="w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500" 
            placeholder="Enter admin username" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input 
            type="password" 
            value={password} 
            onChange={e=>setPassword(e.target.value)} 
            className="w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500" 
            placeholder="Enter admin password" 
          />
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
  const [exams, setExams] = useState(loadExams());
  const [questions, setQuestions] = useState(loadQuestions());
  const [results, setResults] = useState(loadResults());
  const [importError, setImportError] = useState("");
  const [showCreateExam, setShowCreateExam] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);

  useEffect(()=>{
    setExams(loadExams());
  }, []);

  useEffect(()=>{
    localStorage.setItem(LS_KEYS.QUESTIONS, JSON.stringify(questions));
  }, [questions]);

  useEffect(()=>{
    localStorage.setItem(LS_KEYS.RESULTS, JSON.stringify(results));
  }, [results]);

  const handleDocxUpload = async (file) => {
    setImportError("");
    try {
      const arrayBuffer = await file.arrayBuffer();
      const { value: markdown } = await mammoth.convertToMarkdown({ arrayBuffer });
      
      console.log("Raw markdown from document:", markdown.substring(0, 500) + "...");
      
      const parsed = parseQuestionsFromMarkdown(markdown);
      console.log("Parsed questions:", parsed.length, parsed);
      
      if (parsed.length === 0) {
        throw new Error("No questions found. Please check the document format. Make sure each question starts with a number (1, 2, 3...) or Q, has 4 options (A, B, C, D), and ends with 'Answer: X'.");
      }
      
      setQuestions(parsed);
      setImportError(`Successfully imported ${parsed.length} questions!`);
      setTimeout(() => setImportError(""), 3000); // Clear success message after 3 seconds
    } catch (e) {
      console.error("Upload error:", e);
      setImportError(e.message || "Failed to import .docx");
    }
  };

  const addBlankQuestion = () => {
    setQuestions(q => [...q, {id:crypto.randomUUID(), text:"New question text", options:["Option A","Option B","Option C","Option D"], correctIndex:0}]);
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
    if (confirm("Are you sure you want to delete this exam? This action cannot be undone.")) {
      deleteExam(examId);
      setExams(loadExams());
    }
  };

  const activeExam = getActiveExam();

  return (
    <div className="space-y-8">
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

            {exams.length === 0 ? (
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
                        {exam.isActive ? (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                            Active
                          </span>
                        ) : (
                          <button
                            onClick={() => handleActivateExam(exam.id)}
                            className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700"
                          >
                            Activate
                          </button>
                        )}
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

          {activeExam && (
            <Section title="Active Exam">
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                <h4 className="font-semibold text-green-800">{activeExam.title}</h4>
                <p className="text-sm text-green-700">{activeExam.description}</p>
                <div className="flex gap-4 mt-2 text-sm text-green-600">
                  <span>Questions: {activeExam.questionCount || 0}</span>
                  <span>Duration: {activeExam.duration} minutes</span>
                </div>
              </div>
            </Section>
          )}
        </div>
      )}

      {/* Questions Tab */}
      {activeTab === "questions" && (
        <div className="space-y-6">
          <Section title="Upload Questions from Microsoft Word (.docx)">
            <UploadDocx onFile={handleDocxUpload} />
            {importError && <div className="text-red-600 text-sm mt-2">{importError}</div>}
            <FormatHelp />
          </Section>

          <Section title={`Questions (${questions.length})`}>
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <p className="text-sm text-emerald-800">
                <strong>🔄 Randomization Active:</strong> Questions and answer options are automatically randomized for each student to prevent cheating.
              </p>
            </div>
            <QuestionsEditor questions={questions} setQuestions={setQuestions} />
          </Section>
        </div>
      )}

      {/* Results Tab */}
      {activeTab === "results" && (
        <Section title="Exam Results">
          <div className="mb-4 flex gap-2">
            <button onClick={exportResultsToExcel} className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700">
              Export to Excel
            </button>
            <button onClick={exportResultsToWord} className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700">
              Export to Word
            </button>
          </div>
          <ResultsTable results={results} setResults={setResults} />
        </Section>
      )}

      {/* Students Tab */}
      {activeTab === "students" && (
        <Section title="Student Management">
          <StudentManagement />
        </Section>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <Section title="System Settings">
          <AdminSettings />
        </Section>
      )}

      {/* Create Exam Modal */}
      {showCreateExam && (
        <CreateExamModal onClose={() => setShowCreateExam(false)} onCreate={handleCreateExam} />
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
        <h3 className="text-lg font-bold mb-4">Create New Exam</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Exam Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded-xl px-3 py-2"
              placeholder="e.g., Midterm Exam - Biology 101"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border rounded-xl px-3 py-2"
              placeholder="Brief description of the exam"
              rows="3"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Duration (minutes)</label>
              <input
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
              <label className="block text-sm mb-1">Question Count</label>
              <input
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

function StudentManagement() {
  const [students, setStudents] = useState(loadStudentRegistrations());
  const [users, setUsers] = useState(loadUsers());
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const deleteStudent = (username) => {
    // Remove from users
    const updatedUsers = users.filter(u => u.username !== username);
    saveUsers(updatedUsers);
    setUsers(updatedUsers);
    
    // Remove from registrations
    const updatedStudents = students.filter(s => s.username !== username);
    localStorage.setItem(LS_KEYS.STUDENT_REGISTRATIONS, JSON.stringify(updatedStudents));
    setStudents(updatedStudents);
    
    setShowDeleteConfirm(false);
    setSelectedStudent(null);
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

function AdminSettings() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // "success" or "error"

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
            <label className="block text-sm font-medium mb-1">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter current password"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter new password"
              required
            />
            
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
            <label className="block text-sm font-medium mb-1">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Confirm new password"
              required
            />
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

      {/* System Information */}
      <div className="bg-gray-50 rounded-xl border p-6">
        <h4 className="text-lg font-semibold mb-3">ℹ️ System Information</h4>
        <div className="text-sm text-gray-600 space-y-2">
          <p><strong>Current Admin:</strong> admin</p>
          <p><strong>Default Password:</strong> admin123 (change this immediately)</p>
          <p><strong>System Version:</strong> CBT v1.0.0</p>
          <p><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>
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

function UploadDocx({onFile}){
  return (
    <div className="border-2 border-dashed border-blue-300 rounded-2xl p-6 text-center bg-blue-50">
      <div className="mb-4">
        <svg className="mx-auto h-12 w-12 text-blue-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p className="text-lg font-semibold text-gray-700 mb-2">Upload Your Questions</p>
      <p className="text-sm text-gray-600 mb-4">Drag and drop a .docx file here, or click to browse</p>
      <input 
        type="file" 
        accept=".docx" 
        onChange={e=>{ if (e.target.files && e.target.files[0]) onFile(e.target.files[0]); }}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />
      <p className="text-xs text-gray-500 mt-3">
        💡 The system supports multiple question formats - see format guide below
      </p>
    </div>
  );
}

function FormatHelp(){
  return (
    <details className="mt-4 text-sm cursor-pointer">
      <summary className="font-semibold">📄 Flexible .docx Question Formats (Multiple Questions)</summary>
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
            <h4 className="font-semibold text-blue-700">✅ Alternative Formats Supported</h4>
            <pre className="whitespace-pre-wrap text-xs bg-white p-2 rounded">{`Q1. Question with Q prefix?
A. Option A
B. Option B
C. Option C
D. Option D
Answer: C

2. Question with periods?
1) Option 1
2) Option 2
3) Option 3
4) Option 4
Answer: 2`}</pre>
          </div>
          
          <div className="mt-3 p-2 bg-yellow-50 border-l-4 border-yellow-400">
            <p className="text-xs text-yellow-800">
              <strong>💡 Smart Parser:</strong> The system automatically detects multiple questions in your document. 
              Each question must have exactly 4 options and an answer line. Questions can be separated by blank lines.
            </p>
          </div>
          
          <div className="mt-3 p-2 bg-blue-50 border-l-4 border-blue-400">
            <p className="text-xs text-blue-800">
              <strong>🔍 Debugging:</strong> Check the browser console (F12) to see detailed parsing information 
              when you upload a document.
            </p>
          </div>
        </div>
      </div>
    </details>
  );
}

function QuestionsEditor({questions, setQuestions}){
  const updateQ = (i, patch) => {
    setQuestions(questions.map((q,idx)=> idx===i ? {...q, ...patch} : q));
  };
  const removeQ = (i) => setQuestions(questions.filter((_,idx)=>idx!==i));
  const add = () => setQuestions((qs)=>[...qs, {id:crypto.randomUUID(), text:"New question text", options:["Option A","Option B","Option C","Option D"], correctIndex:0}]);

  return (
    <div className="space-y-4">
      {questions.map((q, i)=> (
        <div key={q.id} className="border rounded-xl p-4">
          <div className="flex items-start gap-2">
            <span className="text-sm font-bold bg-gray-100 px-2 py-1 rounded">{i+1}</span>
            <textarea className="w-full border rounded-xl p-2" value={q.text} onChange={e=>updateQ(i,{text:e.target.value})} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3 mt-3">
            {q.options.map((opt, oi)=> (
              <div key={oi} className="flex gap-2 items-center">
                <input className="w-full border rounded-xl p-2" value={opt} onChange={e=>{
                  const newOpts = [...q.options]; newOpts[oi] = e.target.value; updateQ(i,{options:newOpts});
                }} />
                <label className="text-xs flex items-center gap-1">
                  <input type="radio" name={`c-${q.id}`} checked={q.correctIndex===oi} onChange={()=>updateQ(i,{correctIndex:oi})}/>
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
    const exams = loadExams();
    const sorted = [...exams].sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));
    setAllExams(sorted);
  }, []);

  useEffect(()=>{
    if (!selectedExam) return;
    // Once an exam is selected, load and randomize questions scoped to that exam
    const originalQuestions = loadQuestions();
    if (originalQuestions.length > 0) {
      const limitedQuestions = originalQuestions.slice(0, selectedExam.questionCount);
      const randomizedQuestions = randomizeQuestions(limitedQuestions);
      setQuestions(randomizedQuestions);
      setAnswers(Array(randomizedQuestions.length).fill(-1));
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
    const a = [...answers]; a[currentQuestionIndex] = oi; setAnswers(a);
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

  const onSubmit = () => {
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
    const old = loadResults();
    old.push(result);
    localStorage.setItem(LS_KEYS.RESULTS, JSON.stringify(old));
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
        <h3 className="text-lg font-bold mb-2">No Questions Available</h3>
        <p className="text-sm text-gray-600">The exam "{selectedExam.title}" has no questions. Please contact your administrator.</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="bg-white rounded-2xl shadow p-6">
        <h3 className="text-lg font-bold mb-2">Submission Successful</h3>
        <p className="mb-2">Exam: <b>{selectedExam.title}</b></p>
        <p className="mb-4">Score: <b>{score}</b> / {questions.length} ({Math.round((score/questions.length)*100)}%)</p>
        <p className="text-sm text-gray-600">You may close this page. Your result has been recorded.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Exam Header */}
      <div className="bg-white rounded-2xl shadow p-6">
        <h3 className="text-lg font-bold mb-1">{selectedExam.title}</h3>
        <p className="text-sm text-gray-600 mb-2">{selectedExam.description}</p>
        <div className="flex gap-4 text-xs text-gray-500 mb-2">
          <span>Duration: {selectedExam.duration} minutes</span>
          <span>Questions: {questions.length}</span>
          <span>Current: {currentQuestionIndex + 1} of {questions.length}</span>
        </div>
        <p className="text-xs text-emerald-600">⚠️ Questions are randomized for each student</p>
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
    if (confirm("Clear all results?")) {
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

// Utils
function loadQuestions(){
  const raw = localStorage.getItem(LS_KEYS.QUESTIONS);
  if (!raw) return [];
  try {
    const q = JSON.parse(raw);
    return Array.isArray(q) ? q : [];
  } catch { return []; }
}

function loadResults(){
  const raw = localStorage.getItem(LS_KEYS.RESULTS);
  if (!raw) return [];
  try {
    const r = JSON.parse(raw);
    return Array.isArray(r) ? r : [];
  } catch { return []; }
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

// Smart and flexible document parser that handles multiple formats
function parseQuestionsFromMarkdown(md) {
  const text = md.replace(/\r/g, "").trim();
  const questions = [];
  
  // Split the text into lines
  const lines = text.split('\n').map(line => line.trim());
  
  let currentQuestion = null;
  let currentOptions = [];
  let currentAnswer = null;
  let questionNumber = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip empty lines
    if (!line) continue;
    
    // Check if this line starts a new question
    const questionMatch = line.match(/^(\d+|[Qq])\s*[\.\)]?\s*(.+)$/);
    if (questionMatch) {
      // Save previous question if it exists
      if (currentQuestion && currentOptions.length === 4 && currentAnswer !== null) {
        const question = createQuestionObject(currentQuestion, currentOptions, currentAnswer);
        if (question) {
          questions.push(question);
        }
      }
      
      // Start new question
      questionNumber++;
      currentQuestion = cleanMarkdownText(questionMatch[2].trim());
      currentOptions = [];
      currentAnswer = null;
      continue;
    }
    
    // Check if this is an answer line
    const answerMatch = line.match(/^[Aa]nswer\s*[:\-]?\s*([A-Da-d1-4])/i);
    if (answerMatch) {
      currentAnswer = answerMatch[1].toUpperCase();
      continue;
    }
    
    // Check if this is an option line
    const optionMatch = line.match(/^([A-Da-d1-4])\s*[\.\)]?\s*(.+)$/);
    if (optionMatch && currentOptions.length < 4) {
      const optionLetter = optionMatch[1].toUpperCase();
      const optionText = cleanMarkdownText(optionMatch[2].trim());
      
      // Convert 1-4 to A-D
      const optionIndex = optionLetter === '1' ? 'A' : 
                         optionLetter === '2' ? 'B' : 
                         optionLetter === '3' ? 'C' : 
                         optionLetter === '4' ? 'D' : optionLetter;
      
      currentOptions.push({ letter: optionIndex, text: optionText });
      continue;
    }
    
    // If we have a question but no options yet, this might be continuation of question text
    if (currentQuestion && currentOptions.length === 0 && !line.match(/^[A-Da-d1-4]/)) {
      currentQuestion += ' ' + cleanMarkdownText(line);
    }
  }
  
  // Don't forget the last question
  if (currentQuestion && currentOptions.length === 4 && currentAnswer !== null) {
    const question = createQuestionObject(currentQuestion, currentOptions, currentAnswer);
    if (question) {
      questions.push(question);
    }
  }
  
  console.log(`Parsed ${questions.length} questions from document`);
  return questions;
}

function createQuestionObject(questionText, options, correctAnswer) {
  // Validate we have enough data
  if (!questionText || options.length !== 4 || !correctAnswer) {
    console.log("Invalid question data:", { questionText, optionsLength: options.length, correctAnswer });
    return null;
  }
  
  // Convert answer to index
  const answerIndex = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 }[correctAnswer];
  if (answerIndex === undefined) {
    console.log("Invalid answer:", correctAnswer);
    return null;
  }
  
  // Sort options by A, B, C, D order
  const sortedOptions = ['A', 'B', 'C', 'D'].map(letter => {
    const option = options.find(opt => opt.letter === letter);
    return option ? option.text : '';
  });
  
  // Check if all options are present
  if (sortedOptions.some(opt => !opt)) {
    console.log("Missing options:", sortedOptions);
    return null;
  }
  
  return {
    id: crypto.randomUUID(),
    text: cleanMarkdownText(questionText),
    options: sortedOptions.map(opt => cleanMarkdownText(opt)),
    correctIndex: answerIndex
  };
}

export default App;