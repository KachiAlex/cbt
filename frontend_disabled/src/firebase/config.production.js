import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Production Firebase configuration for cbtpromax-prod project
// TODO: Replace with your actual production Firebase config after creating the project
const firebaseConfig = {
  apiKey: "YOUR_PRODUCTION_API_KEY",
  authDomain: "cbtpromax-prod.firebaseapp.com",
  projectId: "cbtpromax-prod",
  storageBucket: "cbtpromax-prod.firebasestorage.app",
  messagingSenderId: "YOUR_PRODUCTION_SENDER_ID",
  appId: "YOUR_PRODUCTION_APP_ID",
  measurementId: "YOUR_PRODUCTION_MEASUREMENT_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with production configuration
export const db = getFirestore(app);

// Initialize Firebase Auth
export const auth = getAuth(app);

export default app;
