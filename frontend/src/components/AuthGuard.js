import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

const AuthGuard = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      // Require both a user record and a real JWT
      const adminUser = localStorage.getItem('multi_tenant_admin_user');
      const token = localStorage.getItem('multi_tenant_admin_token');
      const hasAdminUser = !!adminUser && !!token;
      
      setIsAuthenticated(hasAdminUser);
      setLoading(false);
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
          <p className="text-sm text-gray-500 mt-2">Redirecting to login if needed</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('🔐 AuthGuard: Redirecting to /admin-login');
    return <Navigate to="/admin-login" replace />;
  }

  return children;
};

export default AuthGuard;
