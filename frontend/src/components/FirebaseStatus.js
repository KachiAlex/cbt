import React, { useState, useEffect } from 'react';
import { testFirebaseConnection } from '../firebase/testConnection';

const FirebaseStatus = () => {
  const [status, setStatus] = useState('checking');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const checkConnection = async () => {
      setStatus('checking');
      const result = await testFirebaseConnection();
      
      if (result.success) {
        setStatus('connected');
        setMessage('Firebase connected successfully!');
      } else {
        setStatus('error');
        setMessage(`Connection failed: ${result.error}`);
      }
    };

    checkConnection();
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'text-green-600 bg-green-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-yellow-600 bg-yellow-100';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'connected': return '✅';
      case 'error': return '❌';
      default: return '⏳';
    }
  };

  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
      <span className="mr-2">{getStatusIcon()}</span>
      <span>Firebase: {message || 'Checking connection...'}</span>
    </div>
  );
};

export default FirebaseStatus;
