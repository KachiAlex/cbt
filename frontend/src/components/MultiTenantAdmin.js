import React, { useState, useEffect, useCallback } from 'react';

const MultiTenantAdmin = () => {
  const [activeTab, setActiveTab] = useState('manage');
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false); // eslint-disable-line no-unused-vars
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmittingInstitution, setIsSubmittingInstitution] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    plan: 'Basic',
    timezone: 'UTC',
    default_admin: {
      fullName: '',
      email: '',
      username: '',
      phone: '',
      password: ''
    }
  });
  const [adminsModalSlug, setAdminsModalSlug] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [adminFormData, setAdminFormData] = useState({ fullName: '', email: '', username: '', password: '' });
  const [adminFormLoading, setAdminFormLoading] = useState(false);
  const [adminFormError, setAdminFormError] = useState('');
  const [toast, setToast] = useState({ type: '', message: '' });
  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast({ type: '', message: '' }), 3000);
  };
  const [adminsFilter, setAdminsFilter] = useState('');
  const [studentsModalSlug, setStudentsModalSlug] = useState(null);
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsFilter, setStudentsFilter] = useState('');


  // MongoDB API base URL
  const API_BASE_URL = 'https://cbt-rew7.onrender.com';

  // Get authentication token
  const getAuthToken = () => {
    return localStorage.getItem('multi_tenant_admin_token');
  };

  // Note: role checks are handled server-side for security

  // Check if user is authenticated
  const isAuthenticated = useCallback(() => {
    return !!getAuthToken();
  }, []);

  // Logout function
  const handleLogout = () => {
    localStorage.removeItem('multi_tenant_admin_token');
    localStorage.removeItem('multi_tenant_admin_user');
    window.location.reload();
  };

  const loadInstitutions = useCallback(async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      
      console.log('🔍 Loading institutions...');
      console.log('🔑 Token:', token ? 'Present' : 'Missing');
      
      const response = await fetch(`${API_BASE_URL}/api/tenants`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          console.log('❌ Token expired or invalid');
          return { error: 'unauthorized' };
        }
        throw new Error('Failed to load institutions from MongoDB');
      }
      
      const data = await response.json();
      console.log('📊 Loaded institutions:', data);
      return { data };
    } catch (error) {
      console.error('❌ Error loading institutions:', error);
      return { error: error.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Effect to handle institution loading and logout if needed
  useEffect(() => {
    const loadData = async () => {
      const result = await loadInstitutions();
      if (result.error === 'unauthorized') {
        handleLogout();
        return;
      }
      if (result.data) {
        setInstitutions(result.data);
      } else if (result.error) {
        setError('Failed to load institutions: ' + result.error);
        setInstitutions([]);
      }
    };
    
    if (isAuthenticated()) {
      loadData();
    }
  }, [loadInstitutions, isAuthenticated]);

  // Effect to handle institution loading and logout if needed
  useEffect(() => {
    const loadData = async () => {
      const result = await loadInstitutions();
      if (result.error === 'unauthorized') {
        handleLogout();
        return;
      }
      if (result.data) {
        setInstitutions(result.data);
      } else if (result.error) {
        setError('Failed to load institutions: ' + result.error);
        setInstitutions([]);
      }
    };
    
    if (isAuthenticated()) {
      loadData();
    }
  }, [loadInstitutions, isAuthenticated]);

  // Separate effect to load user counts after institutions are loaded
  useEffect(() => {
    if (institutions.length > 0) {
      console.log('🔍 Loading user counts for all institutions...');
      console.log('📊 Institutions to process:', institutions.map(i => i.slug));
      
      // Add a longer delay to ensure DOM elements are fully rendered
      setTimeout(() => {
        console.log('🔍 DOM should be ready now, checking for elements...');
        
        // Debug: Check what elements exist
        const allElements = document.querySelectorAll('[id*="user-count"]');
        console.log(`🔍 Found ${allElements.length} elements with user-count in ID:`, 
          Array.from(allElements).map(el => el.id));
        
        institutions.forEach(institution => {
          console.log(`🔄 Loading user count for: ${institution.slug}`);
          loadUserCount(institution.slug);
        });
      }, 500); // Increased delay to 500ms
    }
  }, [institutions]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAdmins = async (slug) => {
    try {
      setAdminsLoading(true);
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/tenants/${slug}/admins`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load admins');
      const data = await res.json();
      setAdmins(data.admins || []);
    } catch (e) {
      setError('Failed to load admins: ' + e.message);
      setSuccess('');
      setAdmins([]);
    } finally {
      setAdminsLoading(false);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const openAdminsModal = async (slug) => {
    setAdminsModalSlug(slug);
    setShowAdminForm(false);
    setAdminFormData({ fullName: '', email: '', username: '', password: '' });
    setAdminFormError('');
    await loadAdmins(slug);
  };

  const submitCreateAdmin = async () => {
    if (!adminFormData.fullName || !adminFormData.email || !adminFormData.username || !adminFormData.password) {
      setAdminFormError('All fields are required');
      return;
    }
    if (adminFormData.password.length < 6) {
      setAdminFormError('Password must be at least 6 characters');
      return;
    }
    try {
      setAdminFormLoading(true);
      setAdminFormError('');
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/tenants/${adminsModalSlug}/admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(adminFormData)
      });
      if (!res.ok) {
        let msg = 'Failed to create admin';
        try { const e = await res.json(); msg = e.error || e.message || msg; } catch {}
        throw new Error(msg);
      }
      await loadAdmins(adminsModalSlug);
      setShowAdminForm(false);
      setAdminFormData({ fullName: '', email: '', username: '', password: '' });
      setSuccess('Admin created'); setError('');
    } catch (e) {
      setAdminFormError(e.message);
    } finally {
      setAdminFormLoading(false);
    }
  };

  const setAdminStatus = async (slug, username, isActive) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/tenants/${slug}/admins/${username}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ is_active: isActive })
      });
      if (!res.ok) {
        let msg = 'Failed to update admin status';
        try { const e = await res.json(); msg = e.error || e.message || msg; } catch {}
        throw new Error(msg);
      }
      await loadAdmins(slug);
      setSuccess('Status updated'); setError('');
    } catch (e) {
      setError('Failed to update admin status: ' + e.message); setSuccess('');
    }
  };

  const deleteAdmin = async (slug, username) => {
    if (!window.confirm('Delete this admin?')) return;
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/tenants/${slug}/admins/${username}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        let msg = 'Failed to delete admin';
        try { const e = await res.json(); msg = e.error || e.message || msg; } catch {}
        throw new Error(msg);
      }
      await loadAdmins(slug);
      setSuccess('Admin deleted'); setError('');
    } catch (e) {
      setError('Failed to delete admin: ' + e.message); setSuccess('');
    }
  };

  const loadStudents = async (slug) => {
    try {
      setStudentsLoading(true);
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/tenants/${slug}/students`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load students');
      const data = await res.json();
      setStudents(Array.isArray(data.students) ? data.students : []);
    } catch (e) {
      setError('Failed to load students: ' + e.message); setSuccess('');
      setStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const openStudentsModal = async (slug) => {
    setStudentsModalSlug(slug);
    setStudentsFilter('');
    await loadStudents(slug);
  };

  const setStudentStatusRemote = async (slug, username, isActive) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/tenants/${slug}/students/${username}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ is_active: isActive })
      });
      if (!res.ok) {
        let msg = 'Failed to update student status';
        try { const e = await res.json(); msg = e.error || e.message || msg; } catch {}
        throw new Error(msg);
      }
      await loadStudents(slug);
      showToast('success', isActive ? 'Student activated' : 'Student suspended');
    } catch (e) {
      showToast('error', e.message); setError('Failed to update student status: ' + e.message); setSuccess('');
    }
  };

  const deleteStudentRemote = async (slug, username) => {
    if (!window.confirm('Delete this student?')) return;
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/tenants/${slug}/students/${username}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        let msg = 'Failed to delete student';
        try { const e = await res.json(); msg = e.error || e.message || msg; } catch {}
        throw new Error(msg);
      }
      await loadStudents(slug);
      showToast('success', 'Student deleted');
    } catch (e) {
      showToast('error', e.message); setError('Failed to delete student: ' + e.message); setSuccess('');
    }
  };



  const handleCreateInstitution = async (e) => {
    e.preventDefault();
    
    if (isSubmittingInstitution) return;

    try {
      setIsSubmittingInstitution(true);
      setError('');
      setSuccess('');

      const token = getAuthToken();

      // Frontend validation & normalization
      const allowedPlans = ['Basic', 'Premium', 'Enterprise'];
      let normalizedPlan = (formData.plan || '').toString().trim();
      const tl = normalizedPlan.toLowerCase();
      if (tl === 'basic') normalizedPlan = 'Basic';
      else if (tl === 'premium') normalizedPlan = 'Premium';
      else if (tl === 'enterprise') normalizedPlan = 'Enterprise';
      if (!allowedPlans.includes(normalizedPlan)) normalizedPlan = 'Basic';

      const trimmedName = (formData.name || '').trim();
      const trimmedAddress = (formData.address || '').trim();
      const da = formData.default_admin || {};
      const defaultAdmin = {
        fullName: (da.fullName || '').trim(),
        email: (da.email || '').trim(),
        username: (da.username || '').trim(),
        phone: (da.phone || '').trim(),
        password: (da.password || '')
      };

      if (!trimmedName || !defaultAdmin.email || !defaultAdmin.username || !defaultAdmin.fullName) {
        setError('Please fill all required fields: Institution name, Admin full name, email, and username.');
        setIsSubmittingInstitution(false);
        return;
      }
      if (!defaultAdmin.password || defaultAdmin.password.length < 6) {
        setError('Admin password must be at least 6 characters.');
        setIsSubmittingInstitution(false);
        return;
      }
      
      const institutionData = {
        name: trimmedName,
        address: trimmedAddress,
        plan: normalizedPlan,
        timezone: formData.timezone || 'UTC',
        default_admin: defaultAdmin,
        contact_email: defaultAdmin.email,
        contact_phone: defaultAdmin.phone || ''
      };
      
      const response = await fetch(`${API_BASE_URL}/api/tenants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(institutionData)
      });

      if (!response.ok) {
        let msg = 'Failed to create institution';
        try {
          const errorData = await response.json();
          msg = errorData.error || errorData.message || msg;
        } catch {}
        throw new Error(msg);
      }

      // Prefer reloading list from server to avoid local desync
      const result = await loadInstitutions();
      if (result.data) {
        setInstitutions(result.data);
      }
      setShowCreateForm(false);
      setFormData({
        name: '',
        address: '',
        plan: 'Basic',
        timezone: 'UTC',
        default_admin: { fullName: '', email: '', username: '', phone: '', password: '' }
      });
      setActiveTab('manage');
      setSuccess('Institution created successfully');
      setError('');
    } catch (error) {
      setError('Failed to create institution: ' + error.message);
      setSuccess('');
    } finally {
      setIsSubmittingInstitution(false);
    }
  };

  const toggleInstitutionStatus = async (slug, currentStatus) => {
    try {
      const token = getAuthToken();
      
      const response = await fetch(`${API_BASE_URL}/api/tenants/${slug}/toggle-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ suspended: !currentStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update institution status');
      }

      // Update local state
      setInstitutions(institutions.map(inst => 
        inst.slug === slug ? { ...inst, suspended: !currentStatus } : inst
      ));
         } catch (error) {
       setError('Failed to update institution status: ' + error.message);
       setSuccess(''); // Clear any previous success message
     }
  };





  const loadUserCount = async (slug) => {
    try {
      console.log(`🔍 Starting loadUserCount for: ${slug}`);
      const token = getAuthToken();
      console.log(`🔑 Token present: ${!!token}`);
      
      const response = await fetch(`${API_BASE_URL}/api/tenants/${slug}/users`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log(`📡 Response status: ${response.status}`);
      console.log(`📡 Response ok: ${response.ok}`);

      if (!response.ok) {
        const errorData = await response.json();
        console.log(`❌ Error response:`, errorData);
        throw new Error(errorData.error || 'Failed to fetch tenant users');
      }

      const result = await response.json();
      console.log(`🔍 Users in tenant ${slug}:`, result);
      
      // Update the user count display
      let userCountElement = document.getElementById(`user-count-${slug}`);
      console.log(`🎯 User count element found: ${!!userCountElement}`);
      
      // If element not found, try again after a short delay
      if (!userCountElement) {
        console.log(`⏳ Element not found, retrying after 200ms...`);
        await new Promise(resolve => setTimeout(resolve, 200));
        userCountElement = document.getElementById(`user-count-${slug}`);
        console.log(`🎯 User count element found after retry: ${!!userCountElement}`);
      }
      
      if (userCountElement) {
        userCountElement.textContent = `${result.users.length} users`;
        userCountElement.className = 'text-blue-600 font-medium';
        console.log(`✅ Updated user count display for ${slug}: ${result.users.length} users`);
      } else {
        console.log(`❌ User count element still not found for ${slug} after retry`);
        // Try to find any element with similar ID pattern
        const allElements = document.querySelectorAll('[id*="user-count"]');
        console.log(`🔍 Found ${allElements.length} elements with user-count in ID:`, 
          Array.from(allElements).map(el => el.id));
      }
      
      return result.users.length;
      
    } catch (error) {
      console.error(`❌ Failed to load user count for ${slug}:`, error);
      const userCountElement = document.getElementById(`user-count-${slug}`);
      if (userCountElement) {
        userCountElement.textContent = 'Error loading';
        userCountElement.className = 'text-red-600 font-medium';
      }
      return 0;
    }
  };

  // Removed unused checkTenantUsers helper (not used in UI)







  const resetAdminPassword = async (slug, adminUsername) => {
    console.log('🔍 Attempting to reset password for:', { slug, adminUsername });
    
    if (!adminUsername) {
      setError('No admin username found for this institution');
      return;
    }

    const newPassword = prompt(`Enter new password for admin '${adminUsername}' (minimum 6 characters):`);
    if (!newPassword) return;

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    try {
      const token = getAuthToken();
      
      const response = await fetch(`${API_BASE_URL}/api/tenants/${slug}/reset-admin-password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          newPassword,
          adminUsername
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reset admin password');
      }

      await response.json();
      setSuccess(`Admin password reset successfully. New password: ${newPassword}`);
      setError('');
    } catch (error) {
      setError('Failed to reset admin password: ' + error.message);
      setSuccess('');
    }
  };

  const deleteInstitution = async (slug) => {
    if (!window.confirm('⚠️ HARD DELETE WARNING: This will permanently delete this institution and ALL its data (users, exams, results, etc.) from the database. This action cannot be undone. Are you absolutely sure?')) {
      return;
    }

    try {
      const token = getAuthToken();
      
      const response = await fetch(`${API_BASE_URL}/api/tenants/${slug}?hard=true&force=true`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete institution');
      }

             setInstitutions(institutions.filter(inst => inst.slug !== slug));
       setSuccess('Institution permanently deleted from database');
       setError(''); // Clear any previous error message
     } catch (error) {
       setError('Failed to delete institution: ' + error.message);
       setSuccess(''); // Clear any previous success message
     }
  };



  if (!isAuthenticated()) {
    return null; // This should be handled by the parent component
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading Multi-Tenant Admin Platform...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl font-bold">🏫</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">CBT Platform</h1>
              <p className="text-xs text-gray-500">Multi-Tenant Admin</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
              activeTab === 'dashboard'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className="text-lg">📊</span>
            <span className="font-medium">Dashboard</span>
          </button>
          
          <button
            onClick={() => setActiveTab('create')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
              activeTab === 'create'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className="text-lg">➕</span>
            <span className="font-medium">Create Institution</span>
          </button>
          
          <button
            onClick={() => setActiveTab('manage')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
              activeTab === 'manage'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className="text-lg">🏢</span>
            <span className="font-medium">Manage Institutions</span>
          </button>
        </nav>

        {/* Logout */}
        <div className="absolute bottom-0 w-64 p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left text-red-600 hover:bg-red-50 transition-colors"
          >
            <span className="text-lg">🚪</span>
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Top Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {activeTab === 'dashboard' && 'Dashboard'}
                {activeTab === 'create' && 'Create Institution'}
                {activeTab === 'manage' && 'Manage Institutions'}
              </h2>
              <p className="text-gray-600 mt-1">
                {activeTab === 'dashboard' && 'Overview of your CBT platform'}
                {activeTab === 'create' && 'Add a new institution to your platform'}
                {activeTab === 'manage' && 'Manage existing institutions and users'}
              </p>
            </div>
            

          </div>
        </div>

        {/* Content Area */}
        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
              {success}
            </div>
          )}

          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl">
                <div className="text-3xl mb-2">🏢</div>
                <h3 className="text-xl font-semibold mb-2">Total Institutions</h3>
                <p className="text-3xl font-bold">{institutions.length}</p>
              </div>
              
              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl">
                <div className="text-3xl mb-2">✅</div>
                <h3 className="text-xl font-semibold mb-2">Active Institutions</h3>
                <p className="text-3xl font-bold">
                  {institutions.filter(inst => !inst.suspended).length}
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white p-6 rounded-xl">
                <div className="text-3xl mb-2">📅</div>
                <h3 className="text-xl font-semibold mb-2">Created This Month</h3>
                <p className="text-3xl font-bold">
                  {institutions.filter(inst => {
                    const created = new Date(inst.createdAt);
                    const now = new Date();
                    return created.getMonth() === now.getMonth() && 
                           created.getFullYear() === now.getFullYear();
                  }).length}
                </p>
              </div>
            </div>
          )}

          {/* Create Institution Tab */}
          {activeTab === 'create' && (
            <div className="max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Create New Institution</h2>
              
              <form onSubmit={handleCreateInstitution} className="space-y-6">
                {/* Institution Details */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Institution Details</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Institution Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Enter institution name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Address
                      </label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Enter institution address"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Subscription Plan
                      </label>
                      <select
                        value={formData.plan}
                        onChange={(e) => setFormData({...formData, plan: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="Basic">Basic</option>
                        <option value="Premium">Premium</option>
                        <option value="Enterprise">Enterprise</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Timezone
                      </label>
                      <select
                        value={formData.timezone}
                        onChange={(e) => setFormData({...formData, timezone: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Chicago">Central Time</option>
                        <option value="America/Denver">Mountain Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Default Admin Details */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Default Administrator (Institution Login)</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    These credentials will be used to access the institution's CBT platform.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.default_admin.fullName}
                        onChange={(e) => setFormData({
                          ...formData, 
                          default_admin: {...formData.default_admin, fullName: e.target.value}
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Enter full name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.default_admin.email}
                        onChange={(e) => setFormData({
                          ...formData, 
                          default_admin: {...formData.default_admin, email: e.target.value}
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Enter email address"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Username *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.default_admin.username}
                        onChange={(e) => setFormData({
                          ...formData, 
                          default_admin: {...formData.default_admin, username: e.target.value}
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Enter username for institution login"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.default_admin.phone}
                        onChange={(e) => setFormData({
                          ...formData, 
                          default_admin: {...formData.default_admin, phone: e.target.value}
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Enter phone number"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={formData.default_admin.password}
                          onChange={(e) => setFormData({
                            ...formData, 
                            default_admin: {...formData.default_admin, password: e.target.value}
                          })}
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Enter password for institution login (min 6 characters)"
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? (
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
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab('dashboard')}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingInstitution}
                    className={`px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 ${isSubmittingInstitution ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    {isSubmittingInstitution ? 'Creating...' : 'Create Institution'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Manage Institutions Tab */}
          {activeTab === 'manage' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Manage Institutions</h2>
              
              {institutions.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-4xl">🏢</span>
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-700 mb-3">No Institutions Found</h3>
                  <p className="text-gray-500 mb-6 max-w-md mx-auto">You haven't created any institutions yet. Start by creating your first institution to manage CBT platforms.</p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm hover:shadow-md"
                  >
                    ➕ Create Your First Institution
                  </button>
                </div>
              ) : (
                <div className="grid gap-6">
                  {institutions.map((institution) => (
                    <div key={institution.slug} data-slug={institution.slug} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                              <span className="text-indigo-600 text-xl">🏢</span>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-800">
                              {institution.name}
                            </h3>
                          </div>
                          
                          {/* Institution Info Grid - Organized in Logical Sections */}
                          <div className="space-y-6 mb-6">
                            {/* Basic Info Row */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="bg-gray-50 p-4 rounded-lg">
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Institution ID</div>
                                <div className="text-sm font-mono text-gray-900 bg-white px-3 py-2 rounded border font-medium">{institution.slug}</div>
                              </div>
                              
                              <div className="bg-gray-50 p-4 rounded-lg">
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Subscription Plan</div>
                                <div className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                                  institution.plan === 'Premium' ? 'bg-purple-100 text-purple-800' :
                                  institution.plan === 'Enterprise' ? 'bg-blue-100 text-blue-800' :
                                  'bg-green-100 text-green-800'
                                }`}>{institution.plan}</div>
                              </div>
                              
                              <div className="bg-gray-50 p-4 rounded-lg">
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Status</div>
                                <div className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                                  institution.suspended 
                                    ? 'bg-red-100 text-red-800' 
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {institution.suspended ? 'Suspended' : 'Active'}
                                </div>
                              </div>
                            </div>
                            
                            {/* Admin Info Row */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="bg-gray-50 p-4 rounded-lg">
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Primary Admin</div>
                                <div className="text-sm font-medium text-gray-900">{institution.default_admin?.fullName || 'Not set'}</div>
                              </div>
                              
                              <div className="bg-gray-50 p-4 rounded-lg">
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Admin Username</div>
                                <div className="text-sm font-mono text-gray-900 bg-white px-3 py-2 rounded border">{institution.default_admin?.username || 'Not set'}</div>
                              </div>
                              
                              <div className="bg-gray-50 p-4 rounded-lg">
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Total Users</div>
                                <div className="text-sm font-medium text-gray-900">
                                  <span id={`user-count-${institution.slug}`} className="text-blue-600 font-semibold">
                                    Loading...
                                  </span>
                                  <button
                                    onClick={() => loadUserCount(institution.slug)}
                                    className="ml-2 text-xs text-gray-500 hover:text-gray-700 underline"
                                    title="Refresh user count"
                                  >
                                    🔄
                                  </button>
                                </div>
                              </div>
                            </div>
                            
                            {/* Metadata Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-gray-50 p-4 rounded-lg">
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Created Date</div>
                                <div className="text-sm text-gray-900 font-medium">{new Date(institution.createdAt).toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric' 
                                })}</div>
                              </div>
                              
                              <div className="bg-gray-50 p-4 rounded-lg">
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Address</div>
                                <div className="text-sm text-gray-900">{institution.address || 'No address provided'}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Action Buttons - Organized by Function */}
                        <div className="space-y-3">
                          {/* Primary Actions Row */}
                          <div className="flex flex-wrap gap-3">
                            <button
                              onClick={() => toggleInstitutionStatus(institution.slug, institution.suspended)}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                institution.suspended
                                  ? 'bg-green-600 text-white hover:bg-green-700'
                                  : 'bg-yellow-600 text-white hover:bg-yellow-700'
                              }`}
                            >
                              {institution.suspended ? '🟢 Activate' : '🟡 Suspend'}
                            </button>
                            
                            <button
                              onClick={() => openAdminsModal(institution.slug)}
                              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors"
                              title="Manage admins for this institution"
                            >
                              👥 Manage Admins
                            </button>
                          </div>
                          
                          {/* Secondary Actions Row */}
                          <div className="flex flex-wrap gap-3">
                            <button
                              onClick={() => resetAdminPassword(institution.slug, institution.default_admin?.username)}
                              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium transition-colors"
                              title="Reset admin password"
                            >
                              🔑 Reset Password
                            </button>
                            
                            <button
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to delete "${institution.name}"? This action cannot be undone.`)) {
                                  deleteInstitution(institution.slug);
                                }
                              }}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors"
                              title="Delete this institution"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Institution Access Section */}
                      <div className="mt-6 pt-4 border-t border-gray-200">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex items-center space-x-3">
                            <a
                              href={`https://cbtexam.netlify.app/?slug=${institution.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium border border-indigo-200"
                            >
                              <span>🔗</span>
                              <span>Open Institution Platform</span>
                            </a>
                          </div>
                          
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <span className="bg-gray-100 px-3 py-1 rounded-full">
                              👤 Login: <span className="font-mono font-medium">{institution.default_admin?.username || 'Not set'}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {adminsModalSlug && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4">
            {toast.message && (
              <div className={`mb-3 p-2 rounded text-sm ${toast.type==='error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{toast.message}</div>
            )}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Manage Admins</h3>
              <button onClick={() => setAdminsModalSlug(null)} className="text-gray-500 hover:text-gray-700 text-xl">×</button>
            </div>
            <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div className="text-sm text-gray-600">Tenant: <span className="font-medium">{adminsModalSlug}</span></div>
              <div className="flex gap-2 items-center">
                <input
                  value={adminsFilter}
                  onChange={(e) => setAdminsFilter(e.target.value)}
                  placeholder="Search username/email"
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
                <button onClick={() => setShowAdminForm(true)} className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">+ Create Admin</button>
              </div>
            </div>
            {showAdminForm && (
              <div className="mb-4 border rounded-lg p-4 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      value={adminFormData.fullName}
                      onChange={(e) => setAdminFormData({ ...adminFormData, fullName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter full name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      value={adminFormData.email}
                      onChange={(e) => setAdminFormData({ ...adminFormData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter email"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                    <input
                      type="text"
                      value={adminFormData.username}
                      onChange={(e) => setAdminFormData({ ...adminFormData, username: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter username"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                    <input
                      type="password"
                      value={adminFormData.password}
                      onChange={(e) => setAdminFormData({ ...adminFormData, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Min 6 characters"
                      required
                    />
                  </div>
                </div>
                {adminFormError && (
                  <div className="mt-3 p-2 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{adminFormError}</div>
                )}
                <div className="mt-4 flex justify-end gap-2">
                  <button onClick={() => { setShowAdminForm(false); setAdminFormError(''); }} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                  <button onClick={async () => { await submitCreateAdmin(); showToast('success', 'Admin created'); }} disabled={adminFormLoading} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50">
                    {adminFormLoading ? 'Creating...' : 'Create Admin'}
                  </button>
                </div>
              </div>
            )}
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full table-fixed">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Username</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Full Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">Email</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Role</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Status</th>
                    <th className="px-4 py-2 w-32"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {adminsLoading && (
                    <tr><td colSpan={6} className="px-4 py-4 text-center text-gray-500">Loading...</td></tr>
                  )}
                  {!adminsLoading && admins.filter(a => {
                    const q = adminsFilter.toLowerCase().trim();
                    if (!q) return true;
                    return (
                      (a.username || '').toLowerCase().includes(q) ||
                      (a.email || '').toLowerCase().includes(q)
                    );
                  }).length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-4 text-center text-gray-500">No admins found</td></tr>
                  )}
                  {admins.filter(a => {
                    const q = adminsFilter.toLowerCase().trim();
                    if (!q) return true;
                    return (
                      (a.username || '').toLowerCase().includes(q) ||
                      (a.email || '').toLowerCase().includes(q)
                    );
                  }).map(a => (
                    <tr key={a.username}>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">{a.username}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{a.fullName}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{a.email}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{a.role || 'admin'}</td>
                      <td className="px-4 py-2 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${a.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>{a.is_active ? 'Active' : 'Suspended'}</span>
                      </td>
                      <td className="px-4 py-2 text-sm text-right">
                        {a.is_active ? (
                          <button onClick={async () => { await setAdminStatus(adminsModalSlug, a.username, false); showToast('success', 'Admin suspended'); }} className="px-3 py-1 rounded-lg bg-orange-600 text-white hover:bg-orange-700 mr-2">Suspend</button>
                        ) : (
                          <button onClick={async () => { await setAdminStatus(adminsModalSlug, a.username, true); showToast('success', 'Admin activated'); }} className="px-3 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 mr-2">Activate</button>
                        )}
                        <button
                          onClick={async () => { await deleteAdmin(adminsModalSlug, a.username); showToast('success', 'Admin deleted'); }}
                          className={`px-3 py-1 rounded-lg text-white ${a.is_default_admin ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
                          title={a.is_default_admin ? 'Cannot delete default admin' : 'Delete admin'}
                          disabled={!!a.is_default_admin}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {studentsModalSlug && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4">
            {toast.message && (
              <div className={`mb-3 p-2 rounded text-sm ${toast.type==='error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{toast.message}</div>
            )}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Manage Students</h3>
              <button onClick={() => setStudentsModalSlug(null)} className="text-gray-500 hover:text-gray-700 text-xl">×</button>
            </div>
            <div className="mb-4 flex justify-between items-center">
              <div className="text-sm text-gray-600">Tenant: <span className="font-medium">{studentsModalSlug}</span></div>
              <input
                value={studentsFilter}
                onChange={(e) => setStudentsFilter(e.target.value)}
                placeholder="Search username/email"
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {studentsLoading && (
                    <tr><td colSpan={5} className="px-4 py-4 text-center text-gray-500">Loading...</td></tr>
                  )}
                  {!studentsLoading && students.filter(s => {
                    const q = studentsFilter.toLowerCase().trim();
                    if (!q) return true;
                    return (
                      (s.username || '').toLowerCase().includes(q) ||
                      (s.email || '').toLowerCase().includes(q)
                    );
                  }).length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-4 text-center text-gray-500">No students found</td></tr>
                  )}
                  {students.filter(s => {
                    const q = studentsFilter.toLowerCase().trim();
                    if (!q) return true;
                    return (
                      (s.username || '').toLowerCase().includes(q) ||
                      (s.email || '').toLowerCase().includes(q)
                    );
                  }).map(s => (
                    <tr key={s.username}>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">{s.username}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{s.fullName}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{s.email}</td>
                      <td className="px-4 py-2 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${s.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>{s.is_active ? 'Active' : 'Suspended'}</span>
                      </td>
                      <td className="px-4 py-2 text-sm text-right">
                        {s.is_active ? (
                          <button onClick={() => setStudentStatusRemote(studentsModalSlug, s.username, false)} className="px-3 py-1 rounded-lg bg-orange-600 text-white hover:bg-orange-700 mr-2">Suspend</button>
                        ) : (
                          <button onClick={() => setStudentStatusRemote(studentsModalSlug, s.username, true)} className="px-3 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 mr-2">Activate</button>
                        )}
                        <button onClick={() => deleteStudentRemote(studentsModalSlug, s.username)} className="px-3 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      

    </div>
  );
};

export default MultiTenantAdmin; 