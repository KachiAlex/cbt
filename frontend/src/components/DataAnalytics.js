import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from './Toast';

const DataAnalytics = ({ results, questions, exams, students = [], institution }) => {
  const [selectedMetric, setSelectedMetric] = useState('performance');
  const [selectedTimeframe, setSelectedTimeframe] = useState('all');
  const [selectedExam, setSelectedExam] = useState('all');
  
  const toast = useToast();

  // Filter data based on selections
  const filteredResults = useMemo(() => {
    let filtered = results;

    if (selectedExam !== 'all') {
      filtered = filtered.filter(r => r.examTitle === selectedExam);
    }

    if (selectedTimeframe !== 'all') {
      const now = new Date();
      const days = parseInt(selectedTimeframe);
      const cutoffDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
      filtered = filtered.filter(r => new Date(r.submittedAt) >= cutoffDate);
    }

    return filtered;
  }, [results, selectedExam, selectedTimeframe]);

  // Calculate comprehensive analytics
  const analytics = useMemo(() => {
    if (filteredResults.length === 0) {
      return {
        performance: {},
        trends: {},
        distribution: {},
        correlations: {},
        insights: []
      };
    }

    const scores = filteredResults.map(r => r.percent);
    const times = filteredResults.map(r => r.timeTaken).filter(t => t && t > 0);
    const uniqueStudents = new Set(filteredResults.map(r => r.username)).size;

    // Performance metrics
    const performance = {
      averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      medianScore: scores.sort((a, b) => a - b)[Math.floor(scores.length / 2)],
      minScore: Math.min(...scores),
      maxScore: Math.max(...scores),
      standardDeviation: Math.round(Math.sqrt(scores.reduce((sq, n) => sq + Math.pow(n - (scores.reduce((a, b) => a + b, 0) / scores.length), 2), 0) / scores.length)),
      passRate: Math.round((scores.filter(s => s >= 60).length / scores.length) * 100),
      highPerformers: Math.round((scores.filter(s => s >= 80).length / scores.length) * 100),
      averageTime: times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length / 60) : 0
    };

    // Grade distribution
    const gradeDistribution = filteredResults.reduce((acc, result) => {
      const grade = calculateGrade(result.percent);
      acc[grade] = (acc[grade] || 0) + 1;
      return acc;
    }, {});

    // Time-based trends
    const trends = calculateTrends(filteredResults);

    // Performance by exam
    const examPerformance = calculateExamPerformance(filteredResults);

    // Student performance patterns
    const studentPatterns = calculateStudentPatterns(filteredResults);

    // Student demographics analytics
    const demographics = calculateStudentDemographics(students, filteredResults);

    // Generate insights
    const insights = generateInsights(performance, trends, examPerformance, studentPatterns);

    return {
      performance,
      trends,
      distribution: gradeDistribution,
      examPerformance,
      studentPatterns,
      demographics,
      insights
    };
  }, [filteredResults]);

  const calculateGrade = (percentage) => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 85) return 'A';
    if (percentage >= 80) return 'A-';
    if (percentage >= 75) return 'B+';
    if (percentage >= 70) return 'B';
    if (percentage >= 65) return 'B-';
    if (percentage >= 60) return 'C+';
    if (percentage >= 55) return 'C';
    if (percentage >= 50) return 'C-';
    if (percentage >= 45) return 'D+';
    if (percentage >= 40) return 'D';
    return 'F';
  };

  const calculateTrends = (results) => {
    // Group by date and calculate daily averages
    const dailyData = results.reduce((acc, result) => {
      const date = new Date(result.submittedAt).toDateString();
      if (!acc[date]) {
        acc[date] = { scores: [], count: 0 };
      }
      acc[date].scores.push(result.percent);
      acc[date].count++;
      return acc;
    }, {});

    const trendData = Object.entries(dailyData).map(([date, data]) => ({
      date,
      averageScore: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
      count: data.count
    })).sort((a, b) => new Date(a.date) - new Date(b.date));

    return trendData;
  };

  const calculateExamPerformance = (results) => {
    const examData = results.reduce((acc, result) => {
      if (!acc[result.examTitle]) {
        acc[result.examTitle] = { scores: [], times: [], count: 0 };
      }
      acc[result.examTitle].scores.push(result.percent);
      if (result.timeTaken) acc[result.examTitle].times.push(result.timeTaken);
      acc[result.examTitle].count++;
      return acc;
    }, {});

    return Object.entries(examData).map(([exam, data]) => ({
      exam,
      averageScore: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
      averageTime: data.times.length > 0 ? Math.round(data.times.reduce((a, b) => a + b, 0) / data.times.length / 60) : 0,
      count: data.count,
      passRate: Math.round((data.scores.filter(s => s >= 60).length / data.scores.length) * 100)
    }));
  };

  const calculateStudentPatterns = (results) => {
    const studentData = results.reduce((acc, result) => {
      if (!acc[result.username]) {
        acc[result.username] = { scores: [], times: [], exams: [] };
      }
      acc[result.username].scores.push(result.percent);
      if (result.timeTaken) acc[result.username].times.push(result.timeTaken);
      acc[result.username].exams.push(result.examTitle);
      return acc;
    }, {});

    return Object.entries(studentData).map(([student, data]) => ({
      student,
      averageScore: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
      improvement: data.scores.length > 1 ? data.scores[data.scores.length - 1] - data.scores[0] : 0,
      examCount: data.exams.length,
      averageTime: data.times.length > 0 ? Math.round(data.times.reduce((a, b) => a + b, 0) / data.times.length / 60) : 0
    }));
  };

  const calculateStudentDemographics = (students, results) => {
    if (students.length === 0) {
      return {
        gender: {},
        age: {},
        totalStudents: 0,
        activeStudents: 0
      };
    }

    // Filter students by institution if needed
    const institutionStudents = institution?.slug 
      ? students.filter(s => s.institutionSlug === institution.slug)
      : students;

    // Gender distribution
    const genderDistribution = institutionStudents.reduce((acc, student) => {
      const gender = student.gender || 'unknown';
      acc[gender] = (acc[gender] || 0) + 1;
      return acc;
    }, {});

    // Age distribution
    const ageDistribution = institutionStudents.reduce((acc, student) => {
      if (student.age) {
        const ageGroup = student.age < 20 ? 'Under 20' :
                        student.age < 25 ? '20-24' :
                        student.age < 30 ? '25-29' :
                        student.age < 35 ? '30-34' :
                        student.age < 40 ? '35-39' :
                        '40+';
        acc[ageGroup] = (acc[ageGroup] || 0) + 1;
      }
      return acc;
    }, {});

    // Students who have taken exams
    const studentsWithResults = new Set(results.map(r => r.username));
    const activeStudents = institutionStudents.filter(s => 
      studentsWithResults.has(s.username)
    ).length;

    return {
      gender: genderDistribution,
      age: ageDistribution,
      totalStudents: institutionStudents.length,
      activeStudents: activeStudents,
      participationRate: institutionStudents.length > 0 
        ? Math.round((activeStudents / institutionStudents.length) * 100) 
        : 0
    };
  };

  const generateInsights = (performance, trends, examPerformance, studentPatterns) => {
    const insights = [];

    // Performance insights
    if (performance.averageScore >= 80) {
      insights.push({
        type: 'positive',
        title: 'Excellent Overall Performance',
        message: `Average score of ${performance.averageScore}% indicates strong student understanding.`
      });
    } else if (performance.averageScore < 60) {
      insights.push({
        type: 'warning',
        title: 'Performance Below Expectations',
        message: `Average score of ${performance.averageScore}% suggests need for additional support.`
      });
    }

    // Pass rate insights
    if (performance.passRate >= 80) {
      insights.push({
        type: 'positive',
        title: 'High Pass Rate',
        message: `${performance.passRate}% of students are passing, indicating effective teaching.`
      });
    } else if (performance.passRate < 50) {
      insights.push({
        type: 'critical',
        title: 'Low Pass Rate',
        message: `Only ${performance.passRate}% of students are passing. Consider reviewing curriculum.`
      });
    }

    // Time insights
    if (performance.averageTime > 0) {
      if (performance.averageTime < 30) {
        insights.push({
          type: 'info',
          title: 'Fast Completion Times',
          message: `Average completion time of ${performance.averageTime} minutes suggests students are well-prepared.`
        });
      } else if (performance.averageTime > 60) {
        insights.push({
          type: 'warning',
          title: 'Long Completion Times',
          message: `Average completion time of ${performance.averageTime} minutes may indicate exam difficulty or time management issues.`
        });
      }
    }

    // Trend insights
    if (trends.length >= 2) {
      const recent = trends.slice(-3);
      const older = trends.slice(0, -3);
      if (recent.length > 0 && older.length > 0) {
        const recentAvg = recent.reduce((a, b) => a + b.averageScore, 0) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b.averageScore, 0) / older.length;
        const change = recentAvg - olderAvg;
        
        if (change > 5) {
          insights.push({
            type: 'positive',
            title: 'Improving Performance Trend',
            message: `Recent scores are ${Math.round(change)}% higher than earlier performance.`
          });
        } else if (change < -5) {
          insights.push({
            type: 'warning',
            title: 'Declining Performance Trend',
            message: `Recent scores are ${Math.round(Math.abs(change))}% lower than earlier performance.`
          });
        }
      }
    }

    return insights;
  };

  const MetricCard = ({ title, value, subtitle, color = 'blue', trend = null }) => (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
        {trend && (
          <div className={`text-sm font-medium ${
            trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-600'
          }`}>
            {trend > 0 ? '↗' : trend < 0 ? '↘' : '→'} {Math.abs(trend)}%
          </div>
        )}
      </div>
    </div>
  );

  const InsightCard = ({ insight }) => (
    <div className={`p-4 rounded-lg border-l-4 ${
      insight.type === 'positive' ? 'bg-green-50 border-green-400' :
      insight.type === 'warning' ? 'bg-yellow-50 border-yellow-400' :
      insight.type === 'critical' ? 'bg-red-50 border-red-400' :
      'bg-blue-50 border-blue-400'
    }`}>
      <h4 className={`font-semibold ${
        insight.type === 'positive' ? 'text-green-800' :
        insight.type === 'warning' ? 'text-yellow-800' :
        insight.type === 'critical' ? 'text-red-800' :
        'text-blue-800'
      }`}>
        {insight.title}
      </h4>
      <p className={`text-sm mt-1 ${
        insight.type === 'positive' ? 'text-green-700' :
        insight.type === 'warning' ? 'text-yellow-700' :
        insight.type === 'critical' ? 'text-red-700' :
        'text-blue-700'
      }`}>
        {insight.message}
      </p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Timeframe</label>
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
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
              {[...new Set(results.map(r => r.examTitle))].map(exam => (
                <option key={exam} value={exam}>{exam}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Metric</label>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="performance">Performance</option>
              <option value="trends">Trends</option>
              <option value="distribution">Distribution</option>
              <option value="demographics">Student Demographics</option>
              <option value="correlations">Correlations</option>
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Average Score"
          value={`${analytics.performance.averageScore}%`}
          subtitle="Overall performance"
          color="blue"
        />
        <MetricCard
          title="Pass Rate"
          value={`${analytics.performance.passRate}%`}
          subtitle="Students ≥ 60%"
          color="green"
        />
        <MetricCard
          title="High Performers"
          value={`${analytics.performance.highPerformers}%`}
          subtitle="Students ≥ 80%"
          color="purple"
        />
        <MetricCard
          title="Average Time"
          value={`${analytics.performance.averageTime} min`}
          subtitle="Completion time"
          color="yellow"
        />
      </div>

      {/* Insights */}
      {analytics.insights.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Insights</h3>
          <div className="space-y-3">
            {analytics.insights.map((insight, index) => (
              <InsightCard key={index} insight={insight} />
            ))}
          </div>
        </div>
      )}

      {/* Grade Distribution */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Grade Distribution</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Object.entries(analytics.distribution).map(([grade, count]) => {
            const percentage = Math.round((count / filteredResults.length) * 100);
            return (
              <div key={grade} className="text-center">
                <div className="text-2xl font-bold text-gray-900">{count}</div>
                <div className="text-sm text-gray-600">{grade}</div>
                <div className="text-xs text-gray-500">{percentage}%</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Exam Performance */}
      {analytics.examPerformance.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance by Exam</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exam</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pass Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Students</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analytics.examPerformance.map((exam, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {exam.exam.length > 30 ? exam.exam.substring(0, 30) + '...' : exam.exam}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{exam.averageScore}%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{exam.passRate}%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{exam.averageTime} min</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{exam.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Student Demographics */}
      {selectedMetric === 'demographics' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Student Demographics</h3>
            
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <MetricCard
                title="Total Students"
                value={analytics.demographics.totalStudents}
                subtitle="Registered students"
                color="blue"
              />
              <MetricCard
                title="Active Students"
                value={analytics.demographics.activeStudents}
                subtitle="Students who took exams"
                color="green"
              />
              <MetricCard
                title="Participation Rate"
                value={`${analytics.demographics.participationRate}%`}
                subtitle="Exam participation"
                color="purple"
              />
            </div>

            {/* Gender Distribution */}
            <div className="mb-8">
              <h4 className="text-md font-semibold text-gray-900 mb-4">Gender Distribution</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(analytics.demographics.gender).map(([gender, count]) => {
                  const percentage = analytics.demographics.totalStudents > 0 
                    ? Math.round((count / analytics.demographics.totalStudents) * 100) 
                    : 0;
                  return (
                    <div key={gender} className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">{count}</div>
                      <div className="text-sm text-gray-600 capitalize">{gender}</div>
                      <div className="text-xs text-gray-500">{percentage}%</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Age Distribution */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-4">Age Distribution</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {Object.entries(analytics.demographics.age).map(([ageGroup, count]) => {
                  const percentage = analytics.demographics.totalStudents > 0 
                    ? Math.round((count / analytics.demographics.totalStudents) * 100) 
                    : 0;
                  return (
                    <div key={ageGroup} className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">{count}</div>
                      <div className="text-sm text-gray-600">{ageGroup}</div>
                      <div className="text-xs text-gray-500">{percentage}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataAnalytics;
