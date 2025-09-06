import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

  const [refreshInterval, setRefreshInterval] = useState(60000); // 60 seconds default to reduce API calls

  const loadData = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));
      
      // Check if API is enabled before making calls
      const apiConfig = dataService.getApiConfig();
      if (!apiConfig.USE_API) {
        // If API is disabled, just load from localStorage once
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
        return; // Don't set up intervals for localStorage mode
      }
      
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
  }, []);

  const refreshData = () => {
    loadData();
  };

  const updateRefreshInterval = (interval) => {
    setRefreshInterval(interval);
  };

  useEffect(() => {
    // Initial load
    loadData();

    // Only set up interval for automatic refresh if API is enabled
    const apiConfig = dataService.getApiConfig();
    if (apiConfig.USE_API) {
      const interval = setInterval(loadData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, loadData]);

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
  }, [loadData]);

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
