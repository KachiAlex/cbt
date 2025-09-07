import React, { useState, useEffect, useCallback } from 'react';
import dataService from '../services/dataService';
import { getInstitutionLogo, createFallbackLogo } from '../utils/logoUtils';

// Helper: safe fetch JSON
async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  return res.json().catch(() => ({}));
}

export default function MultiTenantAdmin() {
  // Institutions
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Selected institution
  const [selectedInstitution, setSelectedInstitution] = useState(null);

  // Modals (refactored)
  const [showManageAdminsForm, setShowManageAdminsForm] = useState(false);
  const [showViewAdmins, setShowViewAdmins] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [showAddAdminForm, setShowAddAdminForm] = useState(false);
  const [showEditInstitution, setShowEditInstitution] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Admins state
  const [admins, setAdmins] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);

  // Forms
  const [passwordResetData, setPasswordResetData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const [addAdminData, setAddAdminData] = useState({
    username: '',
    email: '',
    fullName: '',
    password: '',
    confirmPassword: '',
    role: 'admin'
  });

  const [editInstitutionData, setEditInstitutionData] = useState({
    name: '',
    adminUsername: '',
    adminEmail: '',
    adminFullName: '',
    logo: '',
    description: '',
    website: '',
    contactPhone: '',
    address: ''
  });

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');

  // Load institutions
  const loadInstitutions = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      // Check API configuration
      const apiConfig = dataService.getApiConfig();
      
      if (apiConfig.USE_API) {
        // Use API
        const raw = await fetchJson(`${apiConfig.API_BASE}/api/tenants`);
        const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.tenants) ? raw.tenants : []);
        const normalized = list.map((t) => {
          const defaultAdmin = t.default_admin || (Array.isArray(t.admins) ? t.admins.find(a => a.is_default_admin) : null) || {};
          const totalUsers = (
            t.totalUsers ??
            t.userCount ??
            (Array.isArray(t.users) ? t.users.length : undefined) ??
            (Array.isArray(t.admins) ? t.admins.length : undefined) ??
            (t.stats && typeof t.stats.totalUsers === 'number' ? t.stats.totalUsers : undefined) ??
            0
          );
          return {
            ...t,
            _id: t._id || t.id,
            subscriptionPlan: t.subscriptionPlan || t.plan || 'Basic',
            createdAt: t.createdAt || t.created_at || t.createdOn,
            primaryAdmin: t.primaryAdmin || defaultAdmin.fullName || defaultAdmin.name || '',
            adminUsername: t.adminUsername || defaultAdmin.username || '',
            adminEmail: t.adminEmail || defaultAdmin.email || '',
            totalUsers
          };
        });
        setInstitutions(normalized);
      } else {
        // Use localStorage fallback - create demo institutions
        const demoInstitutions = [
          {
            _id: 'demo_institution_1',
            slug: 'demo-university',
            name: 'Demo University',
            adminUsername: 'admin',
            adminEmail: 'admin@demouniversity.edu',
            adminFullName: 'Dr. Sarah Johnson',
            totalUsers: 150,
            isActive: true,
            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
            lastActivity: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
            subscriptionPlan: 'Premium',
            primaryAdmin: 'Dr. Sarah Johnson',
            description: 'A leading educational institution committed to academic excellence and innovation in technology and research.',
            website: 'https://demouniversity.edu',
            contactPhone: '+1 (555) 123-4567',
            address: '123 University Avenue, Tech City, TC 12345',
            logo: getInstitutionLogo('Demo University')
          },
          {
            _id: 'demo_institution_2',
            slug: 'sample-college',
            name: 'Sample College',
            adminUsername: 'college_admin',
            adminEmail: 'admin@samplecollege.edu',
            adminFullName: 'Prof. Michael Chen',
            totalUsers: 75,
            isActive: true,
            createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
            lastActivity: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
            subscriptionPlan: 'Basic',
            primaryAdmin: 'Prof. Michael Chen',
            description: 'A community college focused on providing quality education and career development opportunities.',
            website: 'https://samplecollege.edu',
            contactPhone: '+1 (555) 987-6543',
            address: '456 College Street, Education Town, ET 67890',
            logo: getInstitutionLogo('Sample College')
          },
          {
            _id: 'demo_institution_3',
            slug: 'tech-institute',
            name: 'Tech Institute of Learning',
            adminUsername: 'tech_admin',
            adminEmail: 'admin@techinstitute.edu',
            adminFullName: 'Dr. Emily Rodriguez',
            totalUsers: 200,
            isActive: true,
            createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
            lastActivity: new Date().toISOString(), // Today
            subscriptionPlan: 'Enterprise',
            primaryAdmin: 'Dr. Emily Rodriguez',
            description: 'Specialized institute for technology education, offering cutting-edge programs in computer science and engineering.',
            website: 'https://techinstitute.edu',
            contactPhone: '+1 (555) 456-7890',
            address: '789 Innovation Drive, Tech Valley, TV 54321',
            logo: getInstitutionLogo('Tech Institute of Learning')
          }
        ];
        setInstitutions(demoInstitutions);
      }
    } catch (e) {
      setError(e.message || 'Failed to load institutions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInstitutions();
  }, [loadInstitutions]);

  // Load admins for institution
  const loadAdmins = useCallback(async (tenantSlug) => {
    if (!tenantSlug) return;
    try {
      setLoadingAdmins(true);
      
      // Check API configuration
      const apiConfig = dataService.getApiConfig();
      
      if (apiConfig.USE_API) {
        // Use API
        const data = await fetchJson(`${apiConfig.API_BASE}/api/tenants/${tenantSlug}/admins`);
        const list = Array.isArray(data) ? data : (Array.isArray(data?.admins) ? data.admins : []);
        setAdmins(list);
      } else {
        // Use localStorage fallback - create demo admins
        const demoAdmins = [
          {
            _id: 'admin_1',
            username: 'admin',
            email: 'admin@demo.edu',
            fullName: 'Demo Administrator',
            role: 'super_admin',
            isDefaultAdmin: true,
            createdAt: new Date().toISOString()
          },
          {
            _id: 'admin_2',
            username: 'college_admin',
            email: 'admin@sample.edu',
            fullName: 'College Administrator',
            role: 'admin',
            isDefaultAdmin: false,
            createdAt: new Date().toISOString()
          }
        ];
        setAdmins(demoAdmins);
      }
    } catch (e) {
      setError(e.message || 'Failed to load admins');
      setAdmins([]);
    } finally {
      setLoadingAdmins(false);
    }
  }, []);

  // UI Actions
  const handleOpenManage = (institution) => {
    setSelectedInstitution(institution);
    setShowManageAdminsForm(true);
    loadAdmins(institution.slug || institution._id);
  };

  const handleCloseManage = () => {
    setShowManageAdminsForm(false);
    setSelectedInstitution(null);
  };

  const handleOpenViewAdmins = () => {
    setShowViewAdmins(true);
  };

  const handleCloseViewAdmins = () => {
    setShowViewAdmins(false);
  };

  const handleOpenReset = () => {
    setShowPasswordReset(true);
  };

  const handleCloseReset = () => {
    setShowPasswordReset(false);
    setPasswordResetData({ newPassword: '', confirmPassword: '' });
  };

  const handleOpenAddAdmin = () => {
    setShowAddAdminForm(true);
  };

  const handleCloseAddAdmin = () => {
    setShowAddAdminForm(false);
    setAddAdminData({ username: '', email: '', fullName: '', password: '', confirmPassword: '', role: 'admin' });
  };

  // Edit institution handlers
  const handleOpenEditInstitution = (institution) => {
    setSelectedInstitution(institution);
    setEditInstitutionData({
      name: institution.name || '',
      adminUsername: institution.adminUsername || '',
      adminEmail: institution.adminEmail || '',
      adminFullName: institution.adminFullName || '',
      logo: institution.logo || '',
      description: institution.description || '',
      website: institution.website || '',
      contactPhone: institution.contactPhone || '',
      address: institution.address || ''
    });
    setLogoPreview(institution.logo || '');
    setLogoFile(null);
    setShowEditInstitution(true);
  };

  const handleCloseEditInstitution = () => {
    setShowEditInstitution(false);
    setEditInstitutionData({
      name: '',
      adminUsername: '',
      adminEmail: '',
      adminFullName: '',
      logo: '',
      description: '',
      website: '',
      contactPhone: '',
      address: ''
    });
    setLogoFile(null);
    setLogoPreview('');
    // Reset file input
    const fileInput = document.getElementById('logo-file-input');
    if (fileInput) fileInput.value = '';
  };

  const handleEditInstitutionChange = (e) => {
    const { name, value } = e.target;
    setEditInstitutionData((prev) => ({ ...prev, [name]: value }));
  };

  // File upload handlers
  const handleLogoFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setError('Please select a valid image file (JPEG, PNG, GIF, SVG, or WebP)');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }

      setLogoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target.result);
        setEditInstitutionData(prev => ({ ...prev, logo: e.target.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
    setEditInstitutionData(prev => ({ ...prev, logo: '' }));
    // Reset file input
    const fileInput = document.getElementById('logo-file-input');
    if (fileInput) fileInput.value = '';
  };

  const handleEditInstitution = async (e) => {
    e.preventDefault();
    if (!selectedInstitution) return;
    
    // Check API configuration
    const apiConfig = dataService.getApiConfig();
    
    if (!apiConfig.USE_API) {
      // Demo mode - just show success message
      setError('Demo mode: Institution updated successfully');
      handleCloseEditInstitution();
      await loadInstitutions();
      return;
    }
    
    try {
      await fetchJson(`${apiConfig.API_BASE}/api/tenants/${selectedInstitution.slug || selectedInstitution._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editInstitutionData)
      });
      handleCloseEditInstitution();
      await loadInstitutions();
    } catch (e) {
      setError(e.message || 'Failed to update institution');
    }
  };

  // Delete institution handlers
  const handleOpenDeleteConfirm = (institution) => {
    setSelectedInstitution(institution);
    setShowDeleteConfirm(true);
  };

  const handleCloseDeleteConfirm = () => {
    setShowDeleteConfirm(false);
  };

  const handleDeleteInstitution = async () => {
    if (!selectedInstitution) return;
    
    // Check API configuration
    const apiConfig = dataService.getApiConfig();
    
    if (!apiConfig.USE_API) {
      // Demo mode - just show success message
      setError('Demo mode: Institution deleted successfully');
      handleCloseDeleteConfirm();
      await loadInstitutions();
      return;
    }
    
    try {
      await fetchJson(`${apiConfig.API_BASE}/api/tenants/${selectedInstitution.slug || selectedInstitution._id}`, {
        method: 'DELETE'
      });
      handleCloseDeleteConfirm();
      await loadInstitutions();
    } catch (e) {
      setError(e.message || 'Failed to delete institution');
    }
  };

  // View institution link handler
  const handleViewInstitution = (institution) => {
    // Generate the institution URL
    const baseUrl = window.location.origin;
    const institutionUrl = `${baseUrl}/?tenant=${institution.slug}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(institutionUrl).then(() => {
      setError(`Institution URL copied to clipboard: ${institutionUrl}`);
    }).catch(() => {
      // Fallback: show the URL
      setError(`Institution URL: ${institutionUrl}`);
    });
  };

  // Admin operations
  const setDefaultAdmin = async (adminId) => {
    if (!selectedInstitution || !adminId) return;
    
    // Check API configuration
    const apiConfig = dataService.getApiConfig();
    
    if (!apiConfig.USE_API) {
      // Demo mode - just show success message
      setError('Demo mode: Admin role updated successfully');
      await loadAdmins(selectedInstitution.slug || selectedInstitution._id);
      await loadInstitutions();
      return;
    }
    
    try {
      await fetchJson(`${apiConfig.API_BASE}/api/tenants/${selectedInstitution.slug || selectedInstitution._id}/admins/${adminId}/default`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ makeDefault: true })
      });
      // Promote to super_admin per requirement
      await fetchJson(`${apiConfig.API_BASE}/api/tenants/${selectedInstitution.slug || selectedInstitution._id}/admins/${adminId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'super_admin' })
      });
      await loadAdmins(selectedInstitution.slug || selectedInstitution._id);
      await loadInstitutions();
    } catch (e) {
      setError(e.message || 'Failed to set default admin');
    }
  };

  const updateAdminRole = async (adminId, role) => {
    if (!selectedInstitution || !adminId) return;
    
    // Check API configuration
    const apiConfig = dataService.getApiConfig();
    
    if (!apiConfig.USE_API) {
      // Demo mode - just show success message
      setError('Demo mode: Admin role updated successfully');
      await loadAdmins(selectedInstitution.slug || selectedInstitution._id);
      return;
    }
    
    try {
      await fetchJson(`${apiConfig.API_BASE}/api/tenants/${selectedInstitution.slug || selectedInstitution._id}/admins/${adminId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
      await loadAdmins(selectedInstitution.slug || selectedInstitution._id);
    } catch (e) {
      setError(e.message || 'Failed to update admin role');
    }
  };

  const handlePasswordResetChange = (e) => {
    const { name, value } = e.target;
    setPasswordResetData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!selectedInstitution) return;
    if (passwordResetData.newPassword !== passwordResetData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    // Check API configuration
    const apiConfig = dataService.getApiConfig();
    
    if (!apiConfig.USE_API) {
      // Demo mode - just show success message
      setError('Demo mode: Password reset successfully');
      handleCloseReset();
      return;
    }
    
    try {
      await fetchJson(`${apiConfig.API_BASE}/api/tenants/${selectedInstitution.slug || selectedInstitution._id}/admins/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: selectedInstitution.adminUsername || '',
          newPassword: passwordResetData.newPassword
        })
      });
      handleCloseReset();
    } catch (e) {
      setError(e.message || 'Failed to reset admin password');
    }
  };

  const handleAddAdminChange = (e) => {
    const { name, value } = e.target;
    setAddAdminData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    if (!selectedInstitution) return;
    if (addAdminData.password !== addAdminData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    // Check API configuration
    const apiConfig = dataService.getApiConfig();
    
    if (!apiConfig.USE_API) {
      // Demo mode - just show success message
      setError('Demo mode: Admin added successfully');
      handleCloseAddAdmin();
      await loadAdmins(selectedInstitution.slug || selectedInstitution._id);
      return;
    }
    
    try {
      await fetchJson(`${apiConfig.API_BASE}/api/tenants/${selectedInstitution.slug || selectedInstitution._id}/admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: addAdminData.username,
          email: addAdminData.email,
          fullName: addAdminData.fullName,
          password: addAdminData.password,
          role: addAdminData.role
        })
      });
      await loadAdmins(selectedInstitution.slug || selectedInstitution._id);
      handleCloseAddAdmin();
    } catch (e) {
      setError(e.message || 'Failed to add admin');
    }
  };

    // Logout function
  const handleLogout = () => {
    // Clear multi-tenant admin authentication
    localStorage.removeItem('multi_tenant_admin_token');
    localStorage.removeItem('multi_tenant_admin_refresh_token');
    localStorage.removeItem('multi_tenant_admin_user');
    
    // Redirect to login
    window.location.href = '/?admin=true';
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold">Multi-tenant Admin Dashboard</h2>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>
      {error ? (
        <p className="text-red-600 mt-2">{error}</p>
      ) : null}

      {/* Institutions List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading institutions...</span>
          </div>
        ) : institutions.length === 0 ? (
          <div className="text-center py-8 text-gray-600">
            <p>No institutions found.</p>
          </div>
        ) : (
          institutions.map((inst) => (
            <div key={inst._id || inst.slug} className="bg-white border rounded-lg shadow-sm p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    {inst.logo ? (
                      <img 
                        src={inst.logo} 
                        alt={`${inst.name} logo`}
                        className="w-12 h-12 rounded-lg object-cover border"
                        onError={(e) => { 
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      {...createFallbackLogo(inst.name, 'w-12 h-12')}
                      style={{ display: inst.logo ? 'none' : 'flex' }}
                    />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{inst.name}</h3>
                      <p className="text-sm text-gray-600">Slug: {inst.slug}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">👥 Total Users:</span>
                        <span className="text-sm text-gray-600">{inst.totalUsers || 0}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">👤 Admin:</span>
                        <span className="text-sm text-gray-600">{inst.adminFullName || inst.adminUsername || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">📧 Email:</span>
                        <span className="text-sm text-gray-600">{inst.adminEmail || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">📅 Created:</span>
                        <span className="text-sm text-gray-600">
                          {inst.createdAt ? new Date(inst.createdAt).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">🔄 Last Activity:</span>
                        <span className="text-sm text-gray-600">
                          {inst.lastActivity ? new Date(inst.lastActivity).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">📊 Plan:</span>
                        <span className="text-sm text-gray-600">{inst.subscriptionPlan || 'Basic'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {inst.description && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-700">{inst.description}</p>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col gap-2 ml-4">
                  <button 
                    className="px-3 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 transition-colors"
                    onClick={() => handleViewInstitution(inst)}
                    title="Copy institution URL"
                  >
                    🔗 View Link
                  </button>
                  <button 
                    className="px-3 py-2 rounded bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition-colors"
                    onClick={() => handleOpenManage(inst)}
                  >
                    👥 Manage Admins
                  </button>
                  <button 
                    className="px-3 py-2 rounded bg-green-600 text-white text-sm hover:bg-green-700 transition-colors"
                    onClick={() => handleOpenEditInstitution(inst)}
                  >
                    ✏️ Edit Info
                  </button>
                  <button 
                    className="px-3 py-2 rounded bg-red-600 text-white text-sm hover:bg-red-700 transition-colors"
                    onClick={() => handleOpenDeleteConfirm(inst)}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Manage Admins Modal (3 buttons only) */}
      {showManageAdminsForm && selectedInstitution && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto">
          <div className="bg-white rounded shadow w-11/12 md:w-2/3 lg:w-1/2 mt-16 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Manage Admins - {selectedInstitution.name}</h3>
              <button className="text-gray-500" onClick={handleCloseManage}>✕</button>
              </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button className="px-4 py-3 rounded bg-blue-600 text-white" onClick={handleOpenViewAdmins}>View Admins</button>
              <button className="px-4 py-3 rounded bg-amber-600 text-white" onClick={handleOpenReset}>Reset Admin Password</button>
              <button className="px-4 py-3 rounded bg-green-600 text-white" onClick={handleOpenAddAdmin}>Add New Admin</button>
              </div>
              </div>
            </div>
          )}

      {/* View Admins Modal (list, roles, set default) */}
      {showViewAdmins && selectedInstitution && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto">
          <div className="bg-white rounded shadow w-11/12 md:w-3/4 lg:w-1/2 mt-16 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Admins - {selectedInstitution.name}</h3>
              <button className="text-gray-500" onClick={handleCloseViewAdmins}>✕</button>
                    </div>
                    
            {loadingAdmins ? (
              <p>Loading admins...</p>
            ) : admins.length === 0 ? (
              <p className="text-gray-600">No admins yet.</p>
            ) : (
              <div className="space-y-3">
                {admins.map((admin) => (
                  <div key={admin._id || admin.id} className="border rounded p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <div className="font-medium">{admin.fullName || admin.name || admin.username}</div>
                      <div className="text-sm text-gray-600">{admin.email}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <select
                        className="border rounded px-2 py-1"
                        value={admin.role || 'admin'}
                        onChange={(e) => updateAdminRole(admin._id || admin.id, e.target.value)}
                      >
                        <option value="admin">admin</option>
                        <option value="tenant_admin">tenant_admin</option>
                        <option value="managed_admin">managed_admin</option>
                        <option value="super_admin">super_admin</option>
                      </select>
                      <button
                        className="px-3 py-1 rounded bg-indigo-600 text-white"
                        onClick={() => setDefaultAdmin(admin._id || admin.id)}
                      >
                        Set Default
                      </button>
                    </div>
                  </div>
                ))}
                </div>
            )}
                    </div>
                    </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordReset && selectedInstitution && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto">
          <div className="bg-white rounded shadow w-11/12 md:w-2/3 lg:w-1/2 mt-16 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Reset Admin Password - {selectedInstitution.name}</h3>
              <button className="text-gray-500" onClick={handleCloseReset}>✕</button>
            </div>
            <form onSubmit={handlePasswordReset} className="space-y-4">
                    <div>
                <label className="block text-sm font-medium text-gray-700">New Password</label>
                      <input
                  type="password"
                  name="newPassword"
                  value={passwordResetData.newPassword}
                  onChange={handlePasswordResetChange}
                        required
                  minLength={6}
                  autoComplete="new-password"
                  className="mt-1 block w-full border rounded px-3 py-2"
                  placeholder="Enter new password"
                      />
                    </div>
                    <div>
                <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                      <input
                  type="password"
                  name="confirmPassword"
                  value={passwordResetData.confirmPassword}
                  onChange={handlePasswordResetChange}
                          required
                          minLength={6}
                  autoComplete="new-password"
                  className="mt-1 block w-full border rounded px-3 py-2"
                  placeholder="Confirm new password"
                />
                      </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="px-3 py-2 rounded border" onClick={handleCloseReset}>Cancel</button>
                <button type="submit" className="px-3 py-2 rounded bg-amber-600 text-white">Reset Password</button>
                </div>
              </form>
            </div>
                </div>
              )}

      {/* Add New Admin Modal */}
      {showAddAdminForm && selectedInstitution && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto">
          <div className="bg-white rounded shadow w-11/12 md:w-2/3 lg:w-1/2 mt-16 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add New Admin - {selectedInstitution.name}</h3>
              <button className="text-gray-500" onClick={handleCloseAddAdmin}>✕</button>
            </div>
            <form onSubmit={handleAddAdmin} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <input
                    type="text"
                    name="fullName"
                    value={addAdminData.fullName}
                    onChange={handleAddAdminChange}
                    required
                    className="mt-1 block w-full border rounded px-3 py-2"
                    placeholder="e.g. John Doe"
                  />
              </div>
                  <div>
                  <label className="block text-sm font-medium text-gray-700">Username</label>
                    <input
                      type="text"
                    name="username"
                    value={addAdminData.username}
                    onChange={handleAddAdminChange}
                      required
                    className="mt-1 block w-full border rounded px-3 py-2"
                    placeholder="e.g. johndoe"
                    />
                  </div>
                  <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                    name="email"
                    value={addAdminData.email}
                    onChange={handleAddAdminChange}
                      required
                    className="mt-1 block w-full border rounded px-3 py-2"
                    placeholder="e.g. john@example.com"
                    />
                  </div>
                  <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <select name="role" value={addAdminData.role} onChange={handleAddAdminChange} className="mt-1 block w-full border rounded px-3 py-2">
                    <option value="admin">admin</option>
                    <option value="tenant_admin">tenant_admin</option>
                    <option value="managed_admin">managed_admin</option>
                    <option value="super_admin">super_admin</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                    <input
                    type="password"
                    name="password"
                    value={addAdminData.password}
                    onChange={handleAddAdminChange}
                      required
                    minLength={6}
                    autoComplete="new-password"
                    className="mt-1 block w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div>
                  <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                    <input
                      type="password"
                    name="confirmPassword"
                    value={addAdminData.confirmPassword}
                    onChange={handleAddAdminChange}
                      required
                    minLength={6}
                    autoComplete="new-password"
                    className="mt-1 block w-full border rounded px-3 py-2"
                    />
                  </div>
                </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="px-3 py-2 rounded border" onClick={handleCloseAddAdmin}>Cancel</button>
                <button type="submit" className="px-3 py-2 rounded bg-green-600 text-white">Create Admin</button>
                </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Institution Modal */}
      {showEditInstitution && selectedInstitution && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto">
          <div className="bg-white rounded shadow w-11/12 md:w-3/4 lg:w-1/2 mt-16 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Edit Institution - {selectedInstitution.name}</h3>
              <button className="text-gray-500 hover:text-gray-700" onClick={handleCloseEditInstitution}>✕</button>
            </div>
            
            <form onSubmit={handleEditInstitution} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Institution Name</label>
                  <input
                    type="text"
                    name="name"
                    value={editInstitutionData.name}
                    onChange={handleEditInstitutionChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. University of Technology"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
                  <div className="space-y-3">
                    {/* Logo Preview */}
                    <div className="flex items-center gap-3">
                      {logoPreview ? (
                        <div className="relative">
                          <img 
                            src={logoPreview} 
                            alt="Logo preview" 
                            className="w-16 h-16 rounded-lg object-cover border"
                          />
                          <button
                            type="button"
                            onClick={handleRemoveLogo}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                            title="Remove logo"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs">
                          No logo
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm text-gray-600">Current logo preview</p>
                      </div>
                    </div>
                    
                    {/* File Upload */}
                    <div>
                      <input
                        id="logo-file-input"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFileChange}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => document.getElementById('logo-file-input').click()}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        📁 Choose Logo File
                      </button>
                      <p className="text-xs text-gray-500 mt-1">
                        Supported: JPEG, PNG, GIF, SVG, WebP (max 5MB)
                      </p>
                    </div>
                    
                    {/* URL Input (Alternative) */}
                    <div className="border-t pt-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Or enter logo URL:</label>
                      <input
                        type="url"
                        name="logo"
                        value={editInstitutionData.logo}
                        onChange={handleEditInstitutionChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="https://example.com/logo.png"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  name="description"
                  value={editInstitutionData.description}
                  onChange={handleEditInstitutionChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief description of the institution..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                  <input
                    type="url"
                    name="website"
                    value={editInstitutionData.website}
                    onChange={handleEditInstitutionChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact Phone</label>
                  <input
                    type="tel"
                    name="contactPhone"
                    value={editInstitutionData.contactPhone}
                    onChange={handleEditInstitutionChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <textarea
                  name="address"
                  value={editInstitutionData.address}
                  onChange={handleEditInstitutionChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Full address of the institution..."
                />
              </div>

              <div className="border-t pt-4">
                <h4 className="text-md font-semibold text-gray-900 mb-4">Primary Administrator</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                    <input
                      type="text"
                      name="adminFullName"
                      value={editInstitutionData.adminFullName}
                      onChange={handleEditInstitutionChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. John Doe"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                    <input
                      type="text"
                      name="adminUsername"
                      value={editInstitutionData.adminUsername}
                      onChange={handleEditInstitutionChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. johndoe"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      name="adminEmail"
                      value={editInstitutionData.adminEmail}
                      onChange={handleEditInstitutionChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. john@example.com"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button" 
                  className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                  onClick={handleCloseEditInstitution}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedInstitution && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg w-11/12 md:w-1/2 lg:w-1/3 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-red-600 text-xl">⚠️</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Institution</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-2">
                Are you sure you want to delete <strong>{selectedInstitution.name}</strong>?
              </p>
              <p className="text-sm text-red-600">
                This will permanently delete the institution and all associated data including:
              </p>
              <ul className="text-sm text-red-600 ml-4 mt-2 list-disc">
                <li>All student accounts and data</li>
                <li>All exam results and history</li>
                <li>All administrator accounts</li>
                <li>All questions and exams</li>
              </ul>
            </div>

            <div className="flex justify-end gap-3">
              <button 
                className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                onClick={handleCloseDeleteConfirm}
              >
                Cancel
              </button>
              <button 
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                onClick={handleDeleteInstitution}
              >
                Delete Institution
              </button>
            </div>
          </div>
        </div>
      )}
            </div>
  );
}
