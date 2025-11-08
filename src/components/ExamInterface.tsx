import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './ExamInterface.css';

interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  points: number;
}

interface Exam {
  id: string;
  title: string;
  description: string;
  duration: number;
  questions: Question[];
  isActive: boolean;
  createdAt: string;
}

const ExamInterface: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [exam, setExam] = useState<Exam | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [questionId: string]: number }>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    // Load exam data
    const savedExams = localStorage.getItem('cbt_exams');
    if (savedExams && examId) {
      try {
        const exams: Exam[] = JSON.parse(savedExams);
        const foundExam = exams.find(e => e.id === examId);
        if (foundExam) {
          // Normalize exam data to ensure correctAnswer is always a number
          const normalizedExam: Exam = {
            ...foundExam,
            questions: foundExam.questions.map(q => ({
              ...q,
              correctAnswer: Number(q.correctAnswer) || 0,
              points: Number(q.points) || 1,
              // Ensure options is an array
              options: Array.isArray(q.options) ? q.options : []
            })).filter(q => q.id && q.text && q.options.length > 0) // Filter out invalid questions
          };
          
          setExam(normalizedExam);
          setTimeLeft(normalizedExam.duration * 60); // Convert minutes to seconds
        }
      } catch (error) {
        console.error('Error loading exam data:', error);
      }
    }
  }, [examId]);

  useEffect(() => {
    if (timeLeft > 0 && !isSubmitted) {
      const timer = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !isSubmitted && exam && user) {
      handleSubmitExam();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, isSubmitted, exam, user]);

  const handleAnswerSelect = (questionId: string, answerIndex: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answerIndex
    }));
  };

  const handleNextQuestion = () => {
    if (exam && currentQuestionIndex < exam.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmitExam = () => {
    if (!exam || !user) {
      console.error('Cannot submit exam: missing exam or user data');
      return;
    }

    // Validate exam has questions
    if (!exam.questions || exam.questions.length === 0) {
      console.error('Cannot submit exam: exam has no questions');
      alert('Error: This exam has no questions. Please contact your administrator.');
      return;
    }

    // Calculate score with proper type handling
    let totalScore = 0;
    let correctAnswers = 0;
    const scoringDetails: Array<{ questionId: string; userAnswer: number | undefined; correctAnswer: number; isCorrect: boolean }> = [];

    exam.questions.forEach(question => {
      // Ensure question has required fields
      if (!question.id || question.correctAnswer === undefined || question.correctAnswer === null) {
        console.warn(`Question missing required fields:`, question);
        return;
      }

      const userAnswer = answers[question.id];
      
      // Convert both to numbers for comparison (handles string/number mismatches)
      const userAnswerNum = userAnswer !== undefined && userAnswer !== null ? Number(userAnswer) : null;
      const correctAnswerNum = Number(question.correctAnswer);
      
      // Check if answer is correct (only if user provided an answer)
      const isCorrect = userAnswerNum !== null && userAnswerNum === correctAnswerNum;
      
      if (isCorrect) {
        const points = Number(question.points) || 1;
        totalScore += points;
        correctAnswers++;
      }

      scoringDetails.push({
        questionId: question.id,
        userAnswer: userAnswerNum !== null ? userAnswerNum : undefined,
        correctAnswer: correctAnswerNum,
        isCorrect
      });
    });

    // Log scoring details for debugging
    console.log('Exam Scoring Details:', {
      examId: exam.id,
      examTitle: exam.title,
      totalQuestions: exam.questions.length,
      answeredQuestions: Object.keys(answers).length,
      correctAnswers,
      totalScore,
      scoringDetails
    });

    // Calculate max score
    const maxScore = exam.questions.reduce((sum, q) => {
      const points = Number(q.points) || 1;
      return sum + points;
    }, 0);

    const result = {
      examId: exam.id,
      studentId: user.id,
      studentName: user.name,
      examTitle: exam.title,
      totalQuestions: exam.questions.length,
      correctAnswers,
      totalScore,
      maxScore,
      answers,
      submittedAt: new Date().toISOString(),
      timeSpent: exam.duration * 60 - timeLeft
    };

    // Validate result before saving
    if (result.totalQuestions === 0) {
      console.error('Invalid result: exam has no questions');
      alert('Error: Unable to calculate score. Please contact your administrator.');
      return;
    }

    // Save result
    try {
      const savedResults = localStorage.getItem('cbt_results');
      const results = savedResults ? JSON.parse(savedResults) : [];
      results.push(result);
      localStorage.setItem('cbt_results', JSON.stringify(results));
    } catch (error) {
      console.error('Error saving result to localStorage:', error);
      alert('Error saving exam result. Please contact your administrator.');
      return;
    }

    // Mark exam as completed for this student
    try {
      const completedKey = `cbt_completed_${user.id}`;
      const completedExams = JSON.parse(localStorage.getItem(completedKey) || '[]');
      if (!completedExams.includes(exam.id)) {
        completedExams.push(exam.id);
        localStorage.setItem(completedKey, JSON.stringify(completedExams));
      }
    } catch (error) {
      console.error('Error marking exam as completed:', error);
    }

    setIsSubmitted(true);
    navigate(`/results/${exam.id}`);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!exam) {
    return (
      <div className="exam-interface">
        <div className="loading">Loading exam...</div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="exam-interface">
        <div className="submitted">Exam submitted successfully!</div>
      </div>
    );
  }

  const currentQuestion = exam.questions[currentQuestionIndex];

  return (
    <div className="exam-interface">
      <header className="exam-header">
        <div className="exam-info">
          <h1>{exam.title}</h1>
          <p>Question {currentQuestionIndex + 1} of {exam.questions.length}</p>
        </div>
        <div className="timer">
          <span className={timeLeft < 300 ? 'warning' : ''}>
            {formatTime(timeLeft)}
          </span>
        </div>
      </header>

      <main className="exam-content">
        <div className="question-card">
          <h2>{currentQuestion.text}</h2>
          <div className="options">
            {currentQuestion.options.map((option, index) => (
              <label key={index} className="option">
                <input
                  type="radio"
                  name={`question-${currentQuestion.id}`}
                  value={index}
                  checked={answers[currentQuestion.id] === index}
                  onChange={() => handleAnswerSelect(currentQuestion.id, index)}
                />
                <span className="option-text">{option}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="navigation">
          <button 
            onClick={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0}
            className="nav-button prev"
          >
            Previous
          </button>
          
          <div className="question-indicators">
            {exam.questions.map((_, index) => (
              <button
                key={index}
                className={`indicator ${index === currentQuestionIndex ? 'current' : ''} ${
                  answers[exam.questions[index].id] !== undefined ? 'answered' : ''
                }`}
                onClick={() => setCurrentQuestionIndex(index)}
              >
                {index + 1}
              </button>
            ))}
          </div>

          {currentQuestionIndex === exam.questions.length - 1 ? (
            <button 
              onClick={handleSubmitExam}
              className="nav-button submit"
            >
              Submit Exam
            </button>
          ) : (
            <button 
              onClick={handleNextQuestion}
              className="nav-button next"
            >
              Next
            </button>
          )}
        </div>
      </main>
    </div>
  );
};

export default ExamInterface;
