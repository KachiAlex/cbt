import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell } from 'docx';
import mammoth from 'mammoth';
import dataService from '../services/dataService';

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

const CBTAdminPanel = ({ user, institution, onLogout }) => {
  const [activeTab, setActiveTab] = useState("exams");
  const [exams, setExams] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [results, setResults] = useState([]);
  const [importError, setImportError] = useState("");
  const [showCreateExam, setShowCreateExam] = useState(false);
  const [showEditExam, setShowEditExam] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [loading, setLoading] = useState(true);



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

  const loadQuestions = React.useCallback(async () => {
    try {
      const data = await dataService.loadQuestions();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error loading questions:', error);
      return [];
    }
  }, []);

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
      } finally {
        setLoading(false);
      }
    };
    
    initializeData();
  }, [loadExams, loadQuestions, loadResults]);

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
        const parsed = await parseQuestionsFromExcel(file);
        if (parsed.length === 0) {
          throw new Error("No questions found. Please check the Excel format.");
        }
        
        setQuestions(parsed);
        if (selectedExam) {
          saveQuestionsForExam(selectedExam.id, parsed);
          updateExamQuestionCount(selectedExam.id, parsed.length);
        }
        setImportError(`Successfully imported ${parsed.length} questions!`);
        setTimeout(() => setImportError(""), 3000);
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
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(results.map(r => ({
      Username: r.username,
      'Exam Title': r.examTitle,
      Score: r.score,
      Total: r.total,
      Percent: r.percent,
      'Submitted At': new Date(r.submittedAt).toLocaleString(),
      Answers: r.answers.join(", ")
    })));
    
    XLSX.utils.book_append_sheet(workbook, worksheet, "Results");
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
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
        id: crypto.randomUUID(),
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
              <p className="text-gray-600">Manage exams, questions, and student results for {institution?.name}</p>
            </div>
            <div className="text-sm text-gray-500">
              Logged in as: <span className="font-medium">{user.fullName || user.username}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl mb-8">
          {[
            { id: "exams", label: "📋 Exam Management", icon: "📋", adminOnly: false },
            { id: "questions", label: "❓ Questions", icon: "❓", adminOnly: false },
            { id: "results", label: "📊 Results", icon: "📊", adminOnly: false },
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
function ExamsTab({ exams, onCreateExam, onActivateExam, onDeleteExam, onSelectExam, selectedExam, onEditExam, user }) {
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
              <div key={exam.id} className="border rounded-xl p-4 bg-white">
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
                  {isAdmin && (
                    <div className="flex gap-2">
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
                    </div>
                  )}
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
        <p>{isAdmin ? 'Please select an exam from the Exam Management tab to manage its questions.' : 'Please select an exam to view its questions.'}</p>
        <button
          onClick={onBackToExams}
          className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700"
        >
          ← Back to Exams
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold">Questions for {selectedExam.title}</h3>
          <p className="text-sm text-gray-600">{isAdmin ? 'Upload and manage exam questions' : 'Review exam questions'}</p>
        </div>
        <button
          onClick={onBackToExams}
          className="px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 text-sm"
        >
          ← Back to Exams
        </button>
      </div>

      {isAdmin && (
        <div className="bg-white rounded-xl border p-6">
          <div className="flex flex-wrap gap-2 mb-4">
            <button onClick={() => {
              const workbook = XLSX.utils.book_new();
              const rows = [['Question', 'A', 'B', 'C', 'D', 'Answer'], ['What is 2 + 2?', '3', '4', '5', '6', 'B']];
              const ws = XLSX.utils.aoa_to_sheet(rows);
              XLSX.utils.book_append_sheet(workbook, ws, 'Questions');
              const buf = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
              const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
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
              <div className={`mt-3 p-2 rounded-lg text-sm ${
                importError.includes('Successfully') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {importError}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border p-6">
        <h4 className="font-semibold mb-4">Current Questions ({questions.length})</h4>
        {questions.length === 0 ? (
          <p className="text-gray-500">{isAdmin ? 'No questions uploaded yet. Upload a file to get started.' : 'No questions available for this exam yet.'}</p>
        ) : (
          <div className="space-y-4">
            {questions.map((q, i) => (
              <div key={q.id} className="border rounded-lg p-4">
                <div className="flex items-start gap-2 mb-3">
                  <span className="text-sm font-bold bg-gray-100 px-2 py-1 rounded">{i + 1}</span>
                  <p className="flex-1">{q.text}</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-2 ml-6">
                  {q.options.map((opt, oi) => (
                    <div key={oi} className={`text-sm p-2 rounded ${
                      oi === q.correctIndex ? 'bg-green-100 text-green-700' : 'bg-gray-50'
                    }`}>
                      {String.fromCharCode(65 + oi)}. {opt}
                      {oi === q.correctIndex && <span className="ml-2 text-green-600">✓</span>}
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
  
  // Load actual registered students from localStorage or API
  const raw = localStorage.getItem('cbt_student_registrations_v1');
  const allStudents = raw ? JSON.parse(raw) : [];
  
  // Filter students by institution if needed
  const students = allStudents.filter(s => !institution?.slug || s.institutionSlug === institution.slug);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Student Management</h3>
        <button
          onClick={onBackToExams}
          className="px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 text-sm"
        >
          ← Back to Exams
        </button>
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
    </div>
  );
}

function SettingsTab({ onBackToExams, institution, user }) {
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
    id: crypto.randomUUID(),
    text: questionText.trim(),
    options: sortedOptions,
    correctIndex: answerIndex
  };
}

async function parseQuestionsFromExcel(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    const worksheetName = workbook.SheetNames[0];
    if (!worksheetName) throw new Error('No worksheet found in Excel file');
    
    const worksheet = workbook.Sheets[worksheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    const questions = [];
    
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || row.length < 6) continue;
      
      const questionText = String(row[0] || '').trim();
      const optionA = String(row[1] || '').trim();
      const optionB = String(row[2] || '').trim();
      const optionC = String(row[3] || '').trim();
      const optionD = String(row[4] || '').trim();
      const correctAnswer = String(row[5] || '').trim().toUpperCase();
      
      if (!questionText || !optionA || !optionB || !optionC || !optionD || !correctAnswer) continue;
      
      const answerIndex = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 }[correctAnswer];
      if (answerIndex === undefined) continue;
      
      questions.push({
        id: crypto.randomUUID(),
        text: questionText,
        options: [optionA, optionB, optionC, optionD],
        correctIndex: answerIndex
      });
    }
    
    return questions;
  } catch (error) {
    console.error('Error parsing Excel file:', error);
    throw new Error('Failed to parse Excel file. Please check the format.');
  }
}

export default CBTAdminPanel;
