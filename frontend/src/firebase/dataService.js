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
      users: 'users'
    };
  }

  // Institution Management
  async getInstitutions() {
    try {
      const institutionsRef = collection(db, this.collections.institutions);
      const q = query(institutionsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
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
      const q = query(
        adminsRef, 
        where('institutionId', '==', institutionId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
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
      const q = query(
        usersRef, 
        where('institutionId', '==', institutionId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
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
}

export default new FirebaseDataService();
