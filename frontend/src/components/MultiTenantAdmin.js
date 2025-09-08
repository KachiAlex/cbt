import React, { useState, useEffect, useCallback } from 'react';
import dataService from '../services/dataService';
import { getInstitutionLogo, createFallbackLogo } from '../utils/logoUtils';

// Helper: safe fetch JSON
async function fetchJson(url, options = {}) {
  const token = localStorage.getItem('multi_tenant_admin_token');
  const mergedHeaders = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const res = await fetch(url, { ...options, headers: mergedHeaders });

  if (!res.ok) {
    if (res.status === 401) {
      // Not authenticated – send user to multi-tenant admin login
      try {
        // Clear any stale tokens
        localStorage.removeItem('multi_tenant_admin_token');
        localStorage.removeItem('multi_tenant_admin_refresh_token');
        localStorage.removeItem('multi_tenant_admin_user');
      } catch (_) {}
      // Redirect silently to admin login view on the same site
      if (typeof window !== 'undefined') {
        window.location.href = '/?admin=true';
      }
    }
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
  const [showCreateInstitution, setShowCreateInstitution] = useState(false);

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

  const [createInstitutionData, setCreateInstitutionData] = useState({
    name: '',
    slug: '',
    adminUsername: '',
    adminEmail: '',
    adminFullName: '',
    adminPassword: '',
    logo: '',
    description: '',
    website: '',
    contactPhone: '',
    address: '',
    plan: 'basic'
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

      // Resolve tenant-specific user counts to avoid showing global numbers
      const sleep = (ms) => new Promise(r => setTimeout(r, ms));
      for (let i = 0; i < normalized.length; i += 1) {
        const tenant = normalized[i];
        const tenantKey = tenant._id || tenant.id || tenant.slug;
        if (!tenantKey) continue;
        // Stagger requests to reduce API rate limiting
        // eslint-disable-next-line no-await-in-loop
        await sleep(200);
        try {
          // eslint-disable-next-line no-await-in-loop
          const detail = await fetchJson(`${apiConfig.API_BASE}/api/tenants/${tenant._id || tenant.id || tenant.slug}`);
          const usersArr = Array.isArray(detail?.users) ? detail.users : [];
          const perTenantCount = usersArr.length;
          setInstitutions(prev => prev.map(inst => {
            const key = inst._id || inst.id || inst.slug;
            return key === tenantKey ? { ...inst, totalUsers: perTenantCount } : inst;
          }));
        } catch (_) {
          // Ignore per-tenant failures, keep existing value
        }
      }
      } else {
        // Use localStorage fallback - load from localStorage or create demo institutions
        let demoInstitutions = JSON.parse(localStorage.getItem('demo_institutions') || '[]');
        
        // If no institutions in localStorage, create default demo institutions
        if (demoInstitutions.length === 0) {
          demoInstitutions = [
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
        // Save default demo institutions to localStorage
        localStorage.setItem('demo_institutions', JSON.stringify(demoInstitutions));
        }
        
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
  const loadAdmins = useCallback(async (tenantSlugOrId) => {
    if (!tenantSlugOrId) return;
    try {
      setLoadingAdmins(true);
      
      // Check API configuration
      const apiConfig = dataService.getApiConfig();
      
      if (apiConfig.USE_API) {
        // Use API: fetch tenant details to get users with IDs
        const detail = await fetchJson(`${apiConfig.API_BASE}/api/tenants/${tenantSlugOrId}`);
        const users = Array.isArray(detail?.users) ? detail.users : [];
        const adminUsers = users.filter(u => ['admin','tenant_admin','managed_admin','super_admin'].includes(u.role));
        // Normalize id field
        const normalized = adminUsers.map(u => ({ ...u, id: u._id || u.id }));
        setAdmins(normalized);
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
    loadAdmins(institution._id || institution.slug);
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
      // Demo mode - actually delete from localStorage
      try {
        const demoInstitutions = JSON.parse(localStorage.getItem('demo_institutions') || '[]');
        const updatedInstitutions = demoInstitutions.filter(
          inst => inst.slug !== selectedInstitution.slug && inst._id !== selectedInstitution._id
        );
        localStorage.setItem('demo_institutions', JSON.stringify(updatedInstitutions));
        
        // Clear any error and close modal
        setError('');
        handleCloseDeleteConfirm();
        await loadInstitutions();
        
        console.log('✅ Institution deleted from demo mode:', selectedInstitution.name);
      } catch (e) {
        setError('Failed to delete institution: ' + e.message);
      }
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
    
    // Open in new tab
    window.open(institutionUrl, '_blank', 'noopener,noreferrer');
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

  // Delete an admin
  const deleteAdmin = async (adminId) => {
    if (!selectedInstitution || !adminId) return;
    if (!window.confirm('Are you sure you want to delete this admin? This action cannot be undone.')) return;

    const apiConfig = dataService.getApiConfig();

    if (!apiConfig.USE_API) {
      // Demo/local fallback: just remove from local state
      setAdmins(prev => prev.filter(a => (a._id || a.id) !== adminId));
      return;
    }

    try {
      await fetchJson(`${apiConfig.API_BASE}/api/tenants/${selectedInstitution.slug || selectedInstitution._id}/admins/${adminId}`, {
        method: 'DELETE'
      });
      await loadAdmins(selectedInstitution.slug || selectedInstitution._id);
    } catch (e) {
      setError(e.message || 'Failed to delete admin');
    }
  };

  // Purge all users for selected tenant
  const purgeAllUsers = async (includeDefault = true) => {
    if (!selectedInstitution) return;
    if (!window.confirm(`This will permanently delete ${includeDefault ? 'ALL users including default admin' : 'all non-default users'} for this tenant. Continue?`)) return;
    try {
      const apiConfig = dataService.getApiConfig();
      if (!apiConfig.USE_API) {
        setError('Demo mode: cannot purge users');
        return;
      }
      const key = selectedInstitution._id || selectedInstitution.slug;
      await fetchJson(`${apiConfig.API_BASE}/api/tenants/${key}/users?includeDefault=${includeDefault ? 'true' : 'false'}`, {
        method: 'DELETE'
      });
      // Refresh admins list after purge
      await loadAdmins(key);
      setError('');
    } catch (e) {
      setError(e.message || 'Failed to purge users');
    }
  };

  // Reset password for a specific admin
  const resetPasswordForAdmin = async (admin) => {
    if (!selectedInstitution || !admin) return;
    const apiConfig = dataService.getApiConfig();

    if (!apiConfig.USE_API) {
      // Demo/local fallback: no-op with message
      setError('Demo mode: Password reset simulated successfully');
      return;
    }

    try {
      // Try by adminId first (preferred)
      const adminId = admin._id || admin.id || admin.userId || admin.user_id;
      if (adminId) {
        await fetchJson(`${apiConfig.API_BASE}/api/tenants/${selectedInstitution.slug || selectedInstitution._id}/admins/${adminId}/reset-password`, {
          method: 'POST'
        });
      } else {
        // Fallback: legacy endpoint by username/email
        await fetchJson(`${apiConfig.API_BASE}/api/tenants/${selectedInstitution.slug || selectedInstitution._id}/admins/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: admin.username || admin.email })
        });
      }
      // Optionally show a toast or success message
    } catch (e) {
      setError(e.message || 'Failed to reset admin password');
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
          // Force platform-created admins to super_admin as requested
          role: 'super_admin'
        })
      });
      await loadAdmins(selectedInstitution.slug || selectedInstitution._id);
      handleCloseAddAdmin();
    } catch (e) {
      setError(e.message || 'Failed to add admin');
    }
  };

  // Create institution handler
  const handleCreateInstitution = async (e) => {
    e.preventDefault();
    
    if (!createInstitutionData.name || !createInstitutionData.adminUsername || !createInstitutionData.adminPassword) {
      setError('Name, admin username, and password are required');
      return;
    }
    
    // Check API configuration
    const apiConfig = dataService.getApiConfig();
    
    if (!apiConfig.USE_API) {
      // Demo mode - create institution in localStorage
      const newInstitution = {
        _id: Date.now().toString(),
        name: createInstitutionData.name,
        slug: createInstitutionData.slug || createInstitutionData.name.toLowerCase().replace(/\s+/g, '-'),
        adminUsername: createInstitutionData.adminUsername,
        adminEmail: createInstitutionData.adminEmail,
        adminFullName: createInstitutionData.adminFullName,
        logo: createInstitutionData.logo,
        description: createInstitutionData.description,
        website: createInstitutionData.website,
        contactPhone: createInstitutionData.contactPhone,
        address: createInstitutionData.address,
        plan: createInstitutionData.plan,
        totalUsers: 1,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };
      
      // Add to demo institutions
      const existingInstitutions = JSON.parse(localStorage.getItem('demo_institutions') || '[]');
      existingInstitutions.push(newInstitution);
      localStorage.setItem('demo_institutions', JSON.stringify(existingInstitutions));
      
      handleCloseCreateInstitution();
      await loadInstitutions();
      setError(''); // Clear any previous errors
      return;
    }
    
    try {
      await fetchJson(`${apiConfig.API_BASE}/api/tenants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createInstitutionData.name,
          slug: createInstitutionData.slug || createInstitutionData.name.toLowerCase().replace(/\s+/g, '-'),
          adminUsername: createInstitutionData.adminUsername,
          adminEmail: createInstitutionData.adminEmail,
          adminFullName: createInstitutionData.adminFullName,
          adminPassword: createInstitutionData.adminPassword,
          logo: createInstitutionData.logo,
          description: createInstitutionData.description,
          website: createInstitutionData.website,
          contactPhone: createInstitutionData.contactPhone,
          address: createInstitutionData.address,
          plan: createInstitutionData.plan
        })
      });
      handleCloseCreateInstitution();
      await loadInstitutions();
      setCreateInstitutionData({
        name: '',
        slug: '',
        adminUsername: '',
        adminEmail: '',
        adminFullName: '',
        adminPassword: '',
        logo: '',
        description: '',
        website: '',
        contactPhone: '',
        address: '',
        plan: 'basic'
      });
    } catch (e) {
      setError(e.message || 'Failed to create institution');
    }
  };

  // Create institution form handlers
  const handleCreateInstitutionChange = (e) => {
    const { name, value } = e.target;
    setCreateInstitutionData((prev) => ({ ...prev, [name]: value }));
  };

  const handleOpenCreateInstitution = () => {
    setShowCreateInstitution(true);
    setError('');
  };

  const handleCloseCreateInstitution = () => {
    setShowCreateInstitution(false);
    setCreateInstitutionData({
      name: '',
      slug: '',
      adminUsername: '',
      adminEmail: '',
      adminFullName: '',
      adminPassword: '',
      logo: '',
      description: '',
      website: '',
      contactPhone: '',
      address: '',
      plan: 'basic'
    });
    setLogoFile(null);
    setLogoPreview('');
  };

  // Logo file handling for create institution
  const handleCreateLogoFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
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
        setCreateInstitutionData(prev => ({ ...prev, logo: e.target.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveCreateLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
    setCreateInstitutionData(prev => ({ ...prev, logo: '' }));
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
        <div className="flex gap-2">
          <button
            onClick={handleOpenCreateInstitution}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Institution
          </button>
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
                    title="Open institution page in new tab"
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
                      <button
                        className="px-3 py-1 rounded bg-amber-600 text-white"
                        title="Reset this admin's password"
                        onClick={() => resetPasswordForAdmin(admin)}
                      >
                        Reset Password
                      </button>
                      <button
                        className="px-3 py-1 rounded bg-red-600 text-white"
                        title="Delete this admin"
                        onClick={() => deleteAdmin(admin._id || admin.id)}
                      >
                        Delete
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

      {/* Create Institution Modal */}
      {showCreateInstitution && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto">
          <div className="bg-white rounded shadow w-11/12 md:w-3/4 lg:w-1/2 mt-16 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Create New Institution</h3>
              <button className="text-gray-500 hover:text-gray-700" onClick={handleCloseCreateInstitution}>✕</button>
            </div>
            
            <form onSubmit={handleCreateInstitution} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Institution Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={createInstitutionData.name}
                    onChange={handleCreateInstitutionChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL-friendly)</label>
                  <input
                    type="text"
                    name="slug"
                    value={createInstitutionData.slug}
                    onChange={handleCreateInstitutionChange}
                    placeholder="auto-generated from name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-md font-semibold text-gray-800 mb-3">Primary Administrator</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Admin Username *</label>
                    <input
                      type="text"
                      name="adminUsername"
                      value={createInstitutionData.adminUsername}
                      onChange={handleCreateInstitutionChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoComplete="username"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Admin Email</label>
                    <input
                      type="email"
                      name="adminEmail"
                      value={createInstitutionData.adminEmail}
                      onChange={handleCreateInstitutionChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoComplete="email"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Admin Full Name</label>
                    <input
                      type="text"
                      name="adminFullName"
                      value={createInstitutionData.adminFullName}
                      onChange={handleCreateInstitutionChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Admin Password *</label>
                    <input
                      type="password"
                      name="adminPassword"
                      value={createInstitutionData.adminPassword}
                      onChange={handleCreateInstitutionChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-md font-semibold text-gray-800 mb-3">Additional Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
                    <div className="space-y-2">
                      {/* Logo Preview */}
                      {logoPreview && (
                        <div className="relative inline-block">
                          <img 
                            src={logoPreview} 
                            alt="Logo preview" 
                            className="w-16 h-16 object-cover rounded border"
                          />
                          <button
                            type="button"
                            onClick={handleRemoveCreateLogo}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      )}
                      
                      {/* File Picker */}
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCreateLogoFileChange}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        <p className="text-xs text-gray-500 mt-1">Upload an image file (max 5MB)</p>
                      </div>
                      
                      {/* URL Input */}
                      <div>
                        <input
                          type="url"
                          name="logo"
                          value={createInstitutionData.logo}
                          onChange={handleCreateInstitutionChange}
                          placeholder="Or enter logo URL"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">Or provide a logo URL</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                    <select
                      name="plan"
                      value={createInstitutionData.plan}
                      onChange={handleCreateInstitutionChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="basic">Basic</option>
                      <option value="premium">Premium</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                    <input
                      type="url"
                      name="website"
                      value={createInstitutionData.website}
                      onChange={handleCreateInstitutionChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                    <input
                      type="tel"
                      name="contactPhone"
                      value={createInstitutionData.contactPhone}
                      onChange={handleCreateInstitutionChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    name="description"
                    value={createInstitutionData.description}
                    onChange={handleCreateInstitutionChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <textarea
                    name="address"
                    value={createInstitutionData.address}
                    onChange={handleCreateInstitutionChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={handleCloseCreateInstitution}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
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
            </div>
  );
}
