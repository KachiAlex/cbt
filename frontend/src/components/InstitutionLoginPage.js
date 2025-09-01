import React, { useState, useEffect } from 'react';

const InstitutionLoginPage = () => {
  const [institutionName, setInstitutionName] = useState('Loading Institution...');
  const [institutionLogo, setInstitutionLogo] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('admin'); // 'admin', 'student', 'create-account'

  // Form states
  const [adminCredentials, setAdminCredentials] = useState({ username: '', password: '' });
  const [studentCredentials, setStudentCredentials] = useState({ studentId: '', password: '' });
  const [newStudentData, setNewStudentData] = useState({
    fullName: '',
    email: '',
    studentId: '',
    password: '',
    confirmPassword: '',
    phone: '',
    dateOfBirth: ''
  });

  useEffect(() => {
    loadInstitutionData();
  }, []);

  const loadInstitutionData = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const institutionSlug = urlParams.get('slug');

      if (!institutionSlug) {
        setError('Institution not specified');
        setLoading(false);
        return;
      }

      const response = await fetch(`https://cbt-rew7.onrender.com/api/tenant/${institutionSlug}/profile`);

      if (!response.ok) {
        throw new Error('Institution not found or suspended');
      }

      const data = await response.json();
      setInstitutionName(data.name);
      setInstitutionLogo(data.logo_url);
      setLoading(false);
    } catch (error) {
      setError('Failed to load institution data: ' + error.message);
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const institutionSlug = urlParams.get('slug');

      const response = await fetch('https://cbt-rew7.onrender.com/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: adminCredentials.username,
          password: adminCredentials.password,
          tenant_slug: institutionSlug,
          user_type: 'admin'
        })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('cbt_logged_in_user', JSON.stringify(data.user));
        localStorage.setItem('institution_data', JSON.stringify(data.tenant));
        localStorage.setItem('institution_slug', institutionSlug);
        setSuccess('Login successful! Redirecting...');
        setTimeout(() => {
        window.location.reload();
        }, 1000);
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (error) {
      setError('Login failed: ' + error.message);
    }
  };

  const handleStudentLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const institutionSlug = urlParams.get('slug');

      const response = await fetch('https://cbt-rew7.onrender.com/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: studentCredentials.studentId,
          password: studentCredentials.password,
          tenant_slug: institutionSlug,
          user_type: 'student'
        })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('cbt_logged_in_user', JSON.stringify(data.user));
        localStorage.setItem('institution_data', JSON.stringify(data.tenant));
        localStorage.setItem('institution_slug', institutionSlug);
        setSuccess('Login successful! Redirecting...');
        setTimeout(() => {
        window.location.reload();
        }, 1000);
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (error) {
      setError('Login failed: ' + error.message);
    }
  };

  const handleStudentRegistration = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (newStudentData.password !== newStudentData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newStudentData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const institutionSlug = urlParams.get('slug');

      const response = await fetch('https://cbt-rew7.onrender.com/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: newStudentData.fullName,
          email: newStudentData.email,
          username: newStudentData.studentId,
          password: newStudentData.password,
          phone: newStudentData.phone,
          dateOfBirth: newStudentData.dateOfBirth,
          tenant_slug: institutionSlug,
          role: 'student'
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Account created successfully! You can now log in.');
        setNewStudentData({
          fullName: '',
          email: '',
          studentId: '',
          password: '',
          confirmPassword: '',
          phone: '',
          dateOfBirth: ''
        });
        setTimeout(() => {
          setActiveTab('student');
        }, 2000);
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch (error) {
      setError('Registration failed: ' + error.message);
    }
  };

  const resetForm = () => {
    setError('');
    setSuccess('');
    setAdminCredentials({ username: '', password: '' });
    setStudentCredentials({ studentId: '', password: '' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold mb-2">Loading Institution</h2>
          <p className="text-blue-100">Please wait while we load your institution's portal...</p>
        </div>
      </div>
    );
  }

  if (error && !institutionName) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-600 to-red-800">
        <div className="text-center text-white max-w-md mx-auto px-6">
          <div className="mb-6">
            <svg className="mx-auto h-16 w-16 text-red-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L3.732 16.5c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77-.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold mb-4">Access Error</h2>
          <p className="text-red-100 mb-6">{error}</p>
          <button 
            onClick={() => window.history.back()} 
            className="bg-white text-red-600 px-6 py-3 rounded-lg font-semibold hover:bg-red-50 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Institution Header */}
        <div className="text-center">
          {institutionLogo ? (
            <div className="mb-6">
              <img
                src={institutionLogo}
                alt={`${institutionName} Logo`}
                className="mx-auto h-24 w-auto rounded-lg shadow-lg"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
          ) : (
            <div className="mb-6">
              <div className="mx-auto h-24 w-24 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-4xl font-bold text-white">
                  {institutionName.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          )}
          
          <h1 className="text-4xl font-bold text-white mb-2">
            {institutionName}
          </h1>
          <p className="text-blue-100 text-lg">
            Computer-Based Test System
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-1">
          <div className="flex space-x-1">
                <button
              onClick={() => { setActiveTab('admin'); resetForm(); }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'admin'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-white hover:bg-white/20'
              }`}
            >
              Admin Login
                </button>
                <button
              onClick={() => { setActiveTab('student'); resetForm(); }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'student'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-white hover:bg-white/20'
              }`}
            >
                  Student Login
                </button>
            <button
              onClick={() => { setActiveTab('create-account'); resetForm(); }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'create-account'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-white hover:bg-white/20'
              }`}
            >
              Create Account
            </button>
          </div>
              </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md">
            {error}
              </div>
        )}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-md">
            {success}
            </div>
        )}

              {/* Admin Login Form */}
        {activeTab === 'admin' && (
          <div className="bg-white rounded-lg shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Admin Login</h2>
            <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                    <input
                      type="text"
                      value={adminCredentials.username}
                      onChange={(e) => setAdminCredentials({...adminCredentials, username: e.target.value})}
                      required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter username"
                    />
                  </div>
                  <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                      <input
                  type="password"
                        value={adminCredentials.password}
                        onChange={(e) => setAdminCredentials({...adminCredentials, password: e.target.value})}
                        required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter password"
                />
                  </div>
                    <button 
                      type="submit" 
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                    >
                Login as Admin
                    </button>
            </form>
                  </div>
              )}

              {/* Student Login Form */}
        {activeTab === 'student' && (
          <div className="bg-white rounded-lg shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Student Login</h2>
            <form onSubmit={handleStudentLogin} className="space-y-4">
                  <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
                    <input
                      type="text"
                      value={studentCredentials.studentId}
                      onChange={(e) => setStudentCredentials({...studentCredentials, studentId: e.target.value})}
                      required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter student ID"
                    />
                  </div>
                  <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                      <input
                  type="password"
                        value={studentCredentials.password}
                        onChange={(e) => setStudentCredentials({...studentCredentials, password: e.target.value})}
                        required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter password"
                />
                  </div>
                    <button 
                      type="submit" 
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                    >
                Login as Student
                    </button>
            </form>
                  </div>
        )}

        {/* Student Account Creation Form */}
        {activeTab === 'create-account' && (
          <div className="bg-white rounded-lg shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Create Student Account</h2>
            <form onSubmit={handleStudentRegistration} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={newStudentData.fullName}
                  onChange={(e) => setNewStudentData({...newStudentData, fullName: e.target.value})}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newStudentData.email}
                  onChange={(e) => setNewStudentData({...newStudentData, email: e.target.value})}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
                <input
                  type="text"
                  value={newStudentData.studentId}
                  onChange={(e) => setNewStudentData({...newStudentData, studentId: e.target.value})}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter student ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={newStudentData.phone}
                  onChange={(e) => setNewStudentData({...newStudentData, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={newStudentData.dateOfBirth}
                  onChange={(e) => setNewStudentData({...newStudentData, dateOfBirth: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={newStudentData.password}
                  onChange={(e) => setNewStudentData({...newStudentData, password: e.target.value})}
                  required
                  minLength="6"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter password (min 6 characters)"
                />
                  </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={newStudentData.confirmPassword}
                  onChange={(e) => setNewStudentData({...newStudentData, confirmPassword: e.target.value})}
                  required
                  minLength="6"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Confirm password"
                />
                </div>
              <button
                type="submit"
                className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
              >
                Create Account
              </button>
            </form>
            </div>
          )}

        {/* Footer */}
        <div className="text-center text-blue-100 text-sm">
          <p>&copy; 2025 {institutionName}. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default InstitutionLoginPage;
