import React, { useState, useEffect } from 'react';
import axios from 'axios';

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
    
    // Single-admin flow: remove multi-admin creation UI

    useEffect(() => {
        if (tenant?.slug) {
            fetchProfile();
        }
    }, [tenant]);

    const fetchProfile = async () => {
        try {
            const response = await axios.get(`https://cbt-rew7.onrender.com/api/tenant/${tenant.slug}/profile`);
            setProfile(response.data);
            setEditForm({
                name: response.data.name || '',
                logo_url: response.data.logo_url || '',
                address: response.data.address || '',
                contact_phone: response.data.contact_phone || ''
            });
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
    };

    // Single-admin flow: no admins list

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            await axios.put(`https://cbt-rew7.onrender.com/api/tenant/${tenant.slug}/profile`, editForm);
            setSuccess('Profile updated successfully!');
            fetchProfile();
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    // Single-admin flow: no admin creation

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
                    {/* Single-admin flow: Admin Management disabled */}
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
                            <label className="block text-sm font-medium text-gray-700">Logo URL</label>
                            <input
                                type="url"
                                value={editForm.logo_url}
                                onChange={(e) => setEditForm({...editForm, logo_url: e.target.value})}
                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="https://example.com/logo.png"
                            />
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

            {/* Single-admin flow: Admins Tab disabled */}
        </div>
    );
};

export default ProfileManagement;
