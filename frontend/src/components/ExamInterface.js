import React, { useState, useEffect, useRef } from 'react';
import dataService from '../services/dataService';

function seededNumber(seed) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let value = seed + 0x6D2B79F5;
  return () => {
    value += 0x6D2B79F5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function deterministicShuffle(items, seed, enabled) {
  const shuffled = [...items];
  if (!enabled || shuffled.length < 2) return shuffled;
  const random = seededRandom(seededNumber(seed));
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function formatTime(seconds) {
  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${minutes}:${String(secs).padStart(2, '0')}`;
}

const ExamInterface = ({ user, exam, onClose }) => {
  const [phase, setPhase] = useState('loading');
  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [optionOrder, setOptionOrder] = useState({});
  const [answers, setAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState(null);
  const [error, setError] = useState('');
  const submissionStarted = useRef(false);

  const storageKey = attempt ? `exam_attempt_state_${user?.id}_${attempt.id}` : null;

  useEffect(() => {
    let cancelled = false;
    const loadAttempt = async () => {
      try {
        setPhase('loading');
        setError('');
        const startedAttempt = await dataService.startExamAttempt(exam.id);
        const examQuestions = await dataService.getQuestions(exam.id);
        if (cancelled) return;
        if (!examQuestions.length) throw new Error('This exam has no questions.');

        const orderedQuestions = deterministicShuffle(
          examQuestions,
          `${startedAttempt.id}:questions`,
          exam.randomizeQuestions !== false
        );
        const orderedOptions = {};
        for (const question of orderedQuestions) {
          orderedOptions[question.id] = deterministicShuffle(
            question.options || [],
            `${startedAttempt.id}:${question.id}:options`,
            question.type === 'multiple-choice' && exam.randomizeOptions !== false
          );
        }

        let restoredAnswers = {};
        let restoredIndex = 0;
        try {
          const savedState = JSON.parse(localStorage.getItem(`exam_attempt_state_${user?.id}_${startedAttempt.id}`) || 'null');
          if (savedState?.attemptId === startedAttempt.id) {
            restoredAnswers = savedState.answers || {};
            restoredIndex = Math.min(Math.max(Number(savedState.currentQuestionIndex) || 0, 0), orderedQuestions.length - 1);
          }
        } catch {}

        setAttempt(startedAttempt);
        setQuestions(orderedQuestions);
        setOptionOrder(orderedOptions);
        setAnswers(restoredAnswers);
        setCurrentQuestionIndex(restoredIndex);
        setTimeLeft(Math.max(0, Math.ceil((new Date(startedAttempt.deadlineAt).getTime() - Date.now()) / 1000)));
        setPhase('exam');
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || 'Unable to start this exam.');
          setPhase('error');
        }
      }
    };
    loadAttempt();
    return () => { cancelled = true; };
  }, [exam.id, exam.randomizeOptions, exam.randomizeQuestions, user?.id]);

  useEffect(() => {
    if (phase !== 'exam' || !attempt?.deadlineAt) return undefined;
    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((new Date(attempt.deadlineAt).getTime() - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0 && exam.autoSubmitOnTimeUp !== false && !submissionStarted.current) {
        submitExam(true);
      }
    };
    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [phase, attempt?.deadlineAt, exam.autoSubmitOnTimeUp]);

  useEffect(() => {
    if (!storageKey || phase !== 'exam') return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ attemptId: attempt.id, answers, currentQuestionIndex }));
    } catch {}
  }, [storageKey, attempt?.id, answers, currentQuestionIndex, phase]);

  const setAnswer = (questionId, value) => {
    if (submitting) return;
    setAnswers(previous => ({ ...previous, [questionId]: value }));
  };

  const answeredCount = questions.filter(question => String(answers[question.id] || '').trim()).length;

  const submitExam = async (automatic = false) => {
    if (!attempt || submissionStarted.current) return;
    if (!automatic && answeredCount < questions.length && !window.confirm(`Submit with ${questions.length - answeredCount} unanswered question(s)?`)) {
      return;
    }
    submissionStarted.current = true;
    setSubmitting(true);
    setError('');
    try {
      const payloadAnswers = {};
      for (const question of questions) {
        const answer = answers[question.id];
        if (answer !== undefined && answer !== null) payloadAnswers[question.id] = String(answer).trim();
      }
      const saved = await dataService.submitExamResult({ examId: exam.id, attemptId: attempt.id, answers: payloadAnswers });
      const finalResult = saved.alreadySubmitted && saved.id ? await dataService.getResultById(saved.id) : saved;
      try { if (storageKey) localStorage.removeItem(storageKey); } catch {}
      setSubmittedResult(finalResult);
      setPhase('results');
    } catch (submitError) {
      submissionStarted.current = false;
      setError(submitError.message || 'Submission failed. Your answers remain available; try submitting again.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const currentOptions = currentQuestion ? (optionOrder[currentQuestion.id] || currentQuestion.options || []) : [];
  const isChoiceQuestion = ['multiple-choice', 'true-false'].includes(currentQuestion?.type);
  const canGoBack = exam.allowBackNavigation !== false;

  if (phase === 'loading') {
    return (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700">Preparing your exam session...</p>
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Unable to Start Exam</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Back to Dashboard</button>
        </div>
      </div>
    );
  }

  if (phase === 'results') {
    const percentage = Number(submittedResult?.percentage ?? submittedResult?.score ?? 0);
    return (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl text-green-600">✓</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Exam Submitted</h2>
          <p className="text-gray-600 mb-6">Your result was recorded by the server.</p>
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="text-3xl font-bold text-blue-600">{Number.isFinite(percentage) ? percentage.toFixed(1) : '0.0'}%</div>
            {submittedResult?.score !== undefined && submittedResult?.maxScore !== undefined && (
              <div className="text-sm text-gray-600 mt-1">{submittedResult.score} / {submittedResult.maxScore} points</div>
            )}
            {submittedResult?.status && <div className="text-xs text-gray-500 mt-2">Status: {String(submittedResult.status).replace('_', ' ')}</div>}
          </div>
          <button onClick={onClose} className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Back to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      <div className="bg-blue-600 text-white p-4">
        <div className="max-w-5xl mx-auto flex justify-between items-center gap-4">
          <div className="min-w-0">
            <h1 className="text-lg font-bold truncate">{exam.title}</h1>
            <p className="text-blue-100 text-sm truncate">{exam.institutionName || user?.institutionName || 'Examination'}</p>
          </div>
          <div className="text-right shrink-0">
            <div className={`text-2xl font-mono font-bold ${timeLeft < 300 ? 'text-red-200' : ''}`}>{formatTime(timeLeft)}</div>
            <div className="text-xs text-blue-100">Server time remaining</div>
          </div>
        </div>
      </div>

      {exam.showProgressBar !== false && (
        <div className="bg-gray-200 h-2">
          <div className="bg-blue-600 h-2 transition-all" style={{ width: `${questions.length ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0}%` }} />
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">{error}</div>}
          <div className="bg-white border rounded-lg shadow-sm p-5 md:p-6">
            <div className="flex justify-between items-start gap-4 mb-5">
              <h2 className="text-lg font-semibold text-gray-900">Question {currentQuestionIndex + 1} of {questions.length}</h2>
              <span className="text-sm text-gray-500">{currentQuestion?.points || 1} point{(currentQuestion?.points || 1) === 1 ? '' : 's'}</span>
            </div>
            <p className="text-gray-900 text-lg leading-relaxed mb-6 whitespace-pre-wrap">{currentQuestion?.question}</p>

            {isChoiceQuestion && (
              <div className="space-y-3">
                {currentOptions.map((option, index) => (
                  <label key={index} className="flex items-start gap-3 p-3 border rounded-md cursor-pointer hover:bg-blue-50">
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      value={option}
                      checked={answers[currentQuestion.id] === option}
                      onChange={(event) => setAnswer(currentQuestion.id, event.target.value)}
                      disabled={submitting}
                      className="mt-1 h-4 w-4 text-blue-600"
                    />
                    <span className="text-gray-800"><span className="font-medium mr-2">{String.fromCharCode(65 + index)}.</span>{option}</span>
                  </label>
                ))}
              </div>
            )}

            {currentQuestion?.type === 'short-answer' && (
              <input
                type="text"
                value={answers[currentQuestion.id] || ''}
                onChange={(event) => setAnswer(currentQuestion.id, event.target.value)}
                disabled={submitting}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Type your answer"
              />
            )}

            {currentQuestion?.type === 'essay' && (
              <textarea
                rows={12}
                value={answers[currentQuestion.id] || ''}
                onChange={(event) => setAnswer(currentQuestion.id, event.target.value)}
                disabled={submitting}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Write your answer here"
              />
            )}
          </div>
        </div>
      </div>

      <div className="border-t bg-white p-4">
        <div className="max-w-5xl mx-auto flex flex-col gap-3">
          <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
            {questions.map((question, index) => (
              <button
                key={question.id}
                type="button"
                onClick={() => (canGoBack || index > currentQuestionIndex) && setCurrentQuestionIndex(index)}
                disabled={!canGoBack && index < currentQuestionIndex}
                className={`w-9 h-9 rounded border text-sm font-medium ${index === currentQuestionIndex ? 'bg-blue-600 text-white border-blue-600' : answers[question.id] ? 'bg-green-100 text-green-800 border-green-300' : 'bg-white text-gray-700 border-gray-300'} disabled:opacity-40`}
              >
                {index + 1}
              </button>
            ))}
          </div>
          <div className="flex justify-between items-center gap-3">
            <div className="text-sm text-gray-600">Answered {answeredCount} of {questions.length}</div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))} disabled={!canGoBack || currentQuestionIndex === 0 || submitting} className="px-4 py-2 border rounded-md disabled:opacity-50">Previous</button>
              {currentQuestionIndex < questions.length - 1 ? (
                <button type="button" onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)} disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">Next</button>
              ) : (
                <button type="button" onClick={() => submitExam(false)} disabled={submitting} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50">{submitting ? 'Submitting...' : 'Submit Exam'}</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamInterface;
