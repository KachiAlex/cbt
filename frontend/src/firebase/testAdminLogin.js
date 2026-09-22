import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './config';

// Test admin login function
export const testAdminLogin = async (email, password) => {
  try {
    console.log('🔐 Testing admin login with:', email);
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    console.log('✅ Login successful!');
    console.log('User UID:', user.uid);
    console.log('User Email:', user.email);
    console.log('User Display Name:', user.displayName);
    console.log('Email Verified:', user.emailVerified);
    console.log('Created At:', user.metadata.creationTime);
    console.log('Last Sign In:', user.metadata.lastSignInTime);
    
    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        emailVerified: user.emailVerified,
        creationTime: user.metadata.creationTime,
        lastSignInTime: user.metadata.lastSignInTime
      }
    };
  } catch (error) {
    console.error('❌ Login failed:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message
      }
    };
  }
};

// Make it available in browser console
window.testAdminLogin = testAdminLogin;

// Auto test on load (only in development)
if (process.env.NODE_ENV === 'development') {
  setTimeout(() => {
    console.log('🔍 Admin login test functions available:');
    console.log('- window.testAdminLogin("email", "password")');
    console.log('- window.createFirstAdmin("email", "password")');
  }, 2000);
}
