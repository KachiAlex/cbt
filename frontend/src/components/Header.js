import React from 'react';

const Header = ({ user, onLogout, onLogoClick, institutionData }) => {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-5xl mx-auto px-3 sm:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div 
              className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={onLogoClick}
            >
              {institutionData && institutionData.logo_url ? (
                <img 
                  src={institutionData.logo_url} 
                  alt={`${institutionData.name} Logo`}
                  className="w-10 h-10 rounded-lg object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">C</span>
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold text-gray-800">
                  {institutionData ? institutionData.name : 'College of Nursing'}
                </h1>
                <p className="text-sm text-gray-600">
                  {institutionData ? 'Computer-Based Test System' : 'Eku, Delta State'}
                </p>
              </div>
            </div>
          </div>

          {user && (
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-800">
                  Welcome, {user.fullName || user.username}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {user.role}
                </p>
              </div>
              <button
                onClick={onLogout}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
