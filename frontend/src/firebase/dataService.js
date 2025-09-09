import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './config';

class FirebaseDataService {
  constructor() {
    this.collections = {
      institutions: 'institutions',
      admins: 'admins',
      users: 'users',
      exams: 'exams',
      questions: 'questions',
      results: 'results'
    };
  }

  // Institution Management
  async getInstitutions() {
    try {
      const institutionsRef = collection(db, this.collections.institutions);
      const snapshot = await getDocs(institutionsRef);
      
      const institutions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort by createdAt in JavaScript to avoid index requirement
      return institutions.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return b.createdAt.toDate() - a.createdAt.toDate();
        }
        return 0;
      });
    } catch (error) {
      console.error('Error getting institutions:', error);
      throw error;
    }
  }

  async createInstitution(institutionData) {
    try {
      const institutionsRef = collection(db, this.collections.institutions);
      const docRef = await addDoc(institutionsRef, {
        ...institutionData,
        createdAt: serverTimestamp(),
        totalUsers: 0
      });
      
      return { id: docRef.id, ...institutionData };
    } catch (error) {
      console.error('Error creating institution:', error);
      throw error;
    }
  }

  async updateInstitution(institutionId, updateData) {
    try {
      const institutionRef = doc(db, this.collections.institutions, institutionId);
      await updateDoc(institutionRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating institution:', error);
      throw error;
    }
  }

  async deleteInstitution(institutionId) {
    try {
      // First delete all admins for this institution
      await this.deleteInstitutionAdmins(institutionId);
      
      // Then delete the institution
      const institutionRef = doc(db, this.collections.institutions, institutionId);
      await deleteDoc(institutionRef);
      return true;
    } catch (error) {
      console.error('Error deleting institution:', error);
      throw error;
    }
  }

  // Admin Management
  async getInstitutionAdmins(institutionId) {
    try {
      const adminsRef = collection(db, this.collections.admins);
      const q = query(adminsRef, where('institutionId', '==', institutionId));
      const snapshot = await getDocs(q);
      
      const admins = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort by createdAt in JavaScript to avoid composite index requirement
      return admins.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return b.createdAt.toDate() - a.createdAt.toDate();
        }
        return 0;
      });
    } catch (error) {
      console.error('Error getting admins:', error);
      throw error;
    }
  }

  async createAdmin(adminData) {
    try {
      const adminsRef = collection(db, this.collections.admins);
      const docRef = await addDoc(adminsRef, {
        ...adminData,
        role: 'super_admin', // All admins are super_admin
        createdAt: serverTimestamp()
      });
      
      return { id: docRef.id, ...adminData };
    } catch (error) {
      console.error('Error creating admin:', error);
      throw error;
    }
  }

  async updateAdminPassword(adminId, newPassword) {
    try {
      const adminRef = doc(db, this.collections.admins, adminId);
      await updateDoc(adminRef, {
        password: newPassword,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating admin password:', error);
      throw error;
    }
  }

  async deleteAdmin(adminId) {
    try {
      const adminRef = doc(db, this.collections.admins, adminId);
      await deleteDoc(adminRef);
      return true;
    } catch (error) {
      console.error('Error deleting admin:', error);
      throw error;
    }
  }

  async deleteInstitutionAdmins(institutionId) {
    try {
      const admins = await this.getInstitutionAdmins(institutionId);
      const deletePromises = admins.map(admin => this.deleteAdmin(admin.id));
      await Promise.all(deletePromises);
      return true;
    } catch (error) {
      console.error('Error deleting institution admins:', error);
      throw error;
    }
  }

  // User Management (for institution users)
  async getInstitutionUsers(institutionId) {
    try {
      const usersRef = collection(db, this.collections.users);
      const q = query(usersRef, where('institutionId', '==', institutionId));
      const snapshot = await getDocs(q);
      
      const users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort by createdAt in JavaScript to avoid composite index requirement
      return users.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return b.createdAt.toDate() - a.createdAt.toDate();
        }
        return 0;
      });
    } catch (error) {
      console.error('Error getting users:', error);
      throw error;
    }
  }

  async createUser(userData) {
    try {
      const usersRef = collection(db, this.collections.users);
      const docRef = await addDoc(usersRef, {
        ...userData,
        createdAt: serverTimestamp()
      });
      
      return { id: docRef.id, ...userData };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async deleteUser(userId) {
    try {
      const userRef = doc(db, this.collections.users, userId);
      await deleteDoc(userRef);
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // Update institution user count
  async updateInstitutionUserCount(institutionId) {
    try {
      const users = await this.getInstitutionUsers(institutionId);
      await this.updateInstitution(institutionId, { totalUsers: users.length });
      return users.length;
    } catch (error) {
      console.error('Error updating user count:', error);
      throw error;
    }
  }

  async getInstitution(institutionId) {
    try {
      const institutionRef = doc(db, this.collections.institutions, institutionId);
      const docSnap = await getDoc(institutionRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        throw new Error('Institution not found');
      }
    } catch (error) {
      console.error('Error getting institution:', error);
      throw error;
    }
  }

  async updateUser(userId, updateData) {
    try {
      const userRef = doc(db, this.collections.users, userId);
      await updateDoc(userRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // Exam Management
  async getInstitutionExams(institutionId) {
    try {
      const examsRef = collection(db, this.collections.exams);
      const q = query(examsRef, where('institutionId', '==', institutionId));
      const snapshot = await getDocs(q);
      
      const exams = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return exams.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return b.createdAt.toDate() - a.createdAt.toDate();
        }
        return 0;
      });
    } catch (error) {
      console.error('Error getting exams:', error);
      throw error;
    }
  }

  async createExam(examData) {
    try {
      const examsRef = collection(db, this.collections.exams);
      const docRef = await addDoc(examsRef, {
        ...examData,
        createdAt: serverTimestamp()
      });
      
      return { id: docRef.id, ...examData };
    } catch (error) {
      console.error('Error creating exam:', error);
      throw error;
    }
  }

  async updateExam(examId, updateData) {
    try {
      const examRef = doc(db, this.collections.exams, examId);
      await updateDoc(examRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating exam:', error);
      throw error;
    }
  }

  async deleteExam(examId) {
    try {
      // Cascade delete: remove questions linked to this exam
      const questionsRef = collection(db, this.collections.questions);
      const q = query(questionsRef, where('examId', '==', examId));
      const qs = await getDocs(q);
      const deletions = qs.docs.map(d => deleteDoc(doc(db, this.collections.questions, d.id)));
      await Promise.all(deletions);

      // Delete the exam itself
      const examRef = doc(db, this.collections.exams, examId);
      await deleteDoc(examRef);
      return true;
    } catch (error) {
      console.error('Error deleting exam:', error);
      throw error;
    }
  }

  // Question Management
  async getInstitutionQuestions(institutionId) {
    try {
      const questionsRef = collection(db, this.collections.questions);
      const q = query(questionsRef, where('institutionId', '==', institutionId));
      const snapshot = await getDocs(q);
      
      const questions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return questions.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return b.createdAt.toDate() - a.createdAt.toDate();
        }
        return 0;
      });
    } catch (error) {
      console.error('Error getting questions:', error);
      throw error;
    }
  }

  async createQuestion(questionData) {
    try {
      const questionsRef = collection(db, this.collections.questions);
      const docRef = await addDoc(questionsRef, {
        ...questionData,
        createdAt: serverTimestamp()
      });
      
      return { id: docRef.id, ...questionData };
    } catch (error) {
      console.error('Error creating question:', error);
      throw error;
    }
  }

  async updateQuestion(questionId, updateData) {
    try {
      const questionRef = doc(db, this.collections.questions, questionId);
      await updateDoc(questionRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating question:', error);
      throw error;
    }
  }

  async deleteQuestion(questionId) {
    try {
      const questionRef = doc(db, this.collections.questions, questionId);
      await deleteDoc(questionRef);
      return true;
    } catch (error) {
      console.error('Error deleting question:', error);
      throw error;
    }
  }

  // Utility: count and bulk delete questions for a specific exam
  async countQuestionsByExam(examId) {
    try {
      const questionsRef = collection(db, this.collections.questions);
      const qy = query(questionsRef, where('examId', '==', examId));
      const snap = await getDocs(qy);
      return snap.size;
    } catch (error) {
      console.error('Error counting questions by exam:', error);
      throw error;
    }
  }

  async deleteQuestionsByExam(examId) {
    try {
      const questionsRef = collection(db, this.collections.questions);
      const qy = query(questionsRef, where('examId', '==', examId));
      const snap = await getDocs(qy);
      const deletions = snap.docs.map(d => deleteDoc(doc(db, this.collections.questions, d.id)));
      await Promise.all(deletions);
      return true;
    } catch (error) {
      console.error('Error deleting questions by exam:', error);
      throw error;
    }
  }

  // Results Management
  async getInstitutionResults(institutionId) {
    try {
      const resultsRef = collection(db, this.collections.results);
      const q = query(resultsRef, where('institutionId', '==', institutionId));
      const snapshot = await getDocs(q);
      
      const results = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return results.sort((a, b) => {
        if (a.completedAt && b.completedAt) {
          return b.completedAt.toDate() - a.completedAt.toDate();
        }
        return 0;
      });
    } catch (error) {
      console.error('Error getting results:', error);
      throw error;
    }
  }

  async createResult(resultData) {
    try {
      const resultsRef = collection(db, this.collections.results);
      const docRef = await addDoc(resultsRef, {
        ...resultData,
        completedAt: serverTimestamp()
      });
      
      return { id: docRef.id, ...resultData };
    } catch (error) {
      console.error('Error creating result:', error);
      throw error;
    }
  }

  async updateResult(resultId, updateData) {
    try {
      const resultRef = doc(db, this.collections.results, resultId);
      await updateDoc(resultRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating result:', error);
      throw error;
    }
  }

  async deleteResult(resultId) {
    try {
      const resultRef = doc(db, this.collections.results, resultId);
      await deleteDoc(resultRef);
      return true;
    } catch (error) {
      console.error('Error deleting result:', error);
      throw error;
    }
  }
}

export default new FirebaseDataService();
