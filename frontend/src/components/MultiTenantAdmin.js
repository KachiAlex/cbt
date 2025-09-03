import React, { useState, useEffect, useCallback } from 'react';

const MultiTenantAdmin = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
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

  const canManageAdmins = () => {
    try {
      const u = JSON.parse(localStorage.getItem('multi_tenant_admin_user'));
      return u && (u.role === 'super_admin' || u.role === 'managed_admin');
    } catch {
      return false;
    }
  };

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
          handleLogout();
          return;
        }
        throw new Error('Failed to load institutions from MongoDB');
      }
      
      const data = await response.json();
      console.log('📊 Loaded institutions:', data);
      setInstitutions(data);
      
      // Load user counts for all institutions
      if (data.length > 0) {
        console.log('🔍 Loading user counts for all institutions...');
        data.forEach(institution => {
          loadUserCount(institution.slug);
        });
      }
    } catch (error) {
      console.error('❌ Error loading institutions:', error);
      setError('Failed to load institutions: ' + error.message);
      // Fallback to empty array
      setInstitutions([]);
    } finally {
      setLoading(false);
    }
  }, []);

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

  useEffect(() => {
    if (isAuthenticated()) {
      loadInstitutions();
    }
  }, [isAuthenticated, loadInstitutions]);

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
      await loadInstitutions();
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

  const fixUsersWithoutTenant = async () => {
    if (!window.confirm('This will attempt to fix users that are missing tenant_id. Continue?')) {
      return;
    }
    
    try {
      const token = getAuthToken();
      
      const response = await fetch(`${API_BASE_URL}/api/debug/fix-users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fix users');
      }

      const result = await response.json();
      console.log('🔧 Fix users result:', result);
      
      alert(`Fix completed!\n\n${result.message}\n\nFixed: ${result.fixedCount}/${result.totalUsersWithoutTenant} users`);
      
      // Refresh the page to see the changes
      window.location.reload();
      
    } catch (error) {
      console.error('Failed to fix users:', error);
      alert('Failed to fix users: ' + error.message);
    }
  };

  const checkAllUsers = async () => {
    try {
      const token = getAuthToken();
      
      const response = await fetch(`${API_BASE_URL}/api/debug/users`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch all users');
      }

      const result = await response.json();
      console.log('🔍 All users in system:', result);
      
      // Show the results in an alert for now
      const userList = result.users.map(u => 
        `${u.username} (${u.role}) - Tenant: ${u.tenant_id ? 'Yes' : 'No'}`
      ).join('\n');
      
      alert(`Total Users: ${result.totalUsers}\n\nUsers:\n${userList || 'No users found'}`);
      
    } catch (error) {
      console.error('Failed to check all users:', error);
      alert('Failed to check all users: ' + error.message);
    }
  };

  const loadUserCount = async (slug) => {
    try {
      const token = getAuthToken();
      
      const response = await fetch(`${API_BASE_URL}/api/tenants/${slug}/users`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch tenant users');
      }

      const result = await response.json();
      console.log('🔍 Users in tenant:', result);
      
      // Update the user count display
      const userCountElement = document.getElementById(`user-count-${slug}`);
      if (userCountElement) {
        userCountElement.textContent = `${result.users.length} users`;
        userCountElement.className = 'text-blue-600 font-medium';
      }
      
      return result.users.length;
      
    } catch (error) {
      console.error('Failed to load user count:', error);
      const userCountElement = document.getElementById(`user-count-${slug}`);
      if (userCountElement) {
        userCountElement.textContent = 'Error loading';
        userCountElement.className = 'text-red-600 font-medium';
      }
      return 0;
    }
  };

  const checkTenantUsers = async (slug) => {
    try {
      const token = getAuthToken();
      
      const response = await fetch(`${API_BASE_URL}/api/tenants/${slug}/users`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch tenant users');
      }

      const result = await response.json();
      console.log('🔍 Users in tenant:', result);
      
      // Show the results in an alert for now
      const userList = result.users.map(u => `${u.username} (${u.role})`).join('\n');
      alert(`Users in ${result.tenant.name}:\n\n${userList || 'No users found'}`);
      
    } catch (error) {
      console.error('Failed to check tenant users:', error);
      alert('Failed to check tenant users: ' + error.message);
    }
  };

  const checkDatabaseStatus = async () => {
    try {
      const token = getAuthToken();
      
      const response = await fetch(`${API_BASE_URL}/api/debug/db-status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to check database status');
      }

      const result = await response.json();
      console.log('🗄️ Database status:', result);
      
      if (result.connection === 'connected') {
        alert(`✅ Database Status:\n\nConnection: ${result.connection}\nUsers: ${result.userCount}\nTenants: ${result.tenantCount}\nCollections: ${result.collections.join(', ')}`);
      } else {
        alert(`❌ Database Status:\n\nConnection: ${result.connection}\nReady State: ${result.readyState || 'unknown'}`);
      }
      
    } catch (error) {
      console.error('Failed to check database status:', error);
      alert('Failed to check database status: ' + error.message);
    }
  };

  const fixUserRoles = async () => {
    try {
      const token = getAuthToken();
      
      const response = await fetch(`${API_BASE_URL}/api/debug/fix-roles`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fix user roles');
      }

      const result = await response.json();
      console.log('🔧 Role fix result:', result);
      
      alert(`✅ Role Fix Result:\n\n${result.message}\nModified: ${result.modifiedCount}\nTotal Matched: ${result.totalMatched}`);
      
    } catch (error) {
      console.error('Failed to fix user roles:', error);
      alert('Failed to fix user roles: ' + error.message);
    }
  };

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
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-t-2xl shadow-xl p-8">
          <div className="flex justify-between items-center">
            <div className="text-center flex-1">
              <h1 className="text-4xl font-bold text-gray-800 mb-4">
                🏫 Multi-Tenant CBT Admin Platform
              </h1>
              <p className="text-xl text-gray-600">
                Manage multiple institutions and their CBT systems
              </p>
              <p className="text-sm text-gray-500 mt-2">
                MongoDB Atlas • Real-time updates • Secure management
              </p>
            </div>
            <div className="ml-4">
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-white border-b border-gray-200 px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'dashboard'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📊 Dashboard
            </button>
            <button
              onClick={checkAllUsers}
              className="py-4 px-2 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              🔍 Debug Users
            </button>
            <button
              onClick={fixUsersWithoutTenant}
              className="py-4 px-2 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              🔧 Fix Users
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'create'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              ➕ Create Institution
            </button>
            <button
              onClick={() => setActiveTab('manage')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'manage'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🏢 Manage Institutions
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="bg-white rounded-b-2xl shadow-xl p-8">
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
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🏢</div>
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">No Institutions Found</h3>
                  <p className="text-gray-500 mb-4">Create your first institution to get started.</p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    Create Institution
                  </button>
                </div>
              ) : (
                <div className="grid gap-6">
                  {institutions.map((institution) => (
                    <div key={institution.slug} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-gray-800 mb-2">
                            {institution.name}
                          </h3>
                          <div className="space-y-2 text-sm text-gray-600 mb-4">
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold min-w-[60px]">Slug:</span>
                              <span className="text-gray-800">{institution.slug}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold min-w-[60px]">Plan:</span>
                              <span className="text-gray-800">{institution.plan}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold min-w-[60px]">Status:</span>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                institution.suspended 
                                  ? 'bg-red-100 text-red-800' 
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {institution.suspended ? 'Suspended' : 'Active'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold min-w-[60px]">Admin:</span>
                              <span className="text-gray-800">{institution.default_admin?.fullName}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold min-w-[60px]">Username:</span>
                              <span className="text-gray-800">{institution.default_admin?.username}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold min-w-[60px]">Users:</span>
                              <span className="text-gray-800">
                                <span id={`user-count-${institution.slug}`} className="text-blue-600 font-medium">
                                  Loading...
                                </span>
                                <button
                                  onClick={() => loadUserCount(institution.slug)}
                                  className="ml-2 text-xs text-gray-500 hover:text-gray-700 underline"
                                  title="Refresh user count"
                                >
                                  🔄
                                </button>
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold min-w-[60px]">Created:</span>
                              <span className="text-gray-800">{new Date(institution.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => toggleInstitutionStatus(institution.slug, institution.suspended)}
                            className={`px-4 py-2 rounded-md text-sm ${
                              institution.suspended
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-yellow-600 text-white hover:bg-yellow-700'
                            }`}
                          >
                            {institution.suspended ? 'Activate' : 'Suspend'}
                          </button>
                          
                          <button
                            onClick={() => {
                              console.log('🔍 Full institution data:', institution);
                              checkTenantUsers(institution.slug);
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                            title="Check users in this institution"
                          >
                            Check Users
                          </button>
                          
                          <button
                            onClick={() => resetAdminPassword(institution.slug, institution.default_admin?.username)}
                            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 text-sm"
                            title="Reset admin password"
                          >
                            Reset Admin Password
                          </button>
                          
                          <button
                            onClick={checkDatabaseStatus}
                            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
                            title="Check database connection and status"
                          >
                            🗄️ DB Status
                          </button>
                          
                          <button
                            onClick={fixUserRoles}
                            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-sm"
                            title="Fix user role mismatch (admin -> super_admin)"
                          >
                            🔧 Fix Roles
                          </button>
                          
                          {canManageAdmins() && (
                            <>
                              <button
                                onClick={() => openAdminsModal(institution.slug)}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
                                title="Manage admins for this institution"
                              >
                                Manage Admins
                              </button>
                              
                              <button
                                onClick={() => openStudentsModal(institution.slug)}
                                className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 text-sm"
                                title="Manage students for this institution"
                              >
                                Manage Students
                              </button>
                              
                              <button
                                onClick={() => deleteInstitution(institution.slug)}
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                                title="Delete this institution"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <a
                          href={`https://cbtexam.netlify.app/?slug=${institution.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                        >
                          🔗 View Institution: https://cbtexam.netlify.app/?slug={institution.slug}
                        </a>
                        <p className="text-xs text-gray-500 mt-1">
                          Login: {institution.default_admin?.username} / [password]
                        </p>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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