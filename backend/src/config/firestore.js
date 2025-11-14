const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    // Option 1: Use service account key file (if available)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID || 'cbt-91a97'
      });
    } 
    // Option 2: Use environment variables
    else if (process.env.FIREBASE_PROJECT_ID) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID
      });
    }
    // Option 3: Use default credentials (for local development with gcloud)
    else {
      admin.initializeApp({
        projectId: 'cbt-91a97'
      });
    }
    
    console.log('✅ Firebase Admin SDK initialized');
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin SDK:', error);
    // Fallback: Initialize with minimal config
    try {
      admin.initializeApp({
        projectId: 'cbt-91a97'
      });
      console.log('✅ Firebase Admin SDK initialized with fallback config');
    } catch (fallbackError) {
      console.error('❌ Fallback initialization also failed:', fallbackError);
    }
  }
}

// Get Firestore instance
const db = admin.firestore();

// Collection names
const COLLECTIONS = {
  TENANTS: 'institutions',
  USERS: 'users',
  ADMINS: 'admins',
  EXAMS: 'exams',
  QUESTIONS: 'questions',
  RESULTS: 'results',
  AUDIT_LOGS: 'audit_logs'
};

// Helper functions
const firestoreHelpers = {
  // Convert Firestore timestamp to Date
  toDate: (timestamp) => {
    if (!timestamp) return null;
    if (timestamp.toDate) return timestamp.toDate();
    if (timestamp instanceof Date) return timestamp;
    if (typeof timestamp === 'string') return new Date(timestamp);
    return null;
  },

  // Convert Date to Firestore timestamp
  toTimestamp: (date) => {
    if (!date) return admin.firestore.FieldValue.serverTimestamp();
    if (date instanceof Date) return admin.firestore.Timestamp.fromDate(date);
    if (typeof date === 'string') return admin.firestore.Timestamp.fromDate(new Date(date));
    return admin.firestore.FieldValue.serverTimestamp();
  },

  // Convert Firestore document to plain object
  toObject: (doc) => {
    if (!doc) return null;
    const data = doc.data();
    if (!data) return null;
    
    return {
      _id: doc.id,
      id: doc.id,
      ...data,
      createdAt: firestoreHelpers.toDate(data.createdAt),
      updatedAt: firestoreHelpers.toDate(data.updatedAt),
      created_at: firestoreHelpers.toDate(data.created_at || data.createdAt),
      updated_at: firestoreHelpers.toDate(data.updated_at || data.updatedAt)
    };
  },

  // Convert multiple Firestore documents to array
  toArray: (snapshot) => {
    if (!snapshot || !snapshot.docs) return [];
    return snapshot.docs.map(doc => firestoreHelpers.toObject(doc));
  }
};

module.exports = {
  admin,
  db,
  COLLECTIONS,
  firestoreHelpers
};

