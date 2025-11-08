import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminDashboard from './components/AdminDashboard';
import StudentPortal from './components/StudentPortal';
import LoginPage from './components/LoginPage';
import ExamInterface from './components/ExamInterface';
import MultiTenantAdmin from './components/MultiTenantAdmin';

// Debug import
console.log('🔥 MultiTenantAdmin import:', MultiTenantAdmin);
import MultiTenantAdminLogin from './components/MultiTenantAdminLogin';
import InstitutionCBT from './components/InstitutionCBT';
import AuthGuard from './components/AuthGuard';
import LandingPage from './pages/LandingPage';
import HowItWorks from './pages/HowItWorks';
import FreeTrial from './pages/FreeTrial';
import BlogList from './pages/BlogList';
import BlogDetail from './pages/BlogDetail';
import { dataService } from './services/dataService';
import { testFirebaseConnection } from './firebase/testConnection';

function App() {
  console.log('🔥 App component is rendering!');
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Test Firebase connection on app start (only for non-admin, non-login routes)
    const currentPath = window.location.pathname;
    const isAdminRoute = currentPath.startsWith('/admin');
    const isLoginRoute = currentPath === '/admin-login';
    
    if (!isAdminRoute && !isLoginRoute) {
    testFirebaseConnection().then(result => {
      if (result.success) {
        console.log('🔥 Firebase connected successfully!');
      } else {
        console.error('❌ Firebase connection failed:', result.error);
      }
    });
    }
  }, []);

  const handleMultiTenantAdminLogin = (user) => {
    setUser(user);
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Landing page routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/trial" element={<FreeTrial />} />
          <Route path="/blogs" element={<BlogList />} />
          <Route path="/blog/:id" element={<BlogDetail />} />
          
          {/* Multi-tenant admin routes - NO AuthGuard for now */}
          <Route path="/admin" element={<MultiTenantAdmin />} />
          <Route path="/test-admin" element={<MultiTenantAdmin />} />
          <Route path="/super-admin" element={<MultiTenantAdmin />} />
          <Route path="/admin-login" element={<MultiTenantAdminLogin onLoginSuccess={handleMultiTenantAdminLogin} />} />
          
          {/* Direct admin redirect for clarity */}
          <Route path="/admin/" element={<Navigate to="/admin" replace />} />
          
          {/* Institution CBT route */}
          <Route path="/institution-login" element={<InstitutionCBT />} />
          <Route path="/institution-login/:slug" element={<InstitutionCBT />} />
          
          {/* Legacy routes for backward compatibility */}
          <Route path="/login" element={<MultiTenantAdminLogin onLoginSuccess={handleMultiTenantAdminLogin} />} />
          
          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;