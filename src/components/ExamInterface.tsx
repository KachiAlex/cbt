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
      const exams: Exam[] = JSON.parse(savedExams);
      const foundExam = exams.find(e => e.id === examId);
      if (foundExam) {
        setExam(foundExam);
        setTimeLeft(foundExam.duration * 60); // Convert minutes to seconds
      }
    }
  }, [examId]);

  useEffect(() => {
    if (timeLeft > 0 && !isSubmitted) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !isSubmitted) {
      handleSubmitExam();
    }
  }, [timeLeft, isSubmitted]);

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
    if (!exam || !user) return;

    // Calculate score
    let totalScore = 0;
    let correctAnswers = 0;

    exam.questions.forEach(question => {
      const userAnswer = answers[question.id];
      if (userAnswer === question.correctAnswer) {
        totalScore += question.points;
        correctAnswers++;
      }
    });

    const result = {
      examId: exam.id,
      studentId: user.id,
      studentName: user.name,
      examTitle: exam.title,
      totalQuestions: exam.questions.length,
      correctAnswers,
      totalScore,
      maxScore: exam.questions.reduce((sum, q) => sum + q.points, 0),
      answers,
      submittedAt: new Date().toISOString(),
      timeSpent: exam.duration * 60 - timeLeft
    };

    // Save result
    const savedResults = localStorage.getItem('cbt_results');
    const results = savedResults ? JSON.parse(savedResults) : [];
    results.push(result);
    localStorage.setItem('cbt_results', JSON.stringify(results));

    // Mark exam as completed for this student
    const completedKey = `cbt_completed_${user.id}`;
    const completedExams = JSON.parse(localStorage.getItem(completedKey) || '[]');
    if (!completedExams.includes(exam.id)) {
      completedExams.push(exam.id);
      localStorage.setItem(completedKey, JSON.stringify(completedExams));
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
