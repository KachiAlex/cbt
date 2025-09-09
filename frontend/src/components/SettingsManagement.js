import React, { useState, useEffect } from 'react';
import firebaseDataService from '../firebase/dataService';

const SettingsManagement = ({ institution, user, onLogout }) => {
  const [settings, setSettings] = useState({
    institutionName: institution?.name || '',
    logo: institution?.logo || '',
    timezone: 'Africa/Lagos',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    allowStudentRegistration: true,
    requireEmailVerification: false,
    maxExamAttempts: 3,
    examTimeLimit: 60,
    showCorrectAnswers: false,
    allowReviewAfterSubmit: true,
    autoSubmitOnTimeUp: true,
    randomizeQuestions: true,
    randomizeOptions: true,
    showProgressBar: true,
    allowBackNavigation: true,
    emailNotifications: true,
    smsNotifications: false,
    maintenanceMode: false,
    maintenanceMessage: 'System is under maintenance. Please try again later.'
  });

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [adminFormData, setAdminFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    role: 'admin'
  });
  const [passwordFormData, setPasswordFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const institutionData = await firebaseDataService.getInstitution(institution.id);
      if (institutionData?.settings) {
        setSettings({ ...settings, ...institutionData.settings });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      await firebaseDataService.updateInstitution(institution.id, {
        ...institution,
        settings: settings
      });
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      const adminData = {
        ...adminFormData,
        role: 'admin', // Force regular admin role
        institutionId: institution.id,
        institutionName: institution.name,
        createdAt: new Date().toISOString()
      };

      await firebaseDataService.createAdmin(adminData);
      setShowCreateAdminModal(false);
      setAdminFormData({
        fullName: '',
        username: '',
        email: '',
        password: '',
        role: 'admin'
      });
      alert('Admin created successfully!');
    } catch (error) {
      console.error('Error creating admin:', error);
      alert('Error creating admin. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
      alert('New passwords do not match!');
      return;
    }

    if (passwordFormData.newPassword.length < 6) {
      alert('New password must be at least 6 characters long!');
      return;
    }

    try {
      setLoading(true);
      
      // Verify current password by checking against stored admin data
      const admins = await firebaseDataService.getInstitutionAdmins(institution.id);
      const currentAdmin = admins.find(admin => admin.id === user.id);
      
      if (!currentAdmin || currentAdmin.password !== passwordFormData.currentPassword) {
        alert('Current password is incorrect!');
        setLoading(false);
        return;
      }

      // Update password
      await firebaseDataService.updateAdminPassword(user.id, passwordFormData.newPassword);
      
      setShowChangePasswordModal(false);
      setPasswordFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      alert('Password changed successfully!');
    } catch (error) {
      console.error('Error changing password:', error);
      alert('Error changing password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'general', name: 'General', icon: '⚙️' },
    { id: 'exam', name: 'Exam Settings', icon: '📝' },
    { id: 'notifications', name: 'Notifications', icon: '🔔' },
    { id: 'admins', name: 'Admin Management', icon: '👥' }
  ];

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Institution Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Institution Name
            </label>
            <input
              type="text"
              value={settings.institutionName}
              onChange={(e) => setSettings({ ...settings, institutionName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Logo URL
            </label>
            <input
              type="url"
              value={settings.logo}
              onChange={(e) => setSettings({ ...settings, logo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Regional Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Timezone
            </label>
            <select
              value={settings.timezone}
              onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Africa/Lagos">Africa/Lagos</option>
              <option value="Africa/Cairo">Africa/Cairo</option>
              <option value="Africa/Johannesburg">Africa/Johannesburg</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Format
            </label>
            <select
              value={settings.dateFormat}
              onChange={(e) => setSettings({ ...settings, dateFormat: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time Format
            </label>
            <select
              value={settings.timeFormat}
              onChange={(e) => setSettings({ ...settings, timeFormat: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="24h">24 Hour</option>
              <option value="12h">12 Hour</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Student Registration</h3>
        <div className="space-y-3">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="allowStudentRegistration"
              checked={settings.allowStudentRegistration}
              onChange={(e) => setSettings({ ...settings, allowStudentRegistration: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="allowStudentRegistration" className="ml-2 block text-sm text-gray-900">
              Allow student self-registration
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="requireEmailVerification"
              checked={settings.requireEmailVerification}
              onChange={(e) => setSettings({ ...settings, requireEmailVerification: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="requireEmailVerification" className="ml-2 block text-sm text-gray-900">
              Require email verification for registration
            </label>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Account Security</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Change Password</h4>
              <p className="text-sm text-gray-600">Update your admin account password</p>
            </div>
            <button
              onClick={() => setShowChangePasswordModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
            >
              Change Password
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderExamSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Exam Behavior</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Maximum Exam Attempts
            </label>
            <input
              type="number"
              min="1"
              value={settings.maxExamAttempts}
              onChange={(e) => setSettings({ ...settings, maxExamAttempts: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default Time Limit (minutes)
            </label>
            <input
              type="number"
              min="1"
              value={settings.examTimeLimit}
              onChange={(e) => setSettings({ ...settings, examTimeLimit: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Exam Experience</h3>
        <div className="space-y-3">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="showCorrectAnswers"
              checked={settings.showCorrectAnswers}
              onChange={(e) => setSettings({ ...settings, showCorrectAnswers: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="showCorrectAnswers" className="ml-2 block text-sm text-gray-900">
              Show correct answers after exam completion
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="allowReviewAfterSubmit"
              checked={settings.allowReviewAfterSubmit}
              onChange={(e) => setSettings({ ...settings, allowReviewAfterSubmit: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="allowReviewAfterSubmit" className="ml-2 block text-sm text-gray-900">
              Allow students to review answers after submission
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="autoSubmitOnTimeUp"
              checked={settings.autoSubmitOnTimeUp}
              onChange={(e) => setSettings({ ...settings, autoSubmitOnTimeUp: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="autoSubmitOnTimeUp" className="ml-2 block text-sm text-gray-900">
              Auto-submit exam when time expires
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="randomizeQuestions"
              checked={settings.randomizeQuestions}
              onChange={(e) => setSettings({ ...settings, randomizeQuestions: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="randomizeQuestions" className="ml-2 block text-sm text-gray-900">
              Randomize question order
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="randomizeOptions"
              checked={settings.randomizeOptions}
              onChange={(e) => setSettings({ ...settings, randomizeOptions: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="randomizeOptions" className="ml-2 block text-sm text-gray-900">
              Randomize answer options
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="showProgressBar"
              checked={settings.showProgressBar}
              onChange={(e) => setSettings({ ...settings, showProgressBar: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="showProgressBar" className="ml-2 block text-sm text-gray-900">
              Show progress bar during exam
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="allowBackNavigation"
              checked={settings.allowBackNavigation}
              onChange={(e) => setSettings({ ...settings, allowBackNavigation: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="allowBackNavigation" className="ml-2 block text-sm text-gray-900">
              Allow students to go back to previous questions
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Preferences</h3>
        <div className="space-y-3">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="emailNotifications"
              checked={settings.emailNotifications}
              onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="emailNotifications" className="ml-2 block text-sm text-gray-900">
              Enable email notifications
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="smsNotifications"
              checked={settings.smsNotifications}
              onChange={(e) => setSettings({ ...settings, smsNotifications: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="smsNotifications" className="ml-2 block text-sm text-gray-900">
              Enable SMS notifications
            </label>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">System Maintenance</h3>
        <div className="space-y-3">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="maintenanceMode"
              checked={settings.maintenanceMode}
              onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="maintenanceMode" className="ml-2 block text-sm text-gray-900">
              Enable maintenance mode
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Maintenance Message
            </label>
            <textarea
              value={settings.maintenanceMessage}
              onChange={(e) => setSettings({ ...settings, maintenanceMessage: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderAdminManagement = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Admin Management</h3>
        {user?.role === 'super_admin' ? (
          <button
            onClick={() => setShowCreateAdminModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Create Admin
          </button>
        ) : (
          <span className="text-sm text-gray-500">Only Super Admins can create new admins</span>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Admin Role Permissions
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p><strong>Regular Admins:</strong> Can only manage exams and questions</p>
              <p><strong>Super Admins:</strong> Full access to students, results, and system settings</p>
              <p className="mt-1 text-xs">Only Super Admins can create new administrators.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return renderGeneralSettings();
      case 'exam':
        return renderExamSettings();
      case 'notifications':
        return renderNotificationSettings();
      case 'admins':
        return renderAdminManagement();
      default:
        return renderGeneralSettings();
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <div className="space-x-3">
          <button
            onClick={handleSaveSettings}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
          <button
            onClick={onLogout}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Settings Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>

      {/* Create Admin Modal */}
      {showCreateAdminModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Admin</h3>
              
              <form onSubmit={handleCreateAdmin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={adminFormData.fullName}
                    onChange={(e) => setAdminFormData({ ...adminFormData, fullName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={adminFormData.username}
                    onChange={(e) => setAdminFormData({ ...adminFormData, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={adminFormData.email}
                    onChange={(e) => setAdminFormData({ ...adminFormData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={adminFormData.password}
                    onChange={(e) => setAdminFormData({ ...adminFormData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    value={adminFormData.role}
                    onChange={(e) => setAdminFormData({ ...adminFormData, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    disabled
                  >
                    <option value="admin">Admin (Exam Management Only)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Regular admins can only manage exams and questions. Super Admin privileges are restricted.
                  </p>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateAdminModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Creating...' : 'Create Admin'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
              
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordFormData.currentPassword}
                    onChange={(e) => setPasswordFormData({ ...passwordFormData, currentPassword: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your current password"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordFormData.newPassword}
                    onChange={(e) => setPasswordFormData({ ...passwordFormData, newPassword: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your new password"
                    minLength={6}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordFormData.confirmPassword}
                    onChange={(e) => setPasswordFormData({ ...passwordFormData, confirmPassword: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Confirm your new password"
                    minLength={6}
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">
                        Password Requirements
                      </h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <ul className="list-disc list-inside space-y-1">
                          <li>At least 6 characters long</li>
                          <li>Must match the confirmation password</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowChangePasswordModal(false);
                      setPasswordFormData({
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: ''
                      });
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Changing...' : 'Change Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsManagement;
