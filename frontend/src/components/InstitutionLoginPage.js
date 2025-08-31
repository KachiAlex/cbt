import React, { useState, useEffect } from 'react';

const InstitutionLoginPage = () => {
  const [institutionName, setInstitutionName] = useState('Loading Institution...');
  const [institutionLogo, setInstitutionLogo] = useState(null);
  const [tac, setTac] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [showStudentForm, setShowStudentForm] = useState(false);

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

  const handleTacSubmit = (e) => {
    e.preventDefault();
    if (tac.length === 17) {
      // Show login options after TAC validation
      setShowAdminForm(false);
      setShowStudentForm(false);
      setError('');
    } else {
      setError('Please enter a valid 17-character TAC');
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
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('tenant', JSON.stringify(data.tenant));
        localStorage.setItem('institution_data', JSON.stringify(data.tenant));
        localStorage.setItem('institution_slug', institutionSlug);
        window.location.href = 'https://cbt.netlify.app/?institution=' + institutionSlug;
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
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('tenant', JSON.stringify(data.tenant));
        localStorage.setItem('institution_data', JSON.stringify(data.tenant));
        localStorage.setItem('institution_slug', institutionSlug);
        window.location.href = 'https://cbt.netlify.app/?institution=' + institutionSlug;
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (error) {
      setError('Login failed: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-600">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading institution...</p>
        </div>
      </div>
    );
  }

  if (error && !institutionName) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-600">
        <div className="text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-green-600 flex">
      {/* Left Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold text-white mb-8 text-center">
            {institutionName}
          </h1>
          
          {!showAdminForm && !showStudentForm && (
            <form onSubmit={handleTacSubmit} className="space-y-6">
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  BRISIN Test Authentication Code (TAC)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={tac}
                    onChange={(e) => setTac(e.target.value)}
                    maxLength={17}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter TAC"
                    required
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                    {tac.length}/17
                  </span>
                </div>
              </div>
              
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}
              
              <button
                type="submit"
                className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 font-medium"
              >
                LOGIN
              </button>
            </form>
          )}

          {/* Admin Login Form */}
          {showAdminForm && (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <h2 className="text-xl font-bold text-white mb-4">Admin Login</h2>
              <div>
                <label className="block text-white text-sm font-medium mb-2">Username</label>
                <input
                  type="text"
                  value={adminCredentials.username}
                  onChange={(e) => setAdminCredentials({...adminCredentials, username: e.target.value})}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-white text-sm font-medium mb-2">Password</label>
                <input
                  type="password"
                  value={adminCredentials.password}
                  onChange={(e) => setAdminCredentials({...adminCredentials, password: e.target.value})}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex space-x-3">
                <button type="submit" className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700">
                  Login
                </button>
                <button type="button" onClick={hideForms} className="flex-1 bg-gray-500 text-white py-3 px-4 rounded-lg hover:bg-gray-600">
                  Back
                </button>
              </div>
            </form>
          )}

          {/* Student Login Form */}
          {showStudentForm && (
            <form onSubmit={handleStudentLogin} className="space-y-4">
              <h2 className="text-xl font-bold text-white mb-4">Student Login</h2>
              <div>
                <label className="block text-white text-sm font-medium mb-2">Student ID</label>
                <input
                  type="text"
                  value={studentCredentials.studentId}
                  onChange={(e) => setStudentCredentials({...studentCredentials, studentId: e.target.value})}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-white text-sm font-medium mb-2">Password</label>
                <input
                  type="password"
                  value={studentCredentials.password}
                  onChange={(e) => setStudentCredentials({...studentCredentials, password: e.target.value})}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex space-x-3">
                <button type="submit" className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700">
                  Login
                </button>
                <button type="button" onClick={hideForms} className="flex-1 bg-gray-500 text-white py-3 px-4 rounded-lg hover:bg-gray-600">
                  Back
                </button>
              </div>
            </form>
          )}

          {/* Login Options (shown after TAC validation) */}
          {tac.length === 17 && !showAdminForm && !showStudentForm && (
            <div className="mt-6 space-y-4">
              <h2 className="text-xl font-bold text-white text-center">Choose Login Type</h2>
              <button
                onClick={showAdminLogin}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium"
              >
                Admin Login
              </button>
              <button
                onClick={showStudentLogin}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 font-medium"
              >
                Student Login
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Institution Logo/Emblem */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          {institutionLogo ? (
            <img
              src={institutionLogo}
              alt={`${institutionName} Logo`}
              className="mx-auto h-64 w-auto mb-4"
            />
          ) : (
            <div className="w-64 h-64 mx-auto bg-white rounded-full flex items-center justify-center mb-4">
              <div className="text-center">
                <div className="text-6xl font-bold text-green-600 mb-2">🏫</div>
                <div className="text-green-600 font-semibold">Institution Logo</div>
              </div>
            </div>
          )}
          <h2 className="text-2xl font-bold text-white mb-2">{institutionName}</h2>
          <p className="text-white opacity-80">Computer-Based Test System</p>
        </div>
      </div>
    </div>
  );
};

export default InstitutionLoginPage;
