import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell } from "docx";
import mammoth from "mammoth";

// -------------------------
// Simple In-Browser CBT System
// Features:
// - Login (Admin / Student)
// - Admin uploads .docx with MCQs (auto-parsed) or creates questions manually
// - 12-question CBT delivery for students
// - Auto-grading, Results dashboard
// - Export results to Excel (.xlsx) and Word (.docx)
// - Tailwind styles
// Default Admin: username: admin  | password: admin123
// -------------------------

const LS_KEYS = {
  QUESTIONS: "cbt_questions_v1",
  RESULTS: "cbt_results_v1",
  ACTIVE_EXAM: "cbt_active_exam_v1",
  USERS: "cbt_users_v1",
  STUDENT_REGISTRATIONS: "cbt_student_registrations_v1"
};

const DEFAULT_EXAM_TITLE = "Health School CBT – 12 Questions";

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

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <Header user={user} onLogout={onLogout} />
      <main className="max-w-5xl mx-auto p-4 sm:p-8">
        {user ? (
          user.role === "admin" ? (
            <AdminPanel />
          ) : (
            <StudentPanel user={user} />
          )
        ) : (
          <Login onLogin={(u)=>{setUser(u); localStorage.setItem("cbt_logged_in_user", JSON.stringify(u)); setView("home");}} />
        )}
      </main>
      <footer className="text-center text-xs text-gray-500 py-6">© {new Date().getFullYear()} Health School CBT</footer>
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

function Header({user, onLogout}){
  return (
    <div className="bg-white border-b">
      <div className="max-w-5xl mx-auto flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold">🏥 Health School CBT</span>
          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">12 Questions</span>
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
  const [role, setRole] = useState("student");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    setError("");
    
    if (!username || !password) {
      setError("Please enter both username and password");
      return;
    }

    if (role === "admin") {
      if (username === "admin" && password === "admin123") {
        onLogin({username, role:"admin", fullName: "System Administrator", email: "admin@healthschool.com"});
      } else {
        setError("Invalid admin credentials. Use admin / admin123");
      }
    } else {
      const user = authenticateUser(username, password);
      if (user) {
        onLogin(user);
      } else {
        setError("Invalid username or password. Please check your credentials or register as a new student.");
      }
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
            <label className="block text-sm mb-1">Role</label>
            <select value={role} onChange={e=>setRole(e.target.value)} className="w-full border rounded-xl px-3 py-2">
              <option value="student">Student</option>
              <option value="admin">Admin</option>
            </select>
          </div>
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
            Login
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
        <p>Admin demo — <b>admin / admin123</b></p>
        <p className="mt-2">Students must register first before they can login and take exams.</p>
      </div>
    </div>
  );
}

function AdminPanel(){
  const [examTitle, setExamTitle] = useState(localStorage.getItem(LS_KEYS.ACTIVE_EXAM) || DEFAULT_EXAM_TITLE);
  const [questions, setQuestions] = useState(loadQuestions());
  const [results, setResults] = useState(loadResults());
  const [importError, setImportError] = useState("");

  useEffect(()=>{
    localStorage.setItem(LS_KEYS.ACTIVE_EXAM, examTitle);
  }, [examTitle]);

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
      const parsed = parseQuestionsFromMarkdown(markdown);
      if (parsed.length === 0) throw new Error("No questions found. Ensure .docx uses the specified format.");
      const take12 = parsed.slice(0,12);
      setQuestions(take12);
    } catch (e) {
      setImportError(e.message || "Failed to import .docx");
    }
  };

  const addBlankQuestion = () => {
    setQuestions(q => [...q, {id:crypto.randomUUID(), text:"New question text", options:["Option A","Option B","Option C","Option D"], correctIndex:0}].slice(0,12));
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

  return (
    <div className="space-y-8">
      <Section title="Exam Settings">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Exam Title</label>
            <input value={examTitle} onChange={e=>setExamTitle(e.target.value)} className="w-full border rounded-xl px-3 py-2"/>
          </div>
          <div className="text-sm text-gray-600 self-end">Exactly 12 questions are delivered to students. If more are uploaded, only the first 12 are used.</div>
        </div>
        <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
          <p className="text-sm text-emerald-800">
            <strong>🔄 Randomization Active:</strong> Questions and answer options are automatically randomized for each student to prevent cheating.
          </p>
        </div>
      </Section>

      <Section title="Upload Questions from Microsoft Word (.docx)">
        <UploadDocx onFile={handleDocxUpload} />
        {importError && <div className="text-red-600 text-sm mt-2">{importError}</div>}
        <FormatHelp />
      </Section>

      <Section title={`Questions (${questions.length}/12)`}>
        <QuestionsEditor questions={questions} setQuestions={setQuestions} />
      </Section>

      <Section title="Student Management">
        <StudentManagement />
      </Section>

      <Section title="Results">
        <ResultsTable results={results} setResults={setResults} />
        <div className="flex flex-wrap gap-3 mt-4">
          <button onClick={exportResultsToExcel} className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700">Export to Excel (.xlsx)</button>
          <button onClick={exportResultsToWord} className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">Export to Word (.docx)</button>
        </div>
      </Section>
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
    <div className="border-2 border-dashed rounded-2xl p-6 text-center">
      <p className="mb-3">Upload a <b>.docx</b> file with your questions.</p>
      <input type="file" accept=".docx" onChange={e=>{ if (e.target.files && e.target.files[0]) onFile(e.target.files[0]); }}/>
    </div>
  );
}

function FormatHelp(){
  return (
    <details className="mt-4 text-sm cursor-pointer">
      <summary className="font-semibold">.docx Question Format (example)</summary>
      <div className="mt-2 bg-gray-50 border rounded-xl p-3">
        <pre className="whitespace-pre-wrap text-xs">{`Use the following pattern per question in your Word document (.docx):

1) What is the normal adult resting heart rate?
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

- Questions must have A) .. D) options (4 options) and an Answer: letter.
- The system will import the FIRST 12 questions.
`}</pre>
      </div>
    </details>
  );
}

function QuestionsEditor({questions, setQuestions}){
  const updateQ = (i, patch) => {
    setQuestions(questions.map((q,idx)=> idx===i ? {...q, ...patch} : q));
  };
  const removeQ = (i) => setQuestions(questions.filter((_,idx)=>idx!==i));
  const add = () => setQuestions((qs)=>[...qs, {id:crypto.randomUUID(), text:"New question text", options:["Option A","Option B","Option C","Option D"], correctIndex:0}].slice(0,12));

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
      {questions.length < 12 && (
        <button onClick={add} className="px-4 py-2 rounded-xl bg-emerald-600 text-white">Add Question</button>
      )}
    </div>
  );
}

function StudentPanel({user}){
  const [questions, setQuestions] = useState([]);
  const [examTitle] = useState(localStorage.getItem(LS_KEYS.ACTIVE_EXAM) || DEFAULT_EXAM_TITLE);
  const [answers, setAnswers] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(()=>{
    // Load and randomize questions for this student
    const originalQuestions = loadQuestions();
    if (originalQuestions.length > 0) {
      const randomizedQuestions = randomizeQuestions(originalQuestions);
      setQuestions(randomizedQuestions);
      setAnswers(Array(randomizedQuestions.length).fill(-1));
    }
  }, []);

  // Function to randomize questions and answer options
  const randomizeQuestions = (originalQuestions) => {
    return originalQuestions.map(q => {
      // Create a copy of the question
      const questionCopy = { ...q };
      
      // Randomize the answer options
      const options = [...q.options];
      const correctAnswer = options[q.correctIndex];
      
      // Shuffle options
      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
      }
      
      // Find new correct index
      const newCorrectIndex = options.indexOf(correctAnswer);
      
      return {
        ...questionCopy,
        options: options,
        correctIndex: newCorrectIndex,
        originalId: q.id // Keep track of original question for results
      };
    }).sort(() => Math.random() - 0.5); // Shuffle question order
  };

  const onSelect = (qi, oi)=>{
    const a = [...answers]; a[qi] = oi; setAnswers(a);
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
      examTitle,
      questionOrder: questions.map(q => q.originalId), // Store question order for admin review
    };
    const old = loadResults();
    old.push(result);
    localStorage.setItem(LS_KEYS.RESULTS, JSON.stringify(old));
  };

  if (questions.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow p-6">
        <h3 className="text-lg font-bold mb-2">No active exam</h3>
        <p className="text-sm text-gray-600">Please contact your administrator.</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="bg-white rounded-2xl shadow p-6">
        <h3 className="text-lg font-bold mb-2">Submission Successful</h3>
        <p className="mb-2">Exam: <b>{examTitle}</b></p>
        <p className="mb-4">Score: <b>{score}</b> / {questions.length} ({Math.round((score/questions.length)*100)}%)</p>
        <p className="text-sm text-gray-600">You may close this page. Your result has been recorded.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow p-6">
        <h3 className="text-lg font-bold mb-1">{examTitle}</h3>
        <p className="text-sm text-gray-600">Answer all questions. Select the best option.</p>
        <p className="text-xs text-emerald-600 mt-1">⚠️ Questions are randomized for each student</p>
      </div>
      {questions.map((q, i)=> (
        <div key={q.id} className="bg-white rounded-2xl shadow p-6">
          <div className="flex items-start gap-2 mb-3">
            <span className="text-sm font-bold bg-gray-100 px-2 py-1 rounded">{i+1}</span>
            <p className="font-medium">{q.text}</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {q.options.map((opt, oi)=> (
              <label key={oi} className={`border rounded-xl p-3 flex items-center gap-2 cursor-pointer ${answers[i]===oi?"border-emerald-500 bg-emerald-50":""}`}>
                <input type="radio" name={`q-${q.id}`} checked={answers[i]===oi} onChange={()=>onSelect(i,oi)} />
                <span>{String.fromCharCode(65+oi)}. {opt}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
      <div className="flex justify-end">
        <button onClick={onSubmit} className="px-6 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 font-semibold">Submit Answers</button>
      </div>
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

// Parse .docx converted markdown with pattern:
// n) Question text\nA) option\nB) option\nC) option\nD) option\nAnswer: X
function parseQuestionsFromMarkdown(md){
  const blocks = md.split(/\n\s*\n/).map(b=>b.trim()).filter(Boolean);
  const out = [];

  // Join into a single string to allow regex spanning blocks
  const text = md.replace(/\r/g, "");
  const qRegex = /(\d+)\)\s*([^\n]+)\nA\)\s*([^\n]+)\nB\)\s*([^\n]+)\nC\)\s*([^\n]+)\nD\)\s*([^\n]+)\nAnswer:\s*([ABCD])/g;
  let m;
  while ((m = qRegex.exec(text)) !== null) {
    const [, , qText, A, B, C, D, ans] = m;
    const idx = {A:0,B:1,C:2,D:3}[ans]; 
    out.push({
      id: crypto.randomUUID(),
      text: qText.trim(),
      options: [A,B,C,D].map(s=>s.trim()),
      correctIndex: idx,
    });
  }
  return out;
}

export default App;