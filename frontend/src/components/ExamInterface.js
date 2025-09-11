import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import { scoreEssayAnswer, aggregateEssayScores } from '../utils/essayScorer';

const ExamInterface = ({ user, exam: propExam, onComplete }) => {
  const [exam, setExam] = useState(propExam);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [examStarted, setExamStarted] = useState(false);
  const [examCompleted, setExamCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load exam from localStorage if not provided as prop
    if (!exam) {
      const storedExam = localStorage.getItem('selected_exam');
      if (storedExam) {
        const parsedExam = JSON.parse(storedExam);
        setExam(parsedExam);
        setTimeLeft(parsedExam.duration * 60);
      }
    } else {
      setTimeLeft(exam.duration * 60);
    }
  }, [exam]);

  // Deterministic PRNG based on seed (mulberry32)
  const mulberry32 = (seed) => {
    let t = seed >>> 0;
    return () => {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), t | 1);
      r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  };

  const stringToSeed = (str) => {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    return h >>> 0;
  };

  const shuffleArray = (array, rand) => {
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const getPersistKey = () => `cbt_order_${exam.id}_${user.id}`;

  const applyRandomization = (loadedQuestions) => {
    // Flags could come from exam or institution settings; default to true for both
    const randomizeQuestions = exam?.randomizeQuestions !== false;
    const randomizeOptions = exam?.randomizeOptions !== false;

    const persistKey = getPersistKey();
    const persisted = localStorage.getItem(persistKey);

    if (persisted) {
      try {
        const saved = JSON.parse(persisted);
        const idToQuestion = new Map(loadedQuestions.map(q => [q.id, q]));
        const reordered = saved.questionOrder
          .map(qid => idToQuestion.get(qid))
          .filter(Boolean);
        // Fallback if mismatch
        const baseQuestions = reordered.length ? reordered : loadedQuestions;
        const withOptionOrders = baseQuestions.map(q => {
          const order = saved.optionOrders?.[q.id];
          if (randomizeOptions && Array.isArray(order) && q.options) {
            const opts = order.map(idx => q.options[idx]).filter(v => v !== undefined);
            return { ...q, options: opts };
          }
          return q;
        });
        return withOptionOrders;
      } catch (_) {
        // fall through to fresh generation
      }
    }

    // Generate deterministic per-student order
    const seed = stringToSeed(`${exam.id}::${user.id}`);
    const rand = mulberry32(seed);

    let questionOrder = loadedQuestions.slice();
    if (randomizeQuestions) {
      questionOrder = shuffleArray(questionOrder, rand);
    }

    const optionOrders = {};
    const randomized = questionOrder.map(q => {
      if (randomizeOptions && Array.isArray(q.options)) {
        const indices = q.options.map((_, idx) => idx);
        const shuffledIdx = shuffleArray(indices, rand);
        optionOrders[q.id] = shuffledIdx;
        const newOptions = shuffledIdx.map(i => q.options[i]);
        return { ...q, options: newOptions };
      }
      return q;
    });

    // Persist mapping to ensure consistency for this attempt
    try {
      const saved = {
        questionOrder: randomized.map(q => q.id),
        optionOrders
      };
      localStorage.setItem(persistKey, JSON.stringify(saved));
    } catch (_) {
      // ignore persistence failures
    }

    return randomized;
  };

  useEffect(() => {
    loadExamQuestions();
  }, [exam]);

  useEffect(() => {
    let timer;
    if (examStarted && timeLeft > 0 && !examCompleted) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleSubmitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [examStarted, timeLeft, examCompleted]);

  const loadExamQuestions = async () => {
    if (!exam || !exam.id) {
      setLoading(false);
      return;
    }
    
    try {
      const examQuestions = await dataService.getQuestions(exam.id);
      console.log('🔍 Loaded questions from Firestore:', examQuestions);
      console.log('🔍 First question structure:', examQuestions[0]);
      const randomized = applyRandomization(examQuestions || []);
      setQuestions(randomized);
      setLoading(false);
    } catch (error) {
      console.error('Error loading questions:', error);
      setLoading(false);
    }
  };

  const startExam = () => {
    setExamStarted(true);
  };

  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmitExam = async () => {
    try {
      setExamCompleted(true);
      // Clear persisted order for a fresh start on next attempt
      try { localStorage.removeItem(getPersistKey()); } catch (_) {}
      
      const isEssayExam = String(exam?.type || '').toLowerCase() === 'essay';
      
      // Calculate score for non-essay; for essay mark as pending
      let correctAnswers = 0;
      let essayAggregate = null;
      if (!isEssayExam) {
      questions.forEach(question => {
        if (answers[question.id] === question.correctAnswer) {
          correctAnswers++;
        }
      });
      } else {
        // Essay: compute heuristic per-question provisional scores
        const perQuestion = questions.map(q => {
          const answerText = answers[q.id] || '';
          const rubricKeywords = q.rubricKeywords || '';
          const minWords = q.minWords || 50;
          const modelAnswer = q.modelAnswer || '';
          return scoreEssayAnswer(answerText, rubricKeywords, minWords, modelAnswer);
        });
        essayAggregate = aggregateEssayScores(perQuestion);
      }
      const score = isEssayExam ? (essayAggregate?.percent ?? null) : Math.round((correctAnswers / questions.length) * 100);
      
      // Save result
      const result = {
        examId: exam.id,
        examTitle: exam.title,
        userId: user.id,
        studentName: user.fullName || user.username,
        answers: answers,
        score: score,
        totalQuestions: questions.length,
        correctAnswers: correctAnswers,
        timeSpent: (exam.duration * 60) - timeLeft,
        status: isEssayExam ? (essayAggregate && essayAggregate.confidence >= 0.7 ? 'provisional' : 'pending_review') : 'completed',
        provisional: isEssayExam ? { percent: essayAggregate?.percent ?? null, confidence: essayAggregate?.confidence ?? 0 } : undefined
      };
      
      await dataService.saveExamResult(result);
      
    } catch (error) {
      console.error('Error submitting exam:', error);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Questions Available</h2>
          <p className="text-gray-600 mb-6">This exam has no questions yet.</p>
          <button
            onClick={onComplete}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            Return to Portal
          </button>
        </div>
      </div>
    );
  }

  if (!examStarted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">{exam.title}</h2>
          
          <div className="space-y-4 mb-8">
            <div className="flex justify-between">
              <span className="font-medium text-gray-700">Duration:</span>
              <span className="text-gray-600">{exam.duration} minutes</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-700">Questions:</span>
              <span className="text-gray-600">{questions.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-700">Instructions:</span>
            </div>
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-gray-700">{exam.instructions || 'Answer all questions to the best of your ability. Good luck!'}</p>
            </div>
          </div>
          
          <div className="text-center">
            <button
              onClick={startExam}
              className="bg-indigo-600 text-white px-8 py-3 rounded-md hover:bg-indigo-700 text-lg font-medium"
            >
              Start Exam
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (examCompleted) {
    const isEssay = String(exam?.type || '').toLowerCase() === 'essay';
    if (isEssay) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Exam Submitted</h2>
            <div className="text-6xl mb-4">📬</div>
            <p className="text-lg text-gray-700 mb-2">Thank you for completing the exam.</p>
            <p className="text-gray-600">Your result will be communicated by the school authorities.</p>
            <div className="mt-8">
              <button
                onClick={onComplete}
                className="bg-indigo-600 text-white px-8 py-3 rounded-md hover:bg-indigo-700 text-lg font-medium"
              >
                Return to Portal
              </button>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Exam Submitted</h2>
          <div className="text-6xl mb-4">📬</div>
          <p className="text-lg text-gray-700 mb-2">Thank you for completing the exam.</p>
          <p className="text-gray-600">Your result will be communicated by the school authorities.</p>
          <div className="mt-8">
          <button
            onClick={onComplete}
            className="bg-indigo-600 text-white px-8 py-3 rounded-md hover:bg-indigo-700 text-lg font-medium"
          >
            Return to Portal
          </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  
  console.log('🔍 Current question:', currentQuestion);
  console.log('🔍 Current question options:', currentQuestion?.options);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{exam.title}</h1>
              <p className="text-sm sm:text-base text-gray-600">Question {currentQuestionIndex + 1} of {questions.length}</p>
            </div>
            <div className="text-left sm:text-right flex-shrink-0">
              <div className="text-xl sm:text-2xl font-bold text-red-600">
                {formatTime(timeLeft)}
              </div>
              <div className="text-xs sm:text-sm text-gray-500">Time Remaining</div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-8">
          <div className="mb-6 sm:mb-8">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 leading-relaxed">
              {currentQuestion.question}
            </h2>
            
            <div className="space-y-3">
              {currentQuestion.options && currentQuestion.options.length > 0 ? (
                currentQuestion.options.map((option, index) => (
                  <label key={index} className="flex items-start p-3 sm:p-4 border-2 border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      value={option}
                      checked={answers[currentQuestion.id] === option}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      className="mr-3 mt-1 text-indigo-600 focus:ring-indigo-500 w-4 h-4 flex-shrink-0"
                    />
                    <span className="text-gray-700 text-sm sm:text-base leading-relaxed">{option}</span>
                  </label>
                ))
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-yellow-800 text-sm sm:text-base">⚠️ No options available for this question. Please contact your instructor.</p>
                  <p className="text-xs sm:text-sm text-yellow-700 mt-1">Question ID: {currentQuestion.id}</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <button
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
              className="w-full sm:w-auto px-4 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Previous
            </button>
            
            <div className="flex flex-wrap justify-center gap-2 max-w-full overflow-x-auto">
              {questions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full text-xs sm:text-sm font-medium flex-shrink-0 ${
                    index === currentQuestionIndex
                      ? 'bg-indigo-600 text-white'
                      : answers[questions[index].id]
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
            
            {currentQuestionIndex === questions.length - 1 ? (
              <button
                onClick={handleSubmitExam}
                className="w-full sm:w-auto px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
              >
                Submit Exam
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="w-full sm:w-auto px-4 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamInterface;
