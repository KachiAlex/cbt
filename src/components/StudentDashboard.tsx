import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import './StudentDashboard.css';

interface Exam {
  id: string;
  title: string;
  description: string;
  duration: number;
  questions: Question[];
  isActive: boolean;
  createdAt: string;
}

interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  points: number;
}

const StudentDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [completedExams, setCompletedExams] = useState<string[]>([]);

  useEffect(() => {
    // Load exams from localStorage
    const savedExams = localStorage.getItem('cbt_exams');
    if (savedExams) {
      setExams(JSON.parse(savedExams));
    }

    // Load completed exams for this student
    const savedCompleted = localStorage.getItem(`cbt_completed_${user?.id}`);
    if (savedCompleted) {
      setCompletedExams(JSON.parse(savedCompleted));
    }
  }, [user?.id]);

  const handleLogout = () => {
    logout();
  };

  const activeExams = exams.filter(exam => exam.isActive);

  return (
    <div className="student-dashboard">
      <header className="student-header">
        <div className="header-content">
          <h1>CBT Local - Student Portal</h1>
          <div className="user-info">
            <span>Welcome, {user?.name}</span>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="student-content">
        <div className="dashboard-stats">
          <div className="stat-card">
            <h3>Available Exams</h3>
            <p className="stat-number">{activeExams.length}</p>
          </div>
          <div className="stat-card">
            <h3>Completed Exams</h3>
            <p className="stat-number">{completedExams.length}</p>
          </div>
        </div>

        <div className="exams-section">
          <h2>Available Exams</h2>
          {activeExams.length === 0 ? (
            <div className="no-exams">
              <p>No active exams available at the moment.</p>
            </div>
          ) : (
            <div className="exams-grid">
              {activeExams.map(exam => (
                <div key={exam.id} className="exam-card">
                  <div className="exam-info">
                    <h3>{exam.title}</h3>
                    <p>{exam.description}</p>
                    <div className="exam-details">
                      <span>Duration: {exam.duration} minutes</span>
                      <span>Questions: {exam.questions.length}</span>
                    </div>
                  </div>
                  <div className="exam-actions">
                    {completedExams.includes(exam.id) ? (
                      <div className="completed-badge">
                        <span>Completed</span>
                        <Link to={`/results/${exam.id}`} className="view-results-button">
                          View Results
                        </Link>
                      </div>
                    ) : (
                      <Link to={`/exam/${exam.id}`} className="start-exam-button">
                        Start Exam
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;
