import React, { useState, useEffect } from 'react';

const InstitutionLoginPage = () => {
  const [institutionName, setInstitutionName] = useState('Loading Institution...');
  const [institutionLogo, setInstitutionLogo] = useState(null);
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-700">
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {institutionLogo && (
            <img
              src={institutionLogo}
              alt={`${institutionName} Logo`}
              className="mx-auto h-20 w-auto mb-4"
            />
          )}
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            {institutionName}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-200">
            Computer-Based Test System
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Sign in to your account</h3>

            <div className="space-y-4">
              <button
                onClick={showAdminLogin}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Admin Login
              </button>

              <button
                onClick={showStudentLogin}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Student Login
              </button>
            </div>
          </div>

          {/* Admin Login Form */}
          {showAdminForm && (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <input
                  type="text"
                  value={adminCredentials.username}
                  onChange={(e) => setAdminCredentials({...adminCredentials, username: e.target.value})}
                  required
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  value={adminCredentials.password}
                  onChange={(e) => setAdminCredentials({...adminCredentials, password: e.target.value})}
                  required
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div className="flex space-x-3">
                <button type="submit" className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
                  Login
                </button>
                <button type="button" onClick={hideForms} className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Student Login Form */}
          {showStudentForm && (
            <form onSubmit={handleStudentLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Student ID</label>
                <input
                  type="text"
                  value={studentCredentials.studentId}
                  onChange={(e) => setStudentCredentials({...studentCredentials, studentId: e.target.value})}
                  required
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  value={studentCredentials.password}
                  onChange={(e) => setStudentCredentials({...studentCredentials, password: e.target.value})}
                  required
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div className="flex space-x-3">
                <button type="submit" className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
                  Login
                </button>
                <button type="button" onClick={hideForms} className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstitutionLoginPage;
