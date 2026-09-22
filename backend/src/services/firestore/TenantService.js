const { db, COLLECTIONS, firestoreHelpers } = require('../../config/firestore');

class TenantService {
  constructor() {
    this.collection = db.collection(COLLECTIONS.TENANTS);
  }

  // Find tenant by ID or slug
  async findByIdOrSlug(idOrSlug) {
    try {
      // Try by ID first
      const doc = await this.collection.doc(idOrSlug).get();
      if (doc.exists) {
        return firestoreHelpers.toObject(doc);
      }

      // Try by slug
      const slugQuery = await this.collection.where('slug', '==', idOrSlug).limit(1).get();
      if (!slugQuery.empty) {
        return firestoreHelpers.toObject(slugQuery.docs[0]);
      }

      return null;
    } catch (error) {
      console.error('Error finding tenant:', error);
      throw error;
    }
  }

  // Find tenant by ID
  async findById(id) {
    try {
      const doc = await this.collection.doc(id).get();
      return doc.exists ? firestoreHelpers.toObject(doc) : null;
    } catch (error) {
      console.error('Error finding tenant by ID:', error);
      throw error;
    }
  }

  // Find tenant by slug
  async findBySlug(slug) {
    try {
      const query = await this.collection.where('slug', '==', slug).limit(1).get();
      return query.empty ? null : firestoreHelpers.toObject(query.docs[0]);
    } catch (error) {
      console.error('Error finding tenant by slug:', error);
      throw error;
    }
  }

  // Get all tenants
  async findAll(query = {}) {
    try {
      let queryRef = this.collection;

      // Apply filters
      if (query.status === 'active') {
        queryRef = queryRef.where('suspended', '==', false);
      } else if (query.status === 'suspended') {
        queryRef = queryRef.where('suspended', '==', true);
      }

      if (query.deleted_at === null) {
        queryRef = queryRef.where('deleted_at', '==', null);
      }

      // Apply pagination
      const limit = query.limit || 10;
      const page = query.page || 1;
      
      // Order by created_at descending
      queryRef = queryRef.orderBy('created_at', 'desc').limit(limit);
      
      // Note: Firestore doesn't support offset() directly
      // For proper pagination, use startAfter() with the last document from previous page
      // For now, we'll use limit() only (simple pagination)

      const snapshot = await queryRef.get();
      return firestoreHelpers.toArray(snapshot);
    } catch (error) {
      console.error('Error finding all tenants:', error);
      throw error;
    }
  }

  // Create tenant
  async create(tenantData) {
    try {
      const now = new Date();
      const tenant = {
        ...tenantData,
        suspended: tenantData.suspended || false,
        deleted_at: null,
        created_at: now,
        updated_at: now,
        createdAt: now,
        updatedAt: now
      };

      const docRef = await this.collection.add(tenant);
      const doc = await docRef.get();
      return firestoreHelpers.toObject(doc);
    } catch (error) {
      console.error('Error creating tenant:', error);
      throw error;
    }
  }

  // Update tenant
  async update(id, updateData) {
    try {
      const update = {
        ...updateData,
        updated_at: new Date(),
        updatedAt: new Date()
      };

      await this.collection.doc(id).update(update);
      return await this.findById(id);
    } catch (error) {
      console.error('Error updating tenant:', error);
      throw error;
    }
  }

  // Delete tenant (soft delete)
  async delete(id, hardDelete = false) {
    try {
      if (hardDelete) {
        await this.collection.doc(id).delete();
        return true;
      } else {
        await this.collection.doc(id).update({
          deleted_at: new Date(),
          suspended: true,
          updated_at: new Date()
        });
        return true;
      }
    } catch (error) {
      console.error('Error deleting tenant:', error);
      throw error;
    }
  }

  // Count tenants
  async count(query = {}) {
    try {
      let queryRef = this.collection;

      if (query.status === 'active') {
        queryRef = queryRef.where('suspended', '==', false);
      } else if (query.status === 'suspended') {
        queryRef = queryRef.where('suspended', '==', true);
      }

      if (query.deleted_at === null) {
        queryRef = queryRef.where('deleted_at', '==', null);
      }

      const snapshot = await queryRef.get();
      return snapshot.size;
    } catch (error) {
      console.error('Error counting tenants:', error);
      throw error;
    }
  }
}

module.exports = new TenantService();

