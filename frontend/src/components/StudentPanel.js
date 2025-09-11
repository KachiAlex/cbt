import React, { useState, useEffect } from 'react';
import StudentExam from './StudentExam';
import EnhancedExam from './EnhancedExam';
import dataService from '../services/dataService';

const LS_KEYS = {
  QUESTIONS: "cbt_questions_v1",
  RESULTS: "cbt_results_v1",
  ACTIVE_EXAM: "cbt_active_exam_v1",
};

const StudentPanel = ({ user, tenant, onLogoClick, onAdminAccess }) => {
  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showExam, setShowExam] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load exams and results from Firebase
      const [examsData, resultsData] = await Promise.all([
        dataService.getExams(),
        dataService.getResultsByUser(user.id)
      ]);
      
      // Filter active exams
      const activeExams = examsData.filter(exam => exam.isActive);
      setExams(activeExams);
      setResults(resultsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const userResults = results.filter(r => r.userId === user.id);
  const availableExams = exams.filter(exam => 
    !userResults.some(result => result.examId === exam.id)
  );

  const startExam = (exam) => {
    setShowExam(true);
    // Store the selected exam for the exam interface
    localStorage.setItem('selected_exam', JSON.stringify(exam));
  };

  const backToDashboard = () => {
    setShowExam(false);
    loadData(); // Reload data to show new results
  };

  if (showExam) {
    return <EnhancedExam user={user} tenant={tenant} onComplete={backToDashboard} />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading student panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header with Logo Click */}
      <div className="bg-white border-b shadow-sm mb-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={onLogoClick}
              className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center cursor-pointer hover:scale-105 hover:bg-blue-700 transition-all"
              title="Click to switch to Admin Panel"
            >
              <span className="text-white font-bold text-lg">CBT</span>
            </button>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Student Portal</h1>
                <p className="text-sm text-gray-600">Computer-Based Testing System</p>
              </div>
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
              <span className="text-sm text-gray-600">Welcome, <b>{user.fullName || user.username}</b></span>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Student</span>
            </div>
        </div>
      </div>
      
      <div className="space-y-6">
        {/* Welcome Section */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Student Dashboard</h1>
        <p className="opacity-90">
          Welcome back, {user.fullName || user.username}! Ready to take your exams?
        </p>
        <p className="text-sm opacity-75 mt-1">
          Institution: {tenant?.name || 'Unknown Institution'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Available Exams</p>
              <p className="text-2xl font-semibold text-gray-900">{availableExams.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed Exams</p>
              <p className="text-2xl font-semibold text-gray-900">{userResults.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Average Score</p>
              <p className="text-2xl font-semibold text-gray-900">
                {userResults.length > 0 
                  ? Math.round(userResults.reduce((sum, r) => sum + (r.percent || 0), 0) / userResults.length)
                  : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Available Exams */}
      {availableExams.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Available Exams</h3>
          <div className="space-y-4">
            {availableExams.map((exam) => (
              <div key={exam.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-lg">{exam.title}</h4>
                    <p className="text-gray-600">{exam.questions?.length || 0} questions</p>
                    <p className="text-sm text-gray-500">
                      Duration: {exam.duration || 30} minutes
                    </p>
                  </div>
                  <button
                    onClick={() => startExam(exam)}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Start Exam
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Exams Available */}
      {availableExams.length === 0 && exams.length === 0 && (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-lg font-semibold mb-2">No Exams Available</h3>
          <p className="text-gray-600 mb-4">
            There are currently no active exams for you to take.
          </p>
          <p className="text-sm text-gray-500">
            Please check back later or contact your administrator.
          </p>
        </div>
      )}

      {/* Recent Results */}
      {userResults.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Results</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2 font-medium">Exam</th>
                  <th className="text-left p-2 font-medium">Score</th>
                  <th className="text-left p-2 font-medium">Percentage</th>
                  <th className="text-left p-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {userResults.slice(0, 5).map((result, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="p-2">{result.examTitle}</td>
                    <td className="p-2">{result.score}/{result.totalQuestions}</td>
                    <td className="p-2">{result.percentage || result.percent}%</td>
                    <td className="p-2">
                      {result.submittedAt ? new Date(result.submittedAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => availableExams.length > 0 && startExam(availableExams[0])}
            disabled={availableExams.length === 0}
            className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="text-center">
              <div className="text-3xl mb-2">🎯</div>
              <div className="font-medium">Take Exam</div>
              <div className="text-sm text-gray-500">
                {availableExams.length > 0 ? 'Start your exam now' : 'No exams available'}
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors"
          >
            <div className="text-center">
              <div className="text-3xl mb-2">👤</div>
              <div className="font-medium">View Profile</div>
              <div className="text-sm text-gray-500">Update your information</div>
            </div>
          </button>
        </div>
      </div>
      </div>
    </div>
  );
};

export default StudentPanel;
