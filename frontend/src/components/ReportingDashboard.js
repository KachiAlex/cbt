import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from './Toast';
import { ButtonSpinner } from './LoadingSpinner';
import exportService from '../services/exportService';
import dataService from '../services/dataService';

const ReportingDashboard = ({ user, institution }) => {
  const [results, setResults] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedExam, setSelectedExam] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');
  
  const toast = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [resultsData, questionsData, examsData] = await Promise.all([
        dataService.loadResults(),
        dataService.loadQuestions(),
        dataService.loadExams()
      ]);

      // Filter by institution if applicable
      const filteredResults = institution?.slug 
        ? resultsData.filter(r => r.institutionSlug === institution.slug)
        : resultsData;

      setResults(filteredResults);
      setQuestions(questionsData);
      setExams(examsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load reporting data');
    } finally {
      setLoading(false);
    }
  };

  // Filter data based on selections
  const filteredResults = useMemo(() => {
    let filtered = results;

    if (selectedExam !== 'all') {
      filtered = filtered.filter(r => r.examTitle === selectedExam);
    }

    if (selectedStudent !== 'all') {
      filtered = filtered.filter(r => r.username === selectedStudent);
    }

    if (dateRange !== 'all') {
      const now = new Date();
      const days = parseInt(dateRange);
      const cutoffDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
      filtered = filtered.filter(r => new Date(r.submittedAt) >= cutoffDate);
    }

    return filtered;
  }, [results, selectedExam, selectedStudent, dateRange]);

  // Calculate analytics
  const analytics = useMemo(() => {
    if (filteredResults.length === 0) {
      return {
        totalStudents: 0,
        totalExams: 0,
        averageScore: 0,
        passRate: 0,
        highPerformers: 0,
        averageTime: 0,
        gradeDistribution: {},
        topPerformers: [],
        strugglingStudents: []
      };
    }

    const uniqueStudents = new Set(filteredResults.map(r => r.username)).size;
    const scores = filteredResults.map(r => r.percent);
    const times = filteredResults.map(r => r.timeTaken).filter(t => t && t > 0);
    
    // Grade distribution
    const gradeDistribution = filteredResults.reduce((acc, result) => {
      const grade = exportService.calculateGrade(result.percent);
      acc[grade] = (acc[grade] || 0) + 1;
      return acc;
    }, {});

    // Top performers (≥80%)
    const topPerformers = filteredResults
      .filter(r => r.percent >= 80)
      .sort((a, b) => b.percent - a.percent)
      .slice(0, 10);

    // Struggling students (<60%)
    const strugglingStudents = filteredResults
      .filter(r => r.percent < 60)
      .sort((a, b) => a.percent - b.percent)
      .slice(0, 10);

    return {
      totalStudents: uniqueStudents,
      totalExams: filteredResults.length,
      averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      passRate: Math.round((scores.filter(s => s >= 60).length / scores.length) * 100),
      highPerformers: Math.round((scores.filter(s => s >= 80).length / scores.length) * 100),
      averageTime: times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length / 60) : 0,
      gradeDistribution,
      topPerformers,
      strugglingStudents
    };
  }, [filteredResults]);

  // Export functions
  const handleExport = async (format, options = {}) => {
    try {
      setExporting(true);
      
      switch (format) {
        case 'excel':
          await exportService.exportResultsToExcel(filteredResults, {
            ...options,
            institution: institution,
            includeAnalytics: true,
            includeQuestions: true,
            questions: questions
          });
          break;
        case 'word':
          await exportService.exportResultsToWord(filteredResults, {
            ...options,
            institution: institution,
            includeAnalytics: true
          });
          break;
        case 'csv':
          await exportService.exportResultsToCSV(filteredResults, {
            ...options,
            institution: institution
          });
          break;
        case 'comprehensive':
          await exportService.exportComprehensiveReport(filteredResults, questions, exams, {
            ...options,
            institution: institution
          });
          break;
        default:
          throw new Error('Unsupported export format');
      }
      
      toast.success(`${format.toUpperCase()} export completed successfully!`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Failed to export ${format.toUpperCase()} file`);
    } finally {
      setExporting(false);
    }
  };

  const StatCard = ({ title, value, subtitle, color = 'blue', icon }) => (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-full bg-${color}-100`}>
          {icon}
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
      </div>
    </div>
  );

  const GradeDistributionChart = () => {
    const grades = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F'];
    const colors = {
      'A+': 'bg-green-600', 'A': 'bg-green-500', 'A-': 'bg-green-400',
      'B+': 'bg-blue-600', 'B': 'bg-blue-500', 'B-': 'bg-blue-400',
      'C+': 'bg-yellow-600', 'C': 'bg-yellow-500', 'C-': 'bg-yellow-400',
      'D+': 'bg-orange-600', 'D': 'bg-orange-500',
      'F': 'bg-red-600'
    };

    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Grade Distribution</h3>
        <div className="space-y-3">
          {grades.map(grade => {
            const count = analytics.gradeDistribution[grade] || 0;
            const percentage = filteredResults.length > 0 ? Math.round((count / filteredResults.length) * 100) : 0;
            
            return (
              <div key={grade} className="flex items-center">
                <div className="w-12 text-sm font-medium text-gray-600">{grade}</div>
                <div className="flex-1 mx-3">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${colors[grade]}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
                <div className="w-16 text-sm text-gray-600 text-right">
                  {count} ({percentage}%)
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const TopPerformersList = () => (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers</h3>
      <div className="space-y-3">
        {analytics.topPerformers.map((result, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">{result.fullName || result.username}</p>
              <p className="text-sm text-gray-600">{result.examTitle}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-green-600">{result.percent}%</p>
              <p className="text-sm text-gray-500">{exportService.calculateGrade(result.percent)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const StrugglingStudentsList = () => (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Students Needing Support</h3>
      <div className="space-y-3">
        {analytics.strugglingStudents.map((result, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">{result.fullName || result.username}</p>
              <p className="text-sm text-gray-600">{result.examTitle}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-red-600">{result.percent}%</p>
              <p className="text-sm text-gray-500">{exportService.calculateGrade(result.percent)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading reporting data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reporting Dashboard</h1>
              <p className="text-gray-600">Comprehensive analytics and export tools</p>
            </div>
            
            {/* Export Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={() => handleExport('excel')}
                disabled={exporting}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {exporting ? <ButtonSpinner /> : '📊 Excel'}
              </button>
              <button
                onClick={() => handleExport('word')}
                disabled={exporting}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {exporting ? <ButtonSpinner /> : '📄 Word'}
              </button>
              <button
                onClick={() => handleExport('csv')}
                disabled={exporting}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
              >
                {exporting ? <ButtonSpinner /> : '📋 CSV'}
              </button>
              <button
                onClick={() => handleExport('comprehensive')}
                disabled={exporting}
                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {exporting ? <ButtonSpinner /> : '📈 Comprehensive'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Exam</label>
              <select
                value={selectedExam}
                onChange={(e) => setSelectedExam(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Exams</option>
                {[...new Set(results.map(r => r.examTitle))].map(exam => (
                  <option key={exam} value={exam}>{exam}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Student</label>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Students</option>
                {[...new Set(results.map(r => r.username))].map(student => (
                  <option key={student} value={student}>{student}</option>
                ))}
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
            
            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                Showing {filteredResults.length} of {results.length} results
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatCard
            title="Total Students"
            value={analytics.totalStudents}
            subtitle="Unique students"
            color="blue"
            icon={<span className="text-blue-600">👥</span>}
          />
          <StatCard
            title="Total Exams"
            value={analytics.totalExams}
            subtitle="Exams completed"
            color="green"
            icon={<span className="text-green-600">📝</span>}
          />
          <StatCard
            title="Average Score"
            value={`${analytics.averageScore}%`}
            subtitle="Overall performance"
            color="purple"
            icon={<span className="text-purple-600">📊</span>}
          />
          <StatCard
            title="Pass Rate"
            value={`${analytics.passRate}%`}
            subtitle="Students ≥ 60%"
            color="yellow"
            icon={<span className="text-yellow-600">✅</span>}
          />
        </div>

        {/* Charts and Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GradeDistributionChart />
          <TopPerformersList />
        </div>
        
        <div className="mt-6">
          <StrugglingStudentsList />
        </div>
      </div>
    </div>
  );
};

export default ReportingDashboard;
