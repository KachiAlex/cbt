import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Login from './components/Login';
import AdminLogin from './components/AdminLogin';
import AdminPanel from './components/AdminPanel';
import StudentPanel from './components/StudentPanel';
import dataService from './services/dataService';

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("login");
  const [showAdminLink, setShowAdminLink] = useState(false);

  // Initialize app and ensure admin user exists
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 Initializing CBT application...');
        
        // Load users to ensure admin exists
        const users = await dataService.loadUsers();
        const adminExists = users.some(u => u.username === 'admin' && u.role === 'admin');
        
        if (!adminExists) {
          console.log('🔧 Creating default admin user...');
          const adminUser = {
            id: 'admin-' + Date.now(),
            username: 'admin',
            password: 'admin123',
            role: 'admin',
            fullName: 'System Administrator',
            email: 'admin@healthschool.com',
            registeredAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isDefaultAdmin: true,
            canDeleteDefaultAdmin: false
          };
          
          users.push(adminUser);
          await dataService.saveUsers(users);
          console.log('✅ Default admin user created successfully!');
        } else {
          console.log('✅ Admin user already exists');
        }
        
        // Check for existing login
        const savedUser = localStorage.getItem("cbt_logged_in_user");
        if (savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser);
            setUser(parsedUser);
            setView("home");
          } catch (error) {
            console.error('Error parsing saved user:', error);
            localStorage.removeItem("cbt_logged_in_user");
          }
        }
      } catch (error) {
        console.error('Error initializing app:', error);
      }
    };

    initializeApp();
  }, []);

  const onLogout = () => {
    setUser(null);
    localStorage.removeItem("cbt_logged_in_user");
    setView("login");
  };

  // Hidden admin access - click on the logo
  const handleLogoClick = () => {
    if (!user) {
      setShowAdminLink(false);
      setView("admin-login");
    }
  };

  // Keyboard shortcut for admin access (Ctrl + Alt + A)
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!user && e.ctrlKey && e.altKey && e.key === 'A') {
        e.preventDefault();
        setShowAdminLink(true);
        setTimeout(() => setShowAdminLink(false), 5000);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <Header user={user} onLogout={onLogout} onLogoClick={handleLogoClick} />
      <main className="max-w-5xl mx-auto w-full px-3 sm:px-8 py-4 sm:py-8">
        {user ? (
          user.role === "admin" ? (
            <AdminPanel user={user} />
          ) : (
            <StudentPanel user={user} />
          )
        ) : (
          <>
            {view !== "admin-login" && (
              <Login onLogin={(u)=>{setUser(u); localStorage.setItem("cbt_logged_in_user", JSON.stringify(u)); setView("home");}} />
            )}
            {showAdminLink && (
              <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-center">
                  <p className="text-red-700 font-semibold mb-2">🔐 Admin Access</p>
                  <button 
                    onClick={() => setView("admin-login")}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Access Admin Panel
                  </button>
                </div>
              </div>
            )}
            {view === "admin-login" && (
              <AdminLogin 
                onLogin={(u)=>{setUser(u); localStorage.setItem("cbt_logged_in_user", JSON.stringify(u)); setView("home");}}
                onBack={() => setView("login")}
              />
            )}
          </>
        )}
      </main>
      <footer className="text-center text-xs text-gray-500 py-6">
        © {new Date().getFullYear()} College of Nursing, Eku, Delta State
        {!user && (
          <div className="mt-1 text-gray-400">
            <span className="opacity-30 hover:opacity-100 transition-opacity cursor-help" title="Admin Access: Click logo or press Ctrl+Alt+A">
              🔐
            </span>
          </div>
        )}
      </footer>
    </div>
  );
}

export default App;