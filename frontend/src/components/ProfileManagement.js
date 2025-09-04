import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ProfileManagement = ({ user, tenant }) => {
    const [profile, setProfile] = useState({});
    const [admins, setAdmins] = useState([]);
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
    
    const [newAdminForm, setNewAdminForm] = useState({
        username: '',
        email: '',
        fullName: '',
        phone: '',
        password: ''
    });

    useEffect(() => {
        if (tenant?.slug) {
            fetchProfile();
            fetchAdmins();
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

    const fetchAdmins = async () => {
        try {
            const response = await axios.get(`https://cbt-rew7.onrender.com/api/tenant/${tenant.slug}/admins`);
            setAdmins(response.data);
        } catch (error) {
            console.error('Error fetching admins:', error);
        }
    };

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

    const handleCreateAdmin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            await axios.post(`https://cbt-rew7.onrender.com/api/tenant/${tenant.slug}/admins`, {
                ...newAdminForm,
                requesting_user_id: user._id
            });
            setSuccess('Admin created successfully!');
            setNewAdminForm({
                username: '',
                email: '',
                fullName: '',
                phone: '',
                password: ''
            });
            fetchAdmins();
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to create admin');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveAdmin = async (adminId) => {
        if (!window.confirm('Are you sure you want to remove this admin?')) return;

        try {
            await axios.delete(`https://cbt-rew7.onrender.com/api/tenant/${tenant.slug}/admins/${adminId}`, {
                data: { requesting_user_id: user._id }
            });
            setSuccess('Admin removed successfully!');
            fetchAdmins();
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to remove admin');
        }
    };

    if (!user?.is_default_admin) {
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

            {/* Admins Tab */}
            {activeTab === 'admins' && (
                <div className="space-y-6">
                    {/* Create New Admin */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Admin</h3>
                        
                        <form onSubmit={handleCreateAdmin} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Username</label>
                                    <input
                                        type="text"
                                        value={newAdminForm.username}
                                        onChange={(e) => setNewAdminForm({...newAdminForm, username: e.target.value})}
                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Email</label>
                                    <input
                                        type="email"
                                        value={newAdminForm.email}
                                        onChange={(e) => setNewAdminForm({...newAdminForm, email: e.target.value})}
                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                                    <input
                                        type="text"
                                        value={newAdminForm.fullName}
                                        onChange={(e) => setNewAdminForm({...newAdminForm, fullName: e.target.value})}
                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                                    <input
                                        type="tel"
                                        value={newAdminForm.phone}
                                        onChange={(e) => setNewAdminForm({...newAdminForm, phone: e.target.value})}
                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    />
                                </div>
                                
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700">Password</label>
                                    <input
                                        type="password"
                                        value={newAdminForm.password}
                                        onChange={(e) => setNewAdminForm({...newAdminForm, password: e.target.value})}
                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        required
                                    />
                                </div>
                            </div>
                            
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                                >
                                    {loading ? 'Creating...' : 'Create Admin'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Admin List */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Current Admins</h3>
                        
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
                                                    admin.is_default_admin 
                                                        ? 'bg-purple-100 text-purple-800' 
                                                        : 'bg-green-100 text-green-800'
                                                }`}>
                                                    {admin.is_default_admin ? 'Default Admin' : 'Admin'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {!admin.is_default_admin && (
                                                    <button
                                                        onClick={() => handleRemoveAdmin(admin._id)}
                                                        className="text-red-600 hover:text-red-900"
                                                    >
                                                        Remove
                                                    </button>
                                                )}
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

export default ProfileManagement;
