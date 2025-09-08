import { db, auth } from './config';
import { collection, getDocs } from 'firebase/firestore';

// Test Firebase connection
export const testFirebaseConnection = async () => {
  try {
    console.log('🔥 Testing Firebase connection...');
    
    // Test Firestore connection
    const testCollection = collection(db, 'test');
    const snapshot = await getDocs(testCollection);
    console.log('✅ Firestore connection successful');
    
    // Test Auth connection
    console.log('✅ Firebase Auth initialized:', auth.app.name);
    
    return { success: true, message: 'Firebase connection successful' };
  } catch (error) {
    console.error('❌ Firebase connection failed:', error);
    return { success: false, error: error.message };
  }
};

// Test function you can call from browser console
window.testFirebase = testFirebaseConnection;
