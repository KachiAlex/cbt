import React, { useState, useEffect } from 'react';
import AdminDashboard from './components/AdminDashboard';
import StudentPortal from './components/StudentPortal';
import LoginPage from './components/LoginPage';
import ExamInterface from './components/ExamInterface';
import { dataService } from './services/dataService';

function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('login');
  const [currentExam, setCurrentExam] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('cbt_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setCurrentView('dashboard');
    }
    initializeDefaultAdmin();
  }, []);

  const initializeDefaultAdmin = async () => {
    try {
      const users = await dataService.getUsers();
      const adminExists = users.find(u => u.username === 'admin');
      
      if (!adminExists) {
        const defaultAdmin = {
          id: 'admin-1',
          username: 'admin',
          password: 'admin123',
          role: 'admin',
          fullName: 'System Administrator',
          email: 'admin@localcbt.com',
          createdAt: new Date().toISOString()
        };
        
        users.push(defaultAdmin);
        await dataService.saveUsers(users);
      }
    } catch (error) {
      console.error('Error initializing default admin:', error);
    }
  };

  const handleLogin = async (credentials) => {
    try {
      const users = await dataService.getUsers();
      const user = users.find(u => 
        u.username === credentials.username && 
        u.password === credentials.password
      );

      if (user) {
        setUser(user);
        localStorage.setItem('cbt_user', JSON.stringify(user));
        
        if (user.role === 'admin') {
          setCurrentView('dashboard');
        } else {
          setCurrentView('student');
        }
        return { success: true };
      } else {
        return { success: false, message: 'Invalid credentials' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Login failed' };
    }
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentView('login');
    setCurrentExam(null);
    localStorage.removeItem('cbt_user');
  };

  const startExam = (exam) => {
    setCurrentExam(exam);
    setCurrentView('exam');
  };

  const completeExam = () => {
    setCurrentExam(null);
    setCurrentView('student');
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'login':
        return <LoginPage onLogin={handleLogin} />;
      case 'dashboard':
        return <AdminDashboard user={user} onLogout={handleLogout} />;
      case 'student':
        return <StudentPortal user={user} onLogout={handleLogout} onStartExam={startExam} />;
      case 'exam':
        return <ExamInterface user={user} exam={currentExam} onComplete={completeExam} />;
      default:
        return <LoginPage onLogin={handleLogin} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {renderCurrentView()}
    </div>
  );
}

export default App;
