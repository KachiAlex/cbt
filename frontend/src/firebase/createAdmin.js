import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from './config';

// Function to create the first admin user
export const createFirstAdmin = async (email, password) => {
  try {
    console.log('Creating first admin user...');
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    console.log('✅ Admin user created successfully:', user.email);
    console.log('UID:', user.uid);
    
    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
      }
    };
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// You can call this function from browser console to create your first admin
window.createFirstAdmin = createFirstAdmin;
