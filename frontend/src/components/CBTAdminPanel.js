import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell } from 'docx';
import mammoth from 'mammoth';
import dataService from '../services/dataService';

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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
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

  const loadExams = async () => {
    try {
      const data = await dataService.loadExams();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error loading exams:', error);
      return [];
    }
  };

  const saveExams = async (examsData) => {
    try {
      return await dataService.saveExams(examsData);
    } catch (error) {
      console.error('Error saving exams:', error);
      return false;
    }
  };

  const loadQuestions = async () => {
    try {
      const data = await dataService.loadQuestions();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error loading questions:', error);
      return [];
    }
  };

  const loadResults = async () => {
    try {
      const data = await dataService.loadResults();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error loading results:', error);
      return [];
    }
  };

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
      setActiveTab("questions");
    } catch (error) {
      console.error('Error creating exam:', error);
    }
  };

  const handleActivateExam = async (examId) => {
    try {
      const updatedExams = exams.map(exam => 
        exam.id === examId ? { ...exam, isActive: !exam.isActive } : exam
      );
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
            { id: "exams", label: "📋 Exam Management", icon: "📋" },
            { id: "questions", label: "❓ Questions", icon: "❓" },
            { id: "results", label: "📊 Results", icon: "📊" },
            { id: "students", label: "👥 Students", icon: "👥" },
            { id: "settings", label: "⚙️ Settings", icon: "⚙️" }
          ].map(tab => (
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
          />
        )}

        {activeTab === "results" && (
          <ResultsTab 
            results={results}
            onExportExcel={exportResultsToExcel}
            onExportWord={exportResultsToWord}
            onBackToExams={() => setActiveTab("exams")}
          />
        )}

        {activeTab === "students" && (
          <StudentsTab 
            onBackToExams={() => setActiveTab("exams")}
            institution={institution}
          />
        )}

        {activeTab === "settings" && (
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
function ExamsTab({ exams, onCreateExam, onActivateExam, onDeleteExam, onSelectExam, selectedExam, onEditExam }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Available Exams</h3>
          <p className="text-sm text-gray-600">Create and manage exam events for students</p>
        </div>
        <button
          onClick={onCreateExam}
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionsTab({ selectedExam, questions, setQuestions, onFileUpload, importError, onBackToExams, institution }) {
  if (!selectedExam) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Please select an exam from the Exam Management tab to manage its questions.</p>
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
          <p className="text-sm text-gray-600">Upload and manage exam questions</p>
        </div>
        <button
          onClick={onBackToExams}
          className="px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 text-sm"
        >
          ← Back to Exams
        </button>
      </div>

      <div className="bg-white rounded-xl border p-6">
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

      <div className="bg-white rounded-xl border p-6">
        <h4 className="font-semibold mb-4">Current Questions ({questions.length})</h4>
        {questions.length === 0 ? (
          <p className="text-gray-500">No questions uploaded yet. Upload a file to get started.</p>
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

function ResultsTab({ results, onExportExcel, onExportWord, onBackToExams }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Exam Results</h3>
        <div className="flex gap-2">
          <button onClick={onExportExcel} className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700">
            Export to Excel
          </button>
          <button onClick={onExportWord} className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700">
            Export to Word
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exam</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percent</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {results.map((result, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{result.username}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{result.examTitle}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{result.score}/{result.total}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{result.percent}%</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(result.submittedAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {results.length === 0 && (
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

function StudentsTab({ onBackToExams, institution }) {
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
      
      <div className="bg-white rounded-xl border p-6">
        <p className="text-gray-600">Student management features will be implemented here.</p>
        <p className="text-sm text-gray-500 mt-2">This will include viewing registered students, managing accounts, and tracking student progress.</p>
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
    questionCount: 12
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
    questionCount: exam.questionCount
  });

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
          
          <div className="flex gap-2 pt-4">
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
