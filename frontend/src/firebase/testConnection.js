import { auth } from './config';

// Simple Firebase connection test
export const testFirebaseConnection = async () => {
  try {
    console.log('🔥 Testing Firebase connection...');
    
    // Test Auth connection only
    console.log('✅ Firebase Auth initialized:', auth.app.name);
    
    return { success: true, message: 'Firebase initialized successfully!' };
  } catch (error) {
    console.error('❌ Firebase connection failed:', error);
    return { success: false, error: error.message };
  }
};

// Test function you can call from browser console
window.testFirebase = testFirebaseConnection;
