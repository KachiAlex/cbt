import React, { useState, useEffect } from 'react';
import dataService from '../services/dataService';

const SystemDiagnostics = () => {
  const [diagnostics, setDiagnostics] = useState({
    apiConnection: null,
    databaseStatus: null,
    localStorageData: null,
    environmentInfo: null,
    errors: []
  });
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostics = async () => {
    setIsRunning(true);
    const results = {
      apiConnection: null,
      databaseStatus: null,
      localStorageData: null,
      environmentInfo: null,
      errors: []
    };

    try {
      // Test API Connection
      console.log('🔍 Testing API connection...');
      try {
        const apiResult = await dataService.checkApiConnection();
        results.apiConnection = {
          status: 'success',
          data: apiResult
        };
      } catch (error) {
        results.apiConnection = {
          status: 'error',
          error: error.message
        };
        results.errors.push(`API Connection: ${error.message}`);
      }

      // Test Database Status
      console.log('🔍 Testing database status...');
      try {
        const response = await fetch('https://cbt-rew7.onrender.com/api/debug/db-status');
        if (response.ok) {
          const dbData = await response.json();
          results.databaseStatus = {
            status: 'success',
            data: dbData
          };
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        results.databaseStatus = {
          status: 'error',
          error: error.message
        };
        results.errors.push(`Database Status: ${error.message}`);
      }

      // Check LocalStorage Data
      console.log('🔍 Checking localStorage data...');
      try {
        const lsData = {
          users: JSON.parse(localStorage.getItem('cbt_users_v1') || '[]'),
          exams: JSON.parse(localStorage.getItem('cbt_exams_v1') || '[]'),
          questions: JSON.parse(localStorage.getItem('cbt_questions_v1') || '[]'),
          results: JSON.parse(localStorage.getItem('cbt_results_v1') || '[]'),
          studentRegistrations: JSON.parse(localStorage.getItem('cbt_student_registrations_v1') || '[]')
        };
        
        results.localStorageData = {
          status: 'success',
          data: {
            userCount: lsData.users.length,
            examCount: lsData.exams.length,
            questionCount: lsData.questions.length,
            resultCount: lsData.results.length,
            registrationCount: lsData.studentRegistrations.length,
            hasAdmin: lsData.users.some(u => u.role === 'admin'),
            hasStudents: lsData.users.some(u => u.role === 'student')
          }
        };
      } catch (error) {
        results.localStorageData = {
          status: 'error',
          error: error.message
        };
        results.errors.push(`LocalStorage: ${error.message}`);
      }

      // Environment Information
      results.environmentInfo = {
        status: 'success',
        data: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          cookieEnabled: navigator.cookieEnabled,
          onLine: navigator.onLine,
          localStorageAvailable: typeof Storage !== 'undefined',
          apiBaseUrl: process.env.REACT_APP_API_URL || 'https://cbt-rew7.onrender.com',
          useApi: process.env.REACT_APP_USE_API === 'true',
          nodeEnv: process.env.NODE_ENV,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      results.errors.push(`General Error: ${error.message}`);
    }

    setDiagnostics(results);
    setIsRunning(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      default: return '⏳';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg border">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800">🔧 System Diagnostics</h2>
            <button
              onClick={runDiagnostics}
              disabled={isRunning}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isRunning ? 'Running...' : 'Run Diagnostics'}
            </button>
          </div>
          <p className="text-gray-600 mt-2">
            Comprehensive system health check and troubleshooting information
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* API Connection */}
          <div className={`p-4 rounded-lg border ${getStatusColor(diagnostics.apiConnection?.status)}`}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{getStatusIcon(diagnostics.apiConnection?.status)}</span>
              <h3 className="font-semibold">API Connection</h3>
            </div>
            {diagnostics.apiConnection?.status === 'success' ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="font-medium">{diagnostics.apiConnection.data.status}</span>
                </div>
                <div className="flex justify-between">
                  <span>API Available:</span>
                  <span>{diagnostics.apiConnection.data.apiAvailable ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Database Connected:</span>
                  <span>{diagnostics.apiConnection.data.databaseConnected ? 'Yes' : 'No'}</span>
                </div>
                {diagnostics.apiConnection.data.healthData && (
                  <div className="mt-2 p-2 bg-white rounded border">
                    <strong>Health Data:</strong>
                    <pre className="text-xs mt-1 overflow-auto">
                      {JSON.stringify(diagnostics.apiConnection.data.healthData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm">
                <p><strong>Error:</strong> {diagnostics.apiConnection?.error}</p>
              </div>
            )}
          </div>

          {/* Database Status */}
          <div className={`p-4 rounded-lg border ${getStatusColor(diagnostics.databaseStatus?.status)}`}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{getStatusIcon(diagnostics.databaseStatus?.status)}</span>
              <h3 className="font-semibold">Database Status</h3>
            </div>
            {diagnostics.databaseStatus?.status === 'success' ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Connection:</span>
                  <span className="font-medium">{diagnostics.databaseStatus.data.connection}</span>
                </div>
                <div className="flex justify-between">
                  <span>State:</span>
                  <span>{diagnostics.databaseStatus.data.state}</span>
                </div>
                <div className="flex justify-between">
                  <span>Host:</span>
                  <span>{diagnostics.databaseStatus.data.host}</span>
                </div>
                <div className="flex justify-between">
                  <span>Database:</span>
                  <span>{diagnostics.databaseStatus.data.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Users:</span>
                  <span>{diagnostics.databaseStatus.data.userCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tenants:</span>
                  <span>{diagnostics.databaseStatus.data.tenantCount}</span>
                </div>
                {diagnostics.databaseStatus.data.troubleshooting && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <h4 className="font-medium text-yellow-900 mb-2">Troubleshooting Info:</h4>
                    <ul className="text-sm text-yellow-800 space-y-1">
                      {diagnostics.databaseStatus.data.troubleshooting.common_issues?.map((issue, index) => (
                        <li key={index}>• {issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm">
                <p><strong>Error:</strong> {diagnostics.databaseStatus?.error}</p>
              </div>
            )}
          </div>

          {/* LocalStorage Data */}
          <div className={`p-4 rounded-lg border ${getStatusColor(diagnostics.localStorageData?.status)}`}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{getStatusIcon(diagnostics.localStorageData?.status)}</span>
              <h3 className="font-semibold">Local Storage Data</h3>
            </div>
            {diagnostics.localStorageData?.status === 'success' ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center p-2 bg-white rounded border">
                  <div className="font-bold text-lg">{diagnostics.localStorageData.data.userCount}</div>
                  <div className="text-gray-600">Users</div>
                </div>
                <div className="text-center p-2 bg-white rounded border">
                  <div className="font-bold text-lg">{diagnostics.localStorageData.data.examCount}</div>
                  <div className="text-gray-600">Exams</div>
                </div>
                <div className="text-center p-2 bg-white rounded border">
                  <div className="font-bold text-lg">{diagnostics.localStorageData.data.questionCount}</div>
                  <div className="text-gray-600">Questions</div>
                </div>
                <div className="text-center p-2 bg-white rounded border">
                  <div className="font-bold text-lg">{diagnostics.localStorageData.data.resultCount}</div>
                  <div className="text-gray-600">Results</div>
                </div>
              </div>
            ) : (
              <div className="text-sm">
                <p><strong>Error:</strong> {diagnostics.localStorageData?.error}</p>
              </div>
            )}
          </div>

          {/* Environment Information */}
          <div className={`p-4 rounded-lg border ${getStatusColor(diagnostics.environmentInfo?.status)}`}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{getStatusIcon(diagnostics.environmentInfo?.status)}</span>
              <h3 className="font-semibold">Environment Information</h3>
            </div>
            {diagnostics.environmentInfo?.status === 'success' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Browser:</span>
                    <span className="font-mono text-xs">{diagnostics.environmentInfo.data.userAgent.split(' ')[0]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Platform:</span>
                    <span>{diagnostics.environmentInfo.data.platform}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Language:</span>
                    <span>{diagnostics.environmentInfo.data.language}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Online:</span>
                    <span>{diagnostics.environmentInfo.data.onLine ? 'Yes' : 'No'}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>API URL:</span>
                    <span className="font-mono text-xs">{diagnostics.environmentInfo.data.apiBaseUrl}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Use API:</span>
                    <span>{diagnostics.environmentInfo.data.useApi ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Environment:</span>
                    <span>{diagnostics.environmentInfo.data.nodeEnv}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>LocalStorage:</span>
                    <span>{diagnostics.environmentInfo.data.localStorageAvailable ? 'Available' : 'Not Available'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Errors Summary */}
          {diagnostics.errors.length > 0 && (
            <div className="p-4 rounded-lg border border-red-200 bg-red-50">
              <h3 className="font-semibold text-red-800 mb-3">🚨 Issues Found</h3>
              <ul className="space-y-1 text-sm text-red-700">
                {diagnostics.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Quick Actions */}
          <div className="p-4 rounded-lg border border-blue-200 bg-blue-50">
            <h3 className="font-semibold text-blue-800 mb-3">🔧 Quick Actions</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => window.open('https://cbt-rew7.onrender.com/health', '_blank')}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Check Backend Health
              </button>
              <button
                onClick={() => window.open('https://cbt-rew7.onrender.com/api/debug/db-status', '_blank')}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Check Database Status
              </button>
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Clear LocalStorage
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemDiagnostics;
