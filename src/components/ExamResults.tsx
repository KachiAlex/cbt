import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './ExamResults.css';

interface Result {
  examId: string;
  studentId: string;
  studentName: string;
  examTitle: string;
  totalQuestions: number;
  correctAnswers: number;
  totalScore: number;
  maxScore: number;
  answers: { [questionId: string]: number };
  submittedAt: string;
  timeSpent: number;
}

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

const ExamResults: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [result, setResult] = useState<Result | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!examId || !user) return;

    // Load result
    const savedResults = localStorage.getItem('cbt_results');
    if (savedResults) {
      const results: Result[] = JSON.parse(savedResults);
      const foundResult = results.find(r => r.examId === examId && r.studentId === user.id);
      if (foundResult) {
        setResult(foundResult);
      }
    }

    // Load exam details
    const savedExams = localStorage.getItem('cbt_exams');
    if (savedExams) {
      const exams: Exam[] = JSON.parse(savedExams);
      const foundExam = exams.find(e => e.id === examId);
      if (foundExam) {
        setExam(foundExam);
      }
    }
  }, [examId, user]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getGrade = (percentage: number) => {
    if (percentage >= 90) return { grade: 'A+', color: '#28a745' };
    if (percentage >= 80) return { grade: 'A', color: '#28a745' };
    if (percentage >= 70) return { grade: 'B+', color: '#17a2b8' };
    if (percentage >= 60) return { grade: 'B', color: '#ffc107' };
    if (percentage >= 50) return { grade: 'C', color: '#fd7e14' };
    return { grade: 'F', color: '#dc3545' };
  };

  if (!result || !exam) {
    return (
      <div className="exam-results">
        <div className="loading">Loading results...</div>
      </div>
    );
  }

  const percentage = (result.totalScore / result.maxScore) * 100;
  const gradeInfo = getGrade(percentage);

  return (
    <div className="exam-results">
      <div className="results-container">
        <header className="results-header">
          <h1>Exam Results</h1>
          <Link to="/student" className="back-button">
            ← Back to Dashboard
          </Link>
        </header>

        <div className="results-summary">
          <div className="summary-card">
            <h2>{exam.title}</h2>
            <p>Completed by: {result.studentName}</p>
            <p>Submitted: {new Date(result.submittedAt).toLocaleString()}</p>
          </div>

          <div className="score-card">
            <div className="score-circle">
              <div className="score-percentage" style={{ color: gradeInfo.color }}>
                {percentage.toFixed(1)}%
              </div>
              <div className="score-grade" style={{ color: gradeInfo.color }}>
                {gradeInfo.grade}
              </div>
            </div>
            <div className="score-details">
              <p><strong>{result.correctAnswers}</strong> out of <strong>{result.totalQuestions}</strong> correct</p>
              <p><strong>{result.totalScore}</strong> out of <strong>{result.maxScore}</strong> points</p>
              <p>Time spent: <strong>{formatTime(result.timeSpent)}</strong></p>
            </div>
          </div>
        </div>

        <div className="results-actions">
          <button 
            onClick={() => setShowDetails(!showDetails)}
            className="details-button"
          >
            {showDetails ? 'Hide Details' : 'Show Question Details'}
          </button>
        </div>

        {showDetails && (
          <div className="question-details">
            <h3>Question Review</h3>
            {exam.questions.map((question, index) => {
              const userAnswer = result.answers[question.id];
              const isCorrect = userAnswer === question.correctAnswer;
              
              return (
                <div key={question.id} className={`question-review ${isCorrect ? 'correct' : 'incorrect'}`}>
                  <div className="question-header">
                    <h4>Question {index + 1}</h4>
                    <span className={`status ${isCorrect ? 'correct' : 'incorrect'}`}>
                      {isCorrect ? 'Correct' : 'Incorrect'}
                    </span>
                  </div>
                  <p className="question-text">{question.text}</p>
                  <div className="options-review">
                    {question.options.map((option, optionIndex) => {
                      let className = 'option';
                      if (optionIndex === question.correctAnswer) {
                        className += ' correct-answer';
                      }
                      if (optionIndex === userAnswer && !isCorrect) {
                        className += ' user-answer';
                      }
                      
                      return (
                        <div key={optionIndex} className={className}>
                          {optionIndex === question.correctAnswer && <span className="correct-icon">✓</span>}
                          {optionIndex === userAnswer && !isCorrect && <span className="incorrect-icon">✗</span>}
                          {option}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExamResults;
