import React, { useState, useEffect } from 'react';

const InstitutionLoginPage = () => {
  const [institutionName, setInstitutionName] = useState('Loading Institution...');
  const [institutionLogo, setInstitutionLogo] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showStudentPassword, setShowStudentPassword] = useState(false);

  // Form states
  const [adminCredentials, setAdminCredentials] = useState({ username: '', password: '' });
  const [studentCredentials, setStudentCredentials] = useState({ studentId: '', password: '' });

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

  const showAdminLogin = () => {
    setShowAdminForm(true);
    setShowStudentForm(false);
    setError('');
  };

  const showStudentLogin = () => {
    setShowStudentForm(true);
    setShowAdminForm(false);
    setError('');
  };

  const hideForms = () => {
    setShowAdminForm(false);
    setShowStudentForm(false);
    setError('');
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setError('');

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
        // Reload the page to trigger the main App.js logic
        window.location.reload();
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
        // Reload the page to trigger the main App.js logic
        window.location.reload();
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (error) {
      setError('Login failed: ' + error.message);
    }
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
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
          <p className="text-xl text-blue-100 font-medium">
            Computer-Based Test System
          </p>
          <p className="text-sm text-blue-200 mt-2">
            Secure • Reliable • Professional
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20">
          {!showAdminForm && !showStudentForm ? (
            // Login Type Selection
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome Back</h2>
                <p className="text-gray-600">Choose your login type to continue</p>
              </div>

              <div className="space-y-4">
                <button
                  onClick={showAdminLogin}
                  className="w-full group relative flex items-center justify-center px-6 py-4 border border-transparent text-lg font-medium rounded-xl text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Administrator Login
                </button>

                <button
                  onClick={showStudentLogin}
                  className="w-full group relative flex items-center justify-center px-6 py-4 border border-transparent text-lg font-medium rounded-xl text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Student Login
                </button>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-500">
                  Need help? Contact your institution's IT support
                </p>
              </div>
            </div>
          ) : (
            // Login Forms
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  {showAdminForm ? 'Administrator Access' : 'Student Access'}
                </h2>
                <p className="text-gray-600">
                  Enter your credentials to sign in
                </p>
              </div>

              {/* Admin Login Form */}
              {showAdminForm && (
                <form onSubmit={handleAdminLogin} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      value={adminCredentials.username}
                      onChange={(e) => setAdminCredentials({...adminCredentials, username: e.target.value})}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      placeholder="Enter your username"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showAdminPassword ? "text" : "password"}
                        value={adminCredentials.password}
                        onChange={(e) => setAdminCredentials({...adminCredentials, password: e.target.value})}
                        required
                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminPassword(!showAdminPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        {showAdminPassword ? (
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

                  <div className="flex space-x-3">
                    <button 
                      type="submit" 
                      className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      Sign In
                    </button>
                    <button 
                      type="button" 
                      onClick={hideForms} 
                      className="flex-1 bg-gray-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
                    >
                      Back
                    </button>
                  </div>
                </form>
              )}

              {/* Student Login Form */}
              {showStudentForm && (
                <form onSubmit={handleStudentLogin} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Student ID
                    </label>
                    <input
                      type="text"
                      value={studentCredentials.studentId}
                      onChange={(e) => setStudentCredentials({...studentCredentials, studentId: e.target.value})}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                      placeholder="Enter your student ID"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showStudentPassword ? "text" : "password"}
                        value={studentCredentials.password}
                        onChange={(e) => setStudentCredentials({...studentCredentials, password: e.target.value})}
                        required
                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowStudentPassword(!showStudentPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        {showStudentPassword ? (
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

                  <div className="flex space-x-3">
                    <button 
                      type="submit" 
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      Sign In
                    </button>
                    <button 
                      type="button" 
                      onClick={hideForms} 
                      className="flex-1 bg-gray-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
                    >
                      Back
                    </button>
                  </div>
                </form>
              )}

              {error && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                  <div className="flex">
                    <svg className="h-5 w-5 text-red-400 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span className="font-medium">{error}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-blue-200">
            © 2024 CBT System. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default InstitutionLoginPage;
