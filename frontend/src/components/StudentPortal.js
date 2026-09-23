import React, { useState, useEffect, useMemo } from 'react';
import { dataService } from '../services/dataService';
import { formatResultDate } from '../utils/resultDate';

const StudentPortal = ({ user, onLogout, onStartExam }) => {
  const [availableExams, setAvailableExams] = useState([]);
  const [userResults, setUserResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reviewResult, setReviewResult] = useState(null);
  const [reviewError, setReviewError] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    loadStudentData();
  }, []);

  const loadStudentData = async () => {
    try {
      const [exams, results] = await Promise.all([
        dataService.getExams(),
        dataService.getResultsByUser(user.id)
      ]);

      // Filter exams: institution match, active flag, and within schedule window when provided
      const now = new Date();
      const isWithinWindow = (exam) => {
        if (exam.activeAttemptId) return true;
        const start = exam.startDate ? new Date(exam.startDate).getTime() : null;
        const end = exam.endDate ? new Date(exam.endDate).getTime() : null;
        return (start === null || (Number.isFinite(start) && start <= now.getTime())) &&
          (end === null || (Number.isFinite(end) && end >= now.getTime()));
      };

      const normalize = (val) => (val === undefined || val === null) ? '' : String(val).trim();
      const userInstitutionId = normalize(user?.institutionId || user?.tenantId);

      const activeExams = exams
        .filter(exam => {
          const examInstitutionId = normalize(exam.institutionId || exam.tenantId);
          return !examInstitutionId || !userInstitutionId || examInstitutionId === userInstitutionId;
        })
        .filter(exam => exam.examAvailable === true)
        .filter(exam => Number(exam.totalQuestions ?? 0) > 0)
        .filter(isWithinWindow);

      setAvailableExams(activeExams);
      setUserResults(results);
      setLoadError('');
      setLoading(false);
    } catch (error) {
      setLoadError(error.message || 'Unable to load your portal data.');
      setLoading(false);
    }
  };

  const resultCountsByExam = useMemo(() => {
    const counts = new Map();
    userResults.forEach(result => counts.set(result.examId, (counts.get(result.examId) || 0) + 1));
    return counts;
  }, [userResults]);

  const openReview = async (result) => {
    setReviewLoading(true);
    setReviewError('');
    try {
      setReviewResult(await dataService.getResultReview(result.id));
    } catch (error) {
      setReviewError(error.message || 'Unable to load result review.');
    } finally {
      setReviewLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Student Portal</h1>
              <p className="text-gray-600">Welcome, {user?.fullName || user?.username}</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {loadError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex justify-between items-center gap-4">
              <p className="text-red-700">{loadError}</p>
              <button onClick={loadStudentData} className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700">Retry</button>
            </div>
          </div>
        )}
        {/* Available Exams */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Available Exams</h3>
            
            {availableExams.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableExams.map((exam) => {
                  const attemptsUsed = Number(exam.attemptsUsed ?? resultCountsByExam.get(exam.id) ?? 0);
                  const maxAttempts = Number(exam.maxAttempts) || 1;
                  const inProgress = Boolean(exam.activeAttemptId);
                  const canStart = inProgress || attemptsUsed < maxAttempts;
                  const hasTaken = !canStart;
                  
                  return (
                    <div key={exam.id} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="text-lg font-semibold text-gray-900">{exam.title}</h4>
                        {inProgress && <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">In Progress</span>}
                        {hasTaken && <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">Attempts Used</span>}
                      </div>
                      
                      <p className="text-gray-600 mb-4">{exam.description}</p>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Duration:</span>
                          <span className="font-medium">{exam.duration} minutes</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Status:</span>
                          <span className="font-medium">
                            {inProgress ? 'In progress' : hasTaken ? 'No attempts remaining' : 'Available'}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Attempts:</span>
                          <span className="font-medium">{attemptsUsed} / {maxAttempts}</span>
                        </div>
                      </div>
                      
                      {exam.instructions && (
                        <div className="mb-4">
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Instructions:</h5>
                          <p className="text-sm text-gray-600">{exam.instructions}</p>
                        </div>
                      )}
                      
                      <div className="flex space-x-3">
                        {canStart ? (
                          <button
                            onClick={() => onStartExam(exam)}
                            className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-center"
                          >
                            {inProgress ? 'Continue Exam' : 'Start Exam'}
                          </button>
                        ) : (
                          <button
                            disabled
                            className="flex-1 bg-gray-300 text-gray-500 px-4 py-2 rounded-md cursor-not-allowed text-center"
                          >
                            Attempts Used
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 text-6xl mb-4">📝</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Exams Available</h3>
                <p className="text-gray-500">There are currently no exams available for you to take.</p>
              </div>
            )}
          </div>
        </div>

        {/* Exam History */}
        {userResults.length > 0 && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Exam History</h3>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Exam
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Review</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {userResults.map((result) => (
                      <tr key={result.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {result.examTitle}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {result.status === 'pending_review' || result.status === 'provisional' ? 'Awaiting review' : 'Completed'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatResultDate(result, false, user)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {result.reviewAvailable && result.status === 'completed' && (
                            <button onClick={() => openReview(result)} className="text-indigo-600 hover:underline">Review</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
      {reviewLoading && <p className="pb-6 text-center text-gray-600">Loading review...</p>}
      {reviewError && <p role="alert" className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{reviewError}</p>}
      {reviewResult && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="mx-auto mt-10 max-w-3xl rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{reviewResult.examTitle || 'Exam review'}</h2>
                {reviewResult.percentage != null && <p className="mt-1 text-sm text-gray-600">Score: {reviewResult.percentage}%</p>}
              </div>
              <button onClick={() => { setReviewResult(null); setReviewError(''); }} className="text-gray-500 hover:text-gray-800">Close</button>
            </div>
            <div className="max-h-[70vh] space-y-4 overflow-y-auto">
              {reviewResult.questions.map((question, index) => (
                <article key={question.id} className="rounded border p-4">
                  <h3 className="font-medium text-gray-900">{index + 1}. {question.question}</h3>
                  <p className="mt-2 text-sm text-gray-700">Your answer: {question.selectedAnswer || 'No answer'}</p>
                  {question.correctAnswer !== undefined && <p className="mt-1 text-sm text-green-700">Correct answer: {question.correctAnswer}</p>}
                  {question.explanation && <p className="mt-2 text-sm text-gray-600">{question.explanation}</p>}
                </article>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentPortal;
