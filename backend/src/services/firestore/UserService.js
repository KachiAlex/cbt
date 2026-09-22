const { db, COLLECTIONS, firestoreHelpers } = require('../../config/firestore');
const bcrypt = require('bcryptjs');

class UserService {
  constructor() {
    this.collection = db.collection(COLLECTIONS.USERS);
  }

  // Find user by ID
  async findById(id) {
    try {
      const doc = await this.collection.doc(id).get();
      return doc.exists ? firestoreHelpers.toObject(doc) : null;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  // Find user by username or email
  async findByUsernameOrEmail(usernameOrEmail, tenantId = null) {
    try {
      const key = usernameOrEmail.toLowerCase();
      let query = this.collection.where('username', '==', key);
      
      if (tenantId) {
        query = query.where('tenant_id', '==', tenantId);
      }

      let snapshot = await query.limit(1).get();
      if (!snapshot.empty) {
        return firestoreHelpers.toObject(snapshot.docs[0]);
      }

      // Try email
      query = this.collection.where('email', '==', key);
      if (tenantId) {
        query = query.where('tenant_id', '==', tenantId);
      }

      snapshot = await query.limit(1).get();
      return snapshot.empty ? null : firestoreHelpers.toObject(snapshot.docs[0]);
    } catch (error) {
      console.error('Error finding user by username/email:', error);
      throw error;
    }
  }

  // Find users by tenant
  async findByTenant(tenantId, filters = {}) {
    try {
      let query = this.collection.where('tenant_id', '==', tenantId);

      if (filters.role) {
        query = query.where('role', '==', filters.role);
      }

      if (filters.is_active !== undefined) {
        query = query.where('is_active', '==', filters.is_active);
      }

      const snapshot = await query.get();
      return firestoreHelpers.toArray(snapshot);
    } catch (error) {
      console.error('Error finding users by tenant:', error);
      throw error;
    }
  }

  // Find admins by tenant
  async findAdminsByTenant(tenantId) {
    try {
      const snapshot = await this.collection
        .where('tenant_id', '==', tenantId)
        .where('role', 'in', ['super_admin', 'admin', 'tenant_admin'])
        .get();
      
      return firestoreHelpers.toArray(snapshot);
    } catch (error) {
      console.error('Error finding admins by tenant:', error);
      throw error;
    }
  }

  // Create user
  async create(userData) {
    try {
      // Hash password if provided
      let hashedPassword = userData.password;
      if (userData.password && !userData.password.startsWith('$2')) {
        hashedPassword = await bcrypt.hash(userData.password, 12);
      }

      const now = new Date();
      const user = {
        ...userData,
        password: hashedPassword,
        username: (userData.username || '').toLowerCase(),
        email: (userData.email || '').toLowerCase(),
        is_active: userData.is_active !== undefined ? userData.is_active : true,
        created_at: now,
        updated_at: now,
        createdAt: now,
        updatedAt: now
      };

      // Check for duplicates
      const existing = await this.findByUsernameOrEmail(userData.username || userData.email, userData.tenant_id);
      if (existing) {
        throw new Error('User with this username or email already exists');
      }

      const docRef = await this.collection.add(user);
      const doc = await docRef.get();
      return firestoreHelpers.toObject(doc);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Update user
  async update(id, updateData) {
    try {
      const update = {
        ...updateData,
        updated_at: new Date(),
        updatedAt: new Date()
      };

      // Hash password if provided
      if (updateData.password && !updateData.password.startsWith('$2')) {
        update.password = await bcrypt.hash(updateData.password, 12);
      }

      // Lowercase username and email if provided
      if (updateData.username) {
        update.username = updateData.username.toLowerCase();
      }
      if (updateData.email) {
        update.email = updateData.email.toLowerCase();
      }

      await this.collection.doc(id).update(update);
      return await this.findById(id);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // Delete user
  async delete(id) {
    try {
      await this.collection.doc(id).delete();
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // Compare password
  async comparePassword(user, candidatePassword) {
    try {
      if (!user.password) return false;
      return await bcrypt.compare(candidatePassword, user.password);
    } catch (error) {
      console.error('Error comparing password:', error);
      return false;
    }
  }

  // Count users by tenant
  async countByTenant(tenantId) {
    try {
      const snapshot = await this.collection.where('tenant_id', '==', tenantId).get();
      return snapshot.size;
    } catch (error) {
      console.error('Error counting users by tenant:', error);
      throw error;
    }
  }
}

module.exports = new UserService();

