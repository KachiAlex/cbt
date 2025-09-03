import React, { useState, useEffect, useCallback } from 'react';
import tokenService from '../services/tokenService';

const MultiTenantAdmin = () => {
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showManageAdminsForm, setShowManageAdminsForm] = useState(false);

  const [selectedInstitution, setSelectedInstitution] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    subscriptionPlan: 'Basic',
    primaryAdmin: '',
    adminUsername: '',
    adminPassword: '',
    address: ''
  });

  // Check authentication status
  const isAuthenticated = () => {
    return tokenService.isAuthenticated();
  };

  // Get authentication token
  const getAuthToken = async () => {
    try {
      return await tokenService.getValidToken();
    } catch (error) {
      console.error('Failed to get valid token:', error);
      return null;
    }
  };

  // Handle logout
  const handleLogout = () => {
    tokenService.logout();
  };

  // Load institutions
  const loadInstitutions = useCallback(async () => {
    try {
      const token = await getAuthToken();
      if (!token) {
        setError('No valid authentication token available');
        setLoading(false);
        return;
      }

      const response = await fetch('https://cbt-rew7.onrender.com/api/tenants', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setInstitutions(data);
      setError(null);
    } catch (error) {
      console.error('Error loading institutions:', error);
      setError('Failed to load institutions. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Add new institution
  const handleAddInstitution = async (e) => {
    e.preventDefault();
    try {
      const token = await getAuthToken();
      if (!token) {
        setError('No valid authentication token available');
        return;
      }

      const response = await fetch('https://cbt-rew7.onrender.com/api/tenants', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const newInstitution = await response.json();
      setInstitutions([...institutions, newInstitution]);
      setShowAddForm(false);
      setFormData({
        name: '',
        slug: '',
        subscriptionPlan: 'Basic',
        primaryAdmin: '',
        adminUsername: '',
        adminPassword: '',
        address: ''
      });
      setError(null);
    } catch (error) {
      console.error('Error adding institution:', error);
      setError('Failed to add institution. Please try again.');
    }
  };



  // Delete institution
  const handleDeleteInstitution = async (institutionId) => {
    if (!window.confirm('Are you sure you want to delete this institution?')) {
      return;
    }

    try {
      const token = await getAuthToken();
      if (!token) {
        setError('No valid authentication token available');
        return;
      }

      const response = await fetch(`https://cbt-rew7.onrender.com/api/tenants/${institutionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setInstitutions(institutions.filter(inst => inst._id !== institutionId));
      setError(null);
    } catch (error) {
      console.error('Error deleting institution:', error);
      setError('Failed to delete institution. Please try again.');
    }
  };

  // Update institution
  const handleUpdateInstitution = async (e) => {
    e.preventDefault();
    try {
      const token = await getAuthToken();
      if (!token) {
        setError('No valid authentication token available');
        return;
      }

      const response = await fetch(`https://cbt-rew7.onrender.com/api/tenants/${selectedInstitution._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const updatedInstitution = await response.json();
      setInstitutions(institutions.map(inst => 
        inst._id === selectedInstitution._id ? updatedInstitution : inst
      ));
      setShowAddForm(false);
      setSelectedInstitution(null);
      setFormData({
        name: '',
        slug: '',
        subscriptionPlan: 'Basic',
        primaryAdmin: '',
        adminUsername: '',
        adminPassword: '',
        address: ''
      });
      setError(null);
    } catch (error) {
      console.error('Error updating institution:', error);
      setError('Failed to update institution. Please try again.');
    }
  };

  // Edit institution
  const handleEdit = (institution) => {
    setSelectedInstitution(institution);
    setFormData({
      name: institution.name,
      slug: institution.slug,
      subscriptionPlan: institution.subscriptionPlan || 'Basic',
      primaryAdmin: institution.primaryAdmin || '',
      adminUsername: institution.adminUsername || '',
      adminPassword: '',
      address: institution.address || ''
    });
    setShowAddForm(true);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Load institutions on component mount
  useEffect(() => {
    if (isAuthenticated()) {
      loadInstitutions();
    }
  }, [loadInstitutions]);

  // Check authentication on every render
  if (!isAuthenticated()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Access Denied
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              You are not authenticated. Please log in to continue.
            </p>
          </div>
          <div className="mt-8 space-y-6">
            <button
              onClick={() => window.location.href = '/multi-tenant-admin-login'}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Multi-Tenant Admin Dashboard</h1>
              <p className="text-gray-600">Manage all institutions and their settings</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Add Institution
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-white bg-indigo-500 hover:bg-indigo-400 transition ease-in-out duration-150 cursor-not-allowed">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Loading institutions...
            </div>
          </div>
        )}

        {/* Institutions List */}
        {!loading && institutions.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No institutions</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new institution.</p>
            <div className="mt-6">
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add Institution
              </button>
            </div>
          </div>
        )}

        {/* Institutions Grid */}
        {!loading && institutions.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {institutions.map((institution) => (
              <div key={institution._id} className="bg-white rounded-lg shadow-md overflow-hidden">
                {/* Institution Header */}
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">{institution.name}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      institution.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {institution.status || 'Active'}
                    </span>
                  </div>
                </div>

                {/* Institution Info */}
                <div className="px-6 py-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">ID:</span>
                      <span className="ml-2 text-gray-900 font-mono">{institution.slug}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Plan:</span>
                      <span className="ml-2 text-gray-900">{institution.subscriptionPlan || 'Basic'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Admin:</span>
                      <span className="ml-2 text-gray-900">{institution.primaryAdmin || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Users:</span>
                      <span className="ml-2 text-gray-900">{institution.totalUsers || 0} users</span>
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium text-gray-600">Created:</span>
                      <span className="ml-2 text-gray-900">
                        {new Date(institution.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {institution.address && (
                      <div className="col-span-2">
                        <span className="font-medium text-gray-600">Address:</span>
                        <span className="ml-2 text-gray-900">{institution.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleEdit(institution)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <svg className="-ml-1 mr-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setSelectedInstitution(institution);
                        setShowManageAdminsForm(true);
                      }}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <svg className="-ml-1 mr-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                      </svg>
                      Manage Admins
                    </button>
                    
                    <button
                      onClick={() => handleDeleteInstitution(institution._id)}
                      className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <svg className="-ml-1 mr-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 000-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V7a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Institution Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {selectedInstitution ? 'Edit Institution' : 'Add New Institution'}
                </h3>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setSelectedInstitution(null);
                    setFormData({
                      name: '',
                      slug: '',
                      subscriptionPlan: 'Basic',
                      primaryAdmin: '',
                      adminUsername: '',
                      adminPassword: '',
                      address: ''
                    });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={selectedInstitution ? handleUpdateInstitution : handleAddInstitution} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Institution Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Enter institution name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Institution Slug</label>
                    <input
                      type="text"
                      name="slug"
                      value={formData.slug}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Enter institution slug"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Subscription Plan</label>
                    <select
                      name="subscriptionPlan"
                      value={formData.subscriptionPlan}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="Basic">Basic</option>
                      <option value="Premium">Premium</option>
                      <option value="Enterprise">Enterprise</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Primary Admin Name</label>
                    <input
                      type="text"
                      name="primaryAdmin"
                      value={formData.primaryAdmin}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Enter primary admin name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Admin Username</label>
                    <input
                      type="text"
                      name="adminUsername"
                      value={formData.adminUsername}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Enter admin username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Admin Password</label>
                    <input
                      type="password"
                      name="adminPassword"
                      value={formData.adminPassword}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Enter admin password"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    rows="3"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter institution address"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setSelectedInstitution(null);
                      setFormData({
                        name: '',
                        slug: '',
                        subscriptionPlan: 'Basic',
                        primaryAdmin: '',
                        adminUsername: '',
                        adminPassword: '',
                        address: ''
                      });
                    }}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    {selectedInstitution ? 'Update Institution' : 'Add Institution'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Manage Admins Modal */}
      {showManageAdminsForm && selectedInstitution && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Manage Admins - {selectedInstitution.name}
                </h3>
                <button
                  onClick={() => {
                    setShowManageAdminsForm(false);
                    setSelectedInstitution(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-gray-600">
                  Admin management functionality will be implemented here.
                </p>
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setShowManageAdminsForm(false);
                      setSelectedInstitution(null);
                    }}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default MultiTenantAdmin; 