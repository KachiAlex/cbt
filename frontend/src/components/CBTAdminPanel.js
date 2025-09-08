import React, { useState, useEffect, useCallback } from 'react';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell } from 'docx';
import mammoth from 'mammoth';
import dataService from '../services/dataService';
import ReportingDashboard from './ReportingDashboard';
import ExportOptions from './ExportOptions';
import DataAnalytics from './DataAnalytics';

// Helper function to generate unique IDs (compatible with older browsers)
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

// eslint-disable-next-line no-unused-vars
const LS_KEYS = {
  EXAMS: "cbt_exams_v1",
  QUESTIONS: "cbt_questions_v1",
  RESULTS: "cbt_results_v1",
  ACTIVE_EXAM: "cbt_active_exam_v1",
  USERS: "cbt_users_v1",
  STUDENT_REGISTRATIONS: "cbt_student_registrations_v1",
  SHARED_DATA: "cbt_shared_data_v1"
};

const CBTAdminPanel = ({ user, institution, onLogout, onAdminAccess }) => {
  const [activeTab, setActiveTab] = useState("exams");
  const [exams, setExams] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [results, setResults] = useState([]);
  const [importError, setImportError] = useState("");
  const [showCreateExam, setShowCreateExam] = useState(false);
  const [showEditExam, setShowEditExam] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);



  const loadExams = React.useCallback(async () => {
    try {
      const data = await dataService.loadExams();
      const list = Array.isArray(data) ? data : [];
      return institution?.slug ? list.filter(e => e.institutionSlug === institution.slug) : list;
    } catch (error) {
      console.error('Error loading exams:', error);
      return [];
    }
  }, [institution?.slug]);

  const saveExams = React.useCallback(async (examsData) => {
    try {
      return await dataService.saveExams(examsData);
    } catch (error) {
      console.error('Error saving exams:', error);
      return false;
    }
  }, []);

  // Removed unused loadQuestions to satisfy CI ESLint

  const loadResults = React.useCallback(async () => {
    try {
      const data = await dataService.loadResults();
      const list = Array.isArray(data) ? data : [];
      return institution?.slug ? list.filter(r => r.institutionSlug === institution.slug) : list;
    } catch (error) {
      console.error('Error loading results:', error);
      return [];
    }
  }, [institution?.slug]);

  const loadStudents = React.useCallback(async () => {
    try {
      const users = JSON.parse(localStorage.getItem('cbt_users_v1') || '[]');
      const registrations = JSON.parse(localStorage.getItem('cbt_student_registrations_v1') || '[]');
      const allStudents = [...users.filter(u => u.role === 'student'), ...registrations];
      const uniqueStudents = allStudents.filter((student, index, self) => 
        index === self.findIndex(s => s.email === student.email)
      );
      const institutionStudents = uniqueStudents.filter(student => 
        !institution?.slug || student.institutionSlug === institution.slug
      );
      return institutionStudents;
    } catch (error) {
      console.error('Error loading students:', error);
      return [];
    }
  }, [institution?.slug]);

  // When the selected exam changes, load its own stored questions (or empty)
  useEffect(() => {
    if (!selectedExam) { setQuestions([]); return; }
    try {
      const raw = localStorage.getItem(`cbt_questions_${selectedExam.id}`);
      const q = raw ? JSON.parse(raw) : [];
      setQuestions(Array.isArray(q) ? q : []);
    } catch {
      setQuestions([]);
    }
  }, [selectedExam]);

  // Auto-activation/deactivation effect
  useEffect(() => {
    if (!exams || exams.length === 0) return;

    const interval = setInterval(async () => {
      const now = new Date();
      let changed = false;
      const nextExams = exams.map(exam => {
        const start = exam.startDate ? new Date(exam.startDate) : null;
        const end = exam.endDate ? new Date(exam.endDate) : null;
        // Only auto-toggle if schedule dates exist
        if (start || end) {
          // Auto-activate when within window
          if (start && (!end || now <= end) && now >= start) {
            if (!exam.isActive) { changed = true; return { ...exam, isActive: true }; }
          }
          // Auto-deactivate if ended
          if (end && now > end) {
            if (exam.isActive) { changed = true; return { ...exam, isActive: false }; }
          }
        }
        return exam;
      });
      if (changed) {
        await saveExams(nextExams);
        setExams(nextExams);
      }
    }, 30 * 1000); // check every 30s

    return () => clearInterval(interval);
  }, [exams, saveExams]);

  // Initialize data effect - must come after function definitions
  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        const [examsData, resultsData, studentsData] = await Promise.all([
          loadExams(),
          loadResults(),
          loadStudents()
        ]);
        setExams(examsData || []);
        // Don't load general questions here - questions are exam-specific
        setQuestions([]);
        setResults(resultsData || []);
        setStudents(studentsData || []);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    initializeData();
  }, [loadExams, loadResults]);

  // eslint-disable-next-line no-unused-vars
  const saveResults = async (resultsData) => {
    try {
      return await dataService.saveResults(resultsData);
    } catch (error) {
      console.error('Error saving results:', error);
      return false;
    }
  };

  const handleFileUpload = async (file) => {
    setImportError("");
    try {
      const fileExtension = file.name.toLowerCase().split('.').pop();
      
      if (fileExtension === 'docx') {
        const arrayBuffer = await file.arrayBuffer();
        const { value: markdown } = await mammoth.convertToMarkdown({ arrayBuffer });
        
        const parsed = parseQuestionsFromMarkdown(markdown);
        if (parsed.length === 0) {
          throw new Error("No questions found. Please check the document format.");
        }
        
        setQuestions(parsed);
        if (selectedExam) {
          saveQuestionsForExam(selectedExam.id, parsed);
          updateExamQuestionCount(selectedExam.id, parsed.length);
        }
        setImportError(`Successfully imported ${parsed.length} questions!`);
        setTimeout(() => setImportError(""), 3000);
      } else if (fileExtension === 'xlsx') {
        console.log('📊 Processing Excel file:', file.name);
        const parsed = await parseQuestionsFromExcel(file);
        if (parsed.length === 0) {
          throw new Error("No questions found. Please check the Excel format:\n" +
            "• Column A: Question text\n" +
            "• Column B: Option A\n" +
            "• Column C: Option B\n" +
            "• Column D: Option C\n" +
            "• Column E: Option D\n" +
            "• Column F: Correct Answer (A, B, C, or D)");
        }
        
        setQuestions(parsed);
        if (selectedExam) {
          saveQuestionsForExam(selectedExam.id, parsed);
          updateExamQuestionCount(selectedExam.id, parsed.length);
        }
        setImportError(`✅ Successfully imported ${parsed.length} questions from Excel file!`);
        setTimeout(() => setImportError(""), 5000);
      } else {
        throw new Error("Unsupported file format. Please upload a .docx or .xlsx file.");
      }
    } catch (e) {
      console.error("Upload error:", e);
      setImportError(e.message || "Failed to import file");
    }
  };

  const updateExamQuestionCount = async (examId, count) => {
    try {
      const updatedExams = exams.map(ex => 
        ex.id === examId ? { ...ex, questionCount: count } : ex
      );
      setExams(updatedExams);
      await saveExams(updatedExams);
    } catch (error) {
      console.error('Error updating exam question count:', error);
    }
  };

  const exportResultsToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Results');
    
    worksheet.columns = [
      { header: 'Username', key: 'username', width: 15 },
      { header: 'Exam Title', key: 'examTitle', width: 20 },
      { header: 'Score', key: 'score', width: 10 },
      { header: 'Total', key: 'total', width: 10 },
      { header: 'Percent', key: 'percent', width: 10 },
      { header: 'Submitted At', key: 'submittedAt', width: 20 },
      { header: 'Answers', key: 'answers', width: 30 }
    ];

    worksheet.addRows(results.map(r => ({
      username: r.username,
      examTitle: r.examTitle,
      score: r.score,
      total: r.total,
      percent: r.percent,
      submittedAt: new Date(r.submittedAt).toLocaleString(),
      answers: r.answers.join(", ")
    })));
    
    const excelBuffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${institution?.name || 'Institution'}_CBT_Results.xlsx`);
  };

  const exportResultsToWord = async () => {
    const rows = [
      new TableRow({
        children: ["Username", "Exam Title", "Score", "Total", "Percent", "Submitted At", "Answers"].map(h => 
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] }) ] })
        )
      }),
      ...results.map(r => new TableRow({
        children: [r.username, r.examTitle, String(r.score), String(r.total), String(r.percent), r.submittedAt, r.answers.join(", ")]
          .map(t => new TableCell({ children: [new Paragraph(String(t))] }))
      }))
    ];
    
    const doc = new Document({
      sections: [{
        properties: {}, 
        children: [
          new Paragraph({ children: [new TextRun({ text: "CBT Results", bold: true, size: 28 }) ] }),
          new Paragraph(" "),
          new Table({ rows })
        ]
      }]
    });
    
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${institution?.name || 'Institution'}_CBT_Results.docx`);
  };

  const handleCreateExam = async (examData) => {
    try {
      const newExam = {
        id: generateId(),
        ...examData,
        createdAt: new Date().toISOString(),
        isActive: false,
        questionCount: 0,
        institutionSlug: institution.slug
      };
      
      const updatedExams = [...exams, newExam];
      await saveExams(updatedExams);
      setExams(updatedExams);
      setShowCreateExam(false);
      setSelectedExam(newExam);
      setQuestions([]); // ensure fresh questions list for a new exam
      setActiveTab("questions");
    } catch (error) {
      console.error('Error creating exam:', error);
    }
  };

  const handleActivateExam = async (examId) => {
    try {
      const updatedExams = exams.map(exam => {
        if (exam.id !== examId) return exam;
        const now = new Date();
        const start = exam.startDate ? new Date(exam.startDate) : null;
        const end = exam.endDate ? new Date(exam.endDate) : null;
        // If trying to activate, show confirmation if outside window
        if (!exam.isActive) {
          const beforeWindow = start && now < start;
          const afterWindow = end && now > end;
          if (beforeWindow || afterWindow) {
            const msg = beforeWindow
              ? "This exam is scheduled in the future. Activate now anyway?"
              : "This exam is past its end time. Activate anyway?";
            if (!window.confirm(msg)) {
              return exam; // keep as is
            }
          }
        }
        return { ...exam, isActive: !exam.isActive };
      });
      await saveExams(updatedExams);
      setExams(updatedExams);
      
      // Store active exam data for students to access
      const activeExam = updatedExams.find(exam => exam.id === examId && exam.isActive);
      if (activeExam) {
        // Store the full exam object including duration
        localStorage.setItem(LS_KEYS.ACTIVE_EXAM, JSON.stringify(activeExam));
        console.log('✅ Active exam set with duration:', activeExam.duration, 'minutes');
      } else {
        // Clear active exam if deactivated
        localStorage.removeItem(LS_KEYS.ACTIVE_EXAM);
        console.log('✅ Active exam cleared');
      }
    } catch (error) {
      console.error('Error activating exam:', error);
    }
  };

  const handleDeleteExam = async (examId) => {
    if (window.confirm("Are you sure you want to delete this exam? This action cannot be undone.")) {
      try {
        const updatedExams = exams.filter(ex => ex.id !== examId);
        await saveExams(updatedExams);
        setExams(updatedExams);
        if (selectedExam?.id === examId) {
          setSelectedExam(null);
        }
      } catch (error) {
        console.error('Error deleting exam:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading CBT system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto w-full px-3 sm:px-8 py-4 sm:py-8">
        {/* Admin Panel Header */}
        <div className="bg-white rounded-xl border p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">CBT Admin Panel</h2>
              <p className="text-gray-600">Manage exams, questions, and student results</p>
              {activeTab === "questions" && selectedExam && (
                <div className="mt-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                  📝 Currently viewing questions for: <span className="font-semibold">{selectedExam.title}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Hidden Admin Access Button */}
              <button
                onClick={onAdminAccess}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors opacity-30 hover:opacity-70"
                title="Admin Access (Ctrl+Alt+A)"
              >
                ⚙️
              </button>
            <div className="text-sm text-gray-500">
              Logged in as: <span className="font-medium">{user.fullName || user.username}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl mb-8">
          {[
            { id: "exams", label: "📋 Exam Management", icon: "📋", adminOnly: false },
            { id: "questions", label: "❓ Questions", icon: "❓", adminOnly: false },
            { id: "results", label: "📊 Results", icon: "📊", adminOnly: false },
            { id: "reporting", label: "📈 Reporting", icon: "📈", adminOnly: true },
            { id: "students", label: "👥 Students", icon: "👥", adminOnly: true },
            { id: "settings", label: "⚙️ Settings", icon: "⚙️", adminOnly: true }
          ].filter(tab => !tab.adminOnly || user.role === 'admin' || user.role === 'super_admin' || user.role === 'managed_admin').map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "exams" && (
          <ExamsTab 
            exams={exams}
            onCreateExam={() => setShowCreateExam(true)}
            onActivateExam={handleActivateExam}
            onDeleteExam={handleDeleteExam}
            onSelectExam={setSelectedExam}
            selectedExam={selectedExam}
            onEditExam={() => setShowEditExam(true)}
            user={user}
            onViewQuestions={() => setActiveTab("questions")}
          />
        )}


        {activeTab === "questions" && (
          <QuestionsTab 
            selectedExam={selectedExam}
            questions={questions}
            setQuestions={setQuestions}
            onFileUpload={handleFileUpload}
            importError={importError}
            onBackToExams={() => setActiveTab("exams")}
            institution={institution}
            user={user}
          />
        )}

        {activeTab === "results" && (
          <ResultsTab 
            results={results}
            onExportExcel={exportResultsToExcel}
            onExportWord={exportResultsToWord}
            onBackToExams={() => setActiveTab("exams")}
            user={user}
          />
        )}

        {activeTab === "reporting" && (user.role === 'admin' || user.role === 'super_admin' || user.role === 'managed_admin') && (
          <ReportingTab 
            results={results}
            questions={questions}
            exams={exams}
            students={students}
            institution={institution}
            onExportExcel={exportResultsToExcel}
            onExportWord={exportResultsToWord}
          />
        )}

        {activeTab === "students" && (user.role === 'admin' || user.role === 'super_admin' || user.role === 'managed_admin') && (
          <StudentsTab 
            onBackToExams={() => setActiveTab("exams")}
            institution={institution}
            user={user}
          />
        )}

        {activeTab === "settings" && (user.role === 'admin' || user.role === 'super_admin' || user.role === 'managed_admin') && (
          <SettingsTab 
            onBackToExams={() => setActiveTab("exams")}
            institution={institution}
            user={user}
          />
        )}

        {/* Modals */}
        {showCreateExam && (
          <CreateExamModal 
            onClose={() => setShowCreateExam(false)} 
            onCreate={handleCreateExam} 
          />
        )}

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
      </main>
    </div>
  );
};

// Helper Components
function ExamsTab({ exams, onCreateExam, onActivateExam, onDeleteExam, onSelectExam, selectedExam, onEditExam, user, onViewQuestions }) {
  const isAdmin = user.role === 'admin' || user.role === 'super_admin' || user.role === 'managed_admin';
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Available Exams</h3>
          <p className="text-sm text-gray-600">
            {isAdmin ? 'Create and manage exam events for students' : 'Available exams for you to take'}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={onCreateExam}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
          >
            + Create New Exam
          </button>
        )}
      </div>

      {exams.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>{isAdmin ? 'No exams created yet.' : 'No exams available yet.'}</p>
          <p className="text-sm mt-2">{isAdmin ? 'Create your first exam to get started.' : 'Please check back later or contact your administrator.'}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {exams.map(exam => {
            const now = new Date();
            const start = exam.startDate ? new Date(exam.startDate) : null;
            const end = exam.endDate ? new Date(exam.endDate) : null;
            const isScheduled = start && now < start;
            const isOngoing = start && end && now >= start && now <= end;
            const isEnded = end && now > end;
            return (
              <div key={exam.id} className={`border rounded-xl p-4 transition-all ${
                selectedExam?.id === exam.id 
                  ? 'bg-blue-50 border-blue-300 shadow-md' 
                  : 'bg-white hover:shadow-sm'
              }`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg">{exam.title}</h4>
                    <p className="text-sm text-gray-600">{exam.description}</p>
                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500 items-center">
                      <span>Questions: {exam.questionCount || 0}</span>
                      <span>Duration: {exam.duration} minutes</span>
                      {start && (<span>Starts: {start.toLocaleString()}</span>)}
                      {end && (<span>Ends: {end.toLocaleString()}</span>)}
                      <span>Created: {new Date(exam.createdAt).toLocaleDateString()}</span>
                      {isScheduled && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Scheduled</span>}
                      {isOngoing && <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Ongoing</span>}
                      {isEnded && <span className="px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">Ended</span>}
                    </div>
                  </div>
                    <div className="flex gap-2">
                    {/* View Questions Button - Available to all users */}
                    <button
                      onClick={() => {
                        onSelectExam(exam);
                        if (onViewQuestions) onViewQuestions();
                      }}
                      className={`px-3 py-1 rounded-lg text-xs ${
                        selectedExam?.id === exam.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {selectedExam?.id === exam.id ? '👁️ Viewing Questions' : '📝 View Questions'}
                    </button>
                    
                    {/* Admin-only buttons */}
                    {isAdmin && (
                      <>
                      <button
                        onClick={() => onActivateExam(exam.id)}
                        className={`px-3 py-1 rounded-lg text-xs ${
                          exam.isActive 
                            ? "bg-orange-600 text-white hover:bg-orange-700" 
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                      >
                        {exam.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => onEditExam()}
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDeleteExam(exam.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700"
                      >
                        Delete
                      </button>
                      </>
                  )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function QuestionsTab({ selectedExam, questions, setQuestions, onFileUpload, importError, onBackToExams, institution, user }) {
  const isAdmin = user.role === 'admin' || user.role === 'super_admin' || user.role === 'managed_admin';
  
  if (!selectedExam) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="text-6xl mb-4">📋</div>
        <h3 className="text-xl font-semibold mb-2">No Exam Selected</h3>
        <p className="text-gray-600 mb-4">
          {isAdmin 
            ? 'To manage questions, please select an exam from the Exam Management tab.'
            : 'To view questions, please select an exam from the Exam Management tab.'
          }
        </p>
        <button
          onClick={onBackToExams}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium"
        >
          ← Go to Exam Management
        </button>
        <div className="mt-6 text-sm text-gray-500">
          💡 Tip: Click the "📝 View Questions" button on any exam to see its questions
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Exam Context Header */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-blue-900">📝 Questions for: {selectedExam.title}</h3>
            <p className="text-sm text-blue-700 mt-1">{selectedExam.description || 'No description provided'}</p>
            <div className="flex flex-wrap gap-4 mt-2 text-xs text-blue-600">
              <span>📊 Questions: {questions.length}</span>
              <span>⏱️ Duration: {selectedExam.duration} minutes</span>
              <span>📅 Created: {new Date(selectedExam.createdAt).toLocaleDateString()}</span>
              {selectedExam.isActive && <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700">🟢 Active</span>}
            </div>
        </div>
        <button
          onClick={onBackToExams}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          ← Back to Exams
        </button>
        </div>
      </div>

      {isAdmin && (
        <div className="bg-white rounded-xl border p-6">
          <div className="flex flex-wrap gap-2 mb-4">
            <button onClick={async () => {
              const workbook = new ExcelJS.Workbook();
              const worksheet = workbook.addWorksheet('Questions');
              worksheet.columns = [
                { header: 'Question', key: 'question', width: 20 },
                { header: 'A', key: 'optionA', width: 10 },
                { header: 'B', key: 'optionB', width: 10 },
                { header: 'C', key: 'optionC', width: 10 },
                { header: 'D', key: 'optionD', width: 10 },
                { header: 'Answer', key: 'answer', width: 10 }
              ];
              worksheet.addRow({ question: 'What is 2 + 2?', optionA: '3', optionB: '4', optionC: '5', optionD: '6', answer: 'B' });
              worksheet.addRow({ question: 'Capital of France?', optionA: 'Berlin', optionB: 'Madrid', optionC: 'Paris', optionD: 'Rome', answer: 'C' });
              const excelBuffer = await workbook.xlsx.writeBuffer();
              const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
              saveAs(blob, 'cbt_questions_template.xlsx');
            }} className="px-3 py-2 text-sm rounded-lg border hover:bg-gray-50">Download Excel sample</button>
            <button onClick={async () => {
              const doc = new Document({
                sections: [{ properties: {}, children: [
                  new Paragraph({ children: [new TextRun({ text: 'Sample CBT Questions Template', bold: true, size: 28 })] }),
                  new Paragraph(' '),
                  new Paragraph('1) What is 2 + 2?'),
                  new Paragraph('A) 3'),
                  new Paragraph('B) 4'),
                  new Paragraph('C) 5'),
                  new Paragraph('D) 6'),
                  new Paragraph('Answer: B'),
                  new Paragraph(' '),
                  new Paragraph('2) Capital of France is?'),
                  new Paragraph('A) Berlin'),
                  new Paragraph('B) Madrid'),
                  new Paragraph('C) Paris'),
                  new Paragraph('D) Rome'),
                  new Paragraph('Answer: C'),
                ] }]
              });
              const blob = await Packer.toBlob(doc);
              saveAs(blob, 'cbt_questions_template.docx');
            }} className="px-3 py-2 text-sm rounded-lg border hover:bg-gray-50">Download Word sample</button>
          </div>
          <h4 className="font-semibold mb-4">Upload Questions</h4>
          <div className="border-2 border-dashed border-blue-300 rounded-xl p-6 text-center bg-blue-50">
            <p className="text-lg font-semibold text-gray-700 mb-2">Upload Your Questions</p>
            <p className="text-sm text-gray-600 mb-4">Drag and drop a .docx or .xlsx file here, or click to browse</p>
            <input 
              type="file" 
              accept=".docx,.xlsx" 
              onChange={e => { if (e.target.files && e.target.files[0]) onFileUpload(e.target.files[0]); }}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {importError && (
              <div className={`mt-3 p-3 rounded-lg text-sm ${
                importError.includes('Successfully') || importError.includes('✅') 
                  ? 'bg-green-100 text-green-700 border border-green-200' 
                  : 'bg-red-100 text-red-700 border border-red-200'
              }`}>
                <div className="whitespace-pre-line">{importError}</div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border p-6">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-semibold text-lg">📋 Exam Questions ({questions.length})</h4>
          {questions.length > 0 && (
            <div className="text-sm text-gray-500">
              Total Points: {questions.length} | Time per question: ~{Math.ceil(selectedExam.duration / questions.length)} min
            </div>
          )}
        </div>
        
        {questions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-4">❓</div>
            <p className="text-lg font-medium mb-2">No questions yet for this exam</p>
            <p className="text-sm text-gray-600 mb-4">
              {isAdmin 
                ? 'Upload a question file to get started. Students will see these questions when they take the exam.'
                : 'Questions will be available when the exam starts.'
              }
            </p>
            {isAdmin && (
              <div className="text-xs text-blue-600">
                💡 Tip: Use the upload section above to add questions from Word or Excel files
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q, i) => (
              <div key={q.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-sm font-bold bg-blue-100 text-blue-700 px-3 py-1 rounded-full min-w-[2rem] text-center">
                    {i + 1}
                  </span>
                  <p className="flex-1 text-gray-800 leading-relaxed">{q.text}</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-3 ml-12">
                  {q.options.map((opt, oi) => (
                    <div key={oi} className={`text-sm p-3 rounded-lg border ${
                      oi === q.correctIndex 
                        ? 'bg-green-50 border-green-200 text-green-800' 
                        : 'bg-gray-50 border-gray-200 text-gray-700'
                    }`}>
                      <span className="font-medium">{String.fromCharCode(65 + oi)}.</span> {opt}
                      {oi === q.correctIndex && (
                        <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✓ Correct Answer
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ResultsTab({ results, onExportExcel, onExportWord, onBackToExams, user }) {
  const isAdmin = user.role === 'admin' || user.role === 'super_admin' || user.role === 'managed_admin';
  const total = results.length;
  const avgPercent = total ? Math.round(results.reduce((s, r) => s + (r.percent || 0), 0) / total) : 0;
  const best = total ? Math.max(...results.map(r => r.percent || 0)) : 0;
  const worst = total ? Math.min(...results.map(r => r.percent || 0)) : 0;
  const passRate = total ? Math.round((results.filter(r => (r.percent || 0) >= 50).length / total) * 100) : 0;

  const distribution = [0, 0, 0, 0, 0]; // 0-19,20-39,40-59,60-79,80-100
  results.forEach(r => {
    const p = r.percent || 0;
    if (p < 20) distribution[0]++; else if (p < 40) distribution[1]++; else if (p < 60) distribution[2]++; else if (p < 80) distribution[3]++; else distribution[4]++;
  });

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="bg-white rounded-xl border p-4">
          <h4 className="font-semibold mb-3">Analytics</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
            <div className="p-3 rounded-lg bg-gray-50"><div className="text-gray-500">Submissions</div><div className="font-semibold text-gray-800">{total}</div></div>
            <div className="p-3 rounded-lg bg-gray-50"><div className="text-gray-500">Avg %</div><div className="font-semibold text-gray-800">{avgPercent}%</div></div>
            <div className="p-3 rounded-lg bg-gray-50"><div className="text-gray-500">Best %</div><div className="font-semibold text-gray-800">{best}%</div></div>
            <div className="p-3 rounded-lg bg-gray-50"><div className="text-gray-500">Worst %</div><div className="font-semibold text-gray-800">{worst}%</div></div>
            <div className="p-3 rounded-lg bg-gray-50"><div className="text-gray-500">Pass Rate</div><div className="font-semibold text-gray-800">{passRate}%</div></div>
          </div>
          <div className="mt-4 text-xs text-gray-600 flex flex-wrap gap-4">
            <div>0-19%: {distribution[0]}</div>
            <div>20-39%: {distribution[1]}</div>
            <div>40-59%: {distribution[2]}</div>
            <div>60-79%: {distribution[3]}</div>
            <div>80-100%: {distribution[4]}</div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Exam Results</h3>
        <div className="flex gap-2">
          {isAdmin && (
            <>
              <button onClick={onExportExcel} className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700">
                Export to Excel
              </button>
              <button onClick={onExportWord} className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700">
                Export to Word
              </button>
            </>
          )}
          <button
            onClick={onBackToExams}
            className="px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 text-sm"
          >
            ← Back to Exams
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exam</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percent</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
            </tr>
          </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
              {results
                .filter(result => isAdmin || result.username === user.username)
                .map((result, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{result.username}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{result.examTitle}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{result.score}/{result.total}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{result.percent}%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(result.submittedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              {results.filter(result => isAdmin || result.username === user.username).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">No results yet</td>
                </tr>
              )}
            </tbody>
        </table>
      </div>
    </div>
  );
}

// local student status helpers
function getStudentStatusMap() {
  try {
    return JSON.parse(localStorage.getItem('cbt_student_status_v1') || '{}');
  } catch { return {}; }
}
function setStudentStatus(username, status) {
  const map = getStudentStatusMap();
  map[username] = status; // 'active' | 'suspended'
  localStorage.setItem('cbt_student_status_v1', JSON.stringify(map));
}
function getStudentStatus(username) {
  const map = getStudentStatusMap();
  return map[username] || 'active';
}

function StudentsTab({ onBackToExams, institution, user }) {
  // eslint-disable-next-line no-unused-vars
  const isAdmin = user.role === 'admin' || user.role === 'super_admin' || user.role === 'managed_admin';
  
  // State for Create Student modal
  const [createStudentModalOpen, setCreateStudentModalOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    gender: '',
    age: ''
  });
  const [createStudentError, setCreateStudentError] = useState('');
  
  // Load actual registered students from localStorage or API
  const raw = localStorage.getItem('cbt_student_registrations_v1');
  const allStudents = raw ? JSON.parse(raw) : [];
  
  // Filter students by institution if needed
  const students = allStudents.filter(s => !institution?.slug || s.institutionSlug === institution.slug);

  // Create student function
  const createStudent = async () => {
    try {
      setCreateStudentError('');
      
      // Validate required fields
      if (!newStudent.username || !newStudent.password || !newStudent.fullName || !newStudent.email || !newStudent.gender || !newStudent.age) {
        setCreateStudentError('All fields are required');
        return;
      }

      if (newStudent.password.length < 6) {
        setCreateStudentError('Password must be at least 6 characters long');
        return;
      }

      if (isNaN(newStudent.age) || parseInt(newStudent.age) < 16 || parseInt(newStudent.age) > 100) {
        setCreateStudentError('Age must be a number between 16 and 100');
        return;
      }

      // Check if username or email already exists
      const users = JSON.parse(localStorage.getItem('cbt_users_v1') || '[]');
      const existingUser = users.find(u => 
        (u.username && u.username.toLowerCase() === newStudent.username.toLowerCase()) ||
        (u.email && u.email.toLowerCase() === newStudent.email.toLowerCase())
      );

      if (existingUser) {
        setCreateStudentError('Username or email already exists');
        return;
      }

      // Create new student
      const studentData = {
        username: newStudent.username,
        password: newStudent.password,
        fullName: newStudent.fullName,
        email: newStudent.email,
        gender: newStudent.gender,
        age: parseInt(newStudent.age),
        role: 'student',
        institutionSlug: institution?.slug || null,
        registeredAt: new Date().toISOString()
      };

      // Add to users
      users.push(studentData);
      localStorage.setItem('cbt_users_v1', JSON.stringify(users));

      // Add to registrations
      const registrations = JSON.parse(localStorage.getItem('cbt_student_registrations_v1') || '[]');
      registrations.push(studentData);
      localStorage.setItem('cbt_student_registrations_v1', JSON.stringify(registrations));

      // Reset form and close modal
      setNewStudent({ username: '', password: '', fullName: '', email: '', gender: '', age: '' });
      setCreateStudentModalOpen(false);
      
      // Reload page to refresh student list
      window.location.reload();
      
      console.log('✅ Student created manually:', studentData);
    } catch (error) {
      console.error('Error creating student:', error);
      setCreateStudentError('Failed to create student: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Student Management</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setCreateStudentModalOpen(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
          >
            Create Student
          </button>
          <button
            onClick={onBackToExams}
            className="px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 text-sm"
          >
            ← Back to Exams
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="min-w-full">
                      <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {students.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">No students registered yet</td></tr>
            )}
            {students.map(s => {
              const status = getStudentStatus(s.username);
              return (
                <tr key={s.username}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{s.username}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{s.fullName || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{s.email || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${status==='active' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>{status}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-right">
                    {status === 'active' ? (
                      <button onClick={() => { setStudentStatus(s.username, 'suspended'); window.alert('Student suspended'); }} className="px-3 py-1 rounded-lg bg-orange-600 text-white hover:bg-orange-700 mr-2">Suspend</button>
                    ) : (
                      <button onClick={() => { setStudentStatus(s.username, 'active'); window.alert('Student activated'); }} className="px-3 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 mr-2">Activate</button>
                    )}
                    <button onClick={() => { if(window.confirm('Remove this student data locally?')) { setStudentStatus(s.username, 'active'); /* reset */ } }} className="px-3 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700">Remove</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create Student Modal */}
      {createStudentModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Create New Student</h3>
              <button 
                onClick={() => {
                  setCreateStudentModalOpen(false);
                  setNewStudent({ username: '', password: '', fullName: '', email: '', gender: '', age: '' });
                  setCreateStudentError('');
                }} 
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>
            
            {createStudentError && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                {createStudentError}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={newStudent.fullName}
                  onChange={(e) => setNewStudent(prev => ({ ...prev, fullName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter full name"
                  autoComplete="name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  value={newStudent.username}
                  onChange={(e) => setNewStudent(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter username"
                  autoComplete="username"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newStudent.email}
                  onChange={(e) => setNewStudent(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter email address"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <select
                  value={newStudent.gender}
                  onChange={(e) => setNewStudent(prev => ({ ...prev, gender: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                <input
                  type="number"
                  value={newStudent.age}
                  onChange={(e) => setNewStudent(prev => ({ ...prev, age: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter age (16-100)"
                  min="16"
                  max="100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={newStudent.password}
                  onChange={(e) => setNewStudent(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter password (min 6 characters)"
                  autoComplete="new-password"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={createStudent}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
              >
                Create Student
              </button>
              <button
                onClick={() => {
                  setCreateStudentModalOpen(false);
                  setNewStudent({ username: '', password: '', fullName: '', email: '', gender: '', age: '' });
                  setCreateStudentError('');
                }}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-sm font-medium"
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

function SettingsTab({ onBackToExams, institution, user }) {
  // eslint-disable-next-line no-unused-vars
  const isAdmin = user.role === 'admin' || user.role === 'super_admin' || user.role === 'managed_admin';
  const isSuperAdmin = user.role === 'super_admin' || user.role === 'managed_admin';
  
  const [logoModalOpen, setLogoModalOpen] = useState(false);
  const [selectedLogoFile, setSelectedLogoFile] = useState(null);
  const [logoUrlInput, setLogoUrlInput] = useState('');
  // refined logo upload state
  const [logoUrl, setLogoUrl] = useState('');
  const [logoError, setLogoError] = useState('');
  const [adminsModalOpen, setAdminsModalOpen] = useState(false);
  const [studentsModalOpen, setStudentsModalOpen] = useState(false);
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  
  // Change password state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  
  // Student management state
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [createStudentModalOpen, setCreateStudentModalOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({
    username: '',
    password: '',
    fullName: '',
    email: ''
  });
  const [createStudentError, setCreateStudentError] = useState('');

  const updateLogo = async (logoUrl) => {
    try {
      // Validate the logo URL format
      if (!logoUrl) {
        throw new Error('Logo URL is required');
      }

      // Check if it's a data URL or valid image URL
      const isDataUrl = logoUrl.startsWith('data:image/');
      const isValidUrl = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(logoUrl);
      
      if (!isDataUrl && !isValidUrl) {
        throw new Error('Invalid logo format. Must be a valid image URL or uploaded image.');
      }

      // Use the correct endpoint for admin users
      const endpoint = isSuperAdmin 
        ? `/api/tenants/${institution.slug}/logo`
        : `/api/tenants/${institution.slug}/logo/update`;

      const response = await fetch(`https://cbt-rew7.onrender.com${endpoint}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          // Only add Authorization for multi-tenant admin endpoint
          ...(isSuperAdmin && { 'Authorization': `Bearer ${localStorage.getItem('multi_tenant_admin_token')}` })
        },
        body: JSON.stringify({ 
          logo_url: logoUrl 
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      await response.json();
      
        showToast('Logo updated successfully!', 'success');
        // Clear the form
        setSelectedLogoFile(null);
        setLogoUrl('');
        setLogoUrlInput('');
        setLogoModalOpen(false);
    } catch (error) {
      console.error('Logo update failed:', error);
      setLogoError(error.message);
      showToast(`Logo update failed: ${error.message}`, 'error');
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 3000);
  };

  // Load students from localStorage
  const loadStudents = useCallback(async () => {
    setLoadingStudents(true);
    try {
      // Load from both users and student registrations
      const users = JSON.parse(localStorage.getItem('cbt_users_v1') || '[]');
      const registrations = JSON.parse(localStorage.getItem('cbt_student_registrations_v1') || '[]');
      
      // Combine and filter students
      const allStudents = [...users.filter(u => u.role === 'student'), ...registrations];
      
      // Remove duplicates based on email
      const uniqueStudents = allStudents.filter((student, index, self) => 
        index === self.findIndex(s => s.email === student.email)
      );
      
      // Filter by institution if needed
      const institutionStudents = uniqueStudents.filter(student => 
        !institution?.slug || student.institutionSlug === institution.slug
      );
      
      // Add status information
      const studentsWithStatus = institutionStudents.map(student => ({
        ...student,
        status: getStudentStatus(student.username || student.email) || 'active'
      }));
      
      setStudents(studentsWithStatus);
      console.log('📚 Loaded students for institution:', institution?.slug || 'all', studentsWithStatus.length);
    } catch (error) {
      console.error('Error loading students:', error);
      showToast('Failed to load students', 'error');
    } finally {
      setLoadingStudents(false);
    }
  }, [institution?.slug]);

  // Toggle student status (suspend/unsuspend)
  const toggleStudentStatus = (student) => {
    try {
      const newStatus = student.status === 'active' ? 'suspended' : 'active';
      setStudentStatus(student.username || student.email, newStatus);
      
      // Update local state
      setStudents(prev => prev.map(s => 
        (s.username || s.email) === (student.username || student.email)
          ? { ...s, status: newStatus }
          : s
      ));
      
      showToast(`Student ${newStatus === 'suspended' ? 'suspended' : 'activated'} successfully`, 'success');
    } catch (error) {
      console.error('Error updating student status:', error);
      showToast('Failed to update student status', 'error');
    }
  };

  // Delete student permanently
  const deleteStudent = async (student) => {
    if (!window.confirm(`Are you sure you want to permanently delete student "${student.fullName || student.username}"? This action cannot be undone.`)) {
      return;
    }

    try {
      // Remove from users
      const users = JSON.parse(localStorage.getItem('cbt_users_v1') || '[]');
      const updatedUsers = users.filter(user => 
        !(user.email && user.email.toLowerCase() === student.email.toLowerCase())
      );
      localStorage.setItem('cbt_users_v1', JSON.stringify(updatedUsers));

      // Remove from registrations
      const registrations = JSON.parse(localStorage.getItem('cbt_student_registrations_v1') || '[]');
      const updatedRegistrations = registrations.filter(reg => 
        !(reg.email && reg.email.toLowerCase() === student.email.toLowerCase())
      );
      localStorage.setItem('cbt_student_registrations_v1', JSON.stringify(updatedRegistrations));

      // Remove from student status
      const statusMap = JSON.parse(localStorage.getItem('cbt_student_status_v1') || '{}');
      delete statusMap[student.username || student.email];
      localStorage.setItem('cbt_student_status_v1', JSON.stringify(statusMap));

      // Update local state
      setStudents(prev => prev.filter(s => 
        (s.username || s.email) !== (student.username || student.email)
      ));

      showToast('Student deleted successfully', 'success');
      console.log('🗑️ Student deleted:', student.email);
    } catch (error) {
      console.error('Error deleting student:', error);
      showToast('Failed to delete student', 'error');
    }
  };

  // Create student manually
  const createStudent = async () => {
    try {
      setCreateStudentError('');
      
      // Validate required fields
      if (!newStudent.username || !newStudent.password || !newStudent.fullName || !newStudent.email) {
        setCreateStudentError('All fields are required');
        return;
      }

      if (newStudent.password.length < 6) {
        setCreateStudentError('Password must be at least 6 characters long');
        return;
      }

      // Check if username or email already exists
      const users = JSON.parse(localStorage.getItem('cbt_users_v1') || '[]');
      const existingUser = users.find(u => 
        (u.username && u.username.toLowerCase() === newStudent.username.toLowerCase()) ||
        (u.email && u.email.toLowerCase() === newStudent.email.toLowerCase())
      );

      if (existingUser) {
        setCreateStudentError('Username or email already exists');
        return;
      }

      // Create new student
      const studentData = {
        username: newStudent.username,
        password: newStudent.password,
        fullName: newStudent.fullName,
        email: newStudent.email,
        role: 'student',
        institutionSlug: institution?.slug || null,
        registeredAt: new Date().toISOString()
      };

      // Add to users
      users.push(studentData);
      localStorage.setItem('cbt_users_v1', JSON.stringify(users));

      // Add to registrations
      const registrations = JSON.parse(localStorage.getItem('cbt_student_registrations_v1') || '[]');
      registrations.push(studentData);
      localStorage.setItem('cbt_student_registrations_v1', JSON.stringify(registrations));

      // Reset form and close modal
      setNewStudent({ username: '', password: '', fullName: '', email: '' });
      setCreateStudentModalOpen(false);
      
      // Reload students list
      await loadStudents();
      
      showToast('Student created successfully', 'success');
      console.log('✅ Student created manually:', studentData);
    } catch (error) {
      console.error('Error creating student:', error);
      setCreateStudentError('Failed to create student: ' + error.message);
    }
  };

  // Load students when modal opens
  useEffect(() => {
    if (studentsModalOpen) {
      loadStudents();
    }
  }, [studentsModalOpen, loadStudents]);

  const handleChangePassword = async () => {
    try {
      setPasswordError('');
      
      // Validate input
      if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
        setPasswordError('All fields are required');
        return;
      }
      
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setPasswordError('New passwords do not match');
        return;
      }
      
      if (passwordData.newPassword.length < 6) {
        setPasswordError('New password must be at least 6 characters long');
        return;
      }
      
      // Check current password
      const users = JSON.parse(localStorage.getItem('cbt_users_v1') || '[]');
      const currentUser = users.find(u => u.username === user.username);
      
      if (!currentUser || currentUser.password !== passwordData.currentPassword) {
        setPasswordError('Current password is incorrect');
        return;
      }
      
      // Update password
      const updatedUsers = users.map(u => 
        u.username === user.username 
          ? { ...u, password: passwordData.newPassword }
          : u
      );
      
      localStorage.setItem('cbt_users_v1', JSON.stringify(updatedUsers));
      
      // Clear form and close modal
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setChangePasswordModalOpen(false);
      showToast('Password changed successfully!', 'success');
      
    } catch (error) {
      console.error('Password change failed:', error);
      setPasswordError('Failed to change password. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">System Settings</h3>
        <button
          onClick={onBackToExams}
          className="px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 text-sm"
        >
          ← Back to Exams
        </button>
      </div>
      
      {toast.message && (
        <div className={`p-3 rounded-lg text-sm ${toast.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {toast.message}
        </div>
      )}
      
      <div className="bg-white rounded-xl border p-6">
        <h4 className="font-semibold mb-4">Institution Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Institution Name</label>
            <p className="mt-1 text-sm text-gray-900">{institution?.name || 'N/A'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Institution Slug</label>
            <p className="mt-1 text-sm text-gray-900">{institution?.slug || 'N/A'}</p>
          </div>
        </div>
        
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h5 className="font-semibold mb-4">Administrative Actions</h5>
            <div className="flex flex-wrap gap-3">
            {isSuperAdmin && (
              <>
              <button
                onClick={() => setLogoModalOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                Change Logo
              </button>
              <button
                onClick={() => setAdminsModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
              >
                Manage Admins
              </button>
              <button
                onClick={() => setStudentsModalOpen(true)}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm"
              >
                Manage Students
              </button>
              </>
            )}
            <button
              onClick={() => setChangePasswordModalOpen(true)}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm"
            >
              Change Password
              </button>
            </div>
          </div>
      </div>

      {/* Logo Update Modal */}
      {logoModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <div>
              <h3 className="text-lg font-bold">Update Institution Logo</h3>
                <p className="text-sm text-gray-600 mt-1">Upload an image file or provide a URL</p>
              </div>
              <button
                onClick={() => {
                  setLogoModalOpen(false);
                  setSelectedLogoFile(null);
                  setLogoUrlInput('');
                }}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* File Upload Section - Primary Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="text-indigo-600 font-semibold">📁 Upload Logo File</span>
                  <span className="text-xs text-gray-500 ml-2">(Recommended)</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      // Validate file type
                      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
                      if (!allowedTypes.includes(file.type)) {
                        showToast('Please select a valid image file (JPEG, PNG, GIF, or WebP)', 'error');
                        return;
                      }
                      
                      // Validate file size (max 5MB)
                      if (file.size > 5 * 1024 * 1024) {
                        showToast('File size must be less than 5MB', 'error');
                        return;
                      }
                      
                      setSelectedLogoFile(file);
                      setLogoUrlInput(''); // Clear URL input when file is selected
                      
                      // Create data URL for preview
                      const reader = new FileReader();
                      reader.onload = function(e) {
                        setLogoUrl(e.target.result);
                      };
                      reader.onerror = function() {
                        showToast('Failed to read the selected file', 'error');
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full px-3 py-2 border-2 border-dashed border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 hover:border-indigo-400 transition-colors"
                />
                <p className="text-xs text-gray-500 mt-1">Supported formats: JPEG, PNG, GIF, WebP (Max 5MB)</p>
              </div>

              {/* File Preview */}
              {(selectedLogoFile || logoUrl || logoUrlInput) && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  {selectedLogoFile && (
                    <p className="text-sm text-gray-600 mb-2">Selected file: {selectedLogoFile.name}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <img
                      src={logoUrl || logoUrlInput}
                      alt="Logo preview"
                      className="w-16 h-16 object-contain border rounded"
                      crossOrigin="anonymous"
                    />
                    {selectedLogoFile && (
                      <button
                        onClick={() => {
                          setSelectedLogoFile(null);
                          setLogoUrl('');
                          const fileInput = document.querySelector('input[type="file"]');
                          if (fileInput) fileInput.value = '';
                        }}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Remove file
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Divider - Less prominent */}
              <div className="text-center">
                <div className="inline-flex items-center text-xs text-gray-400">
                  <div className="flex-1 h-px bg-gray-300"></div>
                  <span className="px-3">or use URL</span>
                  <div className="flex-1 h-px bg-gray-300"></div>
                </div>
              </div>

              {/* URL Input Section - Secondary Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="text-gray-600">🔗 Logo URL</span>
                  <span className="text-xs text-gray-500 ml-2">(Alternative)</span>
                </label>
                <input
                  type="text"
                  value={logoUrlInput}
                  placeholder="Enter logo URL (https://...)"
                  onChange={(e) => {
                    const url = e.target.value;
                    setLogoUrlInput(url);
                    setSelectedLogoFile(null);
                    setLogoError('');

                    // Validate URL format if it's not empty
                    if (url && !url.startsWith('data:image/')) {
                      const urlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i;
                      if (!urlPattern.test(url)) {
                        setLogoError('Please enter a valid image URL ending with .jpg, .jpeg, .png, .gif, or .webp');
                      } else {
                        setLogoError('');
                      }
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50"
                />
              </div>

              {/* Error Display */}
              {logoError && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                  {logoError}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => {
                    setLogoModalOpen(false);
                    setSelectedLogoFile(null);
                    setLogoUrlInput('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (selectedLogoFile) {
                      // Validate file type
                      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
                      if (!allowedTypes.includes(selectedLogoFile.type)) {
                        showToast('Please select a valid image file (JPEG, PNG, GIF, or WebP)', 'error');
                        return;
                      }
                      
                      // Validate file size (max 5MB)
                      if (selectedLogoFile.size > 5 * 1024 * 1024) {
                        showToast('File size must be less than 5MB', 'error');
                        return;
                      }
                      
                      // Convert file to data URL for now
                      // In a production environment, you'd upload to a cloud storage service first
                      const reader = new FileReader();
                      reader.onload = function(e) {
                        updateLogo(e.target.result);
                      };
                      reader.onerror = function() {
                        showToast('Failed to read the selected file', 'error');
                      };
                      reader.readAsDataURL(selectedLogoFile);
                    } else {
                      // Use URL input if no file selected
                      const url = logoUrlInput.trim();
                      if (!url) {
                        showToast('Please select a file or enter a valid URL', 'error');
                        return;
                      }
                      
                      if (!/^https?:\/\//i.test(url)) {
                        showToast('Please enter a valid URL starting with http:// or https://', 'error');
                        return;
                      }
                      
                      // Validate URL format
                      const urlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i;
                      if (!urlPattern.test(url)) {
                        showToast('Please enter a valid image URL (JPG, PNG, GIF, WebP, or SVG)', 'error');
                        return;
                      }
                      
                      updateLogo(url);
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Update Logo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage Admins Modal */}
      {adminsModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Manage Admins</h3>
              <button onClick={() => setAdminsModalOpen(false)} className="text-gray-500 hover:text-gray-700 text-xl">×</button>
            </div>
            <div className="text-center text-gray-500 py-8">
              <p>Admin management functionality will be implemented here.</p>
              <p className="text-sm mt-2">This will allow you to create, suspend, and manage admin accounts.</p>
            </div>
          </div>
        </div>
      )}

      {/* Manage Students Modal */}
      {studentsModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Manage Students ({students.length})</h3>
              <button onClick={() => setStudentsModalOpen(false)} className="text-gray-500 hover:text-gray-700 text-xl">×</button>
            </div>
            
            {students.length > 0 && (
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search students by name, email, or username..."
                  value={studentSearchTerm}
                  onChange={(e) => setStudentSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
            
            {loadingStudents ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading students...</p>
              </div>
            ) : students.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
                <div className="text-4xl mb-4">👥</div>
                <p className="text-lg font-medium mb-2">No students found</p>
                <p className="text-sm">Students will appear here once they register for exams.</p>
            </div>
            ) : (() => {
              const filteredStudents = students.filter(student => {
                if (!studentSearchTerm) return true;
                const searchLower = studentSearchTerm.toLowerCase();
                return (
                  (student.fullName && student.fullName.toLowerCase().includes(searchLower)) ||
                  (student.email && student.email.toLowerCase().includes(searchLower)) ||
                  (student.username && student.username.toLowerCase().includes(searchLower))
                );
              });
              
              return (
                <div className="space-y-4">
                  {filteredStudents.length === 0 && studentSearchTerm ? (
                    <div className="text-center text-gray-500 py-8">
                      <div className="text-4xl mb-4">🔍</div>
                      <p className="text-lg font-medium mb-2">No students found</p>
                      <p className="text-sm">No students match your search for "{studentSearchTerm}"</p>
          </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredStudents.map((student, index) => (
                    <div key={student.email || student.username || index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{student.fullName || 'Unknown'}</h4>
                          <p className="text-sm text-gray-600">{student.email}</p>
                          {student.username && (
                            <p className="text-xs text-gray-500">@{student.username}</p>
                          )}
        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          student.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {student.status === 'active' ? 'Active' : 'Suspended'}
                        </span>
                      </div>
                      
                      <div className="text-xs text-gray-500 mb-3">
                        {student.registeredAt && (
                          <p>Registered: {new Date(student.registeredAt).toLocaleDateString()}</p>
                        )}
                        {student.createdAt && (
                          <p>Created: {new Date(student.createdAt).toLocaleDateString()}</p>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleStudentStatus(student)}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            student.status === 'active'
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {student.status === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                        <button
                          onClick={() => deleteStudent(student)}
                          className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors"
                          title="Delete student permanently"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">Student Management</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• <strong>Active</strong> students can log in and take exams</li>
                      <li>• <strong>Suspended</strong> students cannot access the system</li>
                      <li>• You can toggle student status by clicking the suspend/activate button</li>
                      <li>• Changes are saved immediately and take effect right away</li>
                    </ul>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {changePasswordModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Change Password</h3>
              <button 
                onClick={() => {
                  setChangePasswordModalOpen(false);
                  setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  setPasswordError('');
                }} 
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>
            
            {passwordError && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                {passwordError}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter current password"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter new password (min 6 characters)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Confirm new password"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleChangePassword}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                Change Password
              </button>
              <button
                onClick={() => {
                  setChangePasswordModalOpen(false);
                  setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  setPasswordError('');
                }}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Student Modal */}
      {createStudentModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Create New Student</h3>
              <button 
                onClick={() => {
                  setCreateStudentModalOpen(false);
                  setNewStudent({ username: '', password: '', fullName: '', email: '' });
                  setCreateStudentError('');
                }} 
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>
            
            {createStudentError && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                {createStudentError}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={newStudent.fullName}
                  onChange={(e) => setNewStudent(prev => ({ ...prev, fullName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter full name"
                  autoComplete="name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  value={newStudent.username}
                  onChange={(e) => setNewStudent(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter username"
                  autoComplete="username"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newStudent.email}
                  onChange={(e) => setNewStudent(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter email address"
                  autoComplete="email"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={newStudent.password}
                  onChange={(e) => setNewStudent(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter password (min 6 characters)"
                  autoComplete="new-password"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={createStudent}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
              >
                Create Student
              </button>
              <button
                onClick={() => {
                  setCreateStudentModalOpen(false);
                  setNewStudent({ username: '', password: '', fullName: '', email: '' });
                  setCreateStudentError('');
                }}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-sm font-medium"
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

function ReportingTab({ results, questions, exams, students, institution, onExportExcel, onExportWord }) {
  const [selectedReportType, setSelectedReportType] = useState('overview');
  const [dateRange, setDateRange] = useState('all');
  const [selectedExam, setSelectedExam] = useState('all');

  // Calculate key metrics
  const totalStudents = students.length;
  const totalExams = exams.length;
  const totalResults = results.length;
  const averageScore = totalResults > 0 ? Math.round(results.reduce((sum, r) => sum + r.percent, 0) / totalResults) : 0;
  const passRate = totalResults > 0 ? Math.round((results.filter(r => r.percent >= 60).length / totalResults) * 100) : 0;
  const highPerformers = totalResults > 0 ? Math.round((results.filter(r => r.percent >= 80).length / totalResults) * 100) : 0;

  // Filter data based on selections
  const filteredResults = results.filter(result => {
    if (dateRange !== 'all') {
      const days = parseInt(dateRange);
      const cutoffDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
      if (new Date(result.submittedAt) < cutoffDate) return false;
    }
    if (selectedExam !== 'all' && result.examTitle !== selectedExam) return false;
    return true;
  });

  const MetricCard = ({ title, value, subtitle, color = 'blue', icon }) => (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
        {icon && <div className="text-3xl text-gray-400">{icon}</div>}
      </div>
    </div>
  );

  const ReportSection = ({ title, children }) => (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reporting Dashboard</h2>
          <p className="text-gray-600">Comprehensive analytics and insights for {institution?.name || 'your institution'}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onExportExcel}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
          >
            📊 Export Excel
          </button>
          <button
            onClick={onExportWord}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            📄 Export Word
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
            <select
              value={selectedReportType}
              onChange={(e) => setSelectedReportType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="overview">Overview</option>
              <option value="performance">Performance Analysis</option>
              <option value="demographics">Student Demographics</option>
              <option value="exams">Exam Analysis</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Time</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Exam</label>
            <select
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Exams</option>
              {exams.map(exam => (
                <option key={exam.id} value={exam.title}>{exam.title}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Students"
          value={totalStudents}
          subtitle="Registered students"
          icon="👥"
          color="blue"
        />
        <MetricCard
          title="Total Exams"
          value={totalExams}
          subtitle="Available exams"
          icon="📋"
          color="green"
        />
        <MetricCard
          title="Average Score"
          value={`${averageScore}%`}
          subtitle="Overall performance"
          icon="📊"
          color="purple"
        />
        <MetricCard
          title="Pass Rate"
          value={`${passRate}%`}
          subtitle="Students ≥ 60%"
          icon="✅"
          color="green"
        />
      </div>

      {/* Report Content */}
      {selectedReportType === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ReportSection title="Performance Overview">
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">High Performers (≥80%)</span>
                <span className="text-lg font-semibold text-green-600">{highPerformers}%</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">Passing Students (≥60%)</span>
                <span className="text-lg font-semibold text-blue-600">{passRate}%</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">Total Exam Attempts</span>
                <span className="text-lg font-semibold text-gray-900">{filteredResults.length}</span>
              </div>
            </div>
          </ReportSection>

          <ReportSection title="Recent Activity">
            <div className="space-y-3">
              {filteredResults.slice(0, 5).map((result, index) => (
                <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{result.username}</p>
                    <p className="text-sm text-gray-600">{result.examTitle}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{result.percent}%</p>
                    <p className="text-sm text-gray-500">
                      {new Date(result.submittedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              {filteredResults.length === 0 && (
                <p className="text-gray-500 text-center py-4">No recent activity</p>
              )}
            </div>
          </ReportSection>
        </div>
      )}

      {selectedReportType === 'performance' && (
        <ReportSection title="Performance Analysis">
          <DataAnalytics 
            results={filteredResults}
            questions={questions}
            exams={exams}
            students={students}
            institution={institution}
          />
        </ReportSection>
      )}

      {selectedReportType === 'demographics' && (
        <ReportSection title="Student Demographics">
          <DataAnalytics 
            results={filteredResults}
            questions={questions}
            exams={exams}
            students={students}
            institution={institution}
          />
        </ReportSection>
      )}

      {selectedReportType === 'exams' && (
        <ReportSection title="Exam Analysis">
          <div className="space-y-4">
            {exams.map(exam => {
              const examResults = filteredResults.filter(r => r.examTitle === exam.title);
              const examAvg = examResults.length > 0 
                ? Math.round(examResults.reduce((sum, r) => sum + r.percent, 0) / examResults.length)
                : 0;
              const examPassRate = examResults.length > 0
                ? Math.round((examResults.filter(r => r.percent >= 60).length / examResults.length) * 100)
                : 0;

              return (
                <div key={exam.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-lg">{exam.title}</h4>
                    <span className="text-sm text-gray-500">{examResults.length} attempts</span>
                  </div>
                  <p className="text-gray-600 mb-3">{exam.description}</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{examAvg}%</p>
                      <p className="text-sm text-blue-800">Average Score</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{examPassRate}%</p>
                      <p className="text-sm text-green-800">Pass Rate</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ReportSection>
      )}

      {/* Export Options */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExportOptions 
          results={filteredResults}
          questions={questions}
          exams={exams}
          institution={institution}
        />
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button
              onClick={onExportExcel}
              className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              📊 Export Current View to Excel
            </button>
            <button
              onClick={onExportWord}
              className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              📄 Export Current View to Word
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Modal Components
function CreateExamModal({ onClose, onCreate }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    duration: 60,
    questionCount: 12,
    startDate: "",
    endDate: ""
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    onCreate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md mx-4 w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Create New Exam</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Exam Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="e.g., Midterm Exam - Biology 101"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Brief description of the exam"
              rows="3"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value)})}
                className="w-full border rounded-lg px-3 py-2"
                min="15"
                max="300"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Question Count</label>
              <input
                type="number"
                value={formData.questionCount}
                onChange={(e) => setFormData({...formData, questionCount: parseInt(e.target.value)})}
                className="w-full border rounded-lg px-3 py-2"
                min="1"
                max="100"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date/Time</label>
              <input
                type="datetime-local"
                value={formData.startDate}
                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date/Time</label>
              <input
                type="datetime-local"
                value={formData.endDate}
                onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>
          
          <div className="flex gap-2 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Create Exam
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditExamModal({ exam, onClose, onUpdate }) {
  const [formData, setFormData] = useState({
    title: exam.title,
    description: exam.description,
    duration: exam.duration,
    questionCount: exam.questionCount,
    startDate: exam.startDate || "",
    endDate: exam.endDate || ""
  });

  const clearSchedule = () => {
    setFormData({ ...formData, startDate: "", endDate: "" });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    onUpdate({...exam, ...formData});
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md mx-4 w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Edit Exam</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Exam Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
              rows="3"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value)})}
                className="w-full border rounded-lg px-3 py-2"
                min="15"
                max="300"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Question Count</label>
              <input
                type="number"
                value={formData.questionCount}
                onChange={(e) => setFormData({...formData, questionCount: parseInt(e.target.value)})}
                className="w-full border rounded-lg px-3 py-2"
                min="1"
                max="100"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date/Time</label>
              <input
                type="datetime-local"
                value={formData.startDate}
                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date/Time</label>
              <input
                type="datetime-local"
                value={formData.endDate}
                onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>
          <div className="flex justify-between items-center">
            <button type="button" onClick={clearSchedule} className="text-sm text-gray-600 hover:text-gray-800">Clear schedule</button>
          </div>
          
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Update Exam
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Utility Functions
function saveQuestionsForExam(examId, questions) {
  localStorage.setItem(`cbt_questions_${examId}`, JSON.stringify(questions));
}

function parseQuestionsFromMarkdown(md) {
  const text = md.replace(/\r/g, "").trim();
  const questions = [];
  
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let currentQuestion = null;
  let currentOptions = [];
  let currentAnswer = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    const questionPatterns = [
      /^(\d+)\s*[.)]?\s*(.+)$/,
      /^[Qq](\d*)\s*[.)]?\s*(.+)$/,
      /^Question\s*(\d+)\s*[.:-]?\s*(.+)$/i,
    ];
    
    let questionMatch = null;
    for (const pattern of questionPatterns) {
      questionMatch = line.match(pattern);
      if (questionMatch) break;
    }
    
    if (questionMatch) {
      if (currentQuestion && currentOptions.length === 4 && currentAnswer !== null) {
        const question = createQuestionObject(currentQuestion, currentOptions, currentAnswer);
        if (question) questions.push(question);
      }
      
      currentQuestion = questionMatch[2] || questionMatch[1];
      currentOptions = [];
      currentAnswer = null;
      continue;
    }
    
    const answerPatterns = [
      /^[Aa]nswer\s*[:-]?\s*([A-Da-d1-4])/i,
      /^[Cc]orrect\s*[:-]?\s*([A-Da-d1-4])/i,
      /^\s*([A-Da-d1-4])\s*$/,
    ];
    
    let answerMatch = null;
    for (const pattern of answerPatterns) {
      answerMatch = line.match(pattern);
      if (answerMatch) break;
    }
    
    if (answerMatch && currentQuestion) {
      currentAnswer = answerMatch[1].toUpperCase();
      if (currentOptions.length === 4) {
        const question = createQuestionObject(currentQuestion, currentOptions, currentAnswer);
        if (question) questions.push(question);
        currentQuestion = null;
        currentOptions = [];
        currentAnswer = null;
      }
      continue;
    }
    
    const optionPatterns = [
      /^([A-Da-d])\s*[.)]?\s*(.+)$/,
      /^([1-4])\s*[.)]?\s*(.+)$/,
    ];
    
    let optionMatch = null;
    for (const pattern of optionPatterns) {
      optionMatch = line.match(pattern);
      if (optionMatch) break;
    }
    
    if (optionMatch && currentQuestion && currentOptions.length < 4) {
      let optionLetter = optionMatch[1].toUpperCase();
      const optionText = optionMatch[2].trim();
      
      if (optionLetter === '1') optionLetter = 'A';
      else if (optionLetter === '2') optionLetter = 'B';
      else if (optionLetter === '3') optionLetter = 'C';
      else if (optionLetter === '4') optionLetter = 'D';
      
      currentOptions.push({ letter: optionLetter, text: optionText });
      
      if (currentOptions.length === 4 && currentAnswer) {
        const question = createQuestionObject(currentQuestion, currentOptions, currentAnswer);
        if (question) questions.push(question);
        currentQuestion = null;
        currentOptions = [];
        currentAnswer = null;
      }
      continue;
    }
  }
  
  if (currentQuestion && currentOptions.length === 4 && currentAnswer !== null) {
    const question = createQuestionObject(currentQuestion, currentOptions, currentAnswer);
    if (question) questions.push(question);
  }
  
  return questions;
}

function createQuestionObject(questionText, options, correctAnswer) {
  if (!questionText || options.length !== 4 || !correctAnswer) return null;
  
  const answerIndex = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 }[correctAnswer];
  if (answerIndex === undefined) return null;
  
  const sortedOptions = ['A', 'B', 'C', 'D'].map(letter => {
    const option = options.find(opt => opt.letter === letter);
    return option ? option.text : '';
  });
  
  if (sortedOptions.some(opt => !opt)) return null;
  
  return {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2),
    text: questionText.trim(),
    options: sortedOptions,
    correctIndex: answerIndex
  };
}

async function parseQuestionsFromExcel(file) {
  try {
    console.log('🔍 Starting Excel import for file:', file.name);
    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    
    // Get all worksheet names for debugging
    const worksheetNames = workbook.worksheets.map(ws => ws.name);
    console.log('📋 Available worksheets:', worksheetNames);
    
    // Try to find the right worksheet - check multiple possibilities
    let worksheet = null;
    const possibleNames = ['Questions', 'Sheet1', 'Sheet2', 'Sheet3', 'Questions Sheet', 'Exam Questions'];
    
    for (const name of possibleNames) {
      worksheet = workbook.getWorksheet(name);
      if (worksheet) {
        console.log('✅ Found worksheet:', name);
        break;
      }
    }
    
    // If no specific worksheet found, use the first one
    if (!worksheet) {
      worksheet = workbook.getWorksheet(1);
      if (worksheet) {
        console.log('✅ Using first worksheet:', worksheet.name);
      }
    }
    
    if (!worksheet) {
      throw new Error('No worksheet found in Excel file');
    }
    
    console.log('📊 Worksheet info:', {
      name: worksheet.name,
      rowCount: worksheet.rowCount,
      columnCount: worksheet.columnCount
    });
    
    const questions = [];
    let startRow = 1;
    
    // Check if first row is a header
    const firstRow = worksheet.getRow(1);
    const firstCellValue = firstRow.getCell(1).value?.toString().toLowerCase() || '';
    if (firstCellValue.includes('question') || firstCellValue.includes('option')) {
      startRow = 2;
      console.log('📝 Detected header row, starting from row 2');
    }
    
    // Process each row
    for (let rowNumber = startRow; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      
      // Get cell values
      const questionText = row.getCell(1).value?.toString().trim();
      const optionA = row.getCell(2).value?.toString().trim();
      const optionB = row.getCell(3).value?.toString().trim();
      const optionC = row.getCell(4).value?.toString().trim();
      const optionD = row.getCell(5).value?.toString().trim();
      const correctAnswer = row.getCell(6).value?.toString().trim();
      
      console.log(`🔍 Row ${rowNumber}:`, {
        question: questionText?.substring(0, 50) + '...',
        optionA: optionA?.substring(0, 20) + '...',
        optionB: optionB?.substring(0, 20) + '...',
        optionC: optionC?.substring(0, 20) + '...',
        optionD: optionD?.substring(0, 20) + '...',
        answer: correctAnswer
      });
      
      // Skip empty rows
      if (!questionText || questionText.length < 10) {
        console.log(`⏭️ Skipping row ${rowNumber} - no question text`);
        continue;
      }

      // Check if we have all required fields
      if (!optionA || !optionB || !optionC || !optionD || !correctAnswer) {
        console.log(`⏭️ Skipping row ${rowNumber} - missing options or answer`);
        continue;
      }
      
      // Convert answer to index (A=0, B=1, C=2, D=3)
      const answerIndex = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 }[correctAnswer.toUpperCase()];
      if (answerIndex === undefined) {
        console.log(`⏭️ Skipping row ${rowNumber} - invalid answer: ${correctAnswer}`);
        continue;
      }
      
      // Create question object
      const question = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        text: questionText,
        options: [optionA, optionB, optionC, optionD],
        correctIndex: answerIndex
      };
      
      questions.push(question);
      console.log(`✅ Added question ${questions.length}: ${questionText.substring(0, 50)}...`);
    }
    
    console.log(`🎉 Successfully parsed ${questions.length} questions from Excel file`);
    
    if (questions.length === 0) {
      throw new Error('No valid questions found in Excel file. Please check the format:\n' +
        'Column A: Question text\n' +
        'Column B: Option A\n' +
        'Column C: Option B\n' +
        'Column D: Option C\n' +
        'Column E: Option D\n' +
        'Column F: Correct Answer (A, B, C, or D)');
    }
    
    return questions;
  } catch (error) {
    console.error('❌ Error parsing Excel file:', error);
    throw new Error(`Failed to parse Excel file: ${error.message}`);
  }
}

export default CBTAdminPanel;
