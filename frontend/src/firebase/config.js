import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Firebase configuration for cbt-multitenant-admin project
const firebaseConfig = {
  apiKey: "AIzaSyB5oUy7N8G633FCjmu34FrLBZvjsm1tdVc",
  authDomain: "cbt-91a97.firebaseapp.com",
  projectId: "cbt-91a97",
  storageBucket: "cbt-91a97.firebasestorage.app",
  messagingSenderId: "273021677586",
  appId: "1:273021677586:web:f1170c3a9a9f25493028cb",
  measurementId: "G-PMMHZEBZ92"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with standard configuration
export const db = getFirestore(app);

// Initialize Firebase Auth (same for all databases)
export const auth = getAuth(app);

export default app;