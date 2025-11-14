import React, { useState, useEffect, useCallback } from 'react';
import firebaseDataService from '../firebase/dataService';
import firebaseAuthService from '../firebase/authService';
import FirebaseStatus from './FirebaseStatus';
import BlogManagement from './BlogManagement';

export default function MultiTenantAdmin() {
  try {
    console.log('🎨 MultiTenantAdmin component rendering - START');
    
    // Main state
    const [activeTab, setActiveTab] = useState('institutions');
    console.log('🎨 State 1 - activeTab set');
    
    const [institutions, setInstitutions] = useState([]);
    console.log('🎨 State 2 - institutions set');
    
    const [loading, setLoading] = useState(false);
    console.log('🎨 State 3 - loading set');
    
    const [error, setError] = useState('');
    console.log('🎨 State 4 - error set');
    
    console.log('🎨 Component state:', { activeTab, institutions, loading, error });

  // Modals
  const [showCreateInstitution, setShowCreateInstitution] = useState(false);
  const [showManageAdmins, setShowManageAdmins] = useState(false);
  const [showViewInstitution, setShowViewInstitution] = useState(false);
  const [showManageInstitution, setShowManageInstitution] = useState(false);
  const [showCreateBlog, setShowCreateBlog] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState(null);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [admins, setAdmins] = useState([]);

  // Form states
  const [newInstitution, setNewInstitution] = useState({
    name: '',
    slug: '',
    description: '',
    email: '',
    phone: '',
    address: '',
    logo: null
  });

  const [newAdmin, setNewAdmin] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  console.log('🎨 All modal states set');

  // Load institutions
  const loadInstitutions = useCallback(async () => {
    try {
      console.log('🔄 Starting to load institutions from Firestore...');
      setLoading(true);
      setError('');
      
      // Use Firestore directly to load institutions
      const institutionsList = await firebaseDataService.getInstitutions();
      console.log('📊 Loaded institutions from Firestore:', institutionsList);
      
      // Transform to match frontend expectations
      const transformed = (institutionsList || []).map(inst => ({
        id: inst.id || inst._id,
        _id: inst.id || inst._id,
        name: inst.name,
        slug: inst.slug,
        description: inst.description || '',
        email: inst.email || inst.contact_email || '',
        phone: inst.phone || inst.contact_phone || '',
        address: inst.address || '',
        status: inst.status || (inst.suspended ? 'suspended' : 'active'),
        totalUsers: inst.totalUsers || 0,
        createdAt: inst.createdAt || inst.created_at
      }));
      
      console.log('📊 Transformed institutions:', transformed);
      setInstitutions(transformed);
      console.log('✅ Institutions state updated');
    } catch (err) {
      console.error('❌ Failed to load institutions:', err);
      setError('Failed to load institutions. Please try again.');
      setInstitutions([]);
    } finally {
      setLoading(false);
      console.log('🏁 Loading finished');
    }
  }, []);

  // Load admins for selected institution
  const loadAdmins = useCallback(async (institution) => {
    try {
      setLoadingAdmins(true);
      setError('');
      
      // Use Firestore directly to fetch admins
      const institutionId = institution.id || institution._id;
      console.log('🔍 Loading admins for institution:', institutionId, institution);
      
      const adminsList = await firebaseDataService.getInstitutionAdmins(institutionId);
      console.log('📊 Loaded admins from Firestore:', adminsList);
      
      // Filter to only admin roles
      const adminUsers = (adminsList || []).filter(admin => 
        ['super_admin', 'admin', 'tenant_admin'].includes(admin.role)
      );
      
      console.log('✅ Filtered admin users:', adminUsers);
      setAdmins(adminUsers || []);
    } catch (err) {
      console.error('❌ Failed to load admins:', err);
      setError(`Failed to load admins: ${err.message}`);
      setAdmins([]);
    } finally {
      setLoadingAdmins(false);
    }
  }, []);

  // Create institution
  const handleCreateInstitution = async (e) => {
    e.preventDefault();
    try {
      setError('');
      
      await firebaseDataService.createInstitution(newInstitution);
      setNewInstitution({
        name: '',
        slug: '',
        description: '',
        email: '',
        phone: '',
        address: '',
        logo: null
      });
      await loadInstitutions();
      setShowCreateInstitution(false);
    } catch (err) {
      console.error('Failed to create institution:', err);
      setError('Failed to create institution. Please try again.');
    }
  };

  // Create admin
  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!newAdmin.fullName || !newAdmin.username || !newAdmin.email || !newAdmin.password) {
      setError('Please fill in all required fields');
      return;
    }
    
    if (newAdmin.password !== newAdmin.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    try {
      setError('');
      
      // Use Firestore directly to create admin
      const institutionId = selectedInstitution.id || selectedInstitution._id;
      console.log('🔍 Creating admin for institution:', institutionId, selectedInstitution);
      
      const adminData = {
        institutionId: institutionId,
        fullName: newAdmin.fullName,
        username: newAdmin.username,
        email: newAdmin.email,
        password: newAdmin.password,
        role: 'super_admin'
      };
      console.log('📤 Creating admin with data:', { ...adminData, password: '***' });
      
      const createdAdmin = await firebaseDataService.createAdmin(adminData);
      console.log('✅ Admin created successfully in Firestore:', createdAdmin);
      
      // Show success message
      setError(''); // Clear any previous errors
      alert('✅ Admin created successfully!');
      
      // Reset form
      setNewAdmin({
        fullName: '',
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
      });
      
      // Reload admins list
      await loadAdmins(selectedInstitution);
      setShowCreateAdmin(false);
    } catch (err) {
      console.error('Failed to create admin:', err);
      const errorMessage = err.message || 'Failed to create admin. Please try again.';
      setError(errorMessage);
    }
  };

  // Generate institution URL
  const getInstitutionUrl = (institution) => {
    // Use working Firebase hosting URL (cbt-91a97.web.app)
    const baseUrl = 'https://cbt-91a97.web.app';
    return `${baseUrl}/institution-login?institution=${institution.slug}`;
  };

  // Copy institution URL to clipboard
  const copyInstitutionUrl = async (institution) => {
    try {
      const url = getInstitutionUrl(institution);
      await navigator.clipboard.writeText(url);
      alert(`Institution URL copied to clipboard: ${url}`);
    } catch (err) {
      console.error('Failed to copy URL:', err);
      alert('Failed to copy URL to clipboard');
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await firebaseAuthService.signOut();
      localStorage.removeItem('multi_tenant_admin_user');
      window.location.href = '/admin-login';
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (isMounted) {
      await loadInstitutions();
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, []); // Removed loadInstitutions dependency to prevent re-renders

  console.log('🎨 MultiTenantAdmin render - loading:', loading, 'institutions:', institutions.length, 'error:', error);
  console.log('🎨 About to return JSX');

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
            <div className="flex items-center space-x-4">
            {activeTab === 'institutions' && (
              <button
                onClick={() => setShowCreateInstitution(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                + Create Institution
              </button>
            )}
              {activeTab === 'blog' && (
                <button
                  onClick={() => setShowCreateBlog(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  + Create Blog Post
                </button>
              )}
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
          </div>
          
      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('institutions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'institutions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
              Institutions
              </button>
              <button
              onClick={() => setActiveTab('blog')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'blog'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Blog Management
              </button>
            </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        {activeTab === 'institutions' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Institutions</h2>
              <p className="text-gray-600">Manage all institutions in the system</p>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading institutions...</span>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {institutions.length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <div className="text-gray-500">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No institutions</h3>
                      <p className="mt-1 text-sm text-gray-500">Get started by creating a new institution.</p>
                    </div>
                </div>
                ) : (
                  institutions.map((institution) => (
                    <div key={institution.id} className="bg-white rounded-lg shadow-md p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">{institution.name}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      institution.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                    }`}>
                          {institution.status}
                    </span>
                  </div>
                      <p className="text-gray-600 text-sm mb-4">{institution.description}</p>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm text-gray-500">
                          {institution.totalUsers || 0} users
                        </span>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setSelectedInstitution(institution);
                              setShowViewInstitution(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            View Details
                          </button>
                          <button
                            onClick={() => {
                              setSelectedInstitution(institution);
                              loadAdmins(institution);
                              setShowManageAdmins(true);
                            }}
                            className="text-green-600 hover:text-green-800 text-sm font-medium"
                          >
                            Manage Admins
                          </button>
                        </div>
                      </div>
                      
                      {/* Institution Access Section */}
                      <div className="border-t pt-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-600">Institution Access</span>
                          <span className="text-xs text-gray-500">Slug: {institution.slug}</span>
                        </div>
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={() => copyInstitutionUrl(institution)}
                            className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded text-xs font-medium transition-colors"
                            title="Copy institution URL to clipboard"
                          >
                            📋 Copy URL
                          </button>
                          <button
                            onClick={() => window.open(getInstitutionUrl(institution), '_blank')}
                            className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 px-3 py-2 rounded text-xs font-medium transition-colors"
                            title="Open institution panel in new tab"
                          >
                            🚀 Open Panel
                          </button>
                        </div>
                        
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600 break-all">
                          {getInstitutionUrl(institution)}
                        </div>
                      </div>
              </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'blog' && <BlogManagement />}
      </div>

      {/* Create Institution Modal */}
      {showCreateInstitution && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Create New Institution</h3>
            <form onSubmit={handleCreateInstitution}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={newInstitution.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
                      setNewInstitution({...newInstitution, name, slug});
                    }}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">URL Slug</label>
                  <input
                    type="text"
                    value={newInstitution.slug}
                    onChange={(e) => setNewInstitution({...newInstitution, slug: e.target.value})}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Auto-generated from name"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">This will be used in the institution URL</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={newInstitution.description}
                    onChange={(e) => setNewInstitution({...newInstitution, description: e.target.value})}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    rows="3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={newInstitution.email}
                    onChange={(e) => setNewInstitution({...newInstitution, email: e.target.value})}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    type="tel"
                    value={newInstitution.phone}
                    onChange={(e) => setNewInstitution({...newInstitution, phone: e.target.value})}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <textarea
                    value={newInstitution.address}
                    onChange={(e) => setNewInstitution({...newInstitution, address: e.target.value})}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    rows="2"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateInstitution(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Institution
                </button>
              </div>
            </form>
              </div>
            </div>
          )}

      {/* View Institution Modal */}
      {showViewInstitution && selectedInstitution && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-lg font-semibold mb-4">Institution Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <p className="mt-1 text-gray-900">{selectedInstitution.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <p className="mt-1 text-gray-900">{selectedInstitution.description}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="mt-1 text-gray-900">{selectedInstitution.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <p className="mt-1 text-gray-900">{selectedInstitution.phone}</p>
                    </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <p className="mt-1 text-gray-900">{selectedInstitution.address}</p>
                </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  selectedInstitution.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {selectedInstitution.status}
                          </span>
                        </div>
                    <div>
                <label className="block text-sm font-medium text-gray-700">Total Users</label>
                <p className="mt-1 text-gray-900">{selectedInstitution.totalUsers || 0}</p>
                        </div>
                    </div>
            <div className="mt-6 flex justify-end">
                        <button
                onClick={() => setShowViewInstitution(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Close
                </button>
            </div>
                    </div>
                    </div>
      )}

      {/* Manage Admins Modal */}
      {showManageAdmins && selectedInstitution && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl">
            <h3 className="text-lg font-semibold mb-4">Manage Admins - {selectedInstitution.name}</h3>
            
            <div className="mb-4 flex justify-between items-center">
              <button
                onClick={() => setShowCreateAdmin(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm"
              >
                + Add Admin
              </button>
              {admins.length === 0 && (
                <span className="text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded">
                  ⚠️ No admins yet - create the first one
                </span>
              )}
            </div>

            {loadingAdmins ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
            ) : (
              <div className="space-y-2">
                {admins.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No admins found</p>
                ) : (
                  admins.map((admin) => (
                    <div key={admin._id || admin.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                        <p className="font-medium">{admin.fullName || admin.email}</p>
                        <p className="text-sm text-gray-500">{admin.email}</p>
                        <p className="text-xs text-gray-400">Username: {admin.username} | Role: {admin.role || 'admin'}</p>
                </div>
                      <div className="flex space-x-2">
                        {admin.is_default_admin && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Default Admin</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowManageAdmins(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Close
              </button>
                </div>
          </div>
        </div>
      )}

      {/* Create Admin Modal */}
      {showCreateAdmin && selectedInstitution && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Create Admin for {selectedInstitution.name}</h3>
            <form onSubmit={handleCreateAdmin}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name *</label>
                  <input
                    type="text"
                    value={newAdmin.fullName}
                    onChange={(e) => setNewAdmin({...newAdmin, fullName: e.target.value})}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., John Doe"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Username *</label>
                  <input
                    type="text"
                    value={newAdmin.username}
                    onChange={(e) => setNewAdmin({...newAdmin, username: e.target.value})}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., johndoe"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email *</label>
                  <input
                    type="email"
                    value={newAdmin.email}
                    onChange={(e) => {
                      const email = e.target.value;
                      // Auto-generate username from email if username is empty
                      if (!newAdmin.username && email) {
                        const username = email.split('@')[0];
                        setNewAdmin({...newAdmin, email, username});
                      } else {
                        setNewAdmin({...newAdmin, email});
                      }
                    }}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="admin@institution.edu.ng"
                    required
                  />
                  </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Password *</label>
                  <input
                    type="password"
                    value={newAdmin.password}
                    onChange={(e) => setNewAdmin({...newAdmin, password: e.target.value})}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                  <div>
                  <label className="block text-sm font-medium text-gray-700">Confirm Password *</label>
                  <input
                    type="password"
                    value={newAdmin.confirmPassword}
                    onChange={(e) => setNewAdmin({...newAdmin, confirmPassword: e.target.value})}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                    <button
                  type="button"
                  onClick={() => setShowCreateAdmin(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                    </button>
                    <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Admin
                  </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
  } catch (error) {
    console.error('❌ MultiTenantAdmin rendering error:', error);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Admin Panel Error</h1>
          <p className="text-gray-600 mb-4">There was an error loading the admin panel.</p>
          <p className="text-sm text-gray-500">Error: {error.message}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }
}