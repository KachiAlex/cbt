import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ExamManagement from './ExamManagement';
import QuestionBank from './QuestionBank';
import StudentResults from './StudentResults';
import './AdminDashboard.css';

interface Exam {
  id: string;
  title: string;
  description: string;
  duration: number; // in minutes
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

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'exams' | 'questions' | 'results'>('exams');
  const [exams, setExams] = useState<Exam[]>([]);

  useEffect(() => {
    // Load exams from localStorage
    const savedExams = localStorage.getItem('cbt_exams');
    if (savedExams) {
      setExams(JSON.parse(savedExams));
    }
  }, []);

  const saveExams = (updatedExams: Exam[]) => {
    setExams(updatedExams);
    localStorage.setItem('cbt_exams', JSON.stringify(updatedExams));
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div className="header-content">
          <h1>CBT Local - Admin Dashboard</h1>
          <div className="user-info">
            <span>Welcome, {user?.name}</span>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </div>
      </header>

      <nav className="admin-nav">
        <button 
          className={activeTab === 'exams' ? 'nav-button active' : 'nav-button'}
          onClick={() => setActiveTab('exams')}
        >
          Exam Management
        </button>
        <button 
          className={activeTab === 'questions' ? 'nav-button active' : 'nav-button'}
          onClick={() => setActiveTab('questions')}
        >
          Question Bank
        </button>
        <button 
          className={activeTab === 'results' ? 'nav-button active' : 'nav-button'}
          onClick={() => setActiveTab('results')}
        >
          Student Results
        </button>
      </nav>

      <main className="admin-content">
        {activeTab === 'exams' && (
          <ExamManagement exams={exams} onExamsChange={saveExams} />
        )}
        {activeTab === 'questions' && (
          <QuestionBank />
        )}
        {activeTab === 'results' && (
          <StudentResults />
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
