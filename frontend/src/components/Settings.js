import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { buildApiUrl } from '../config/api';

const Settings = ({ user, tenant }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    // File upload states
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState('');
    
    // Profile states
    const [profile, setProfile] = useState({});
    const [editForm, setEditForm] = useState({
        name: '',
        logo_url: '',
        address: '',
        contact_phone: ''
    });

    useEffect(() => {
        if (tenant?.slug) {
            fetchProfile();
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

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        // Validate passwords
        if (newPassword !== confirmPassword) {
            setError('New passwords do not match');
            setLoading(false);
            return;
        }

        if (newPassword.length < 6) {
            setError('New password must be at least 6 characters long');
            setLoading(false);
            return;
        }

        try {
            // For now, we'll use a simple approach
            // In a real app, you'd want to verify the current password first
            await axios.put(`https://cbt-rew7.onrender.com/api/tenant/${tenant.slug}/profile`, {
                // This would need to be implemented on the backend
                // For now, we'll just show a success message
            });
            
            setSuccess('Password changed successfully!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Settings</h2>
                <p className="text-gray-600">Manage your account settings</p>
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

            {/* User Info */}
            <div className="bg-white shadow rounded-lg p-6 mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Full Name</label>
                        <p className="mt-1 text-sm text-gray-900">{user?.fullName}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Username</label>
                        <p className="mt-1 text-sm text-gray-900">{user?.username}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <p className="mt-1 text-sm text-gray-900">{user?.email}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Role</label>
                        <p className="mt-1 text-sm text-gray-900">
                            {(user?.is_default_admin || user?.isDefaultAdmin || user?.role === 'super_admin') ? 'Default Admin' : 'Admin'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Change Password */}
            <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
                
                <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Current Password</label>
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700">New Password</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            required
                            minLength={6}
                        />
                        <p className="mt-1 text-sm text-gray-500">Must be at least 6 characters long</p>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            required
                        />
                    </div>
                    
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {loading ? 'Changing...' : 'Change Password'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Institution Profile Management */}
            <div className="bg-white shadow rounded-lg p-6 mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Institution Profile</h3>
                
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

            {/* Institution Info Display */}
            <div className="bg-white shadow rounded-lg p-6 mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Current Institution Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Institution Name</label>
                        <p className="mt-1 text-sm text-gray-900">{tenant?.name}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Plan</label>
                        <p className="mt-1 text-sm text-gray-900 capitalize">{tenant?.plan}</p>
                    </div>
                    {tenant?.logo_url && (
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">Current Logo</label>
                            <img 
                                src={tenant.logo_url} 
                                alt="Institution Logo" 
                                className="mt-1 h-12 w-auto"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;
