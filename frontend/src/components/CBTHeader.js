import React from 'react';

const CBTHeader = ({ user, institution, onLogout, onSwitchToAdmin, onSwitchToStudent }) => {
  return (
    <div className="bg-white border-b shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">CBT</span>
          </div>
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
              
              {/* Role Switch Buttons */}
              {user.role === "admin" && (
                <button
                  onClick={onSwitchToStudent}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm"
                >
                  👨‍🎓 Student View
                </button>
              )}
              
              {user.role === "student" && (
                <button
                  onClick={onSwitchToAdmin}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  🔐 Admin View
                </button>
              )}
              
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
