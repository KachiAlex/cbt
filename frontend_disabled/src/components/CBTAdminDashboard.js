import React, { useState, useEffect, useMemo } from 'react';
import ExamManagement from './ExamManagement';
import QuestionsManagement from './QuestionsManagement';
import StudentsManagement from './StudentsManagement';
import ResultsManagement from './ResultsManagement';
import SettingsManagement from './SettingsManagement';
import DepartmentsManagement from './DepartmentsManagement';
import firebaseDataService from '../firebase/dataService';

const CBTAdminDashboard = ({ institution, user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('exams');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [stats, setStats] = useState({
    totalExams: 0,
    totalQuestions: 0,
    totalStudents: 0,
    totalResults: 0,
    activeExams: 0,
    completedResults: 0,
    averageScore: 0,
    passRate: 0
  });
  const [rawData, setRawData] = useState({
    exams: [],
    questions: [],
    students: [],
    results: []
  });

  useEffect(() => {
    loadDashboardStats();
    // Set up real-time updates every 30 seconds
    const interval = setInterval(loadDashboardStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const [exams, questions, students, results] = await Promise.all([
        firebaseDataService.getInstitutionExams(institution.id),
        firebaseDataService.getInstitutionQuestions(institution.id),
        firebaseDataService.getInstitutionUsers(institution.id),
        firebaseDataService.getInstitutionResults(institution.id)
      ]);

      // Store raw data for search and analytics
      setRawData({ exams, questions, students, results });

      // Calculate enhanced stats
      const activeExams = exams.filter(exam => exam.isActive).length;
      const completedResults = results.filter(result => result.status === 'completed').length;
      const averageScore = results.length > 0 
        ? results.reduce((sum, result) => sum + (result.percentage || 0), 0) / results.length 
        : 0;
      const passRate = results.length > 0 
        ? (results.filter(result => (result.percentage || 0) >= 50).length / results.length) * 100 
        : 0;

      setStats({
        totalExams: exams.length,
        totalQuestions: questions.length,
        totalStudents: students.length,
        totalResults: results.length,
        activeExams,
        completedResults,
        averageScore: Math.round(averageScore * 100) / 100,
        passRate: Math.round(passRate * 100) / 100
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Search functionality
  const filteredData = useMemo(() => {
    if (!searchTerm) return rawData;
    
    const term = searchTerm.toLowerCase();
    return {
      exams: rawData.exams.filter(exam => 
        exam.title?.toLowerCase().includes(term) ||
        exam.description?.toLowerCase().includes(term)
      ),
      questions: rawData.questions.filter(question =>
        question.question?.toLowerCase().includes(term) ||
        question.options?.some(opt => opt.toLowerCase().includes(term))
      ),
      students: rawData.students.filter(student =>
        student.fullName?.toLowerCase().includes(term) ||
        student.username?.toLowerCase().includes(term) ||
        student.email?.toLowerCase().includes(term)
      ),
      results: rawData.results.filter(result =>
        result.studentName?.toLowerCase().includes(term) ||
        result.examTitle?.toLowerCase().includes(term)
      )
    };
  }, [rawData, searchTerm]);

  // Quick actions
  const handleBulkDelete = async (type) => {
    if (selectedItems.length === 0) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedItems.length} ${type}? This action cannot be undone.`
    );
    
    if (confirmed) {
      try {
        setLoading(true);
        // Implement bulk delete logic based on type
        console.log(`Bulk deleting ${selectedItems.length} ${type}:`, selectedItems);
        // TODO: Implement actual bulk delete functionality
        setSelectedItems([]);
        await loadDashboardStats();
      } catch (error) {
        console.error('Error during bulk delete:', error);
        alert('Error occurred during bulk delete operation');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBulkExport = (type) => {
    if (selectedItems.length === 0) return;
    
    const data = selectedItems.map(item => {
      // Format data for export based on type
      switch (type) {
        case 'results':
          return {
            'Student Name': item.studentName,
            'Exam': item.examTitle,
            'Score': item.percentage,
            'Status': item.status,
            'Date': new Date(item.completedAt).toLocaleDateString()
          };
        case 'students':
          return {
            'Name': item.fullName,
            'Username': item.username,
            'Email': item.email,
            'Role': item.role
          };
        case 'exams':
          return {
            'Title': item.title,
            'Description': item.description,
            'Status': item.isActive ? 'Active' : 'Inactive',
            'Questions': item.questionCount || 0
          };
        default:
          return item;
      }
    });

    const csvContent = [
      Object.keys(data[0] || {}),
      ...data.map(row => Object.values(row))
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Single-admin model: show all tabs to admin users
  const getTabsForRole = () => {
    return [
      { id: 'exams', name: 'Exam Management', icon: '📝' },
      { id: 'questions', name: 'Questions', icon: '❓' },
      { id: 'students', name: 'Students', icon: '👥' },
      { id: 'results', name: 'Results', icon: '📊' },
      { id: 'structure', name: 'Departments & Levels', icon: '🏛️' },
      { id: 'analytics', name: 'Analytics', icon: '📈' },
      { id: 'settings', name: 'Settings', icon: '⚙️' }
    ];
  };

  const tabs = getTabsForRole();

  // Analytics component
  const renderAnalytics = () => {
    const gradeDistribution = rawData.results.reduce((acc, result) => {
      const grade = result.percentage >= 70 ? 'A' : 
                   result.percentage >= 60 ? 'B' : 
                   result.percentage >= 50 ? 'C' : 
                   result.percentage >= 40 ? 'D' : 'F';
      acc[grade] = (acc[grade] || 0) + 1;
      return acc;
    }, {});

    const examPerformance = rawData.exams.map(exam => {
      const examResults = rawData.results.filter(r => r.examId === exam.id);
      const avgScore = examResults.length > 0 
        ? examResults.reduce((sum, r) => sum + (r.percentage || 0), 0) / examResults.length 
        : 0;
      return {
        title: exam.title,
        attempts: examResults.length,
        averageScore: Math.round(avgScore * 100) / 100
      };
    });

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Grade Distribution Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Grade Distribution</h3>
            <div className="space-y-3">
              {Object.entries(gradeDistribution).map(([grade, count]) => (
                <div key={grade} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Grade {grade}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          grade === 'A' ? 'bg-green-500' :
                          grade === 'B' ? 'bg-blue-500' :
                          grade === 'C' ? 'bg-yellow-500' :
                          grade === 'D' ? 'bg-orange-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${(count / rawData.results.length) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-8">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Exam Performance */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Exam Performance</h3>
            <div className="space-y-3">
              {examPerformance.map((exam, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{exam.title}</p>
                    <p className="text-xs text-gray-500">{exam.attempts} attempts</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{exam.averageScore}%</p>
                    <p className="text-xs text-gray-500">avg score</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Performance Trends */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trends</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{stats.averageScore}%</p>
              <p className="text-sm text-blue-800">Average Score</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{stats.passRate}%</p>
              <p className="text-sm text-green-800">Pass Rate</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{stats.completedResults}</p>
              <p className="text-sm text-purple-800">Completed Exams</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'exams':
        return <ExamManagement institution={institution} onStatsUpdate={loadDashboardStats} />;
      case 'questions':
        return <QuestionsManagement institution={institution} onStatsUpdate={loadDashboardStats} />;
      case 'students':
        return <StudentsManagement institution={institution} onStatsUpdate={loadDashboardStats} />;
      case 'results':
        return <ResultsManagement institution={institution} onStatsUpdate={loadDashboardStats} />;
      case 'structure':
        return <DepartmentsManagement institution={institution} onChange={loadDashboardStats} />;
      case 'analytics':
        return renderAnalytics();
      case 'settings':
        return <SettingsManagement institution={institution} user={user} onLogout={onLogout} />;
      default:
        return <ExamManagement institution={institution} onStatsUpdate={loadDashboardStats} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              {institution?.logo && (
                <img
                  src={institution.logo}
                  alt={`${institution.name} Logo`}
                  className="h-10 w-10 object-contain"
                />
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{institution?.name}</h1>
                <p className="text-sm text-gray-600">CBT Admin Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Welcome, {user?.username}</span>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  user?.role === 'super_admin' 
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {user?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Exams</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalExams}</p>
                <p className="text-xs text-green-600">{stats.activeExams} active</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Questions</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalQuestions}</p>
                <p className="text-xs text-blue-600">Avg: {stats.totalExams > 0 ? Math.round(stats.totalQuestions / stats.totalExams) : 0} per exam</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Students</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalStudents}</p>
                <p className="text-xs text-purple-600">{stats.completedResults} completed exams</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-orange-100 text-orange-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Average Score</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.averageScore}%</p>
                <p className="text-xs text-green-600">{stats.passRate}% pass rate</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Quick Actions Bar */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Search Bar */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search exams, students, results..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowQuickActions(!showQuickActions)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
                <span>Quick Actions</span>
              </button>
              
              <button
                onClick={loadDashboardStats}
                className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-700 transition-colors flex items-center space-x-2"
                disabled={loading}
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Quick Actions Dropdown */}
          {showQuickActions && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Bulk Operations</h4>
                  <div className="space-y-2">
                    <button
                      onClick={() => handleBulkExport('results')}
                      className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-white hover:text-gray-900 rounded-md transition-colors"
                    >
                      Export Selected Results
                    </button>
                    <button
                      onClick={() => handleBulkExport('students')}
                      className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-white hover:text-gray-900 rounded-md transition-colors"
                    >
                      Export Selected Students
                    </button>
                    <button
                      onClick={() => handleBulkExport('exams')}
                      className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-white hover:text-gray-900 rounded-md transition-colors"
                    >
                      Export Selected Exams
                    </button>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Data Management</h4>
                  <div className="space-y-2">
                    <button
                      onClick={() => handleBulkDelete('results')}
                      className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-white hover:text-red-900 rounded-md transition-colors"
                    >
                      Delete Selected Results
                    </button>
                    <button
                      onClick={() => handleBulkDelete('students')}
                      className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-white hover:text-red-900 rounded-md transition-colors"
                    >
                      Delete Selected Students
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Search Results</h4>
                  <div className="text-sm text-gray-600">
                    {searchTerm && (
                      <div className="space-y-1">
                        <p>Found {filteredData.exams.length} exams</p>
                        <p>Found {filteredData.students.length} students</p>
                        <p>Found {filteredData.results.length} results</p>
                        <p>Found {filteredData.questions.length} questions</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CBTAdminDashboard;

