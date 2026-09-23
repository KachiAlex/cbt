import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import authService from '../services/authService';

const AuthGuard = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const checkAuth = async () => {
      const [session, storedUser] = await Promise.all([authService.getSession(), authService.getCurrentUser()]);
      if (!active) return;
      setIsAuthenticated(Boolean(session?.role === 'super_admin' && storedUser?.uid === session.id));
      setLoading(false);
    };
    checkAuth();
    return () => { active = false; };
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
    return <Navigate to="/admin-login" replace />;
  }

  return children;
};

export default AuthGuard;
