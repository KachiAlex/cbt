import React, { useEffect, useState } from "react";
import InstitutionLoginPage from "./components/InstitutionLoginPage";
import MultiTenantAdmin from "./components/MultiTenantAdmin";
import MultiTenantAdminLogin from "./components/MultiTenantAdminLogin";
import CBTExam from "./components/CBTExam";
import StudentExam from "./components/StudentExam";
import ConnectionStatus from "./components/ConnectionStatus";
// import SystemDiagnostics from "./components/SystemDiagnostics";
import AdminDashboardStats from "./components/AdminDashboardStats";
import PerformanceAnalytics from "./components/PerformanceAnalytics";
import RealTimeDataProvider from "./components/RealTimeDataProvider";
import ValidatedInput, { EmailInput, PasswordInput } from "./components/ValidatedInput";
import { useUserLoginForm, useUserRegistrationForm } from "./hooks/useFormValidation";
import { ToastProvider, useToast } from "./components/Toast";
import { ButtonSpinner } from "./components/LoadingSpinner";
import dataService from "./services/dataService";

const LS_KEYS = {
  EXAMS: "cbt_exams_v1",
  QUESTIONS: "cbt_questions_v1",
  RESULTS: "cbt_results_v1",
  ACTIVE_EXAM: "cbt_active_exam_v1",
  USERS: "cbt_users_v1",
  STUDENT_REGISTRATIONS: "cbt_student_registrations_v1",
  SHARED_DATA: "cbt_shared_data_v1"
};

function Header({user, onLogout, onLogoClick, institutionData}){
  return (
    <div className="bg-white border-b">
      <div className="max-w-5xl mx-auto flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          {institutionData?.logo ? (
            <div className="flex items-center gap-2 text-left">
              <div className="h-10 md:h-12 w-10 md:w-12 rounded-lg overflow-hidden flex items-center justify-center bg-gray-100">
                <img 
                  src={institutionData.logo} 
                  alt={`${institutionData.name} logo`}
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    // Fallback to default CBT logo if image fails to load
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="h-10 md:h-12 w-10 md:w-12 bg-blue-600 rounded-lg flex items-center justify-center hidden">
                  <span className="text-white font-bold text-lg md:text-xl">CBT</span>
                </div>
              </div>
              <span className="text-base sm:text-lg font-bold whitespace-nowrap">{institutionData.name}</span>
            </div>
          ) : (
            <button 
              onClick={onLogoClick}
              className="flex items-center gap-2 text-left hover:text-blue-600 transition-colors cursor-pointer"
              title={!user ? "Click to reveal admin access" : ""}
            >
              <div className="h-10 md:h-12 w-10 md:w-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg md:text-xl">CBT</span>
              </div>
              <span className="text-base sm:text-lg font-bold whitespace-nowrap">CBT Platform</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <ConnectionStatus className="hidden sm:block" />
          {user ? (
            <>
              <button onClick={onLogout} className="px-3 py-1.5 rounded-xl bg-gray-800 text-white text-sm hover:bg-black">Logout</button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AdminLogin({onLogin, onBack}){
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    
    if (!username || !password) {
      setError("Please enter both username and password");
      setIsLoading(false);
      return;
    }

    try {
      console.log('🔐 Attempting admin login for username:', username);
      
      const user = await authenticateUser(username, password);
      console.log('🔐 Authentication result:', user);
      
      if (user && user.role === "admin") {
        console.log('✅ Admin login successful');
        onLogin(user);
      } else {
        console.log('❌ Admin login failed - invalid credentials or role');
        setError("Invalid admin credentials. Please check your username and password.");
      }
    } catch (error) {
      console.error('❌ Error during admin login:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Cannot connect to server. Please check your internet connection.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Login request timed out. Please try again.';
      } else if (error.message.includes('Invalid admin credentials')) {
        errorMessage = 'Invalid admin credentials. Please check your username and password.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white p-6 rounded-xl shadow-lg border">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">🔐 Admin Login</h2>
          <p className="text-gray-600">Access the admin panel</p>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter admin username"
              autoComplete="username"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter admin password"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-2 px-4 rounded-lg transition-colors font-medium ${
              isLoading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Authenticating...
              </span>
            ) : (
              'Sign In as Admin'
            )}
          </button>
        </form>
        
        <div className="mt-4 text-center">
          <button
            onClick={onBack}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            ← Back to Student Login
          </button>
        </div>
      </div>
    </div>
  );
}

function Login({onLogin}){
  const [mode, setMode] = useState("login"); // "login" or "register"
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  
  // Use validation hooks
  const loginForm = useUserLoginForm({ username: "", password: "" });
  const registrationForm = useUserRegistrationForm({ 
    username: "", 
    password: "", 
    fullName: "", 
    email: "", 
    confirmPassword: "" 
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    
    await loginForm.handleSubmit(async (formData) => {
    setIsLoading(true);

    try {
      // Only student authentication - admin access is separate
        const user = await authenticateUser(formData.username, formData.password);
      if (user && user.role === "student") {
          toast.success("Login successful! Welcome back.");
        onLogin(user);
      } else if (user && user.role === "admin") {
        setError("This is an admin account. Please use the admin login instead.");
          toast.warning("This is an admin account. Please use the admin login instead.");
      } else {
        setError("Invalid username or password. Please check your credentials or register as a new student.");
          toast.error("Invalid username or password. Please check your credentials.");
      }
    } catch (error) {
      console.error('Error during student login:', error);
        
        // Provide more specific error messages
        let errorMessage = 'Login failed. Please try again.';
        
        if (error.message.includes('Failed to fetch')) {
          errorMessage = 'Cannot connect to server. Please check your internet connection.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Login request timed out. Please try again.';
        } else if (error.message.includes('Invalid username or password')) {
          errorMessage = 'Invalid username or password. Please check your credentials.';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        setError(errorMessage);
        toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    await registrationForm.handleSubmit(async (formData) => {
      try {
        // Additional validation for password confirmation
        if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

      const studentData = {
          username: formData.username,
          password: formData.password,
          fullName: formData.fullName,
          email: formData.email
      };
      
      await registerStudent(studentData);
      setSuccess("Registration successful! You can now login with your credentials.");
        toast.success("Registration successful! You can now login with your credentials.");
      setMode("login");
        registrationForm.resetForm();
    } catch (err) {
        console.error('Error during student registration:', err);
        
        // Provide more specific error messages
        let errorMessage = err.message || 'Registration failed. Please try again.';
        
        if (err.message.includes('Failed to fetch')) {
          errorMessage = 'Cannot connect to server. Please check your internet connection.';
        } else if (err.message.includes('timeout')) {
          errorMessage = 'Registration request timed out. Please try again.';
        } else if (err.message.includes('Username already exists')) {
          errorMessage = 'Username already exists. Please choose a different username.';
        } else if (err.message.includes('Email already registered')) {
          errorMessage = 'Email already registered. Please use a different email address.';
        }
        
        setError(errorMessage);
        toast.error(errorMessage);
      }
    });
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl shadow p-6 mt-10">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Student Portal</h2>
        <p className="text-gray-600 text-sm">Login or register to take exams</p>
      </div>
      
      <div className="flex mb-6">
        <button 
          onClick={() => {setMode("login"); setError(""); setSuccess("");}} 
          className={`flex-1 py-2 text-sm font-medium ${mode === "login" ? "text-emerald-600 border-b-2 border-emerald-600" : "text-gray-500"}`}
        >
          Login
        </button>
        <button 
          onClick={() => {setMode("register"); setError(""); setSuccess("");}} 
          className={`flex-1 py-2 text-sm font-medium ${mode === "register" ? "text-emerald-600 border-b-2 border-emerald-600" : "text-gray-500"}`}
        >
          Register
        </button>
      </div>

      {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl">{error}</div>}
      {success && <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-600 text-sm rounded-xl">{success}</div>}

      {mode === "login" ? (
        <form onSubmit={handleLogin} className="space-y-4">
          <ValidatedInput
              name="username"
            label="Username"
            value={loginForm.formData.username}
            onChange={loginForm.updateField}
            onBlur={() => loginForm.touchField('username')}
              placeholder="Enter your username"
              autoComplete="username"
            error={loginForm.getFieldError('username')}
            touched={loginForm.touched.username}
            required
          />
          
          <PasswordInput
                name="password"
            label="Password"
            value={loginForm.formData.password}
            onChange={loginForm.updateField}
            onBlur={() => loginForm.touchField('password')}
                placeholder="Enter your password"
                autoComplete="current-password"
            error={loginForm.getFieldError('password')}
            touched={loginForm.touched.password}
            required
          />
          
          <button 
            type="submit"
            disabled={isLoading || loginForm.isSubmitting}
            className={`w-full rounded-xl py-2.5 font-semibold ${
              isLoading || loginForm.isSubmitting
                ? 'bg-gray-400 cursor-not-allowed text-white' 
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {isLoading || loginForm.isSubmitting ? (
              <span className="flex items-center justify-center">
                <ButtonSpinner />
                Authenticating...
              </span>
            ) : (
              'Login as Student'
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleRegister} className="space-y-4">
          <ValidatedInput
              name="fullName"
            label="Full Name"
            value={registrationForm.formData.fullName}
            onChange={registrationForm.updateField}
            onBlur={() => registrationForm.touchField('fullName')}
              placeholder="Enter your full name"
              autoComplete="name"
            error={registrationForm.getFieldError('fullName')}
            touched={registrationForm.touched.fullName}
            required
          />
          
          <EmailInput
              name="email"
            label="Email"
            value={registrationForm.formData.email}
            onChange={registrationForm.updateField}
            onBlur={() => registrationForm.touchField('email')}
              placeholder="Enter your email address"
            error={registrationForm.getFieldError('email')}
            touched={registrationForm.touched.email}
            required
          />
          
          <ValidatedInput
              name="username"
            label="Username"
            value={registrationForm.formData.username}
            onChange={registrationForm.updateField}
            onBlur={() => registrationForm.touchField('username')}
              placeholder="Choose a username"
              autoComplete="username"
            error={registrationForm.getFieldError('username')}
            touched={registrationForm.touched.username}
            required
          />
          
          <PasswordInput
                name="password"
            label="Password"
            value={registrationForm.formData.password}
            onChange={registrationForm.updateField}
            onBlur={() => registrationForm.touchField('password')}
            placeholder="Choose a password (min 8 characters)"
            error={registrationForm.getFieldError('password')}
            touched={registrationForm.touched.password}
            required
          />
          
          <PasswordInput
                name="confirmPassword"
            label="Confirm Password"
            value={registrationForm.formData.confirmPassword}
            onChange={registrationForm.updateField}
            onBlur={() => registrationForm.touchField('confirmPassword')}
                placeholder="Confirm your password"
            error={registrationForm.getFieldError('confirmPassword')}
            touched={registrationForm.touched.confirmPassword}
            required
              />
          
              <button
            type="submit"
            disabled={registrationForm.isSubmitting}
            className={`w-full rounded-xl py-2.5 font-semibold ${
              registrationForm.isSubmitting
                ? 'bg-gray-400 cursor-not-allowed text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {registrationForm.isSubmitting ? (
              <span className="flex items-center justify-center">
                <ButtonSpinner />
                Registering...
              </span>
            ) : (
              'Register as Student'
            )}
          </button>
        </form>
      )}

      <div className="mt-6 text-xs text-gray-500">
        <p>Students must register first before they can login and take exams.</p>
      </div>
    </div>
  );
}

function AdminPanel({ user, tenant, onCBTView }) {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
        <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Admin Dashboard</h1>
        <p className="opacity-90">
          Welcome back, {user.fullName || user.username}! Manage your institution's CBT system.
        </p>
        <p className="text-sm opacity-75 mt-1">
          Institution: {tenant?.name || 'Unknown Institution'}
        </p>
            </div>

      {/* Connection Status */}
      <ConnectionStatus showDetails={true} className="mb-6" />

      {/* Enhanced Dashboard Statistics */}
      <AdminDashboardStats user={user} tenant={tenant} />

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
                  <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Dashboard
                  </button>
                  <button 
              onClick={() => setActiveTab('cbt')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'cbt'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              CBT Management
                  </button>
                  <button 
              onClick={() => setActiveTab('users')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              User Management
                  </button>
                  <button
              onClick={() => setActiveTab('analytics')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'analytics'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Analytics
                  </button>
                  <button
              onClick={() => setActiveTab('settings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Settings
                  </button>
                  <button
              onClick={() => setActiveTab('diagnostics')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'diagnostics'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Diagnostics
                  </button>
          </nav>
                </div>

        <div className="p-6">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h4 className="font-medium text-blue-900 mb-3 text-lg">Welcome to Your CBT Dashboard</h4>
                <p className="text-blue-800 mb-4">
                  Your comprehensive statistics and system overview are displayed above. Use the tabs below to manage different aspects of your CBT system.
                </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <h5 className="font-medium text-blue-900 mb-2">📝 Exam Management</h5>
                    <p className="text-sm text-blue-700 mb-3">Create and manage exams, upload questions, and configure settings.</p>
                  <button
                  onClick={onCBTView}
                      className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                    >
                      Go to CBT Management →
                </button>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <h5 className="font-medium text-blue-900 mb-2">👥 User Management</h5>
                    <p className="text-sm text-blue-700 mb-3">View registered students, manage permissions, and track activity.</p>
            <button 
                  onClick={() => setActiveTab('users')}
                      className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                    >
                      Manage Users →
                    </button>
          </div>
              </div>
            </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">Getting Started Guide</h4>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• Upload your exam questions using Microsoft Word (.docx) or Excel (.xlsx) format</li>
                  <li>• Set exam title and configure settings in the CBT Management tab</li>
                  <li>• Students can register and take exams through the student portal</li>
                  <li>• View real-time statistics and export results for analysis</li>
                  <li>• Monitor system health and connection status at the top of the dashboard</li>
                </ul>
              </div>
        </div>
      )}

          {activeTab === 'cbt' && (
        <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">CBT Management</h3>
              <p className="text-gray-600">Click the button below to access the full CBT management system.</p>
            <button 
                onClick={onCBTView}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold"
            >
                Open CBT Management
            </button>
          </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">User Management</h3>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-600">
                  User management features will be implemented here. This will include:
                </p>
                <ul className="mt-2 text-sm text-gray-600 space-y-1">
                  <li>• View all registered students</li>
                  <li>• Add new students</li>
                  <li>• Manage student permissions</li>
                  <li>• View student exam history</li>
                </ul>
            </div>
        </div>
      )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Performance Analytics</h3>
              <PerformanceAnalytics />
        </div>
      )}

          {activeTab === 'settings' && (
        <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Institution Settings</h3>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-600">
                  Institution settings and configuration options will be available here.
                </p>
            </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}

function StudentPanel({ user, tenant, onExamView }) {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Student Dashboard</h1>
        <p className="opacity-90">
          Welcome back, {user.fullName || user.username}! Take your exams.
        </p>
        <p className="text-sm opacity-75 mt-1">
          Institution: {tenant?.name || 'Unknown Institution'}
        </p>
          </div>
          
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
          </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Exams</p>
              <p className="text-2xl font-semibold text-gray-900">1</p>
            </div>
            </div>
          </div>
          
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
          </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Students</p>
              <p className="text-2xl font-semibold text-gray-900">0</p>
      </div>
    </div>
          </div>
          
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
          </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Exam Results</p>
              <p className="text-2xl font-semibold text-gray-900">0</p>
            </div>
          </div>
            </div>
          </div>
          
      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('exams')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'exams'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Exams
            </button>
          <button
              onClick={() => setActiveTab('results')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'results'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Results
          </button>
              <button
              onClick={() => setActiveTab('settings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Settings
              </button>
          </nav>
          </div>
          
        <div className="p-6">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                  onClick={() => setActiveTab('exams')}
                  className="flex items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                  <div className="text-center">
                    <div className="text-4xl mb-3">📝</div>
                    <div className="font-medium text-lg">Take Exams</div>
                    <div className="text-sm text-gray-500 mt-1">
                      Available exams to take
            </div>
          </div>
                </button>
          
            <button
                  onClick={() => setActiveTab('results')}
                  className="flex items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors"
                >
                  <div className="text-center">
                    <div className="text-4xl mb-3">📊</div>
                    <div className="font-medium text-lg">View Results</div>
                    <div className="text-sm text-gray-500 mt-1">
                      Your exam history
                    </div>
                  </div>
            </button>
          </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Getting Started</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Check available exams in the "Exams" tab.</li>
                  <li>• Click on an exam to start.</li>
                  <li>• Answer questions and submit your exam.</li>
                  <li>• View your exam results in the "Results" tab.</li>
                </ul>
      </div>
    </div>
          )}

          {activeTab === 'exams' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Available Exams</h3>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-600">
                  No exams available at this time. Please check back later.
                </p>
        </div>
      </div>
          )}

          {activeTab === 'results' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Exam Results</h3>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-600">
                  Your exam history will be displayed here.
                </p>
        </div>
        </div>
      )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Student Settings</h3>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-600">
                  Student settings and preferences will be available here.
                </p>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("multi-tenant-admin-login"); // Default to multi-tenant admin
  const [showAdminLink, setShowAdminLink] = useState(false);
  const [institutionData, setInstitutionData] = useState(null);
  const [currentView, setCurrentView] = useState("main"); // "main", "cbt-admin", "student-exam"
  // eslint-disable-next-line no-unused-vars
  const [selectedExam, setSelectedExam] = useState(null); // Used in handleStudentExamView

  useEffect(() => {
    console.log('🔍 Current URL:', window.location.href);
    console.log('🔍 Pathname:', window.location.pathname);
    console.log('🔍 Search:', window.location.search);
    console.log('🔍 Initial view state:', view);
    
    // Get URL parameters first
    const urlParams = new URLSearchParams(window.location.search);
    
    // Multi-tenant admin is now the default at root URL
    // Check if this is a multi-tenant admin route (default for root URL)
    const isMultiTenantAdminRoute = window.location.pathname === '/admin' || 
                                   window.location.pathname === '/admin/' || 
                                   urlParams.get('admin') === 'true' ||
                                   urlParams.get('mode') === 'admin' ||
                                   (window.location.pathname === '/' && !urlParams.get('tenant') && !urlParams.get('student'));
    
    if (isMultiTenantAdminRoute) {
      console.log('🏢 Multi-tenant admin route detected (default at root)');
      console.log('🔍 Current URL:', window.location.href);
      console.log('🔍 Pathname:', window.location.pathname);
      console.log('🔍 Search params:', window.location.search);
      console.log('🔍 isMultiTenantAdminRoute condition result:', isMultiTenantAdminRoute);
      
      // Check if multi-tenant admin is authenticated
      const token = localStorage.getItem('multi_tenant_admin_token');
      const refreshToken = localStorage.getItem('multi_tenant_admin_refresh_token');
      const userData = localStorage.getItem('multi_tenant_admin_user');
      
      console.log('🔐 Authentication check:', {
        hasToken: !!token,
        hasRefreshToken: !!refreshToken,
        hasUserData: !!userData,
        tokenLength: token?.length || 0
      });
      
      if (token && userData) {
        try {
          const user = JSON.parse(userData);
          console.log('✅ Multi-tenant admin authenticated:', user.username);
        setView("multi-tenant-admin");
        } catch (error) {
          console.error('❌ Error parsing user data:', error);
          localStorage.removeItem('multi_tenant_admin_token');
          localStorage.removeItem('multi_tenant_admin_refresh_token');
          localStorage.removeItem('multi_tenant_admin_user');
          setView("multi-tenant-admin-login");
        }
        } else {
          console.log('❌ No valid authentication found, showing login');
          console.log('🔧 Setting view to multi-tenant-admin-login');
          setView("multi-tenant-admin-login");
          console.log('🔧 View set to:', "multi-tenant-admin-login");
        }
      return; // Exit early for admin routes
    }
    
    // Check if this is an institution-specific route (only with explicit tenant parameter)
    let slug = urlParams.get('tenant') || urlParams.get('slug');
    
    // Only check pathname for institution slugs if we're not at root and no tenant param
    if (!slug && window.location.pathname !== '/' && window.location.pathname !== '/admin') {
      const pathParts = window.location.pathname.split('/').filter(part => part);
      if (pathParts.length > 0) {
        // Check if the first path part looks like an institution slug
        const potentialSlug = pathParts[0];
        if (potentialSlug.includes('-') || potentialSlug.length > 5) {
          slug = potentialSlug;
          console.log('🏫 Institution route detected from pathname:', slug);
        }
      }
    }
    
    console.log('🔍 Checking URL parameters:', { slug, search: window.location.search, href: window.location.href });
    
    if (slug) {
      console.log('🏫 Institution route detected:', slug);
      // Set view immediately for better UX, load data in background
      setView("institution-login");
      // Load institution data in background
      loadInstitutionData(slug);
      return; // Exit early for institution routes
    } else {
      console.log('🏠 Regular route detected - this should not happen as multi-tenant admin is now default');
      // This should not be reached since multi-tenant admin is now the default
      // But keeping as fallback for any edge cases
      setView("multi-tenant-admin-login");
    }
    
    // Multi-tenant admin is now the default, no need for local admin user creation
    
    // Check API connection on app load
    const checkConnection = async () => {
      try {
        const connectionStatus = await dataService.checkApiConnection();
        console.log('🔍 App startup - API connection status:', connectionStatus);
      } catch (error) {
        console.error('Error checking API connection:', error);
      }
    };
    
    checkConnection();
  }, []);

  // Load institution data for institution-specific routes
  const loadInstitutionData = async (slug) => {
    try {
      // Check API configuration first
      const apiConfig = dataService.getApiConfig();
      
      if (!apiConfig.USE_API) {
        // Demo mode - check if institution exists in demo institutions first
        const demoInstitutions = JSON.parse(localStorage.getItem('demo_institutions') || '[]');
        console.log('🔍 [App.js] All demo institutions:', demoInstitutions);
        console.log('🔍 [App.js] Looking for slug:', slug);
        const existingInstitution = demoInstitutions.find(inst => inst.slug === slug);
        console.log('🔍 [App.js] Found existing institution:', existingInstitution);
        
        let demoInstitution;
        if (existingInstitution) {
          // Use existing institution data (created by multi-tenant admin)
          demoInstitution = existingInstitution;
          console.log('🏫 [App.js] Using existing institution data from multi-tenant admin:', demoInstitution);
          console.log('🏫 [App.js] Institution logo:', demoInstitution.logo);
        } else {
          // Create new demo institution data
          demoInstitution = {
            _id: `demo_${slug}`,
            slug: slug,
            name: slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
            adminUsername: 'admin',
            adminEmail: `admin@${slug}.edu`,
            adminFullName: 'Institution Administrator',
            logo: '', // No logo for new demo institutions
            description: `Welcome to ${slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} - Your trusted educational partner.`,
            website: `https://${slug}.edu`,
            contactPhone: '+1 (555) 123-4567',
            address: '123 Education Street, Learning City, LC 12345',
            plan: 'basic',
            totalUsers: 50,
            isActive: true,
            createdAt: new Date().toISOString(),
            lastActivity: new Date().toISOString()
          };
          console.log('🏫 [App.js] Demo institution data created:', demoInstitution);
        }
        
        setInstitutionData(demoInstitution);
        localStorage.setItem('institution_data', JSON.stringify(demoInstitution));
        localStorage.setItem('institution_slug', slug);
        return;
      }
      
      // API mode - Load institution data from MongoDB API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
      
      try {
        const response = await fetch(`https://cbt-rew7.onrender.com/api/tenant/${slug}/profile`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error('Institution not found or suspended');
        }
        
        const data = await response.json();
        setInstitutionData(data);
        
        // Store institution data in localStorage for use throughout the app
        localStorage.setItem('institution_data', JSON.stringify(data));
        localStorage.setItem('institution_slug', slug);
        
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.warn('Institution data fetch timed out, will retry from component');
          return;
        }
        throw fetchError;
      }
      
      } catch (error) {
      console.error('Failed to load institution data:', error);
      // If institution not found, show error or redirect
      console.error('Institution not found or suspended');
    }
  };

  const onLogout = () => {
    setUser(null);
    localStorage.removeItem("cbt_logged_in_user");
    setView("login");
    setCurrentView("main");
  };

  // Multi-tenant admin login handler
  const handleMultiTenantAdminLogin = (loginData) => {
    setView("multi-tenant-admin");
  };

  // Hidden admin access - click on the logo
  const handleLogoClick = () => {
    if (!user) {
      setShowAdminLink(false);
      setView("admin-login");
    }
  };

  // Keyboard shortcut for admin access (Ctrl + Alt + A)
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!user && e.ctrlKey && e.altKey && e.key === 'A') {
        e.preventDefault();
        setShowAdminLink(true);
        setTimeout(() => setShowAdminLink(false), 5000);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [user]);

  // CBT System Navigation Handlers
  const handleCBTAdminView = () => {
    setCurrentView("cbt-admin");
  };

  const handleStudentExamView = (exam) => {
    setSelectedExam(exam);
    setCurrentView("student-exam");
  };

  const handleBackToMain = () => {
    setCurrentView("main");
    setSelectedExam(null);
  };

  // Institution route is now handled in the main useEffect above

  // CBT System Views
  if (currentView === "cbt-admin") {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
          <div className="max-w-5xl mx-auto p-4">
                <button
              onClick={handleBackToMain}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
                >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Main Dashboard
                </button>
            <CBTExam user={user} tenant={institutionData} />
              </div>
          </div>
      </div>
    );
  }

  if (currentView === "student-exam") {
    return (
      <StudentExam 
        user={user} 
        tenant={institutionData} 
        onComplete={handleBackToMain}
      />
    );
  }

    return (
    <ToastProvider>
      <RealTimeDataProvider>
    <div className="min-h-screen bg-gray-50 text-gray-800">
      {/* Hide header on institution pages to avoid duplicate branding */}
      {view !== "institution-login" && currentView !== "cbt-admin" && currentView !== "student-exam" && (
        <Header user={user} onLogout={onLogout} onLogoClick={handleLogoClick} institutionData={institutionData} />
      )}
      <main className="max-w-5xl mx-auto w-full px-3 sm:px-8 py-4 sm:py-8">
        {user ? (
          user.role === "admin" ? (
            <AdminPanel 
              user={user} 
              tenant={institutionData}
              onCBTView={handleCBTAdminView}
            />
          ) : (
            <StudentPanel 
              user={user} 
              tenant={institutionData}
              onExamView={handleStudentExamView}
            />
          )
        ) : (
          <>
            {console.log('🔍 Rendering view:', view)}
            {view === "multi-tenant-admin-login" ? (
              <MultiTenantAdminLogin onLogin={handleMultiTenantAdminLogin} />
            ) : view === "multi-tenant-admin" ? (
              <MultiTenantAdmin />
            ) : view === "institution-login" ? (
              <InstitutionLoginPage />
            ) : (
              <>
                {view === "admin-login" ? (
                  <AdminLogin 
                    onLogin={(u)=>{setUser(u); localStorage.setItem("cbt_logged_in_user", JSON.stringify(u)); setView("home");}}
                    onBack={() => setView("login")}
                    institutionData={institutionData}
                  />
                ) : view === "login" ? (
                  <>
                  <Login 
                    onLogin={(u)=>{setUser(u); localStorage.setItem("cbt_logged_in_user", JSON.stringify(u)); setView("home");}}
                    institutionData={institutionData}
                  />
                {showAdminLink && (
                  <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="text-center">
                      <p className="text-red-700 font-semibold mb-2">🔐 Admin Access</p>
              <button 
                        onClick={() => setView("admin-login")}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                        Access Admin Panel
              </button>
          </div>
        </div>
      )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600">Loading...</p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
      <footer className="text-center text-xs text-gray-500 py-6">
        © {new Date().getFullYear()} {institutionData ? institutionData.name : 'CBT Platform'}
        {!user && view !== "multi-tenant-admin" && view !== "multi-tenant-admin-login" && !institutionData?.logo && (
          <div className="mt-1 text-gray-400">
            <span className="opacity-30 hover:opacity-100 transition-opacity cursor-help" title="Admin Access: Click logo or press Ctrl+Alt+A">
              🔐
            </span>
    </div>
        )}
      </footer>
    </div>
      </RealTimeDataProvider>
    </ToastProvider>
  );
}

// User management functions - now using dataService
async function loadUsers() {
  try {
    const data = await dataService.loadUsers();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error loading users:', error);
    return [];
  }
}

async function saveUsers(users) {
  try {
    return await dataService.saveUsers(users);
  } catch (error) {
    console.error('Error saving users:', error);
    return false;
  }
}

async function authenticateUser(username, password) {
  console.log('🔐 Authenticating user:', username);
  
  try {
    // Use dataService to load users (handles both cloud and localStorage)
    const users = await dataService.loadUsers();
    console.log('👥 Total users loaded:', users.length);
    
    // Find the user
    const user = users.find(u => 
      u.username.toLowerCase() === username.toLowerCase() && 
      u.password === password
    );
    
    if (user) {
      // Make this admin the default admin if they're logging in
      if (user.role === "admin" && !user.isDefaultAdmin) {
        console.log('👑 Making current admin the default admin...');
        user.isDefaultAdmin = true;
        user.canDeleteDefaultAdmin = true;
        
        // Update the user in the database
        const updatedUsers = users.map(u => 
          u.username === user.username ? user : u
        );
        await dataService.saveUsers(updatedUsers);
        console.log('✅ Current admin is now the default admin');
      }
      
      console.log('✅ Authentication successful:', user.username, user.role);
      return user;
    } else {
      console.log('❌ Authentication failed - user not found or wrong password');
      console.log('🔍 Searched for:', username.toLowerCase());
      console.log('🔍 Available users:', users.map(u => u.username.toLowerCase()));
      return null;
    }
  } catch (error) {
    console.error('❌ Authentication error:', error);
    return null;
  }
}

async function registerStudent(studentData) {
  try {
    const users = await loadUsers();
    
    // Check if username already exists (case-insensitive)
    const newName = (studentData.username || "").trim().toLowerCase();
    if (users.find(u => (u.username || "").toLowerCase() === newName)) {
      throw new Error("Username already exists. Please choose a different username.");
    }
    
    // Check if email already exists
    if (users.find(u => u.email === studentData.email)) {
      throw new Error("Email already registered. Please use a different email.");
    }
    
    const newStudent = {
      ...studentData,
      role: "student",
      registeredAt: new Date().toISOString()
    };
    
    users.push(newStudent);
    await saveUsers(users);
    
    // Also save to registrations for admin tracking
    const registrations = loadStudentRegistrations();
    registrations.push(newStudent);
    localStorage.setItem(LS_KEYS.STUDENT_REGISTRATIONS, JSON.stringify(registrations));
    
    return newStudent;
  } catch (error) {
    console.error('Error registering student:', error);
    throw error;
  }
}

function loadStudentRegistrations() {
  const saved = localStorage.getItem(LS_KEYS.STUDENT_REGISTRATIONS);
  return saved ? JSON.parse(saved) : [];
}

export default App;
