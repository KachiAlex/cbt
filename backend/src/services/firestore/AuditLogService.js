const { db, COLLECTIONS, firestoreHelpers } = require('../../config/firestore');

class AuditLogService {
  constructor() {
    this.collection = db.collection(COLLECTIONS.AUDIT_LOGS);
  }

  // Create audit log
  async create(logData) {
    try {
      const now = new Date();
      const log = {
        ...logData,
        created_at: now,
        createdAt: now
      };

      const docRef = await this.collection.add(log);
      const doc = await docRef.get();
      return firestoreHelpers.toObject(doc);
    } catch (error) {
      console.error('Error creating audit log:', error);
      throw error;
    }
  }

  // Get audit logs
  async find(query = {}) {
    try {
      let queryRef = this.collection;

      if (query.action) {
        queryRef = queryRef.where('action', '==', query.action);
      }

      if (query.resource_type) {
        queryRef = queryRef.where('resource_type', '==', query.resource_type);
      }

      if (query.resource_id) {
        queryRef = queryRef.where('resource_id', '==', query.resource_id);
      }

      const limit = query.limit || 20;
      const page = query.page || 1;
      const offset = (page - 1) * limit;

      queryRef = queryRef.orderBy('created_at', 'desc').limit(limit).offset(offset);

      const snapshot = await queryRef.get();
      return firestoreHelpers.toArray(snapshot);
    } catch (error) {
      console.error('Error finding audit logs:', error);
      throw error;
    }
  }
}

module.exports = new AuditLogService();

