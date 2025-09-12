import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AdminDashboard from './components/AdminDashboard';
import StudentPortal from './components/StudentPortal';
import LoginPage from './components/LoginPage';
import ExamInterface from './components/ExamInterface';
import MultiTenantAdmin from './components/MultiTenantAdmin';
import MultiTenantAdminLogin from './components/MultiTenantAdminLogin';
import InstitutionCBT from './components/InstitutionCBT';
import InstitutionLogin from './components/InstitutionLogin';
import { dataService } from './services/dataService';
import { testFirebaseConnection } from './firebase/testConnection';
import './firebase/createAdmin';

function App() {
  const [user, setUser] = useState(null);
  const [currentExam, setCurrentExam] = useState(null);

  useEffect(() => {
    // Test Firebase connection on app start
    testFirebaseConnection().then(result => {
      if (result.success) {
        console.log('🔥 Firebase connected successfully!');
      } else {
        console.error('❌ Firebase connection failed:', result.error);
      }
    });
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
    setCurrentExam(null);
    localStorage.removeItem('cbt_user');
    localStorage.removeItem('multi_tenant_admin_token');
    localStorage.removeItem('multi_tenant_admin_refresh_token');
    localStorage.removeItem('multi_tenant_admin_user');
  };

  const startExam = (exam) => {
    setCurrentExam(exam);
  };

  const completeExam = () => {
    setCurrentExam(null);
  };

  const handleMultiTenantAdminLogin = (user) => {
    setUser(user);
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Landing Page - Default Route */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Institution Login */}
          <Route path="/institution-login" element={<InstitutionLogin />} />
          
          {/* Multi-tenant Admin Routes */}
          <Route path="/multi-tenant-admin/login" element={<MultiTenantAdminLogin onLoginSuccess={handleMultiTenantAdminLogin} />} />
          <Route path="/multi-tenant-admin" element={<MultiTenantAdmin />} />
          
          {/* Institution CBT Routes */}
          <Route path="/institution/:slug" element={<InstitutionCBT />} />
          
          {/* Legacy Routes for backward compatibility */}
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/student-dashboard" element={<StudentPortal />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/exam" element={<ExamInterface exam={currentExam} onComplete={completeExam} />} />
          
          {/* Catch all route - redirect to landing page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;