import React, { useState, useEffect } from 'react';
import firebaseDataService from '../firebase/dataService';
import AdminDashboard from './AdminDashboard';
import StudentPortal from './StudentPortal';
import LoginPage from './LoginPage';
import ExamInterface from './ExamInterface';

const InstitutionCBT = () => {
  const [institution, setInstitution] = useState(null);
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('login');
  const [currentExam, setCurrentExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadInstitution();
  }, []);

  const loadInstitution = async () => {
    try {
      setLoading(true);
      const urlParams = new URLSearchParams(window.location.search);
      const institutionSlug = urlParams.get('institution');
      
      if (!institutionSlug) {
        setError('No institution specified');
        return;
      }

      // Get institution data from Firebase
      const institutions = await firebaseDataService.getInstitutions();
      const foundInstitution = institutions.find(inst => inst.slug === institutionSlug);
      
      if (!foundInstitution) {
        setError('Institution not found');
        return;
      }

      setInstitution(foundInstitution);

      // Check for saved user
      const savedUser = localStorage.getItem(`cbt_user_${institutionSlug}`);
      if (savedUser) {
        setUser(JSON.parse(savedUser));
        setCurrentView('dashboard');
      }
    } catch (err) {
      console.error('Error loading institution:', err);
      setError('Failed to load institution');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (credentials) => {
    try {
      // For now, we'll use a simple check against institution admins
      // In a real implementation, you'd use Firebase Auth
      const admins = await firebaseDataService.getInstitutionAdmins(institution.id);
      const admin = admins.find(a => 
        (a.username === credentials.username || a.email === credentials.username) &&
        a.password === credentials.password
      );

      if (admin) {
        const userData = {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          fullName: admin.fullName,
          role: 'admin',
          institutionId: institution.id,
          institutionName: institution.name
        };

        setUser(userData);
        localStorage.setItem(`cbt_user_${institution.slug}`, JSON.stringify(userData));
        
        if (admin.role === 'admin') {
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
    localStorage.removeItem(`cbt_user_${institution.slug}`);
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
        return (
          <div>
            <div className="bg-white shadow-sm border-b">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="text-center">
                  <h1 className="text-3xl font-bold text-gray-900">{institution?.name}</h1>
                  <p className="text-gray-600 mt-1">Computer-Based Test System</p>
                </div>
              </div>
            </div>
            <LoginPage onLogin={handleLogin} />
          </div>
        );
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading institution...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
          >
            Go to Main Admin
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {renderCurrentView()}
    </div>
  );
};

export default InstitutionCBT;
