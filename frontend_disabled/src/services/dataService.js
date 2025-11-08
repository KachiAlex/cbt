// Firestore-backed data service
import { db } from '../firebase/config';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';

class DataService {
  // Users
  async getUsers() {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
      console.error('Error getting users:', error);
      return [];
    }
  }

  async saveUsers(_users) {
    // Not used in Firestore approach; keep as no-op to preserve API
    return true;
  }

  async createUser(userData) {
    try {
      const docRef = await addDoc(collection(db, 'users'), {
        ...userData,
        createdAt: serverTimestamp(),
      });
      const docSnap = await getDoc(docRef);
      return { id: docRef.id, ...docSnap.data() };
    } catch (error) {
      console.error('Error creating user:', error);
      return null;
    }
  }

  // Exams
  async getExams() {
    try {
      const snapshot = await getDocs(collection(db, 'exams'));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
      console.error('Error getting exams:', error);
      return [];
    }
  }

  async saveExams(_exams) {
    // Not used in Firestore approach; keep as no-op
    return true;
  }

  async createExam(examData) {
    try {
      const docRef = await addDoc(collection(db, 'exams'), {
        isActive: true,
        createdAt: serverTimestamp(),
        ...examData,
      });
      const docSnap = await getDoc(docRef);
      return { id: docRef.id, ...docSnap.data() };
    } catch (error) {
      console.error('Error creating exam:', error);
      return null;
    }
  }

  async updateExam(examId, updates) {
    try {
      const ref = doc(db, 'exams', examId);
      await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
      const snap = await getDoc(ref);
      return { id: snap.id, ...snap.data() };
    } catch (error) {
      console.error('Error updating exam:', error);
      return null;
    }
  }

  async deleteExam(examId) {
    try {
      await deleteDoc(doc(db, 'exams', examId));
      return true;
    } catch (error) {
      console.error('Error deleting exam:', error);
      return false;
    }
  }

  // Questions
  async getQuestions(examId) {
    try {
      const q = query(collection(db, 'questions'), where('examId', '==', examId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
      console.error('Error getting questions:', error);
      return [];
    }
  }

  async saveQuestions(_questions) {
    // Not used; per-question writes handled in addQuestions
    return true;
  }

  async addQuestions(examId, questionsData) {
    try {
      const created = [];
      for (const qd of questionsData) {
        const docRef = await addDoc(collection(db, 'questions'), {
          examId,
          createdAt: serverTimestamp(),
          ...qd,
        });
        const snap = await getDoc(docRef);
        created.push({ id: docRef.id, ...snap.data() });
      }
      return created;
    } catch (error) {
      console.error('Error adding questions:', error);
      return [];
    }
  }

  // Results
  async getResults() {
    try {
      const snapshot = await getDocs(collection(db, 'results'));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
      console.error('Error getting results:', error);
      return [];
    }
  }

  async saveResults(_results) {
    // Not used in Firestore approach
    return true;
  }

  async saveExamResult(resultData) {
    try {
      const docRef = await addDoc(collection(db, 'results'), {
        ...resultData,
        submittedAt: serverTimestamp(),
      });
      const snap = await getDoc(docRef);
      return { id: docRef.id, ...snap.data() };
    } catch (error) {
      console.error('Error saving exam result:', error);
      return null;
    }
  }

  async getResultsByExam(examId) {
    try {
      const q = query(collection(db, 'results'), where('examId', '==', examId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
      console.error('Error getting results by exam:', error);
      return [];
    }
  }

  async getResultsByUser(userId) {
    try {
      const q = query(collection(db, 'results'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
      console.error('Error getting results by user:', error);
      return [];
    }
  }

  async updateExamResult(resultId, updates) {
    try {
      const ref = doc(db, 'results', resultId);
      await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
      const snap = await getDoc(ref);
      return { id: snap.id, ...snap.data() };
    } catch (error) {
      console.error('Error updating exam result:', error);
      return null;
    }
  }

  // Utilities (no-ops in Firestore mode)
  clearAllData() { return false; }
  exportData() { return null; }
  importData(_data) { return false; }

}

export const dataService = new DataService();