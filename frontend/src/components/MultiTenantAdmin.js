import React, { useState, useEffect, useCallback } from 'react';
import firebaseDataService from '../firebase/dataService';
import firebaseAuthService from '../firebase/authService';
import FirebaseStatus from './FirebaseStatus';
import BlogManagement from './BlogManagement';

export default function MultiTenantAdmin() {
  // Main state
  const [activeTab, setActiveTab] = useState('institutions');
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Modals
  const [showCreateInstitution, setShowCreateInstitution] = useState(false);
  const [showManageAdmins, setShowManageAdmins] = useState(false);
  const [showViewInstitution, setShowViewInstitution] = useState(false);
  const [showManageInstitution, setShowManageInstitution] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState(null);

  // Admin management
  const [admins, setAdmins] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);

  // Create institution form
  const [createForm, setCreateForm] = useState({
    name: '',
    adminFullName: '',
    adminUsername: '',
    adminEmail: '',
    adminPassword: '',
    confirmPassword: '',
    logo: null
  });

  // Password reset form
  const [passwordResetForm, setPasswordResetForm] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  // Load institutions
  const loadInstitutions = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const institutionsList = await firebaseDataService.getInstitutions();
      setInstitutions(institutionsList);
    } catch (err) {
      console.error('Failed to load institutions:', err);
      setError('Failed to load institutions. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load admins for selected institution
  const loadAdmins = useCallback(async (institution) => {
    try {
      setLoadingAdmins(true);
      const adminsList = await firebaseDataService.getInstitutionAdmins(institution.id);
      setAdmins(adminsList);
    } catch (err) {
      console.error('Failed to load admins:', err);
      setAdmins([]);
    } finally {
      setLoadingAdmins(false);
    }
  }, []);

  // Create institution
  const createInstitution = async (e) => {
    e.preventDefault();
    
    if (createForm.adminPassword !== createForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Create admin user in Firebase Auth first
      const authResult = await firebaseAuthService.createUser(
        createForm.adminEmail,
        createForm.adminPassword,
        createForm.adminFullName
      );

      if (!authResult.success) {
        setError(authResult.error);
        return;
      }

      // Create institution data
      const institutionData = {
        name: createForm.name,
        slug: createForm.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''),
        adminFullName: createForm.adminFullName,
        adminUsername: createForm.adminUsername,
        adminEmail: createForm.adminEmail,
        logo: createForm.logo || '',
        plan: 'basic'
      };

      // Create institution in Firestore
      const institution = await firebaseDataService.createInstitution(institutionData);

      // Create admin record in Firestore
      await firebaseDataService.createAdmin({
        institutionId: institution.id,
        uid: authResult.user.uid,
        username: createForm.adminUsername,
        email: createForm.adminEmail,
        fullName: createForm.adminFullName,
        role: 'super_admin',
        isDefaultAdmin: true
      });
      
      setShowCreateInstitution(false);
      setCreateForm({
        name: '',
        adminFullName: '',
        adminUsername: '',
        adminEmail: '',
        adminPassword: '',
        confirmPassword: '',
        logo: null
      });
      await loadInstitutions();
    } catch (err) {
      console.error('Failed to create institution:', err);
      setError('Failed to create institution. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Reset admin password
  const resetAdminPassword = async (e) => {
    e.preventDefault();
    
    if (passwordResetForm.newPassword !== passwordResetForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Update password in Firebase Auth
      const authResult = await firebaseAuthService.updatePassword(passwordResetForm.newPassword);
      
      if (!authResult.success) {
        setError(authResult.error);
        return;
      }

      // Update password in Firestore
      await firebaseDataService.updateAdminPassword(selectedAdmin.id, passwordResetForm.newPassword);
      
      setShowPasswordReset(false);
      setPasswordResetForm({ newPassword: '', confirmPassword: '' });
      setSelectedAdmin(null);
      await loadAdmins(selectedInstitution);
    } catch (err) {
      console.error('Failed to reset password:', err);
      setError('Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Delete admin
  const deleteAdmin = async (admin) => {
    if (!window.confirm(`Are you sure you want to delete admin ${admin.fullName || admin.username}?`)) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      await firebaseDataService.deleteAdmin(admin.id);
      await loadAdmins(selectedInstitution);
    } catch (err) {
      console.error('Failed to delete admin:', err);
      setError('Failed to delete admin. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Suspend institution
  const suspendInstitution = async (institution) => {
    if (!window.confirm(`Are you sure you want to suspend ${institution.name}? This will prevent all users from accessing the platform.`)) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      await firebaseDataService.updateInstitutionStatus(institution.id, 'suspended');
      await loadInstitutions();
      setShowManageInstitution(false);
      setSelectedInstitution(null);
    } catch (err) {
      console.error('Failed to suspend institution:', err);
      setError('Failed to suspend institution. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Activate institution
  const activateInstitution = async (institution) => {
    if (!window.confirm(`Are you sure you want to activate ${institution.name}? This will restore access for all users.`)) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      await firebaseDataService.updateInstitutionStatus(institution.id, 'active');
      await loadInstitutions();
      setShowManageInstitution(false);
      setSelectedInstitution(null);
    } catch (err) {
      console.error('Failed to activate institution:', err);
      setError('Failed to activate institution. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Delete institution
  const deleteInstitution = async (institution) => {
    if (!window.confirm(`Are you sure you want to permanently delete ${institution.name}? This action cannot be undone and will remove all data associated with this institution.`)) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      await firebaseDataService.deleteInstitution(institution.id);
      await loadInstitutions();
      setShowManageInstitution(false);
      setSelectedInstitution(null);
    } catch (err) {
      console.error('Failed to delete institution:', err);
      setError('Failed to delete institution. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle logo upload
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCreateForm(prev => ({ ...prev, logo: event.target.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Initialize
  useEffect(() => {
    loadInstitutions();
  }, [loadInstitutions]);

    return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Multi-Tenant Admin</h1>
              <p className="text-gray-600 mt-1">Manage institutions, administrators, and content</p>
              <div className="mt-2">
                <FirebaseStatus />
              </div>
            </div>
            {activeTab === 'institutions' && (
              <button
                onClick={() => setShowCreateInstitution(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                + Create Institution
              </button>
            )}
          </div>
          
          {/* Tab Navigation */}
          <div className="border-t border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('institutions')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === 'institutions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Institutions ({institutions.length})
              </button>
              <button
                onClick={() => setActiveTab('blogs')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === 'blogs'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Blog Management
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'institutions' && error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {activeTab === 'institutions' && (
          <>
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {institutions.map((institution) => (
              <div 
                key={institution.id} 
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  const institutionUrl = `${window.location.origin}/institution-login?institution=${institution.slug}`;
                  window.open(institutionUrl, '_blank');
                }}
              >
                {/* Institution Logo/Header */}
                <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                  {institution.logo ? (
                    <img 
                      src={institution.logo} 
                      alt={institution.name}
                      className="h-16 w-16 rounded-full object-cover border-4 border-white"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">
                        {institution.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Institution Info */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">{institution.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      institution.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : institution.status === 'suspended'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {institution.status || 'active'}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p><span className="font-medium">Admin:</span> {institution.adminFullName}</p>
                    <p><span className="font-medium">Email:</span> {institution.adminEmail}</p>
                    <p><span className="font-medium">Users:</span> {institution.totalUsers || 0}</p>
                    <p><span className="font-medium">Created:</span> {institution.createdAt ? new Date(institution.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown'}</p>
            </div>

                  {/* Action Buttons */}
                  <div className="mt-6 space-y-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        const institutionUrl = `${window.location.origin}/institution-login?institution=${institution.slug}`;
                        navigator.clipboard.writeText(institutionUrl);
                        alert('Institution link copied to clipboard!');
                      }}
                      className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      Copy CBT Link
                    </button>
                    <button
                      onClick={() => {
                        setSelectedInstitution(institution);
                        setShowViewInstitution(true);
                      }}
                      className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      View Institution
                    </button>
                    <button
                      onClick={() => {
                        setSelectedInstitution(institution);
                        loadAdmins(institution);
                        setShowManageAdmins(true);
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      Manage Admins
                    </button>
                    <button
                      onClick={() => {
                        setSelectedInstitution(institution);
                        setShowManageInstitution(true);
                      }}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      Manage Institution
                    </button>
                  </div>
      </div>
              </div>
            ))}
          </div>
            )}

            {institutions.length === 0 && !loading && (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">🏢</div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">No institutions yet</h3>
                <p className="text-gray-600 mb-6">Create your first institution to get started</p>
                <button
                  onClick={() => setShowCreateInstitution(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Create Institution
                </button>
              </div>
            )}
          </>
        )}

        {activeTab === 'blogs' && (
          <BlogManagement />
        )}
      </div>

      {/* Create Institution Modal */}
      {showCreateInstitution && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">Create New Institution</h2>
              <p className="text-gray-600 mt-1">Set up a new institution with administrator details</p>
            </div>

            <form onSubmit={createInstitution} className="p-6 space-y-6">
              {/* Institution Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Institution Name *
                </label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., College of Nursing Sciences"
                />
              </div>

              {/* Administrator Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Administrator Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.adminFullName}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, adminFullName: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.adminUsername}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, adminUsername: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., john.doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Administrator Email *
                </label>
                <input
                  type="email"
                  required
                  value={createForm.adminEmail}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, adminEmail: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., john.doe@college.edu"
                />
              </div>

              {/* Password Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={createForm.adminPassword}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, adminPassword: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={createForm.confirmPassword}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Confirm password"
                  />
                </div>
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Institution Logo
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    id="logo-upload"
                  />
                  <label
                    htmlFor="logo-upload"
                    className="cursor-pointer bg-gray-100 hover:bg-gray-200 px-4 py-3 rounded-lg border border-gray-300 transition-colors"
                  >
                    Choose Logo
                  </label>
                  {createForm.logo && (
                    <img
                      src={createForm.logo}
                      alt="Logo preview"
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  )}
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-4 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateInstitution(false)}
                  className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Institution'}
                </button>
              </div>
            </form>
              </div>
            </div>
          )}

      {/* Manage Admins Modal */}
      {showManageAdmins && selectedInstitution && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">Manage Admins - {selectedInstitution.name}</h2>
              <p className="text-gray-600 mt-1">View, reset passwords, and manage administrators</p>
                    </div>
                    
            <div className="p-6">
            {loadingAdmins ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-4">
                {admins.map((admin) => (
                    <div key={admin.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                          <span className="text-white font-medium">
                            {(admin.fullName || admin.username || 'A').charAt(0).toUpperCase()}
                          </span>
                        </div>
                    <div>
                          <h4 className="font-medium text-gray-900">{admin.fullName || admin.name || 'Unknown'}</h4>
                          <p className="text-sm text-gray-600">{admin.email || admin.username}</p>
                          <p className="text-xs text-blue-600 font-medium">Super Admin</p>
                        </div>
                    </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedAdmin(admin);
                            setShowPasswordReset(true);
                          }}
                          className="px-3 py-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded text-sm font-medium transition-colors"
                        >
                          Reset Password
                        </button>
                      <button
                          onClick={() => deleteAdmin(admin)}
                          className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded text-sm font-medium transition-colors"
                      >
                          Delete
                      </button>
                    </div>
                  </div>
                ))}
                  
                  {admins.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No administrators found for this institution.
                    </div>
                  )}
                </div>
            )}

              <div className="flex justify-end pt-6 border-t mt-6">
                <button
                  onClick={() => {
                    setShowManageAdmins(false);
                    setSelectedInstitution(null);
                    setAdmins([]);
                  }}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
                    </div>
                    </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordReset && selectedAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Reset Password</h2>
              <p className="text-gray-600 mt-1">Reset password for {selectedAdmin.fullName || selectedAdmin.username}</p>
            </div>
            
            <form onSubmit={resetAdminPassword} className="p-6 space-y-4">
                    <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password *
                </label>
                      <input
                  type="password"
                        required
                  value={passwordResetForm.newPassword}
                  onChange={(e) => setPasswordResetForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter new password"
                      />
                    </div>
              
                    <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password *
                </label>
                      <input
                  type="password"
                          required
                  value={passwordResetForm.confirmPassword}
                  onChange={(e) => setPasswordResetForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Confirm new password"
                />
                      </div>

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordReset(false);
                    setSelectedAdmin(null);
                    setPasswordResetForm({ newPassword: '', confirmPassword: '' });
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
                </div>
              </form>
            </div>
                </div>
              )}

      {/* View Institution Modal */}
      {showViewInstitution && selectedInstitution && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">{selectedInstitution.name}</h2>
              <p className="text-gray-600 mt-1">Institution Details</p>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex items-center space-x-4">
                {selectedInstitution.logo ? (
                  <img 
                    src={selectedInstitution.logo} 
                    alt={selectedInstitution.name}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">
                      {selectedInstitution.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                  <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedInstitution.name}</h3>
                  <p className="text-gray-600">Institution ID: {selectedInstitution.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Administrator Details</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Name:</span> {selectedInstitution.adminFullName}</p>
                    <p><span className="font-medium">Email:</span> {selectedInstitution.adminEmail}</p>
                    <p><span className="font-medium">Username:</span> {selectedInstitution.adminUsername}</p>
                  </div>
                </div>
                
                  <div>
                  <h4 className="font-medium text-gray-900 mb-3">Institution Stats</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Total Users:</span> {selectedInstitution.totalUsers || 0}</p>
                    <p><span className="font-medium">Created:</span> {selectedInstitution.createdAt ? new Date(selectedInstitution.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown'}</p>
                    <p><span className="font-medium">Slug:</span> {selectedInstitution.slug}</p>
                    <div className="mt-3">
                      <p className="font-medium text-gray-900 mb-2">CBT App Link:</p>
                      <div className="flex items-center space-x-2">
                    <input
                          type="text"
                          readOnly
                          value={`${window.location.origin}/institution-login?institution=${selectedInstitution.slug}`}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm bg-gray-50"
                        />
                        <button
                          onClick={() => {
                            const institutionUrl = `${window.location.origin}/institution-login?institution=${selectedInstitution.slug}`;
                            navigator.clipboard.writeText(institutionUrl);
                            alert('Link copied to clipboard!');
                          }}
                          className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end p-6 border-t">
              <button
                onClick={() => {
                  setShowViewInstitution(false);
                  setSelectedInstitution(null);
                }}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
                </div>
          </div>
        </div>
      )}

      {/* Manage Institution Modal */}
      {showManageInstitution && selectedInstitution && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">Manage Institution</h2>
              <p className="text-gray-600 mt-1">{selectedInstitution.name}</p>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Institution Status */}
              <div className="flex items-center space-x-4">
                {selectedInstitution.logo ? (
                  <img 
                    src={selectedInstitution.logo} 
                    alt={selectedInstitution.name}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">
                      {selectedInstitution.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedInstitution.name}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      selectedInstitution.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : selectedInstitution.status === 'suspended'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedInstitution.status || 'active'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Institution Details */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Institution Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><span className="font-medium">Admin:</span> {selectedInstitution.adminFullName}</p>
                    <p><span className="font-medium">Email:</span> {selectedInstitution.adminEmail}</p>
                  </div>
                  <div>
                    <p><span className="font-medium">Total Users:</span> {selectedInstitution.totalUsers || 0}</p>
                    <p><span className="font-medium">Created:</span> {selectedInstitution.createdAt ? new Date(selectedInstitution.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown'}</p>
                  </div>
                </div>
              </div>

              {/* Management Actions */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Management Actions</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Suspend/Activate Button */}
                  {selectedInstitution.status === 'suspended' ? (
                    <button
                      onClick={() => activateInstitution(selectedInstitution)}
                      disabled={loading}
                      className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Activate Institution</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => suspendInstitution(selectedInstitution)}
                      disabled={loading}
                      className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                      </svg>
                      <span>Suspend Institution</span>
                    </button>
                  )}

                  {/* Delete Button */}
                  <button
                    onClick={() => deleteInstitution(selectedInstitution)}
                    disabled={loading}
                    className="w-full bg-red-800 hover:bg-red-900 text-white px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Delete Institution</span>
                  </button>
                </div>

                {/* Warning Messages */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium">Important:</p>
                      <ul className="mt-1 space-y-1 list-disc list-inside">
                        <li>Suspending will prevent all users from accessing the platform</li>
                        <li>Deleting will permanently remove all institution data</li>
                        <li>These actions cannot be undone</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end p-6 border-t">
              <button
                onClick={() => {
                  setShowManageInstitution(false);
                  setSelectedInstitution(null);
                }}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
            </div>
  );
}