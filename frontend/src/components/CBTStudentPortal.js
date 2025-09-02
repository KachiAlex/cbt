import React, { useState, useEffect } from 'react';
import dataService from '../services/dataService';

const LS_KEYS = {
  QUESTIONS: "cbt_questions_v1",
  RESULTS: "cbt_results_v1",
  ACTIVE_EXAM: "cbt_active_exam_v1",
};

const CBTStudentPortal = ({ user, institution, onLogout }) => {
  const [questions, setQuestions] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [allExams, setAllExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExamsData();
  }, []);

  useEffect(() => {
    if (!selectedExam) return;
    
    const originalQuestions = loadQuestionsForExam(selectedExam.id);
    if (originalQuestions.length > 0) {
      const limitedQuestions = originalQuestions.slice(0, selectedExam.questionCount);
      const randomizedQuestions = randomizeQuestions(limitedQuestions);
      setQuestions(randomizedQuestions);
      setAnswers(Array(randomizedQuestions.length).fill(-1));
    } else {
      setQuestions([]);
      setAnswers([]);
    }
  }, [selectedExam]);

  const loadExamsData = async () => {
    try {
      setLoading(true);
      const exams = await dataService.loadExams();
      const sorted = [...exams].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setAllExams(sorted);
    } catch (error) {
      console.error('Error loading exams:', error);
      setAllExams([]);
    } finally {
      setLoading(false);
    }
  };

  const randomizeQuestions = (originalQuestions) => {
    return originalQuestions.map(q => {
      const questionCopy = { ...q };
      const options = [...q.options];
      const correctAnswer = options[q.correctIndex];
      
      // Shuffle options
      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
      }
      
      const newCorrectIndex = options.indexOf(correctAnswer);
      return {
        ...questionCopy,
        options: options,
        correctIndex: newCorrectIndex,
        originalId: q.id
      };
    }).sort(() => Math.random() - 0.5);
  };

  const onSelect = (oi) => {
    setAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[currentQuestionIndex] = oi;
      return newAnswers;
    });
  };

  const goToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const goToQuestion = (index) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index);
    }
  };

  const onSubmit = async () => {
    let s = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.correctIndex) s++;
    });
    
    setScore(s);
    setSubmitted(true);

    const result = {
      username: user.username,
      score: s,
      total: questions.length,
      percent: Math.round((s / questions.length) * 100),
      submittedAt: new Date().toISOString(),
      answers,
      examTitle: selectedExam ? selectedExam.title : 'Institution CBT',
      questionOrder: questions.map(q => q.originalId),
      institutionSlug: institution.slug,
      institutionName: institution.name
    };

    try {
      const old = await dataService.loadResults();
      old.push(result);
      await dataService.saveResults(old);
    } catch (error) {
      console.error('Error saving result:', error);
      // Fallback to localStorage
      const old = JSON.parse(localStorage.getItem(LS_KEYS.RESULTS) || '[]');
      old.push(result);
      localStorage.setItem(LS_KEYS.RESULTS, JSON.stringify(old));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading exams...</p>
        </div>
      </div>
    );
  }

  // If no exam selected yet, show exams for selection
  if (!selectedExam) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-5xl mx-auto w-full px-3 sm:px-8 py-4 sm:py-8">
          <div className="bg-white rounded-2xl shadow p-6">
            <h3 className="text-lg font-bold mb-2">Available Exams</h3>
            {allExams.length === 0 ? (
              <p className="text-sm text-gray-600">No exams found. Please contact your administrator.</p>
            ) : (
              <div className="space-y-3">
                {allExams.map(exam => (
                  <div key={exam.id} className="border rounded-xl p-4 flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">{exam.title}</h4>
                      <p className="text-sm text-gray-600">{exam.description}</p>
                      <div className="flex gap-4 mt-2 text-xs text-gray-500">
                        <span>Questions: {exam.questionCount || 0}</span>
                        <span>Duration: {exam.duration} minutes</span>
                        {exam.isActive ? (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Active</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">Past</span>
                        )}
                        <span>Created: {new Date(exam.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedExam(exam)}
                      className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm h-fit"
                    >
                      Start Exam
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-5xl mx-auto w-full px-3 sm:px-8 py-4 sm:py-8">
          <div className="bg-white rounded-2xl shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold mb-2">No Questions Available</h3>
                <p className="text-sm text-gray-600">The exam "{selectedExam.title}" has no questions. Please contact your administrator.</p>
              </div>
              <button
                onClick={() => setSelectedExam(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 text-sm"
              >
                ← Back to Exams
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-5xl mx-auto w-full px-3 sm:px-8 py-4 sm:py-8">
          <div className="bg-white rounded-2xl shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold mb-2">Exam Completed!</h3>
                <p className="mb-2">Exam: <b>{selectedExam.title}</b></p>
                <p className="mb-4">Score: <b>{score}</b> / {questions.length} ({Math.round((score / questions.length) * 100)}%)</p>
                <p className="text-sm text-gray-600">You may close this page. Your result has been recorded.</p>
              </div>
              <button
                onClick={() => setSelectedExam(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 text-sm"
              >
                ← Back to Exams
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const currentQ = questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-5xl mx-auto w-full px-3 sm:px-8 py-4 sm:py-8">
        {/* Exam Header */}
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-bold mb-1">{selectedExam.title}</h3>
              <p className="text-sm text-gray-600 mb-2">{selectedExam.description}</p>
              <div className="flex gap-4 text-xs text-gray-500 mb-2">
                <span>Duration: {selectedExam.duration} minutes</span>
                <span>Questions: {questions.length}</span>
                <span>Current: {currentQuestionIndex + 1} of {questions.length}</span>
              </div>
              <p className="text-xs text-emerald-600">⚠️ Questions are randomized for each student</p>
            </div>
            <button
              onClick={() => setSelectedExam(null)}
              className="px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 text-sm"
            >
              ← Back to Exams
            </button>
          </div>
        </div>

        {/* Question Navigation */}
        <div className="bg-white rounded-2xl shadow p-4 mb-6">
          <div className="flex flex-wrap gap-2 mb-4">
            {questions.map((_, index) => (
              <button
                key={index}
                onClick={() => goToQuestion(index)}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                  index === currentQuestionIndex
                    ? 'bg-emerald-600 text-white'
                    : answers[index] !== -1
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={`Question ${index + 1}${answers[index] !== -1 ? ' (Answered)' : ''}`}
              >
                {index + 1}
              </button>
            ))}
          </div>
          <div className="text-xs text-gray-500">
            <span className="inline-block w-3 h-3 bg-emerald-100 border border-emerald-300 rounded mr-1"></span>
            Answered • 
            <span className="inline-block w-3 h-3 bg-gray-100 rounded ml-2 mr-1"></span>
            Not Answered
          </div>
        </div>

        {/* Current Question */}
        {questions.length > 0 && (
          <div className="bg-white rounded-2xl shadow p-6">
            <div className="flex items-start gap-2 mb-4">
              <span className="text-sm font-bold bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
            </div>
            <p className="font-medium text-lg mb-6">{currentQ.text}</p>
            
            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              {currentQ.options.map((opt, optionIndex) => (
                <label 
                  key={optionIndex} 
                  className={`border-2 rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-all hover:border-emerald-300 ${
                    answers[currentQuestionIndex] === optionIndex 
                      ? "border-emerald-500 bg-emerald-50" 
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <input 
                    type="radio" 
                    name={`q-${currentQ.id}`} 
                    checked={answers[currentQuestionIndex] === optionIndex} 
                    onChange={() => onSelect(optionIndex)} 
                    className="w-4 h-4 text-emerald-600"
                  />
                  <span className="font-medium">
                    {String.fromCharCode(65 + optionIndex)}. {opt}
                  </span>
                </label>
              ))}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center">
              <button 
                onClick={goToPreviousQuestion}
                disabled={currentQuestionIndex === 0}
                className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                  currentQuestionIndex === 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                ← Previous
              </button>

              <div className="text-sm text-gray-600">
                {answers.filter(a => a !== -1).length} of {questions.length} answered
              </div>

              {currentQuestionIndex === questions.length - 1 ? (
                <button 
                  onClick={onSubmit}
                  className="px-6 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-semibold transition-colors"
                >
                  Submit Exam
                </button>
              ) : (
                <button 
                  onClick={goToNextQuestion}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-medium transition-colors"
                >
                  Next →
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

// Utility Functions
function loadQuestionsForExam(examId) {
  const raw = localStorage.getItem(`cbt_questions_${examId}`);
  if (!raw) return [];
  try {
    const q = JSON.parse(raw);
    return Array.isArray(q) ? q : [];
  } catch { 
    return []; 
  }
}

export default CBTStudentPortal;
