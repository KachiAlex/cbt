import React, { createContext, useContext, useState, useEffect } from 'react';
import dataService from '../services/dataService';

const RealTimeDataContext = createContext();

export const useRealTimeData = () => {
  const context = useContext(RealTimeDataContext);
  if (!context) {
    throw new Error('useRealTimeData must be used within a RealTimeDataProvider');
  }
  return context;
};

export const RealTimeDataProvider = ({ children }) => {
  const [data, setData] = useState({
    exams: [],
    questions: [],
    users: [],
    results: [],
    lastUpdated: null,
    loading: false,
    error: null
  });

  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds default

  const loadData = async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));
      
      const [exams, questions, users, results] = await Promise.all([
        dataService.loadExams(),
        dataService.loadQuestions(),
        dataService.loadUsers(),
        dataService.loadResults()
      ]);

      setData({
        exams: Array.isArray(exams) ? exams : [],
        questions: Array.isArray(questions) ? questions : [],
        users: Array.isArray(users) ? users : [],
        results: Array.isArray(results) ? results : [],
        lastUpdated: new Date().toISOString(),
        loading: false,
        error: null
      });

    } catch (error) {
      console.error('Error loading real-time data:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
    }
  };

  const refreshData = () => {
    loadData();
  };

  const updateRefreshInterval = (interval) => {
    setRefreshInterval(interval);
  };

  useEffect(() => {
    // Initial load
    loadData();

    // Set up interval for automatic refresh
    const interval = setInterval(loadData, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Listen for storage changes (for localStorage updates)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key && e.key.startsWith('cbt_')) {
        // Reload data when localStorage changes
        setTimeout(loadData, 100); // Small delay to ensure data is written
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const value = {
    ...data,
    refreshData,
    updateRefreshInterval,
    refreshInterval
  };

  return (
    <RealTimeDataContext.Provider value={value}>
      {children}
    </RealTimeDataContext.Provider>
  );
};

export default RealTimeDataProvider;
