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

// Helper function to handle Firestore network errors
const handleFirestoreError = (error, operation) => {
  console.error(`Firestore ${operation} error:`, error);
  
  // Check for network-related errors
  if (error.code === 'unavailable' || error.code === 'deadline-exceeded' || error.message?.includes('network')) {
    console.warn(`Network issue detected during ${operation}. The operation may succeed on retry.`);
  }
  
  // Re-throw the error to be handled by calling code
  throw error;
};

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

  // Helper function to safely convert timestamps to Date objects
  safeToDate(timestamp) {
    if (!timestamp) return null;
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    if (timestamp instanceof Date) {
      return timestamp;
    }
    if (typeof timestamp === 'string') {
      return new Date(timestamp);
    }
    return null;
  }

  // Institution Management
  async getInstitutions() {
    try {
      console.log('🔥 Firebase getInstitutions: Starting...');
      const institutionsRef = collection(db, this.collections.institutions);
      console.log('🔥 Firebase getInstitutions: Collection reference created');
      const snapshot = await getDocs(institutionsRef);
      console.log('🔥 Firebase getInstitutions: Snapshot received, docs count:', snapshot.docs.length);
      
      const institutions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('🔥 Firebase getInstitutions: Mapped institutions:', institutions);
      
      // Sort by createdAt in JavaScript to avoid index requirement
      const sortedInstitutions = institutions.sort((a, b) => {
        const dateA = this.safeToDate(a.createdAt);
        const dateB = this.safeToDate(b.createdAt);
        if (dateA && dateB) {
          return dateB - dateA;
        }
        return 0;
      });
      console.log('🔥 Firebase getInstitutions: Sorted institutions:', sortedInstitutions);
      return sortedInstitutions;
    } catch (error) {
      console.error('🔥 Firebase getInstitutions: Error occurred:', error);
      handleFirestoreError(error, 'getInstitutions');
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

  async updateInstitutionStatus(institutionId, status) {
    try {
      const institutionRef = doc(db, this.collections.institutions, institutionId);
      await updateDoc(institutionRef, {
        status: status,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating institution status:', error);
      throw error;
    }
  }

  // Department Management (per institution)
  getDepartmentCollectionRef(institutionId) {
    return collection(db, this.collections.institutions, institutionId, 'departments');
  }

  async getInstitutionDepartments(institutionId) {
    try {
      const departmentsRef = this.getDepartmentCollectionRef(institutionId);
      const snapshot = await getDocs(departmentsRef);

      const departments = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));

      return departments.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } catch (error) {
      console.error('Error getting departments:', error);
      throw error;
    }
  }

  async createInstitutionDepartment(institutionId, departmentData) {
    try {
      const departmentsRef = this.getDepartmentCollectionRef(institutionId);
      const docRef = await addDoc(departmentsRef, {
        ...departmentData,
        isActive: departmentData.isActive !== false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return { id: docRef.id, ...departmentData };
    } catch (error) {
      console.error('Error creating department:', error);
      throw error;
    }
  }

  async updateInstitutionDepartment(institutionId, departmentId, updateData) {
    try {
      const departmentRef = doc(db, this.collections.institutions, institutionId, 'departments', departmentId);
      await updateDoc(departmentRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating department:', error);
      throw error;
    }
  }

  async deleteInstitutionDepartment(institutionId, departmentId) {
    try {
      const departmentRef = doc(db, this.collections.institutions, institutionId, 'departments', departmentId);
      await deleteDoc(departmentRef);
      return true;
    } catch (error) {
      console.error('Error deleting department:', error);
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
        const dateA = this.safeToDate(a.createdAt);
        const dateB = this.safeToDate(b.createdAt);
        if (dateA && dateB) {
          return dateB - dateA;
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
      console.log('🔍 FirebaseDataService: Getting users for institution:', institutionId);
      const usersRef = collection(db, this.collections.users);
      const q = query(usersRef, where('institutionId', '==', institutionId));
      const snapshot = await getDocs(q);
      
      console.log('🔍 FirebaseDataService: Query snapshot size:', snapshot.size);
      
      const users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('🔍 FirebaseDataService: Mapped users:', users);
      
      // Sort by createdAt in JavaScript to avoid composite index requirement
      return users.sort((a, b) => {
        const dateA = this.safeToDate(a.createdAt);
        const dateB = this.safeToDate(b.createdAt);
        if (dateA && dateB) {
          return dateB - dateA;
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
      console.log('🔍 FirebaseDataService: Creating user with data:', userData);
      const usersRef = collection(db, this.collections.users);
      const docRef = await addDoc(usersRef, {
        ...userData,
        createdAt: serverTimestamp()
      });
      
      const result = { id: docRef.id, ...userData };
      console.log('🔍 FirebaseDataService: Created user result:', result);
      return result;
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

  // Debug function to get all users
  async getAllUsers() {
    try {
      console.log('🔍 FirebaseDataService: Getting ALL users for debugging...');
      const usersRef = collection(db, this.collections.users);
      const snapshot = await getDocs(usersRef);
      
      const allUsers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('🔍 FirebaseDataService: ALL users in database:', allUsers);
      return allUsers;
    } catch (error) {
      console.error('Error getting all users:', error);
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

  async getInstitutionBySlug(slug) {
    try {
      const institutionsRef = collection(db, this.collections.institutions);
      const q = query(institutionsRef, where('slug', '==', slug));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() };
      } else {
        throw new Error('Institution not found');
      }
    } catch (error) {
      if (error.message === 'Institution not found') {
        throw error; // Re-throw business logic errors as-is
      }
      handleFirestoreError(error, 'getInstitutionBySlug');
    }
  }

  // Alias method for backward compatibility with student login
  async getInstitutionStudents(institutionId) {
    try {
      // Students are stored as users with role 'student'
      const usersRef = collection(db, this.collections.users);
      const q = query(usersRef, where('institutionId', '==', institutionId), where('role', '==', 'student'));
      const snapshot = await getDocs(q);
      
      const students = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return students.sort((a, b) => {
        const dateA = this.safeToDate(a.createdAt);
        const dateB = this.safeToDate(b.createdAt);
        if (dateA && dateB) {
          return dateB - dateA;
        }
        return 0;
      });
    } catch (error) {
      console.error('Error getting students:', error);
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
        const dateA = this.safeToDate(a.createdAt);
        const dateB = this.safeToDate(b.createdAt);
        if (dateA && dateB) {
          return dateB - dateA;
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
        const dateA = this.safeToDate(a.createdAt);
        const dateB = this.safeToDate(b.createdAt);
        if (dateA && dateB) {
          return dateB - dateA;
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
        const dateA = this.safeToDate(a.completedAt);
        const dateB = this.safeToDate(b.completedAt);
        if (dateA && dateB) {
          return dateB - dateA;
        }
        return 0;
      });
    } catch (error) {
      console.error('Error getting results:', error);
      throw error;
    }
  }

  // Blog Management
  async getBlogs() {
    try {
      const blogsRef = collection(db, 'blogs');
      const q = query(blogsRef, where('published', '==', true));
      const snapshot = await getDocs(q);
      
      const blogs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return blogs.sort((a, b) => {
        const dateA = this.safeToDate(a.publishedAt);
        const dateB = this.safeToDate(b.publishedAt);
        if (dateA && dateB) {
          return dateB - dateA;
        }
        return 0;
      });
    } catch (error) {
      console.error('Error getting blogs:', error);
      throw error;
    }
  }

  async getAllBlogs() {
    try {
      const blogsRef = collection(db, 'blogs');
      const snapshot = await getDocs(blogsRef);
      
      const blogs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return blogs.sort((a, b) => {
        const dateA = this.safeToDate(a.createdAt);
        const dateB = this.safeToDate(b.createdAt);
        if (dateA && dateB) {
          return dateB - dateA;
        }
        return 0;
      });
    } catch (error) {
      console.error('Error getting all blogs:', error);
      throw error;
    }
  }

  async getBlog(blogId) {
    try {
      const blogRef = doc(db, 'blogs', blogId);
      const docSnap = await getDoc(blogRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        throw new Error('Blog not found');
      }
    } catch (error) {
      console.error('Error getting blog:', error);
      throw error;
    }
  }

  async createBlog(blogData) {
    try {
      const blogsRef = collection(db, 'blogs');
      const docRef = await addDoc(blogsRef, {
        ...blogData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return { id: docRef.id, ...blogData };
    } catch (error) {
      console.error('Error creating blog:', error);
      throw error;
    }
  }

  async updateBlog(blogId, updateData) {
    try {
      const blogRef = doc(db, 'blogs', blogId);
      await updateDoc(blogRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating blog:', error);
      throw error;
    }
  }

  async publishBlog(blogId) {
    try {
      const blogRef = doc(db, 'blogs', blogId);
      await updateDoc(blogRef, {
        published: true,
        publishedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error publishing blog:', error);
      throw error;
    }
  }

  async unpublishBlog(blogId) {
    try {
      const blogRef = doc(db, 'blogs', blogId);
      await updateDoc(blogRef, {
        published: false,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error unpublishing blog:', error);
      throw error;
    }
  }

  async deleteBlog(blogId) {
    try {
      const blogRef = doc(db, 'blogs', blogId);
      await deleteDoc(blogRef);
      return true;
    } catch (error) {
      console.error('Error deleting blog:', error);
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

  async getResultById(resultId) {
    try {
      const resultRef = doc(db, this.collections.results, resultId);
      const docSnap = await getDoc(resultRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        throw new Error('Result not found');
      }
    } catch (error) {
      console.error('Error getting result by ID:', error);
      throw error;
    }
  }
}

export default new FirebaseDataService();
