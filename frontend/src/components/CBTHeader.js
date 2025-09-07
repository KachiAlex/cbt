import React from 'react';

const CBTHeader = ({ user, institution, onLogout, onLogoClick }) => {
  return (
    <div className="bg-white border-b shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          {institution?.logo ? (
            <div 
              className="h-12 w-12 rounded-lg overflow-hidden flex items-center justify-center bg-gray-100 cursor-pointer hover:scale-105 transition-all"
              onClick={onLogoClick}
              title={user ? "Click to logout and switch access" : "Click to access admin panel"}
            >
              <img 
                src={institution.logo} 
                alt={`${institution.name} logo`}
                className="h-full w-full object-contain"
                onError={(e) => {
                  // Fallback to default CBT logo if image fails to load
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center hidden">
                <span className="text-white font-bold text-xl">CBT</span>
              </div>
            </div>
          ) : (
            <div 
              className={`h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center transition-all relative ${
                onLogoClick 
                  ? 'cursor-pointer hover:scale-105 hover:bg-blue-700 shadow-lg hover:shadow-xl' 
                  : ''
              }`}
              onClick={onLogoClick}
              title={user ? "Click to logout and switch access" : "Click to access admin panel"}
            >
              <span className="text-white font-bold text-xl">CBT</span>
              {onLogoClick && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
              )}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-800">{institution?.name || 'Institution'}</h1>
            <p className="text-sm text-gray-600">Computer-Based Testing Portal</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {user && (
            <>
              <div className="text-sm text-gray-600">
                <span>Welcome, <b>{user.fullName || user.username}</b></span>
                <span className="mx-2">•</span>
                <span className="capitalize">{user.role}</span>
              </div>
              
              
              <button
                onClick={onLogout}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-black text-sm"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CBTHeader;
