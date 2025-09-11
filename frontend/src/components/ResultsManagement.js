import React, { useState, useEffect } from 'react';
import firebaseDataService from '../firebase/dataService';

const ResultsManagement = ({ institution, onStatsUpdate }) => {
  const [results, setResults] = useState([]);
  const [exams, setExams] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [showDetails, setShowDetails] = useState(null);
  const [finalizeTarget, setFinalizeTarget] = useState(null);
  const [finalizeScore, setFinalizeScore] = useState('');
  const [finalizeNote, setFinalizeNote] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [resultsData, examsData, studentsData] = await Promise.all([
        firebaseDataService.getInstitutionResults(institution.id),
        firebaseDataService.getInstitutionExams(institution.id),
        firebaseDataService.getInstitutionUsers(institution.id)
      ]);
      
      console.log('🔍 ResultsManagement: Loaded results:', resultsData);
      console.log('🔍 ResultsManagement: Loaded students:', studentsData);
      
      // Log detailed results structure
      resultsData.forEach((result, index) => {
        console.log(`🔍 Result ${index}:`, {
          id: result.id,
          studentId: result.studentId,
          userId: result.userId,
          studentName: result.studentName,
          examId: result.examId,
          examTitle: result.examTitle
        });
      });
      
      // Log detailed students structure
      studentsData.forEach((student, index) => {
        console.log(`🔍 Student ${index}:`, {
          id: student.id,
          studentId: student.studentId,
          userId: student.userId,
          username: student.username,
          fullName: student.fullName,
          email: student.email
        });
      });
      
      setResults(resultsData);
      setExams(examsData);
      setStudents(studentsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredResults = results.filter(result => {
    const examMatch = !selectedExam || result.examId === selectedExam;
    const studentMatch = !selectedStudent || result.studentId === selectedStudent;
    return examMatch && studentMatch;
  });

  const getGradeColor = (percentage) => {
    if (percentage >= 70) return 'text-green-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getGradeLabel = (percentage) => {
    if (percentage >= 70) return 'A';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
  };

  const getStatusBadge = (status) => {
    const colors = {
      completed: 'bg-green-100 text-green-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      abandoned: 'bg-red-100 text-red-800',
      pending_review: 'bg-yellow-100 text-yellow-800',
      provisional: 'bg-blue-100 text-blue-800'
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status?.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

    const getStudentName = (studentId) => {
      console.log('🔍 Looking for student with ID:', studentId);
      console.log('🔍 Available students:', students.map(s => ({
        id: s.id,
        fullName: s.fullName,
        username: s.username,
        studentId: s.studentId,
        userId: s.userId
      })));

      // Try multiple matching strategies
      let student = students.find(s =>
        s.id === studentId ||
        s.userId === studentId ||
        s.username === studentId ||
        s.studentId === studentId
      );

      // If no direct match, try matching by studentName from results
      if (!student) {
        console.log('🔍 No direct ID match, trying to find by result data...');
        // Get the result that contains this studentId
        const result = results.find(r => r.studentId === studentId);
        if (result && result.studentName) {
          console.log('🔍 Looking for student with name:', result.studentName);
          // Try matching by fullName or username (case insensitive)
          student = students.find(s => 
            (s.fullName && s.fullName.toLowerCase() === result.studentName.toLowerCase()) ||
            (s.username && s.username.toLowerCase() === result.studentName.toLowerCase())
          );
        }
      }

      if (student) {
        console.log('✅ Found student:', student);
        return student.fullName || student.username || 'Unknown Name';
      } else {
        console.log('❌ Student not found for ID:', studentId);
        return `Unknown Student (ID: ${studentId})`;
      }
    };

  const getExamTitle = (examId) => {
    const exam = exams.find(e => e.id === examId);
    return exam ? exam.title : 'Unknown Exam';
  };

  const getPercent = (r) => {
    if (typeof r.percentage === 'number') return r.percentage;
    if (typeof r.score === 'number' && (r.totalQuestions === undefined || r.score <= 100)) return r.score;
    return null;
  };

  const finalizeResult = async () => {
    if (!finalizeTarget) return;
    const parsed = parseInt(finalizeScore, 10);
    if (isNaN(parsed) || parsed < 0 || parsed > 100) {
      alert('Enter a valid percentage between 0 and 100');
      return;
    }
    try {
      setLoading(true);
      await firebaseDataService.updateResult(finalizeTarget.id, {
        percentage: parsed,
        score: parsed,
        status: 'completed',
        finalized: true,
        finalizedAt: new Date().toISOString(),
        finalizeNote: finalizeNote || ''
      });
      setFinalizeTarget(null);
      setFinalizeScore('');
      setFinalizeNote('');
      await loadData();
      onStatsUpdate && onStatsUpdate();
    } catch (e) {
      console.error('Error finalizing result:', e);
      alert('Failed to finalize result.');
    } finally {
      setLoading(false);
    }
  };

  const exportResults = () => {
    const csvContent = [
      ['Student Name', 'Exam', 'Score', 'Percentage', 'Grade', 'Status', 'Date'],
      ...filteredResults.map(result => [
        getStudentName(result.studentId),
        getExamTitle(result.examId),
        result.score,
        result.percentage,
        getGradeLabel(result.percentage),
        result.status,
        new Date(result.completedAt).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exam-results-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getAnalytics = () => {
    const total = filteredResults.length;
    const passed = filteredResults.filter(r => r.percentage >= 50).length;
    const average = total > 0 ? filteredResults.reduce((sum, r) => sum + r.percentage, 0) / total : 0;
    
    return { total, passed, average: Math.round(average * 100) / 100 };
  };

  const analytics = getAnalytics();

  // Ensure we load full result details if needed before showing modal
  const openDetails = async (result) => {
    try {
      // If result already appears detailed, just show it
      if (result && (result.answers || result.totalQuestions || result.percentage !== undefined)) {
        setShowDetails(result);
        return;
      }
      // Try to fetch full result by id from backend
      if (result && result.id && typeof firebaseDataService.getResultById === 'function') {
        setLoading(true);
        const full = await firebaseDataService.getResultById(result.id);
        setShowDetails(full || result);
      } else {
        setShowDetails(result);
      }
    } catch (e) {
      console.error('Error loading result details:', e);
      setShowDetails(result);
    } finally {
      setLoading(false);
    }
  };

  const normalizeAnswers = (answers) => {
    if (!answers) return [];
    if (Array.isArray(answers)) return answers;
    if (typeof answers === 'string') {
      try {
        const parsed = JSON.parse(answers);
        return Array.isArray(parsed) ? parsed : [];
      } catch (_) {
        return [];
      }
    }
    if (typeof answers === 'object') {
      try {
        const values = Object.values(answers);
        return values.map((entry) => (
          typeof entry === 'object' && entry !== null
            ? entry
            : { selectedAnswer: String(entry) }
        ));
      } catch (_) {
        return [];
      }
    }
    return [];
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Results Management</h2>
        <button
          onClick={exportResults}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
        >
          Export Results
        </button>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Attempts</p>
              <p className="text-2xl font-semibold text-gray-900">{analytics.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Passed</p>
              <p className="text-2xl font-semibold text-gray-900">{analytics.passed}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Average Score</p>
              <p className="text-2xl font-semibold text-gray-900">{analytics.average}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Exam
            </label>
            <select
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Exams</option>
              {exams.map(exam => (
                <option key={exam.id} value={exam.id}>{exam.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Student
            </label>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Students</option>
              {students.map(student => (
                <option key={student.id} value={student.id}>{student.fullName}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Exam
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Grade
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredResults.map((result) => (
              <tr key={result.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {getStudentName(result.studentId)}
                  </div>
                  <div className="text-xs text-gray-500">
                    ID: {result.studentId || result.userId || 'N/A'}
                  </div>
                  {(() => {
                    // Use the same matching logic as getStudentName
                    let student = students.find(s =>
                      s.id === result.studentId ||
                      s.userId === result.studentId ||
                      s.username === result.studentId ||
                      s.studentId === result.studentId
                    );

                    // If no direct match, try matching by studentName
                    if (!student) {
                      const resultData = results.find(r => r.studentId === result.studentId);
                      if (resultData && resultData.studentName) {
                        student = students.find(s => 
                          (s.fullName && s.fullName.toLowerCase() === resultData.studentName.toLowerCase()) ||
                          (s.username && s.username.toLowerCase() === resultData.studentName.toLowerCase())
                        );
                      }
                    }

                    return student ? (
                      <div className="text-xs text-gray-500">
                        Username: {student.username}
                      </div>
                    ) : null;
                  })()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {getExamTitle(result.examId)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {getPercent(result) !== null ? `${getPercent(result)}%` : (result.totalQuestions ? `${result.score} / ${result.totalQuestions}` : '-')}
                    {result.status === 'provisional' && (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700">Provisional</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className={`text-sm font-medium ${getGradeColor(getPercent(result) ?? 0)}`}>
                    {getPercent(result) !== null ? `${getPercent(result)}% (${getGradeLabel(getPercent(result))})` : '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(result.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(result.completedAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => openDetails(result)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    View Details
                  </button>
                  {(result.status === 'pending_review' || result.status === 'provisional') && (
                    <button
                      onClick={() => {
                        setFinalizeTarget(result);
                        setFinalizeScore(String(getPercent(result) ?? ''));
                      }}
                      className="ml-3 text-green-600 hover:text-green-800"
                    >
                      Finalize
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Result Details Modal */}
      {showDetails && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Result Details</h3>
                <button
                  onClick={() => setShowDetails(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Student</label>
                    <p className="text-sm text-gray-900">{getStudentName(showDetails.studentId)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Exam</label>
                    <p className="text-sm text-gray-900">{getExamTitle(showDetails.examId)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Score</label>
                    <p className="text-sm text-gray-900">
                      {typeof showDetails.score === 'number' ? showDetails.score : '-'}
                      {showDetails.totalQuestions ? ` / ${showDetails.totalQuestions}` : ''}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Percentage</label>
                    <p className={`text-sm font-medium ${getGradeColor(getPercent(showDetails) ?? 0)}`}>
                      {getPercent(showDetails) !== null ? `${getPercent(showDetails)}%` : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Grade</label>
                    <p className={`text-sm font-medium ${getGradeColor(getPercent(showDetails) ?? 0)}`}>
                      {getPercent(showDetails) !== null ? getGradeLabel(getPercent(showDetails)) : '-'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <div className="mt-1">{getStatusBadge(showDetails.status)}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Completed At</label>
                    <p className="text-sm text-gray-900">
                      {new Date(showDetails.completedAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {showDetails.timeSpent && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Time Spent</label>
                    <p className="text-sm text-gray-900">{showDetails.timeSpent} minutes</p>
                  </div>
                )}

                {normalizeAnswers(showDetails.answers).length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Answers</label>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {normalizeAnswers(showDetails.answers).map((answer, index) => (
                        <div key={index} className="p-3 border rounded-md">
                          <div className="text-sm font-medium text-gray-900">
                            Question {index + 1}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            Answer: {answer.selectedAnswer || 'No answer'}
                          </div>
                          {answer.isCorrect !== undefined && (
                            <div className={`text-xs mt-1 ${answer.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                              {answer.isCorrect ? 'Correct' : 'Incorrect'}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setShowDetails(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsManagement;

