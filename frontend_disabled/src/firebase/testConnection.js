import { db, auth } from './config';
import { collection, getDocs } from 'firebase/firestore';

// Test Firebase connection (only for authenticated users)
export const testFirebaseConnection = async () => {
  try {
    console.log('🔥 Testing Firebase connection...');
    
    // Check if user is authenticated
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.log('⚠️ Firebase connection test skipped - user not authenticated');
      return { success: true, message: 'Firebase initialized (authentication required for data access)' };
    }
    
    // Test Firestore connection with authenticated user
    const testCollection = collection(db, 'institutions');
    const snapshot = await getDocs(testCollection);
    console.log('✅ Firestore connection successful');
    
    // Test Auth connection
    console.log('✅ Firebase Auth initialized:', auth.app.name);
    
    return { success: true, message: 'Firebase connected successfully!' };
  } catch (error) {
    console.error('❌ Firebase connection failed:', error);
    return { success: false, error: error.message };
  }
};

// Test function you can call from browser console
window.testFirebase = testFirebaseConnection;
