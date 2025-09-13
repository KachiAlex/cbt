import React, { useState, useEffect } from 'react';
import firebaseDataService from '../firebase/dataService';
import CBTAdminDashboard from './CBTAdminDashboard';
import StudentPortal from './StudentPortal';
import InstitutionLoginPage from './InstitutionLoginPage';
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
        const userData = JSON.parse(savedUser);
        setUser(userData);
        // Set view based on user role
        setCurrentView(userData.role === 'admin' ? 'dashboard' : 'student');
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
      // Check if institution is suspended
      if (institution.status === 'suspended') {
        return { 
          success: false, 
          error: 'Your institution has been suspended. Contact your administrator.' 
        };
      }

      // Check for hardcoded admin credentials first
      if (credentials.username === 'admin' && credentials.password === 'admin123') {
        const userData = {
          id: 'admin_default',
          username: 'admin',
          email: 'admin@institution.com',
          fullName: 'Institution Administrator',
          role: 'admin',
          institutionId: institution.id,
          institutionName: institution.name
        };

        setUser(userData);
        localStorage.setItem(`cbt_user_${institution.slug}`, JSON.stringify(userData));
        setCurrentView('dashboard');
        return { success: true };
      }

      // Check against institution admins from Firebase
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
        setCurrentView('dashboard');
        return { success: true };
      }

      // If not an admin, treat as student login
      // For now, we'll create a simple student user
      // In a real implementation, you'd check against a student database
      const userData = {
        id: `student_${Date.now()}`,
        username: credentials.username,
        email: credentials.username,
        fullName: credentials.username,
        role: 'student',
        institutionId: institution.id,
        institutionName: institution.name
      };

      setUser(userData);
      localStorage.setItem(`cbt_user_${institution.slug}`, JSON.stringify(userData));
      setCurrentView('student');
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Login failed' };
    }
  };

  const handleAdminAccess = () => {
    // Direct admin access - show admin login form
    setCurrentView('admin-login');
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
          <InstitutionLoginPage 
            institution={institution}
            onLogin={handleLogin}
            onAdminAccess={handleAdminAccess}
          />
        );
      case 'admin-login':
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="max-w-md w-full space-y-8">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Admin Login</h2>
                <div className="bg-white rounded-lg shadow-lg p-8">
                  <p className="text-gray-600 mb-4">Please enter your admin credentials:</p>
                  <InstitutionLoginPage 
                    institution={institution}
                    onLogin={handleLogin}
                    onAdminAccess={handleAdminAccess}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      case 'dashboard':
        return <CBTAdminDashboard institution={institution} user={user} onLogout={handleLogout} />;
      case 'student':
        return <StudentPortal user={user} onLogout={handleLogout} onStartExam={startExam} />;
      case 'exam':
        return <ExamInterface user={user} exam={currentExam} onComplete={completeExam} />;
      default:
        return (
          <InstitutionLoginPage 
            institution={institution}
            onLogin={handleLogin}
            onAdminAccess={handleAdminAccess}
          />
        );
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
