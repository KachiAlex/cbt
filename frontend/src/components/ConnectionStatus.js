import React, { useState, useEffect } from 'react';
import dataService from '../services/dataService';

const ConnectionStatus = ({ showDetails = false, className = "" }) => {
  const [status, setStatus] = useState({
    apiAvailable: false,
    databaseConnected: false,
    lastChecked: null,
    error: null
  });
  const [isChecking, setIsChecking] = useState(false);

  const checkConnection = async () => {
    setIsChecking(true);
    try {
      const connectionResult = await dataService.checkApiConnection();
      setStatus(dataService.getConnectionStatus());
    } catch (error) {
      console.error('Connection check failed:', error);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkConnection();
    // Check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    if (status.databaseConnected) return 'text-green-600 bg-green-50 border-green-200';
    if (status.apiAvailable) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getStatusIcon = () => {
    if (status.databaseConnected) return '✅';
    if (status.apiAvailable) return '⚠️';
    return '❌';
  };

  const getStatusText = () => {
    if (status.databaseConnected) return 'All Systems Online';
    if (status.apiAvailable) return 'API Online (Database Offline)';
    return 'System Offline';
  };

  const getStatusDescription = () => {
    if (status.databaseConnected) {
      return 'Your data is being saved to the cloud database.';
    }
    if (status.apiAvailable) {
      return 'API is running but database is not connected. Data will be saved locally.';
    }
    return 'System is offline. Data will be saved locally only.';
  };

  if (!showDetails) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm border ${getStatusColor()} ${className}`}>
        <span>{getStatusIcon()}</span>
        <span>{getStatusText()}</span>
        {isChecking && <span className="animate-spin">⟳</span>}
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-lg border ${getStatusColor()} ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{getStatusIcon()}</span>
          <h3 className="font-semibold">{getStatusText()}</h3>
        </div>
        <button
          onClick={checkConnection}
          disabled={isChecking}
          className="px-3 py-1 text-xs bg-white rounded border hover:bg-gray-50 disabled:opacity-50"
        >
          {isChecking ? 'Checking...' : 'Refresh'}
        </button>
      </div>
      
      <p className="text-sm mb-3">{getStatusDescription()}</p>
      
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span>API Server:</span>
          <span className={status.apiAvailable ? 'text-green-600' : 'text-red-600'}>
            {status.apiAvailable ? 'Online' : 'Offline'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Database:</span>
          <span className={status.databaseConnected ? 'text-green-600' : 'text-red-600'}>
            {status.databaseConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        {status.lastChecked && (
          <div className="flex justify-between">
            <span>Last Checked:</span>
            <span className="text-gray-600">
              {new Date(status.lastChecked).toLocaleTimeString()}
            </span>
          </div>
        )}
        {status.error && (
          <div className="mt-2 p-2 bg-red-100 rounded text-red-700">
            <strong>Error:</strong> {status.error}
          </div>
        )}
      </div>
      
      {!status.databaseConnected && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
          <h4 className="font-medium text-blue-900 mb-2">Database Connection Issue</h4>
          <p className="text-sm text-blue-800 mb-2">
            The database is not connected. This is likely due to MongoDB Atlas IP whitelist settings.
          </p>
          <div className="text-xs text-blue-700">
            <p><strong>Quick Fix:</strong></p>
            <ol className="list-decimal list-inside space-y-1 mt-1">
              <li>Go to MongoDB Atlas Dashboard</li>
              <li>Click "Network Access"</li>
              <li>Add IP Address: 0.0.0.0/0</li>
              <li>Wait 2 minutes for changes to apply</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;
