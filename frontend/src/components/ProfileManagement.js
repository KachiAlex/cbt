import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { buildApiUrl } from '../config/api';

const ProfileManagement = ({ user, tenant }) => {
    const [profile, setProfile] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [activeTab, setActiveTab] = useState('profile');
    
    // Form states
    const [editForm, setEditForm] = useState({
        name: '',
        logo_url: '',
        address: '',
        contact_phone: ''
    });
    
    // File upload states
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState('');
    
    // Admin management states
    const [admins, setAdmins] = useState([]);
    const [showCreateAdmin, setShowCreateAdmin] = useState(false);
    const [newAdmin, setNewAdmin] = useState({
        username: '',
        email: '',
        fullName: '',
        password: '',
        role: 'admin'
    });

    useEffect(() => {
        if (tenant?.slug) {
            fetchProfile();
            fetchAdmins();
        }
    }, [tenant]);

    const fetchProfile = async () => {
        try {
            const response = await axios.get(buildApiUrl(`/api/tenant/${tenant.slug}/profile`));
            setProfile(response.data);
            setEditForm({
                name: response.data.name || '',
                logo_url: response.data.logo_url || '',
                address: response.data.address || '',
                contact_phone: response.data.contact_phone || ''
            });
            // Set preview URL if logo exists
            if (response.data.logo_url) {
                setPreviewUrl(response.data.logo_url);
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
    };

    const fetchAdmins = async () => {
        try {
            const response = await axios.get(buildApiUrl(`/api/tenant/${tenant.slug}/admins`));
            setAdmins(response.data);
        } catch (error) {
            console.error('Error fetching admins:', error);
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                setError('Please select a valid image file');
                return;
            }
            
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                setError('File size must be less than 5MB');
                return;
            }
            
            setSelectedFile(file);
            setError('');
            
            // Create preview URL
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    const handleFileUpload = async () => {
        if (!selectedFile) return;
        
        setUploading(true);
        setError('');
        
        try {
            const formData = new FormData();
            formData.append('logo', selectedFile);
            
            const response = await axios.post(
                buildApiUrl(`/api/tenant/${tenant.slug}/upload-logo`),
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );
            
            // Update the form with the new logo URL
            setEditForm({...editForm, logo_url: response.data.logo_url});
            setSuccess('Logo uploaded successfully!');
            setSelectedFile(null);
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to upload logo');
        } finally {
            setUploading(false);
        }
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            await axios.put(buildApiUrl(`/api/tenant/${tenant.slug}/profile`), editForm);
            setSuccess('Profile updated successfully!');
            fetchProfile();
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAdmin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            await axios.post(buildApiUrl(`/api/tenant/${tenant.slug}/admins`), newAdmin);
            setSuccess('Admin created successfully!');
            setNewAdmin({
                username: '',
                email: '',
                fullName: '',
                password: '',
                role: 'admin'
            });
            setShowCreateAdmin(false);
            fetchAdmins();
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to create admin');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAdmin = async (adminId) => {
        if (!window.confirm('Are you sure you want to delete this admin?')) {
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            await axios.delete(buildApiUrl(`/api/tenant/${tenant.slug}/admins/${adminId}`));
            setSuccess('Admin deleted successfully!');
            fetchAdmins();
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to delete admin');
        } finally {
            setLoading(false);
        }
    };

    // Single-admin flow: no admin removal

    const isDefaultAdmin = (user?.role === 'super_admin') || (user?.username === 'admin') || user?.is_default_admin || user?.isDefaultAdmin;
    if (!isDefaultAdmin) {
        return (
            <div className="p-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <p className="text-yellow-800">
                        Only the default admin can manage institution profile and other admins.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Institution Management</h2>
                <p className="text-gray-600">Manage your institution profile and admin accounts</p>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'profile'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Institution Profile
                    </button>
                    <button
                        onClick={() => setActiveTab('admins')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'admins'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Admin Management
                    </button>
                </nav>
            </div>

            {/* Messages */}
            {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
                    <p className="text-red-800">{error}</p>
                </div>
            )}
            {success && (
                <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
                    <p className="text-green-800">{success}</p>
                </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
                <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Institution Profile</h3>
                    
                    <form onSubmit={handleProfileUpdate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Institution Name</label>
                            <input
                                type="text"
                                value={editForm.name}
                                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                required
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Institution Logo</label>
                            
                            {/* File Picker */}
                            <div className="mb-4">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                />
                                <p className="mt-1 text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                            </div>
                            
                            {/* Upload Button */}
                            {selectedFile && (
                                <div className="mb-4">
                                    <button
                                        type="button"
                                        onClick={handleFileUpload}
                                        disabled={uploading}
                                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 text-sm"
                                    >
                                        {uploading ? 'Uploading...' : 'Upload Logo'}
                                    </button>
                                </div>
                            )}
                            
                            {/* Logo Preview */}
                            {previewUrl && (
                                <div className="mb-4">
                                    <p className="text-sm font-medium text-gray-700 mb-2">Logo Preview:</p>
                                    <img
                                        src={previewUrl}
                                        alt="Logo preview"
                                        className="h-20 w-20 object-contain border border-gray-300 rounded-md"
                                    />
                                </div>
                            )}
                            
                            {/* Manual URL Input (fallback) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Or enter logo URL manually:</label>
                            <input
                                type="url"
                                value={editForm.logo_url}
                                onChange={(e) => setEditForm({...editForm, logo_url: e.target.value})}
                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="https://example.com/logo.png"
                            />
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Address</label>
                            <textarea
                                value={editForm.address}
                                onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                                rows={3}
                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Contact Phone</label>
                            <input
                                type="tel"
                                value={editForm.contact_phone}
                                onChange={(e) => setEditForm({...editForm, contact_phone: e.target.value})}
                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                        </div>
                        
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {loading ? 'Updating...' : 'Update Profile'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Admin Management Tab */}
            {activeTab === 'admins' && (
                <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-medium text-gray-900">Admin Management</h3>
                        <button
                            onClick={() => setShowCreateAdmin(true)}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                        >
                            Create New Admin
                        </button>
                    </div>

                    {/* Create Admin Form */}
                    {showCreateAdmin && (
                        <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                            <h4 className="text-md font-medium text-gray-900 mb-4">Create New Admin</h4>
                            <form onSubmit={handleCreateAdmin} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Username</label>
                                        <input
                                            type="text"
                                            value={newAdmin.username}
                                            onChange={(e) => setNewAdmin({...newAdmin, username: e.target.value})}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Email</label>
                                        <input
                                            type="email"
                                            value={newAdmin.email}
                                            onChange={(e) => setNewAdmin({...newAdmin, email: e.target.value})}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Full Name</label>
                                        <input
                                            type="text"
                                            value={newAdmin.fullName}
                                            onChange={(e) => setNewAdmin({...newAdmin, fullName: e.target.value})}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Password</label>
                                        <input
                                            type="password"
                                            value={newAdmin.password}
                                            onChange={(e) => setNewAdmin({...newAdmin, password: e.target.value})}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Role</label>
                                        <select
                                            value={newAdmin.role}
                                            onChange={(e) => setNewAdmin({...newAdmin, role: e.target.value})}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        >
                                            <option value="admin">Admin</option>
                                            <option value="teacher">Teacher</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateAdmin(false)}
                                        className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                        {loading ? 'Creating...' : 'Create Admin'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Admins List */}
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Username
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Email
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Role
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {admins.map((admin) => (
                                    <tr key={admin._id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {admin.fullName}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {admin.username}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {admin.email}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                admin.role === 'super_admin' ? 'bg-red-100 text-red-800' :
                                                admin.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                                                admin.role === 'teacher' ? 'bg-green-100 text-green-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}>
                                                {admin.role.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                admin.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                                {admin.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            {!admin.is_default_admin && (
                                                <button
                                                    onClick={() => handleDeleteAdmin(admin._id)}
                                                    className="text-red-600 hover:text-red-900"
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfileManagement;
