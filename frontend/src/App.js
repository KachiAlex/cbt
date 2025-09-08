import React, { useState, useEffect } from 'react';
import AdminDashboard from './components/AdminDashboard';
import StudentPortal from './components/StudentPortal';
import LoginPage from './components/LoginPage';
import ExamInterface from './components/ExamInterface';
import MultiTenantAdmin from './components/MultiTenantAdmin';
import MultiTenantAdminLogin from './components/MultiTenantAdminLogin';
import InstitutionCBT from './components/InstitutionCBT';
import { dataService } from './services/dataService';
import { testFirebaseConnection } from './firebase/testConnection';

function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('login');
  const [currentExam, setCurrentExam] = useState(null);
  const [showMultiTenantAdmin, setShowMultiTenantAdmin] = useState(false);

  useEffect(() => {
    // Test Firebase connection on app start
    testFirebaseConnection().then(result => {
      if (result.success) {
        console.log('🔥 Firebase connected successfully!');
      } else {
        console.error('❌ Firebase connection failed:', result.error);
      }
    });

    // Check URL parameters for institution access
    const urlParams = new URLSearchParams(window.location.search);
    const institutionSlug = urlParams.get('institution');
    
    if (institutionSlug) {
      // Institution-specific CBT app
      setCurrentView('institution-cbt');
      return;
    }

    // Check for saved multi-tenant admin user
    const savedAdminUser = localStorage.getItem('multi_tenant_admin_user');
    if (savedAdminUser) {
      setUser(JSON.parse(savedAdminUser));
      setCurrentView('multi-tenant-admin');
      return;
    }

    // Default to multi-tenant admin login
    setCurrentView('multi-tenant-admin-login');
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
    setCurrentView('multi-tenant-admin-login');
    setCurrentExam(null);
    setShowMultiTenantAdmin(false);
    localStorage.removeItem('cbt_user');
    localStorage.removeItem('multi_tenant_admin_token');
    localStorage.removeItem('multi_tenant_admin_refresh_token');
    localStorage.removeItem('multi_tenant_admin_user');
    
    // Clear URL parameters
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  const startExam = (exam) => {
    setCurrentExam(exam);
    setCurrentView('exam');
  };

  const completeExam = () => {
    setCurrentExam(null);
    setCurrentView('student');
  };

  const handleMultiTenantAdminLogin = (user) => {
    setUser(user);
    setCurrentView('multi-tenant-admin');
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'multi-tenant-admin-login':
        return <MultiTenantAdminLogin onLoginSuccess={handleMultiTenantAdminLogin} />;
      case 'multi-tenant-admin':
        return <MultiTenantAdmin />;
      case 'institution-cbt':
        return <InstitutionCBT />;
      default:
        return <MultiTenantAdminLogin onLoginSuccess={handleMultiTenantAdminLogin} />;
    }
  };

    return (
      <div className="min-h-screen bg-gray-50">
      {renderCurrentView()}
    </div>
  );
}

export default App;