import React, { useState } from 'react';
import dataService from '../services/dataService';

const AdminLogin = ({ onLogin, onBack, institutionData }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('🔐 Attempting admin login...');
      
      // If we're in institution mode, use the multi-tenant API
      if (institutionData) {
        const institutionSlug = localStorage.getItem('institution_slug');
        
        const response = await fetch('https://cbt-rew7.onrender.com/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: username,
            password: password,
            tenant_slug: institutionSlug,
            user_type: 'admin'
          })
        });

        const data = await response.json();

        if (data.success) {
          console.log('✅ Institution admin login successful:', data.user.username);
          // Store institution data with the user
          const userWithInstitution = {
            ...data.user,
            institution: institutionData
          };
          onLogin(userWithInstitution);
        } else {
          console.log('❌ Institution admin login failed:', data.message);
          setError(data.message || 'Invalid admin credentials. Please try again.');
        }
      } else {
        // Regular local authentication
        console.log('💾 Using localStorage authentication...');
        const users = await dataService.loadUsers();
        
        const user = users.find(u => 
          u.username.toLowerCase() === username.toLowerCase() && 
          u.password === password &&
          u.role === 'admin'
        );

        if (user) {
          console.log('✅ Admin login successful:', user.username);
          onLogin(user);
        } else {
          console.log('❌ Admin login failed: Invalid credentials');
          setError('Invalid admin credentials. Please try again.');
        }
      }
    } catch (error) {
      console.error('❌ Admin login error:', error);
      setError('Admin login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      <div className="text-center mb-6">
        {institutionData && (
          <>
            {institutionData.logo_url && (
              <img 
                src={institutionData.logo_url} 
                alt={`${institutionData.name} Logo`}
                className="mx-auto h-16 w-auto mb-4"
              />
            )}
            <h2 className="text-2xl font-bold text-gray-800">{institutionData.name}</h2>
            <p className="text-gray-600 mt-2">Admin Login - Administrator Access</p>
          </>
        )}
        {!institutionData && (
          <>
            <h2 className="text-2xl font-bold text-gray-800">Admin Login</h2>
            <p className="text-gray-600 mt-2">Administrator access only</p>
          </>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="admin-username" className="block text-sm font-medium text-gray-700 mb-1">
            Admin Username
          </label>
          <input
            type="text"
            id="admin-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="Enter admin username"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="admin-password" className="block text-sm font-medium text-gray-700 mb-1">
            Admin Password
          </label>
          <input
            type="password"
            id="admin-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="Enter admin password"
            required
            disabled={loading}
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Signing in...' : 'Admin Sign In'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          Back to Student login
        </button>
      </div>

      {/* Removed inline default credentials for security */}
    </div>
  );
};

export default AdminLogin;
