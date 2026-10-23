import React, { useState, useEffect, useMemo } from 'react';
import dataService from '../services/dataService';

// Per-question item analysis: difficulty, discrimination signals, AI grading health.
const QuestionAnalytics = ({ institution }) => {
  const [data, setData] = useState({ questions: [], totalResults: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [examFilter, setExamFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const result = await dataService.getQuestionAnalytics(institution.id);
        if (!cancelled) setData(result || { questions: [], totalResults: 0 });
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load question analytics');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [institution.id]);

  const exams = useMemo(
    () => [...new Map(data.questions.filter(q => q.examId).map(q => [q.examId, q.examTitle])).entries()],
    [data.questions]
  );
  const subjects = useMemo(
    () => [...new Set(data.questions.map(q => q.subject).filter(Boolean))].sort(),
    [data.questions]
  );

  const filtered = useMemo(() => data.questions.filter(question => {
    if (examFilter && question.examId !== examFilter) return false;
    if (subjectFilter && question.subject !== subjectFilter) return false;
    if (search && !String(question.text || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [data.questions, examFilter, subjectFilter, search]);

  const difficultyColor = (percent) => {
    if (percent >= 70) return 'text-green-600';
    if (percent >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-sm text-gray-500">Loading question analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Question Performance</h3>
          <p className="text-xs text-gray-500">
            {data.questions.length} questions across {data.totalResults} graded results. Low correct % flags questions that are hard, ambiguous, or mis-keyed.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="Search question text..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          <select
            value={examFilter}
            onChange={(e) => setExamFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All exams</option>
            {exams.map(([id, title]) => <option key={id} value={id}>{title || 'Untitled exam'}</option>)}
          </select>
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All subjects</option>
            {subjects.map(subject => <option key={subject} value={subject}>{subject}</option>)}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500 py-6 text-center">No answered questions yet — analytics appear once students submit exams.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Question</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Exam</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Attempts</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Correct %</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Avg Score</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">AI Confidence</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.map(question => (
                <tr key={question.questionId}>
                  <td className="px-4 py-2 text-sm text-gray-900 max-w-md">
                    <div className="truncate" title={question.text}>{question.text || '(untitled)'}</div>
                    {question.subject && <span className="text-xs text-indigo-600">{question.subject}</span>}
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-600 max-w-xs">
                    <div className="truncate" title={question.examTitle}>{question.examTitle || '-'}</div>
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-600">{question.type || '-'}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 text-right">{question.attempts}</td>
                  <td className={`px-4 py-2 text-sm font-medium text-right ${question.type === 'essay' ? 'text-gray-400' : difficultyColor(question.correctPercent)}`}>
                    {question.type === 'essay' ? '—' : `${question.correctPercent}%`}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900 text-right">{question.averageScore}%</td>
                  <td className="px-4 py-2 text-xs text-right">
                    {question.averageAiConfidence !== null ? (
                      <span className={question.averageAiConfidence >= 0.7 ? 'text-green-600' : 'text-yellow-600'}>
                        {Math.round(question.averageAiConfidence * 100)}%
                        {question.aiFallbacks > 0 && <span className="text-gray-400"> ({question.aiFallbacks} fallback)</span>}
                      </span>
                    ) : <span className="text-gray-400">-</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default QuestionAnalytics;
