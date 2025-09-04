import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const InstitutionLogin = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [tenant, setTenant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAdminForm, setShowAdminForm] = useState(false);
    const [showStudentForm, setShowStudentForm] = useState(false);
    const [loginError, setLoginError] = useState('');

    // Form states
    const [adminCredentials, setAdminCredentials] = useState({ username: '', password: '' });
    const [studentCredentials, setStudentCredentials] = useState({ studentId: '', password: '' });

    useEffect(() => {
        fetchTenantData();
    }, [slug]);

    const fetchTenantData = async () => {
        try {
            setLoading(true);
            const response = await fetch(`https://cbt-rew7.onrender.com/api/tenant/${slug}/profile`);
            
            if (!response.ok) {
                throw new Error('Institution not found or suspended');
            }
            
            const tenantData = await response.json();
            setTenant(tenantData);
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAdminLogin = async (e) => {
        e.preventDefault();
        setLoginError('');

        try {
            const response = await fetch('https://cbt-rew7.onrender.com/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: adminCredentials.username,
                    password: adminCredentials.password,
                    tenant_slug: slug,
                    user_type: 'admin'
                })
            });

            const data = await response.json();

            if (response.ok) {
                // Store user data
                localStorage.setItem('user', JSON.stringify(data));
                localStorage.setItem('tenant', JSON.stringify(data.tenant));
                localStorage.setItem('userType', 'admin');
                
                // Redirect to admin dashboard
                navigate('/admin-dashboard');
            } else {
                setLoginError(data.error || 'Login failed');
            }
        } catch (error) {
            setLoginError('Network error. Please try again.');
        }
    };

    const handleStudentLogin = async (e) => {
        e.preventDefault();
        setLoginError('');

        try {
            const response = await fetch('https://cbt-rew7.onrender.com/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: studentCredentials.studentId,
                    password: studentCredentials.password,
                    tenant_slug: slug,
                    user_type: 'student'
                })
            });

            const data = await response.json();

            if (response.ok) {
                // Store user data
                localStorage.setItem('user', JSON.stringify(data));
                localStorage.setItem('tenant', JSON.stringify(data.tenant));
                localStorage.setItem('userType', 'student');
                
                // Redirect to student dashboard
                navigate('/student-dashboard');
            } else {
                setLoginError(data.error || 'Login failed');
            }
        } catch (error) {
            setLoginError('Network error. Please try again.');
        }
    };

    const showAdminLogin = () => {
        setShowAdminForm(true);
        setShowStudentForm(false);
        setLoginError('');
    };

    const showStudentLogin = () => {
        setShowStudentForm(true);
        setShowAdminForm(false);
        setLoginError('');
    };

    const hideForms = () => {
        setShowAdminForm(false);
        setShowStudentForm(false);
        setLoginError('');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700">
                <div className="text-center text-white">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p>Loading institution...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700">
                <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-gray-900 mb-4">Institution Not Found</h1>
                        <p className="text-gray-600 mb-6">{error}</p>
                        <button 
                            onClick={() => navigate('/')}
                            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
                        >
                            Go Home
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    {tenant?.logo_url && (
                        <img 
                            className="mx-auto h-20 w-auto mb-4" 
                            src={tenant.logo_url} 
                            alt={`${tenant.name} Logo`}
                        />
                    )}
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
                        {tenant?.name || 'Institution'}
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-200">
                        Computer-Based Test System
                    </p>
                </div>
                
                <div className="bg-white rounded-lg shadow-xl p-8">
                    <div className="mb-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Sign in to your account</h3>
                        
                        <div className="space-y-4">
                            <button 
                                onClick={showAdminLogin}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                Admin Login
                            </button>
                            
                            <button 
                                onClick={showStudentLogin}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                            >
                                Student Login
                            </button>
                        </div>
                    </div>
                    
                    {/* Admin Login Form */}
                    {showAdminForm && (
                        <form onSubmit={handleAdminLogin} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Username</label>
                                <input 
                                    type="text" 
                                    required 
                                    value={adminCredentials.username}
                                    onChange={(e) => setAdminCredentials({...adminCredentials, username: e.target.value})}
                                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Password</label>
                                <input 
                                    type="password" 
                                    required 
                                    value={adminCredentials.password}
                                    onChange={(e) => setAdminCredentials({...adminCredentials, password: e.target.value})}
                                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                            </div>
                            <div className="flex space-x-3">
                                <button 
                                    type="submit" 
                                    className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                                >
                                    Login
                                </button>
                                <button 
                                    type="button" 
                                    onClick={hideForms}
                                    className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    )}
                    
                    {/* Student Login Form */}
                    {showStudentForm && (
                        <form onSubmit={handleStudentLogin} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Student ID</label>
                                <input 
                                    type="text" 
                                    required 
                                    value={studentCredentials.studentId}
                                    onChange={(e) => setStudentCredentials({...studentCredentials, studentId: e.target.value})}
                                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Password</label>
                                <input 
                                    type="password" 
                                    required 
                                    value={studentCredentials.password}
                                    onChange={(e) => setStudentCredentials({...studentCredentials, password: e.target.value})}
                                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                            </div>
                            <div className="flex space-x-3">
                                <button 
                                    type="submit" 
                                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                                >
                                    Login
                                </button>
                                <button 
                                    type="button" 
                                    onClick={hideForms}
                                    className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    )}
                    
                    {loginError && (
                        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                            {loginError}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InstitutionLogin;
