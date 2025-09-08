import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Firebase configuration for cbt-multitenant-admin project
// You'll need to replace these with your actual Firebase project config
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "cbt-multitenant-admin.firebaseapp.com",
  projectId: "cbt-multitenant-admin",
  storageBucket: "cbt-multitenant-admin.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;
