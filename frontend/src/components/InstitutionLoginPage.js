import React, { useState, useEffect } from 'react';
import firebaseDataService from '../firebase/dataService';

const InstitutionLoginPage = ({ institution, onLogin, onAdminAccess }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [secretClickCount, setSecretClickCount] = useState(0);
  const [showRegister, setShowRegister] = useState(false);
  const [registerData, setRegisterData] = useState({
    fullName: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  });

  // Hidden admin access - click on logo 5 times quickly
  const handleLogoClick = () => {
    setSecretClickCount(prev => {
      const newCount = prev + 1;
      if (newCount >= 5) {
        setShowAdminPanel(true);
        setSecretClickCount(0);
        return 0;
      }
      // Reset counter after 3 seconds
      setTimeout(() => setSecretClickCount(0), 3000);
      return newCount;
    });
  };

  // Keyboard shortcut for admin access (Ctrl + Alt + A)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.altKey && e.key === 'a') {
        e.preventDefault();
        setShowAdminPanel(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await onLogin(formData);
      if (!result.success) {
        setError(result.message || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminAccess = () => {
    if (onAdminAccess) {
      onAdminAccess();
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleRegisterInputChange = (e) => {
    setRegisterData({
      ...registerData,
      [e.target.name]: e.target.value
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (registerData.password !== registerData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const studentData = {
        fullName: registerData.fullName,
        email: registerData.email,
        username: registerData.username,
        password: registerData.password,
        role: 'student',
        isActive: true,
        institutionId: institution.id,
        institutionName: institution.name,
        createdAt: new Date().toISOString()
      };

      const newUser = await firebaseDataService.createUser(studentData);
      console.log('🔍 InstitutionLoginPage: Created new student:', newUser);

      setFormData({
        username: registerData.username,
        password: registerData.password
      });
      setShowRegister(false);
      setError('');
      alert('Registration successful! You can now sign in.');
    } catch (err) {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Institution Header */}
        <div className="text-center">
          <div className="flex justify-center items-center space-x-4 mb-6">
            {institution?.logo && (
              <img
                src={institution.logo}
                alt={`${institution.name} Logo`}
                className="h-16 w-16 object-contain cursor-pointer transition-transform hover:scale-105"
                onClick={handleLogoClick}
                title="Click 5 times quickly for admin access"
              />
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{institution?.name}</h1>
              <p className="text-gray-600 mt-1">Computer-Based Test System</p>
            </div>
          </div>
          
           <div className="bg-white rounded-lg shadow-lg p-8">
             {showAdminPanel ? (
               /* Admin Panel */
               <div>
                 <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
                   Admin Access
                 </h2>
                 
                 <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                   <h3 className="text-sm font-medium text-blue-800 mb-2">Admin Credentials</h3>
                   <div className="space-y-2 text-sm">
                     <div className="flex justify-between">
                       <span className="text-blue-700">Username:</span>
                       <span className="font-mono text-blue-900">admin</span>
                     </div>
                     <div className="flex justify-between">
                       <span className="text-blue-700">Password:</span>
                       <span className="font-mono text-blue-900">admin123</span>
                     </div>
                   </div>
                 </div>

                 {error && (
                   <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                     {error}
                   </div>
                 )}

                 <form onSubmit={handleSubmit} className="space-y-6">
                   <div>
                     <label htmlFor="admin-username" className="block text-sm font-medium text-gray-700 mb-2">
                       Username
                     </label>
                     <input
                       id="admin-username"
                       name="username"
                       type="text"
                       required
                       value={formData.username}
                       onChange={handleInputChange}
                       className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                       placeholder="Enter admin username"
                     />
                   </div>

                   <div>
                     <label htmlFor="admin-password" className="block text-sm font-medium text-gray-700 mb-2">
                       Password
                     </label>
                     <input
                       id="admin-password"
                       name="password"
                       type="password"
                       required
                       value={formData.password}
                       onChange={handleInputChange}
                       className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                       placeholder="Enter admin password"
                     />
                   </div>

                   <button
                     type="submit"
                     disabled={loading}
                     className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     {loading ? (
                       <div className="flex items-center">
                         <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                         Signing in...
                       </div>
                     ) : (
                       'Admin Sign In'
                     )}
                   </button>
                 </form>

                 <div className="mt-6 text-center">
                   <button
                     onClick={() => setShowAdminPanel(false)}
                     className="text-sm text-gray-500 hover:text-gray-700 underline"
                   >
                     Back to Student Access
                   </button>
                 </div>
               </div>
             ) : (
               /* Student Access Panel */
               <div>
                 <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
                   {showRegister ? 'Student Registration' : 'Student Login'}
                 </h2>

                 {error && (
                   <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                     {error}
                   </div>
                 )}

                 {showRegister ? (
                   /* Registration Form */
                   <form onSubmit={handleRegister} className="space-y-4">
                     <div>
                       <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                         Full Name
                       </label>
                       <input
                         id="fullName"
                         name="fullName"
                         type="text"
                         required
                         value={registerData.fullName}
                         onChange={handleRegisterInputChange}
                         className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                         placeholder="Enter your full name"
                       />
                     </div>

                     <div>
                       <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                         Email
                       </label>
                       <input
                         id="email"
                         name="email"
                         type="email"
                         required
                         value={registerData.email}
                         onChange={handleRegisterInputChange}
                         className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                         placeholder="Enter your email"
                       />
                     </div>

                     <div>
                       <label htmlFor="reg-username" className="block text-sm font-medium text-gray-700 mb-2">
                         Username
                       </label>
                       <input
                         id="reg-username"
                         name="username"
                         type="text"
                         required
                         value={registerData.username}
                         onChange={handleRegisterInputChange}
                         className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                         placeholder="Choose a username"
                       />
                     </div>

                     <div>
                       <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700 mb-2">
                         Password
                       </label>
                       <input
                         id="reg-password"
                         name="password"
                         type="password"
                         required
                         value={registerData.password}
                         onChange={handleRegisterInputChange}
                         className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                         placeholder="Choose a password"
                       />
                     </div>

                     <div>
                       <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                         Confirm Password
                       </label>
                       <input
                         id="confirmPassword"
                         name="confirmPassword"
                         type="password"
                         required
                         value={registerData.confirmPassword}
                         onChange={handleRegisterInputChange}
                         className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                         placeholder="Confirm your password"
                       />
                     </div>

                     <button
                       type="submit"
                       disabled={loading}
                       className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                       {loading ? (
                         <div className="flex items-center">
                           <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                           Registering...
                         </div>
                       ) : (
                         'Register'
                       )}
                     </button>
                   </form>
                 ) : (
                   /* Login Form */
                   <form onSubmit={handleSubmit} className="space-y-6">
                     <div>
                       <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                         Username or Email
                       </label>
                       <input
                         id="username"
                         name="username"
                         type="text"
                         required
                         value={formData.username}
                         onChange={handleInputChange}
                         className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                         placeholder="Enter your username or email"
                       />
                     </div>

                     <div>
                       <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                         Password
                       </label>
                       <input
                         id="password"
                         name="password"
                         type="password"
                         required
                         value={formData.password}
                         onChange={handleInputChange}
                         className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                         placeholder="Enter your password"
                       />
                     </div>

                     <button
                       type="submit"
                       disabled={loading}
                       className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                       {loading ? (
                         <div className="flex items-center">
                           <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                           Signing in...
                         </div>
                       ) : (
                         'Sign In'
                       )}
                     </button>
                   </form>
                 )}

                 {/* Toggle between Login and Register */}
                 <div className="mt-6 text-center">
                   {showRegister ? (
                     <button
                       onClick={() => setShowRegister(false)}
                       className="text-sm text-gray-500 hover:text-gray-700 underline"
                     >
                       Already have an account? Sign in
                     </button>
                   ) : (
                     <button
                       onClick={() => setShowRegister(true)}
                       className="text-sm text-gray-500 hover:text-gray-700 underline"
                     >
                       Don't have an account? Register
                     </button>
                   )}
                 </div>

                 {/* Help Text */}
                 <div className="mt-6 text-center">
                   <p className="text-xs text-gray-500">
                     Need help? Contact your institution administrator.
                   </p>
                   <p className="text-xs text-gray-400 mt-1">
                     Admin access: Click logo 5 times or press Ctrl+Alt+A
                   </p>
                 </div>
               </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default InstitutionLoginPage;
