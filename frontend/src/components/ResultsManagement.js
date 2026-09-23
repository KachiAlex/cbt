import React, { useState, useEffect, useMemo } from 'react';
import dataService from '../services/dataService';
import { formatResultDate } from '../utils/resultDate';

const ResultsManagement = ({ institution, onStatsUpdate }) => {
  const [results, setResults] = useState([]);
  const [exams, setExams] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [filters, setFilters] = useState({
    department: '',
    level: '',
    studentId: ''
  });
  const [showDetails, setShowDetails] = useState(null);
  const [finalizeTarget, setFinalizeTarget] = useState(null);
  const [finalizeScore, setFinalizeScore] = useState('');
  const [finalizeNote, setFinalizeNote] = useState('');
  const [selectedResults, setSelectedResults] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [resultsData, examsData, studentsData] = await Promise.all([
        dataService.getInstitutionResults(institution.id),
        dataService.getInstitutionExams(institution.id),
        dataService.getInstitutionUsers(institution.id)
      ]);
      
      setResults(resultsData);
      setExams(examsData);
      setStudents(studentsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const studentsByIdentifier = useMemo(() => {
    const byIdentifier = new Map();
    students.forEach(student => {
      [student.id, student.userId, student.username, student.studentId, student.email, student.fullName]
        .filter(Boolean)
        .forEach(value => {
          const key = String(value).toLowerCase();
          if (!byIdentifier.has(key)) byIdentifier.set(key, student);
        });
    });
    return byIdentifier;
  }, [students]);
  const examsById = useMemo(() => new Map(exams.map(exam => [exam.id, exam])), [exams]);
  const uniqueDepartments = useMemo(
    () => [...new Set(students.map(student => student.department).filter(Boolean))].sort(),
    [students]
  );

  const filteredResults = useMemo(() => results.filter(result => {
    const examMatch = !selectedExam || result.examId === selectedExam;
    const studentMatch = !selectedStudent || result.studentId === selectedStudent ||
      result.userId === selectedStudent || result.studentName === selectedStudent;
    const student = [result.userId, result.studentId, result.username, result.studentName]
      .map(value => value && studentsByIdentifier.get(String(value).toLowerCase()))
      .find(Boolean);

    if (filters.department && student?.department !== filters.department) return false;
    if (filters.level && student?.level !== filters.level) return false;
    if (filters.studentId) {
      const needle = filters.studentId.toLowerCase();
      const studentIdMatch = String(student?.studentId || '').toLowerCase().includes(needle);
      const resultIdMatch = String(result.studentId || '').toLowerCase().includes(needle);
      if (!studentIdMatch && !resultIdMatch) return false;
    }
    return examMatch && studentMatch;
  }), [results, selectedExam, selectedStudent, filters, studentsByIdentifier]);

  const findStudentForResult = (result) => [result?.userId, result?.studentId, result?.username, result?.studentName]
    .map(value => value && studentsByIdentifier.get(String(value).toLowerCase()))
    .find(Boolean);
  const getStudentName = (result) => {
    const student = findStudentForResult(result);
    return student?.fullName || student?.username || result?.studentName || `Unknown Student (ID: ${result?.studentId || result?.userId || 'N/A'})`;
  };
  const getStudentUsername = (result) => findStudentForResult(result)?.username || result?.studentName || 'Unknown';
  const getExamTitle = (examId) => examsById.get(examId)?.title || 'Unknown Exam';

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



  const getPercent = (r) => {
    // Debug logging for problematic calculations
    if (r.percentage !== undefined && (!Number.isFinite(Number(r.percentage)) || Number(r.percentage) < 0 || Number(r.percentage) > 100)) {
      console.warn('Invalid result percentage:', r.id);
    }
    // Prioritize percentage field if available and valid (0-100)
    if (typeof r.percentage === 'number' && r.percentage >= 0 && r.percentage <= 100) {
      return r.percentage;
    }
    
    // If score appears to be a percentage (0-100) and no totalQuestions, use it
    if (typeof r.score === 'number' && r.score >= 0 && r.score <= 100 && !r.totalQuestions) {
      return r.score;
    }
    
    // If score is a raw count and we have totalQuestions, calculate percentage
    if (typeof r.score === 'number' && typeof r.totalQuestions === 'number' && r.totalQuestions > 0 && r.score <= r.totalQuestions) {
      return Math.round((r.score / r.totalQuestions) * 100);
    }
    
    // If we have correctAnswers and totalQuestions, calculate percentage
    if (typeof r.correctAnswers === 'number' && typeof r.totalQuestions === 'number' && r.totalQuestions > 0) {
      return Math.round((r.correctAnswers / r.totalQuestions) * 100);
    }
    
    // If score is greater than 100, it might be a percentage stored incorrectly
    if (typeof r.score === 'number' && r.score > 100 && r.score <= 10000) {
      // Assume it's a percentage (e.g., 70 instead of 0.7)
      return Math.min(100, r.score);
    }
    
    return null;
  };

  const getScoreFormat = (result) => {
    const percentage = getPercent(result);
    if (result.maxScore === null) return percentage !== null ? `${percentage}%` : '-';
    
    // Determine the correct score (number of correct answers)
    let correctScore = 0;
    
    // Prioritize correctAnswers field (most reliable)
    if (result.correctAnswers !== undefined) {
      correctScore = result.correctAnswers;
    } 
    // If score is a raw count (should be <= totalQuestions)
    else if (result.score !== undefined && result.totalQuestions && result.score <= result.totalQuestions) {
      correctScore = result.score;
    }
    // If score appears to be a percentage (> 100), calculate correct answers
    else if (result.score !== undefined && result.totalQuestions && result.score > 100) {
      // This is a percentage, calculate correct answers
      correctScore = Math.round((result.score / 100) * result.totalQuestions);
    }
    // If we have percentage and totalQuestions, calculate correct answers
    else if (percentage !== null && result.totalQuestions) {
      correctScore = Math.round((percentage / 100) * result.totalQuestions);
    }
    
    // Get total questions
    const totalQuestions = result.totalQuestions || 0;
    
    if (totalQuestions > 0 && percentage !== null) {
      return `${correctScore}/${totalQuestions} (${percentage}%)`;
    } else if (totalQuestions > 0) {
      return `${correctScore}/${totalQuestions}`;
    } else if (percentage !== null) {
      return `${percentage}%`;
    }
    
    return '-';
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
      await dataService.updateResult(finalizeTarget.id, {
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

  const handleSelectResult = (resultId, isSelected) => {
    if (isSelected) {
      setSelectedResults(prev => [...prev, resultId]);
    } else {
      setSelectedResults(prev => prev.filter(id => id !== resultId));
    }
  };

  const handleSelectAll = (isSelected) => {
    if (isSelected) {
      setSelectedResults(filteredResults.map(result => result.id));
    } else {
      setSelectedResults([]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedResults.length === 0) return;
    
    try {
      setLoading(true);
      for (let i = 0; i < selectedResults.length; i += 500) {
        await dataService.deleteResults(selectedResults.slice(i, i + 500));
      }
      
      setSelectedResults([]);
      setShowDeleteConfirm(false);
      await loadData();
      onStatsUpdate && onStatsUpdate();
    } catch (error) {
      console.error('Error deleting results:', error);
      alert('Failed to delete some results. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
    setSelectedResults([]);
  };

  const clearFilters = () => {
    setSelectedExam('');
    setSelectedStudent('');
    setFilters({ department: '', level: '', studentId: '' });
    setSelectedResults([]);
  };

  const exportResults = () => {
    const csvCell = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csvContent = [
      ['Student Name', 'Exam', 'Score', 'Percentage', 'Grade', 'Status', 'Date'],
      ...filteredResults.map(result => {
        const percentage = getPercent(result);
        const scoreFormat = getScoreFormat(result);
        
        return [
          getStudentName(result),
          getExamTitle(result.examId),
          scoreFormat,
          percentage !== null ? `${percentage}%` : '-',
          percentage !== null ? getGradeLabel(percentage) : '-',
          result.status,
          formatResultDate(result)
        ];
      })
    ].map(row => row.map(csvCell).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exam-results-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const analytics = useMemo(() => {
    const percentages = filteredResults.map(getPercent).filter(value => value !== null);
    const passed = percentages.filter(value => value >= 50).length;
    const average = percentages.length
      ? percentages.reduce((sum, value) => sum + value, 0) / percentages.length
      : 0;
    return { total: filteredResults.length, passed, average: Math.round(average * 100) / 100 };
  }, [filteredResults]);

  // Ensure we load full result details if needed before showing modal
  const openDetails = async (result) => {
    try {
      // If result already appears detailed, just show it
      if (result && result.answers !== undefined) {
        setShowDetails(result);
        return;
      }
      // Try to fetch full result by id from backend
      if (result && result.id && typeof dataService.getResultById === 'function') {
        setLoading(true);
        const full = await dataService.getResultById(result.id);
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
  const detailAnswers = useMemo(() => normalizeAnswers(showDetails?.answers), [showDetails]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Results Management</h2>
        <div className="flex space-x-3">
          {selectedResults.length > 0 && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
            >
              Delete Selected ({selectedResults.length})
            </button>
          )}
          <button
            onClick={exportResults}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
          >
            Export Results
          </button>
        </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Exam
            </label>
            <select
              value={selectedExam}
              onChange={(e) => {
                setSelectedExam(e.target.value);
                setSelectedResults([]);
              }}
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
              onChange={(e) => {
                setSelectedStudent(e.target.value);
                setSelectedResults([]);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Students</option>
              {students.map(student => (
                <option key={student.id} value={student.id}>
                  {student.fullName} ({student.username})
                </option>
              ))}
              {/* Add options for students found in results but not in students list */}
              {results
                .filter(result => !students.find(s => s.id === result.studentId || s.id === result.userId))
                .map(result => (
                  <option key={`result-${result.id}`} value={result.studentId || result.userId}>
                    {result.studentName} (from results)
                  </option>
                ))
                .filter((option, index, self) => 
                  index === self.findIndex(o => o.props.value === option.props.value)
                )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Department
            </label>
            <select
              value={filters.department}
              onChange={(e) => handleFilterChange('department', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Departments</option>
              {uniqueDepartments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Level
            </label>
            <select
              value={filters.level}
              onChange={(e) => handleFilterChange('level', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Levels</option>
              <option value="100">100 Level</option>
              <option value="200">200 Level</option>
              <option value="300">300 Level</option>
              <option value="400">400 Level</option>
              <option value="500">500 Level</option>
              <option value="Postgraduate">Postgraduate</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Student ID
            </label>
            <input
              type="text"
              value={filters.studentId}
              onChange={(e) => handleFilterChange('studentId', e.target.value)}
              placeholder="Search by Student ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredResults.length} of {results.length} results
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={filteredResults.length > 0 && selectedResults.length === filteredResults.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
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
              <tr key={result.id} className={selectedResults.includes(result.id) ? 'bg-blue-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedResults.includes(result.id)}
                    onChange={(e) => handleSelectResult(result.id, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {getStudentName(result)}
                  </div>
                  <div className="text-xs text-gray-500">
                    ID: {result.studentId || result.userId || 'N/A'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {getStudentUsername(result)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {getExamTitle(result.examId)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {getScoreFormat(result)}
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
                  {formatResultDate(result)}
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
                    <p className="text-sm text-gray-900">{getStudentName(showDetails)}</p>
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
                      {getScoreFormat(showDetails)}
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
                      {formatResultDate(showDetails, true)}
                    </p>
                  </div>
                </div>

                {showDetails.timeSpent !== undefined && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Time Spent</label>
                    <p className="text-sm text-gray-900">
                      {showDetails.timeSpent} minutes
                      {showDetails.timeSpent < 1 && ' (< 1 minute)'}
                    </p>
                  </div>
                )}

                {detailAnswers.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Answers</label>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {detailAnswers.map((answer, index) => (
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">Delete Results</h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete {selectedResults.length} selected result{selectedResults.length > 1 ? 's' : ''}? 
                  This action cannot be undone.
                </p>
              </div>
              <div className="mt-6 flex justify-center space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Deleting...' : 'Delete'}
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

