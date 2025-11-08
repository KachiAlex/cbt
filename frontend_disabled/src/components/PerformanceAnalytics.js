import React, { useState, useEffect } from 'react';
import { useRealTimeData } from './RealTimeDataProvider';

const PerformanceAnalytics = () => {
  const { exams, results, loading } = useRealTimeData();
  const [analytics, setAnalytics] = useState({
    examPerformance: [],
    scoreDistribution: [],
    timeAnalysis: [],
    topPerformers: [],
    strugglingStudents: []
  });

  useEffect(() => {
    if (loading || !results.length) return;

    // Calculate exam performance analytics
    const examPerformance = exams.map(exam => {
      const examResults = results.filter(r => r.examId === exam.id);
      const avgScore = examResults.length > 0 
        ? examResults.reduce((sum, r) => sum + (r.percent || 0), 0) / examResults.length 
        : 0;
      const completionRate = examResults.length > 0 ? 100 : 0;
      
      return {
        examTitle: exam.title,
        totalAttempts: examResults.length,
        averageScore: Math.round(avgScore),
        completionRate,
        passRate: examResults.filter(r => (r.percent || 0) >= 50).length / examResults.length * 100
      };
    });

    // Calculate score distribution
    const scoreRanges = [
      { range: '0-20%', count: 0, color: 'bg-red-500' },
      { range: '21-40%', count: 0, color: 'bg-orange-500' },
      { range: '41-60%', count: 0, color: 'bg-yellow-500' },
      { range: '61-80%', count: 0, color: 'bg-blue-500' },
      { range: '81-100%', count: 0, color: 'bg-green-500' }
    ];

    results.forEach(result => {
      const score = result.percent || 0;
      if (score <= 20) scoreRanges[0].count++;
      else if (score <= 40) scoreRanges[1].count++;
      else if (score <= 60) scoreRanges[2].count++;
      else if (score <= 80) scoreRanges[3].count++;
      else scoreRanges[4].count++;
    });

    // Calculate time analysis
    const timeAnalysis = results.map(result => {
      const startTime = new Date(result.startedAt);
      const endTime = new Date(result.submittedAt);
      const duration = Math.round((endTime - startTime) / 60000); // minutes
      
      return {
        username: result.username,
        examTitle: result.examTitle,
        duration,
        score: result.percent || 0
      };
    }).sort((a, b) => a.duration - b.duration);

    // Top performers
    const topPerformers = results
      .sort((a, b) => (b.percent || 0) - (a.percent || 0))
      .slice(0, 5)
      .map(result => ({
        username: result.username,
        examTitle: result.examTitle,
        score: result.percent || 0,
        date: result.submittedAt
      }));

    // Struggling students (scores below 40%)
    const strugglingStudents = results
      .filter(result => (result.percent || 0) < 40)
      .map(result => ({
        username: result.username,
        examTitle: result.examTitle,
        score: result.percent || 0,
        date: result.submittedAt
      }))
      .slice(0, 5);

    setAnalytics({
      examPerformance,
      scoreDistribution: scoreRanges,
      timeAnalysis,
      topPerformers,
      strugglingStudents
    });
  }, [exams, results, loading]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDuration = (minutes) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Exam Performance Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Exam Performance Overview</h3>
        {analytics.examPerformance.length > 0 ? (
          <div className="space-y-4">
            {analytics.examPerformance.map((exam, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{exam.examTitle}</h4>
                  <span className="text-sm text-gray-500">{exam.totalAttempts} attempts</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Average Score:</span>
                    <span className="ml-2 font-semibold text-gray-900">{exam.averageScore}%</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Pass Rate:</span>
                    <span className="ml-2 font-semibold text-gray-900">{Math.round(exam.passRate)}%</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Completion:</span>
                    <span className="ml-2 font-semibold text-gray-900">{exam.completionRate}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No exam performance data available</p>
          </div>
        )}
      </div>

      {/* Score Distribution */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Score Distribution</h3>
        <div className="space-y-3">
          {analytics.scoreDistribution.map((range, index) => {
            const totalResults = analytics.scoreDistribution.reduce((sum, r) => sum + r.count, 0);
            const percentage = totalResults > 0 ? (range.count / totalResults) * 100 : 0;
            
            return (
              <div key={index} className="flex items-center">
                <div className="w-20 text-sm text-gray-600">{range.range}</div>
                <div className="flex-1 mx-4">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${range.color}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
                <div className="w-12 text-sm text-gray-900 font-medium">{range.count}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Performers */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers</h3>
        {analytics.topPerformers.length > 0 ? (
          <div className="space-y-3">
            {analytics.topPerformers.map((performer, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div className="ml-3">
                    <p className="font-medium text-gray-900">{performer.username}</p>
                    <p className="text-sm text-gray-600">{performer.examTitle}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">{performer.score}%</p>
                  <p className="text-xs text-gray-500">{formatDate(performer.date)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No performance data available</p>
          </div>
        )}
      </div>

      {/* Students Needing Attention */}
      {analytics.strugglingStudents.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Students Needing Attention</h3>
          <div className="space-y-3">
            {analytics.strugglingStudents.map((student, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-semibold text-sm">
                    ⚠️
                  </div>
                  <div className="ml-3">
                    <p className="font-medium text-gray-900">{student.username}</p>
                    <p className="text-sm text-gray-600">{student.examTitle}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-red-600">{student.score}%</p>
                  <p className="text-xs text-gray-500">{formatDate(student.date)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Time Analysis */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Time Analysis</h3>
        {analytics.timeAnalysis.length > 0 ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-blue-600 font-semibold">Average Time</p>
                <p className="text-lg font-bold text-blue-800">
                  {formatDuration(
                    Math.round(
                      analytics.timeAnalysis.reduce((sum, t) => sum + t.duration, 0) / 
                      analytics.timeAnalysis.length
                    )
                  )}
                </p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-green-600 font-semibold">Fastest Completion</p>
                <p className="text-lg font-bold text-green-800">
                  {formatDuration(analytics.timeAnalysis[0]?.duration || 0)}
                </p>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <p className="text-orange-600 font-semibold">Longest Time</p>
                <p className="text-lg font-bold text-orange-800">
                  {formatDuration(analytics.timeAnalysis[analytics.timeAnalysis.length - 1]?.duration || 0)}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No time analysis data available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceAnalytics;
