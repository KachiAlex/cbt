import React, { useState, useEffect } from 'react';
import StudentExam from './StudentExam';
import EnhancedExam from './EnhancedExam';
import dataService from '../services/dataService';
import { migrateLocalStorageToFirebase, checkMigrationStatus, hasLocalStorageData } from '../utils/dataMigration';

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
  const [showMigrationPrompt, setShowMigrationPrompt] = useState(false);
  const [migrating, setMigrating] = useState(false);

  useEffect(() => {
    loadData();
    checkForMigration();
  }, []);

  const checkForMigration = () => {
    const migrationStatus = checkMigrationStatus();
    const hasLocalData = hasLocalStorageData();
    
    if (hasLocalData && !migrationStatus.completed) {
      setShowMigrationPrompt(true);
    }
  };

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

  const handleMigration = async () => {
    setMigrating(true);
    try {
      const result = await migrateLocalStorageToFirebase(user);
      if (result.success) {
        alert(`✅ Migration successful! Migrated ${result.migrated} exam results.`);
        setShowMigrationPrompt(false);
        loadData(); // Reload to show migrated data
      } else {
        alert(`❌ Migration failed: ${result.error}`);
      }
    } catch (error) {
      alert(`❌ Migration failed: ${error.message}`);
    } finally {
      setMigrating(false);
    }
  };

  const dismissMigration = () => {
    setShowMigrationPrompt(false);
    localStorage.setItem('migration_dismissed', 'true');
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

  // Migration prompt
  if (showMigrationPrompt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="text-center mb-6">
            <div className="text-4xl mb-4">🔄</div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Data Migration Available</h2>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
              We found your previous exam results stored locally. Would you like to migrate them to the new system?
            </p>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={handleMigration}
              disabled={migrating}
              className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {migrating ? 'Migrating...' : 'Migrate My Data'}
            </button>
            
            <button
              onClick={dismissMigration}
              disabled={migrating}
              className="w-full bg-gray-200 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-300 disabled:opacity-50 font-medium"
            >
              Skip Migration
            </button>
          </div>
          
          <p className="text-xs text-gray-500 mt-4 text-center leading-relaxed">
            This is a one-time process. Your old data will remain in your browser.
          </p>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="ml-3 sm:ml-4 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Available Exams</p>
              <p className="text-xl sm:text-2xl font-semibold text-gray-900">{availableExams.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3 sm:ml-4 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Completed Exams</p>
              <p className="text-xl sm:text-2xl font-semibold text-gray-900">{userResults.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="ml-3 sm:ml-4 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Average Score</p>
              <p className="text-xl sm:text-2xl font-semibold text-gray-900">
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
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6 sm:mb-8">
          <h3 className="text-lg font-semibold mb-4">Available Exams</h3>
          <div className="space-y-4">
            {availableExams.map((exam) => (
              <div key={exam.id} className="border rounded-lg p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-lg truncate">{exam.title}</h4>
                    <p className="text-gray-600 text-sm sm:text-base">{exam.questions?.length || 0} questions</p>
                    <p className="text-sm text-gray-500">
                      Duration: {exam.duration || 30} minutes
                    </p>
                  </div>
                  <button
                    onClick={() => startExam(exam)}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto text-center font-medium"
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
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => availableExams.length > 0 && startExam(availableExams[0])}
            disabled={availableExams.length === 0}
            className="flex items-center justify-center p-4 sm:p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[120px]"
          >
            <div className="text-center">
              <div className="text-2xl sm:text-3xl mb-2">🎯</div>
              <div className="font-medium text-sm sm:text-base">Take Exam</div>
              <div className="text-xs sm:text-sm text-gray-500 mt-1">
                {availableExams.length > 0 ? 'Start your exam now' : 'No exams available'}
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className="flex items-center justify-center p-4 sm:p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors min-h-[120px]"
          >
            <div className="text-center">
              <div className="text-2xl sm:text-3xl mb-2">👤</div>
              <div className="font-medium text-sm sm:text-base">View Profile</div>
              <div className="text-xs sm:text-sm text-gray-500 mt-1">Update your information</div>
            </div>
          </button>
        </div>
      </div>
      </div>
    </div>
  );
};

export default StudentPanel;
