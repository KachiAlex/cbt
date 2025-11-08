import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from './Toast';
import { ButtonSpinner } from './LoadingSpinner';

const LS_KEYS = {
  QUESTIONS: "cbt_questions_v1",
  RESULTS: "cbt_results_v1",
  ACTIVE_EXAM: "cbt_active_exam_v1",
  EXAM_PROGRESS: "cbt_exam_progress_v1",
};

const EnhancedExam = ({ user, tenant, onComplete }) => {
  const [questions, setQuestions] = useState([]);
  const [examTitle, setExamTitle] = useState('');
  const [answers, setAnswers] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [examDuration, setExamDuration] = useState(0); // Duration in minutes
  const [examStarted, setExamStarted] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState(null);
  
  const toast = useToast();
  const autoSaveRef = useRef(null);
  const progressRef = useRef(null);

  // Auto-save answers every 30 seconds
  const autoSave = useCallback(() => {
    if (autoSaveEnabled && examStarted && !submitted) {
      try {
        const progressData = {
          answers: answers,
          currentQuestion: currentQuestion,
          timeLeft: timeLeft,
          examTitle: examTitle,
          lastSaved: new Date().toISOString()
        };
        localStorage.setItem(LS_KEYS.EXAM_PROGRESS, JSON.stringify(progressData));
        setLastSaved(new Date().toLocaleTimeString());
        console.log('💾 Auto-saved exam progress');
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }
  }, [autoSaveEnabled, examStarted, submitted, answers, currentQuestion, timeLeft, examTitle]);

  // Load saved progress
  const loadProgress = useCallback(() => {
    try {
      const saved = localStorage.getItem(LS_KEYS.EXAM_PROGRESS);
      if (saved) {
        const progress = JSON.parse(saved);
        if (progress.examTitle === examTitle) {
          setAnswers(progress.answers || []);
          setCurrentQuestion(progress.currentQuestion || 0);
          setTimeLeft(progress.timeLeft || 0);
          setLastSaved(progress.lastSaved ? new Date(progress.lastSaved).toLocaleTimeString() : null);
          return true;
        }
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    }
    return false;
  }, [examTitle]);

  const handleSubmit = useCallback(() => {
    let correctAnswers = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.correctIndex) correctAnswers++;
    });

    const finalScore = correctAnswers;
    setScore(finalScore);
    setSubmitted(true);

    // Save result
    const result = {
      username: user.username,
      fullName: user.fullName || user.username,
      score: finalScore,
      total: questions.length,
      percent: Math.round((finalScore / questions.length) * 100),
      submittedAt: new Date().toISOString(),
      answers: answers,
      examTitle: examTitle,
      timeTaken: (examDuration * 60) - timeLeft,
      tenant: tenant?.name || 'Unknown Institution'
    };

    try {
      const existingResults = JSON.parse(localStorage.getItem(LS_KEYS.RESULTS) || '[]');
      existingResults.push(result);
      localStorage.setItem(LS_KEYS.RESULTS, JSON.stringify(existingResults));
      
      // Clear progress
      localStorage.removeItem(LS_KEYS.EXAM_PROGRESS);
      
      toast.success(`Exam submitted! Score: ${finalScore}/${questions.length} (${Math.round((finalScore / questions.length) * 100)}%)`);
    } catch (error) {
      console.error('Error saving result:', error);
      toast.error('Error saving exam result');
    }
  }, [questions, answers, user.username, user.fullName, examTitle, timeLeft, examDuration, tenant?.name, toast]);

  useEffect(() => {
    loadExamData();
  }, []);

  useEffect(() => {
    if (examStarted && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (examStarted && timeLeft === 0) {
      handleSubmit(); // Auto-submit when time runs out
    }
  }, [examStarted, timeLeft, handleSubmit]);

  // Auto-save effect
  useEffect(() => {
    if (autoSaveEnabled && examStarted && !submitted) {
      autoSaveRef.current = setInterval(autoSave, 30000); // Every 30 seconds
      return () => {
        if (autoSaveRef.current) clearInterval(autoSaveRef.current);
      };
    }
  }, [autoSave, autoSaveEnabled, examStarted, submitted]);

  const loadExamData = () => {
    try {
      const loadedQuestions = JSON.parse(localStorage.getItem(LS_KEYS.QUESTIONS) || '[]');
      
      // Try to load active exam data (including duration)
      let activeExamData = null;
      try {
        const activeExamJson = localStorage.getItem(LS_KEYS.ACTIVE_EXAM);
        if (activeExamJson) {
          activeExamData = JSON.parse(activeExamJson);
        }
      } catch (e) {
        console.warn('Could not parse active exam data, using fallback');
      }
      
      const loadedExamTitle = activeExamData?.title || 'Institution CBT – 12 Questions';
      const examDuration = activeExamData?.duration || loadedQuestions.length; // Default to 1 minute per question if no duration set
      
      if (loadedQuestions.length === 0) {
        setLoading(false);
        return;
      }

      setQuestions(loadedQuestions);
      setExamTitle(loadedExamTitle);
      setAnswers(new Array(loadedQuestions.length).fill(-1));
      setExamDuration(examDuration);
      setTimeLeft(examDuration * 60); // Convert minutes to seconds
      
      console.log('📝 Exam loaded:', {
        title: loadedExamTitle,
        duration: examDuration,
        questions: loadedQuestions.length,
        timeLeft: examDuration * 60
      });
      
      // Try to load saved progress
      if (loadProgress()) {
        toast.info('Resumed from saved progress');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading exam data:', error);
      setLoading(false);
    }
  };

  const startExam = () => {
    setExamStarted(true);
    toast.success('Exam started! Good luck!');
  };

  const onSelectAnswer = (questionIndex, optionIndex) => {
    const newAnswers = [...answers];
    newAnswers[questionIndex] = optionIndex;
    setAnswers(newAnswers);
    
    // Auto-save immediately when answer is selected
    if (autoSaveEnabled) {
      setTimeout(autoSave, 1000);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const goToQuestion = (index) => {
    setCurrentQuestion(index);
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const getProgressPercentage = () => {
    return Math.round(((currentQuestion + 1) / questions.length) * 100);
  };

  const getAnsweredCount = () => {
    return answers.filter(answer => answer !== -1).length;
  };

  const getTimeWarning = () => {
    if (timeLeft <= 300) return 'danger'; // 5 minutes
    if (timeLeft <= 600) return 'warning'; // 10 minutes
    return 'normal';
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!examStarted || submitted) return;
      
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        nextQuestion();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevQuestion();
      } else if (e.key >= '1' && e.key <= '4') {
        e.preventDefault();
        const optionIndex = parseInt(e.key) - 1;
        onSelectAnswer(currentQuestion, optionIndex);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [examStarted, submitted, currentQuestion, questions.length, onSelectAnswer]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-6xl mb-4">📝</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Exam Available</h2>
          <p className="text-gray-600 mb-4">
            There are no questions available for this exam. Please contact your instructor.
          </p>
          <button
            onClick={() => onComplete && onComplete()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!examStarted) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🎯</div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{examTitle}</h1>
              <p className="text-gray-600">Get ready to start your exam</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="font-semibold text-blue-900 mb-2">📊 Exam Details</h3>
                <ul className="text-blue-800 space-y-1">
                  <li>• {questions.length} questions</li>
                  <li>• {examDuration} minutes time limit</li>
                  <li>• Multiple choice format</li>
                  <li>• Auto-save enabled</li>
                </ul>
              </div>

              <div className="bg-green-50 rounded-lg p-6">
                <h3 className="font-semibold text-green-900 mb-2">💡 Tips</h3>
                <ul className="text-green-800 space-y-1">
                  <li>• Use arrow keys to navigate</li>
                  <li>• Press 1-4 to select answers</li>
                  <li>• Review all answers before submitting</li>
                  <li>• Your progress is auto-saved</li>
                </ul>
              </div>
            </div>

            {lastSaved && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-yellow-800">
                  <span className="font-semibold">💾 Last saved:</span> {lastSaved}
                </p>
              </div>
            )}

            <div className="text-center">
              <button
                onClick={startExam}
                className="bg-green-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-green-700 transition-colors shadow-lg"
              >
                Start Exam
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Exam Completed!</h1>
            
            <div className="bg-blue-50 rounded-lg p-6 mb-6">
              <h2 className="text-2xl font-bold text-blue-900 mb-2">Your Score</h2>
              <div className="text-4xl font-bold text-blue-600 mb-2">
                {score}/{questions.length}
              </div>
              <div className="text-xl text-blue-800">
                {Math.round((score / questions.length) * 100)}%
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="font-semibold text-gray-700">Time Taken</div>
                <div className="text-gray-600">{formatTime((examDuration * 60) - timeLeft)}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="font-semibold text-gray-700">Questions Answered</div>
                <div className="text-gray-600">{getAnsweredCount()}/{questions.length}</div>
              </div>
            </div>

            <button
              onClick={() => onComplete && onComplete()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];
  const timeWarning = getTimeWarning();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{examTitle}</h1>
              <p className="text-sm text-gray-600">
                Question {currentQuestion + 1} of {questions.length}
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Progress */}
              <div className="hidden sm:block">
                <div className="text-sm text-gray-600 mb-1">Progress</div>
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${getProgressPercentage()}%` }}
                  ></div>
                </div>
              </div>

              {/* Timer */}
              <div className={`px-4 py-2 rounded-lg font-mono text-lg font-bold ${
                timeWarning === 'danger' ? 'bg-red-100 text-red-800' :
                timeWarning === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {formatTime(timeLeft)}
              </div>

              {/* Auto-save indicator */}
              {lastSaved && (
                <div className="text-xs text-gray-500">
                  Saved: {lastSaved}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Question Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-4 sticky top-4">
              <h3 className="font-semibold text-gray-900 mb-3">Questions</h3>
              <div className="grid grid-cols-4 lg:grid-cols-2 gap-2">
                {questions.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToQuestion(index)}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                      index === currentQuestion
                        ? 'bg-blue-600 text-white'
                        : answers[index] !== -1
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Answered:</span>
                    <span className="font-semibold">{getAnsweredCount()}/{questions.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Question Area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Question {currentQuestion + 1}
                  </h2>
                  <div className="text-sm text-gray-500">
                    {answers[currentQuestion] !== -1 ? '✅ Answered' : '⭕ Not answered'}
                  </div>
                </div>
                
                <p className="text-gray-800 text-lg leading-relaxed mb-6">
                  {currentQ.text}
                </p>
              </div>

              <div className="space-y-3">
                {currentQ.options.map((option, index) => (
                  <label
                    key={index}
                    className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      answers[currentQuestion] === index
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${currentQuestion}`}
                      value={index}
                      checked={answers[currentQuestion] === index}
                      onChange={() => onSelectAnswer(currentQuestion, index)}
                      className="sr-only"
                    />
                    <div className="flex items-center">
                      <div className={`w-6 h-6 rounded-full border-2 mr-3 flex items-center justify-center ${
                        answers[currentQuestion] === index
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300'
                      }`}>
                        {answers[currentQuestion] === index && (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        )}
                      </div>
                      <span className="text-gray-800">{option}</span>
                    </div>
                  </label>
                ))}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t">
                <button
                  onClick={prevQuestion}
                  disabled={currentQuestion === 0}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Previous
                </button>

                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowReview(true)}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                  >
                    Review Answers
                  </button>
                  
                  <button
                    onClick={handleSubmit}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                  >
                    Submit Exam
                  </button>
                </div>

                <button
                  onClick={nextQuestion}
                  disabled={currentQuestion === questions.length - 1}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {showReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Review Your Answers</h2>
                <button
                  onClick={() => setShowReview(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid gap-4">
                {questions.map((question, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-gray-900">
                        Question {index + 1}
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs ${
                        answers[index] !== -1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {answers[index] !== -1 ? 'Answered' : 'Not answered'}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-2">{question.text}</p>
                    {answers[index] !== -1 && (
                      <p className="text-sm text-blue-600">
                        Your answer: {question.options[answers[index]]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <button
                  onClick={() => setShowReview(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Continue Exam
                </button>
                <button
                  onClick={() => {
                    setShowReview(false);
                    handleSubmit();
                  }}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Submit Exam
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedExam;
