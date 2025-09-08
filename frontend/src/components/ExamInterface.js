import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';

const ExamInterface = ({ user, exam, onComplete }) => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(exam.duration * 60); // Convert to seconds
  const [examStarted, setExamStarted] = useState(false);
  const [examCompleted, setExamCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExamQuestions();
  }, [exam.id]);

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
    try {
      const examQuestions = await dataService.getQuestions(exam.id);
      setQuestions(examQuestions);
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
      
      // Calculate score
      let correctAnswers = 0;
      questions.forEach(question => {
        if (answers[question.id] === question.correctAnswer) {
          correctAnswers++;
        }
      });
      
      const score = Math.round((correctAnswers / questions.length) * 100);
      
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
        timeSpent: (exam.duration * 60) - timeLeft
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
    const result = questions.reduce((acc, question) => {
      if (answers[question.id] === question.correctAnswer) {
        acc.correct++;
      }
      return acc;
    }, { correct: 0 });
    
    const score = Math.round((result.correct / questions.length) * 100);
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Exam Completed!</h2>
          
          <div className="space-y-4 mb-8">
            <div className="text-6xl mb-4">
              {score >= 70 ? '🎉' : '📝'}
            </div>
            <div className="text-4xl font-bold text-gray-900">
              {score}%
            </div>
            <div className={`text-xl font-medium ${score >= 70 ? 'text-green-600' : 'text-red-600'}`}>
              {score >= 70 ? 'Congratulations! You passed!' : 'You need to improve. Keep studying!'}
            </div>
            <div className="text-gray-600">
              {result.correct} out of {questions.length} questions correct
            </div>
          </div>
          
          <button
            onClick={onComplete}
            className="bg-indigo-600 text-white px-8 py-3 rounded-md hover:bg-indigo-700 text-lg font-medium"
          >
            Return to Portal
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{exam.title}</h1>
              <p className="text-gray-600">Question {currentQuestionIndex + 1} of {questions.length}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-red-600">
                {formatTime(timeLeft)}
              </div>
              <div className="text-sm text-gray-500">Time Remaining</div>
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

      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {currentQuestion.question}
            </h2>
            
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => (
                <label key={index} className="flex items-center p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name={`question-${currentQuestion.id}`}
                    value={option}
                    checked={answers[currentQuestion.id] === option}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                    className="mr-3 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-gray-700">{option}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <button
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            <div className="flex space-x-2">
              {questions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`w-8 h-8 rounded-full text-sm font-medium ${
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
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Submit Exam
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
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
