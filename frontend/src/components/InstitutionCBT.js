import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import dataService from '../services/dataService';
import CBTAdminDashboard from './CBTAdminDashboard';
import StudentPortal from './StudentPortal';
import InstitutionLoginPage from './InstitutionLoginPage';
import ExamInterface from './ExamInterface';

const InstitutionCBT = () => {
  const { slug: routeSlug } = useParams();
  const [institution, setInstitution] = useState(null);
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('login');
  const [currentExam, setCurrentExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadInstitution(routeSlug);
  }, [routeSlug]);

  // Check institution status periodically to handle suspensions while logged in
  useEffect(() => {
    if (!institution || !user) return;

    const checkInstitutionStatus = async () => {
      try {
        const currentInstitution = await dataService.getInstitutionBySlug(institution.slug);
        
        if (currentInstitution && currentInstitution.status === 'suspended') {
          // Institution was suspended, log out user
          setUser(null);
          setCurrentView('login');
          setError('Your institution has been suspended. Contact your administrator.');
          localStorage.removeItem(`cbt_user_${institution.slug}`);
          localStorage.removeItem('cbt_token');
        }
      } catch (err) {
        console.error('Error checking institution status:', err);
      }
    };

    // Check every 30 seconds
    const interval = setInterval(checkInstitutionStatus, 30000);
    
    return () => clearInterval(interval);
  }, [institution, user]);

  const loadInstitution = async (pathSlug) => {
    try {
      setLoading(true);
      const urlParams = new URLSearchParams(window.location.search);
      const institutionSlug = pathSlug || urlParams.get('institution');
      
      if (!institutionSlug) {
        setError('No institution specified');
        return;
      }

      // Get institution data
      const foundInstitution = await dataService.getInstitutionBySlug(institutionSlug);

      // Check if institution is suspended
      if (foundInstitution.status === 'suspended') {
        setError('Your institution has been suspended. Contact your administrator.');
        localStorage.removeItem(`cbt_user_${institutionSlug}`);
        setCurrentView('login');
        return;
      }

      setInstitution(foundInstitution);

      const savedUser = localStorage.getItem(`cbt_user_${institutionSlug}`);
      const hasToken = Boolean(localStorage.getItem('cbt_token'));
      let restored = false;
      if (savedUser && hasToken) {
        try {
          const cachedUser = JSON.parse(savedUser);
          const session = await dataService.getSession();
          const sessionUser = session?.user;
          if (sessionUser?.id === cachedUser.id && sessionUser?.institutionId === foundInstitution.id) {
            if (sessionUser.role === 'admin') {
              try { setInstitution(await dataService.getInstitution(foundInstitution.id)); } catch (_) {}
            }
            setUser(sessionUser);
            setCurrentView(sessionUser.role === 'admin' ? 'dashboard' : 'student');
            restored = true;
          }
        } catch (_) {}
      }
      if (!restored) {
        localStorage.removeItem(`cbt_user_${institutionSlug}`);
        localStorage.removeItem('cbt_token');
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

      const result = await dataService.institutionLogin(
        institution.slug, credentials.username, credentials.password
      );

      if (result.success) {
        localStorage.setItem('cbt_token', result.token);
        if (result.user.role === 'admin') {
          try { setInstitution(await dataService.getInstitution(result.user.institutionId)); } catch (_) {}
        }
        setUser(result.user);
        localStorage.setItem(`cbt_user_${institution.slug}`, JSON.stringify(result.user));
        setCurrentView(result.user.role === 'admin' ? 'dashboard' : 'student');
        return { success: true };
      }

      return { success: false, error: 'Invalid username or password' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message || 'Login failed' };
    }
  };

  const handleAdminAccess = () => {
    // Direct admin access - show admin login form
    setCurrentView('admin-login');
  };

  const handleInstitutionChange = (updatedInstitution) => setInstitution(updatedInstitution);

  const handleLogout = async () => {
    try { await dataService.logout(); } catch (_) {}
    setUser(null);
    setCurrentView('login');
    setCurrentExam(null);
    localStorage.removeItem(`cbt_user_${institution.slug}`);
    localStorage.removeItem('cbt_token');
    localStorage.removeItem('multi_tenant_admin_token');
    localStorage.removeItem('multi_tenant_admin_user');
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
        return <CBTAdminDashboard institution={institution} user={user} onLogout={handleLogout} onInstitutionChange={handleInstitutionChange} />;
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
            onClick={() => window.location.href = '/admin'}
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
