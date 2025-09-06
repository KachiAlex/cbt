import React, { useState } from 'react';
import tokenService from '../services/tokenService';
import dataService from '../services/dataService';

const MultiTenantAdminLogin = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('🔐 Attempting multi-tenant admin login for:', credentials.username);
      
      // Check if API is enabled
      const apiConfig = dataService.getApiConfig();
      console.log('🔧 API Configuration:', apiConfig);
      
      if (!apiConfig.USE_API) {
        // Use localStorage fallback for multi-tenant admin
        console.log('ℹ️ API disabled, using localStorage for multi-tenant admin login');
        
        // Check against hardcoded credentials for demo purposes
        if (credentials.username === 'superadmin' && credentials.password === 'superadmin123') {
          const adminData = {
            success: true,
            token: 'super-admin-token',
            role: 'super_admin',
            fullName: 'Super Administrator',
            email: 'superadmin@cbt-system.com'
          };
          
          // Store tokens for debugging
          localStorage.setItem('multi_tenant_admin_token', adminData.token);
          localStorage.setItem('multi_tenant_admin_refresh_token', 'super-admin-refresh-token');
          localStorage.setItem('multi_tenant_admin_user', JSON.stringify({
            username: adminData.fullName,
            role: adminData.role,
            email: adminData.email
          }));
          
          console.log('✅ Multi-tenant admin login successful (localStorage mode)');
          onLogin(adminData);
          return;
        } else if (credentials.username === 'managedadmin' && credentials.password === 'managedadmin123') {
          const adminData = {
            success: true,
            token: 'managed-admin-token',
            role: 'managed_admin',
            fullName: 'Managed Administrator',
            email: 'managedadmin@cbt-system.com'
          };
          
          // Store tokens for debugging
          localStorage.setItem('multi_tenant_admin_token', adminData.token);
          localStorage.setItem('multi_tenant_admin_refresh_token', 'managed-admin-refresh-token');
          localStorage.setItem('multi_tenant_admin_user', JSON.stringify({
            username: adminData.fullName,
            role: adminData.role,
            email: adminData.email
          }));
          
          console.log('✅ Multi-tenant admin login successful (localStorage mode)');
          onLogin(adminData);
          return;
        } else {
          throw new Error('Invalid credentials for multi-tenant admin');
        }
      }
      
      // API mode - make actual API call
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch('https://cbt-rew7.onrender.com/api/multi-tenant-admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      console.log('🔍 Login response status:', response.status);
      console.log('🔍 Login response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        let errorMessage = 'Login failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
        } catch (parseError) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('✅ Login successful, received data:', {
        hasToken: !!data.token,
        hasRefreshToken: !!data.refreshToken,
        hasUser: !!data.user,
        userRole: data.user?.role
      });
      
      // Store authentication tokens using token service
      tokenService.storeTokens(data.token, data.refreshToken, data.user, data.expiresIn);
      
      // Also store in localStorage for debugging
      localStorage.setItem('multi_tenant_admin_token', data.token);
      localStorage.setItem('multi_tenant_admin_refresh_token', data.refreshToken);
      localStorage.setItem('multi_tenant_admin_user', JSON.stringify(data.user));
      
      console.log('💾 Tokens stored successfully');
      
      // Call the onLogin callback
      onLogin(data);
    } catch (error) {
      console.error('❌ Multi-tenant admin login error:', error);
      
      if (error.name === 'AbortError') {
        setError('Login request timed out. Please check your internet connection and try again.');
      } else if (error.message.includes('Failed to fetch')) {
        setError('Cannot connect to server. Please check your internet connection and try again.');
      } else if (error.message.includes('401')) {
        setError('Invalid username or password. Please check your credentials.');
      } else if (error.message.includes('500')) {
        setError('Server error. Please try again later or contact support.');
      } else {
        setError(error.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              🔐 Multi-Tenant Admin
            </h1>
            <p className="text-gray-600">
              Sign in to manage institutions
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                required
                value={credentials.username}
                onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={credentials.password}
                  onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Default credentials: superadmin / superadmin123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiTenantAdminLogin; 