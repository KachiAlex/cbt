const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Import models
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// Helper: find tenant by ObjectId or slug
async function findTenantByIdOrSlug(idOrSlug) {
  let tenant = null;
  try {
    tenant = await Tenant.findById(idOrSlug);
  } catch (_) {}
  if (!tenant) {
    tenant = await Tenant.findOne({ slug: idOrSlug });
  }
  return tenant;
}

// Simple middleware to check for admin token
const requireManagedAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Simple token validation
    if (token === 'super-admin-token' || token === 'managed-admin-token' || token === 'admin-token') {
      // Set a mock user for the request
      req.user = { id: 'admin-user', role: 'super_admin' };
      next();
    } else {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Authentication error' });
  }
};

// Generate temporary password
const generateTempPassword = () => {
  return crypto.randomBytes(8).toString('hex');
};

// Create tenant with default admin
router.post('/tenants', requireManagedAdmin, async (req, res) => {
  try {
    const {
      name,
      slug,
      address,
      contact_email,
      contact_phone,
      timezone = 'UTC',
      language = 'en',
      logo_url,
      plan = 'basic',
      default_admin
    } = req.body;

    // Validate required fields
    if (!name || !slug || !contact_email || !default_admin) {
      return res.status(400).json({
        error: 'Missing required fields: name, slug, contact_email, default_admin'
      });
    }

    // Check if tenant slug already exists
    const existingTenant = await Tenant.findOne({ slug });
    if (existingTenant) {
      return res.status(400).json({ error: 'Tenant slug already exists' });
    }

    // Create tenant
    const tenant = new Tenant({
      name,
      slug,
      address,
      contact_email,
      contact_phone,
      timezone,
      language,
      logo_url,
      plan
    });

    await tenant.save();

    // Generate temporary password for default admin
    const tempPassword = generateTempPassword();

    // Create default admin user (platform-level default as super_admin)
    const defaultAdminUser = new User({
      tenant_id: tenant._id,
      username: default_admin.username || default_admin.email.split('@')[0],
      email: default_admin.email,
      phone: default_admin.phone,
      fullName: default_admin.fullName || default_admin.email.split('@')[0],
      password: tempPassword,
      role: 'super_admin',
      is_default_admin: true,
      must_change_password: true
    });

    await defaultAdminUser.save();

    // Create audit log
    await new AuditLog({
      actor_user_id: req.user.id,
      actor_ip: req.ip,
      actor_user_agent: req.get('User-Agent'),
      action: 'tenant.create',
      resource_type: 'tenant',
      resource_id: tenant._id,
      details: {
        tenant_name: name,
        tenant_slug: slug,
        default_admin_email: default_admin.email,
        plan: plan
      }
    }).save();

    res.status(201).json({
      message: 'Tenant created successfully',
      tenant: {
        id: tenant._id,
        name: tenant.name,
        slug: tenant.slug,
        contact_email: tenant.contact_email,
        plan: tenant.plan,
        created_at: tenant.created_at
      },
      default_admin: {
        id: defaultAdminUser._id,
        email: defaultAdminUser.email,
        username: defaultAdminUser.username,
        temp_password: tempPassword
      }
    });

  } catch (error) {
    console.error('Error creating tenant:', error);
    res.status(500).json({ error: 'Failed to create tenant' });
  }
});

// Get all tenants
router.get('/tenants', requireManagedAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    let query = {};
    if (status === 'active') {
      query = { suspended: false, deleted_at: null };
    } else if (status === 'suspended') {
      query = { suspended: true, deleted_at: null };
    } else if (status === 'deleted') {
      query = { deleted_at: { $ne: null } };
    }

    const tenants = await Tenant.find(query)
      .sort({ created_at: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Tenant.countDocuments(query);

    res.json({
      tenants,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error('Error fetching tenants:', error);
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
});

// Get tenant details
router.get('/tenants/:id', requireManagedAdmin, async (req, res) => {
  try {
    const tenant = await findTenantByIdOrSlug(req.params.id);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Get tenant users
    const users = await User.find({ tenant_id: tenant._id })
      .select('-password')
      .lean();

    // Get recent audit logs for this tenant
    const auditLogs = await AuditLog.find({
      resource_type: 'tenant',
      resource_id: tenant._id
    })
      .sort({ created_at: -1 })
      .limit(10)
      .populate('actor_user_id', 'username email')
      .lean();

    res.json({
      tenant,
      users,
      audit_logs: auditLogs
    });

  } catch (error) {
    console.error('Error fetching tenant details:', error);
    res.status(500).json({ error: 'Failed to fetch tenant details' });
  }
});

// Create an admin for a tenant (role forced to super_admin at platform level)
router.post('/tenants/:id/admins', requireManagedAdmin, async (req, res) => {
  try {
    const tenant = await findTenantByIdOrSlug(req.params.id);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const { username, email, fullName, password } = req.body || {};
    if (!username || !email || !fullName || !password) {
      return res.status(400).json({ error: 'username, email, fullName, and password are required' });
    }

    // Check duplicate
    const existing = await User.findOne({ tenant_id: tenant._id, $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }] });
    if (existing) {
      return res.status(400).json({ error: 'An admin with this username or email already exists' });
    }

    const adminUser = new User({
      tenant_id: tenant._id,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      fullName,
      password,
      role: 'super_admin',
      is_default_admin: false,
      must_change_password: false
    });
    await adminUser.save();

    try {
      await new AuditLog({
        actor_user_id: req.user?.id,
        actor_ip: req.ip,
        actor_user_agent: req.get('User-Agent'),
        action: 'admin.create',
        resource_type: 'user',
        resource_id: adminUser._id,
        details: { tenant_id: tenant._id, tenant_name: tenant.name, role: 'super_admin' }
      }).save();
    } catch (_) {}

    const { password: _, ...adminSafe } = adminUser.toObject();
    return res.status(201).json({ message: 'Admin created', admin: adminSafe });
  } catch (error) {
    console.error('Error creating admin:', error);
    return res.status(500).json({ error: 'Failed to create admin' });
  }
});

// Suspend tenant
router.post('/tenants/:id/suspend', requireManagedAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const tenant = await Tenant.findById(req.params.id);
    
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    tenant.suspended = true;
    await tenant.save();

    // Create audit log
    await new AuditLog({
      actor_user_id: req.user.id,
      actor_ip: req.ip,
      actor_user_agent: req.get('User-Agent'),
      action: 'tenant.suspend',
      resource_type: 'tenant',
      resource_id: tenant._id,
      details: { reason }
    }).save();

    res.json({ message: 'Tenant suspended successfully' });

  } catch (error) {
    console.error('Error suspending tenant:', error);
    res.status(500).json({ error: 'Failed to suspend tenant' });
  }
});

// Reinstate tenant
router.post('/tenants/:id/reinstate', requireManagedAdmin, async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    tenant.suspended = false;
    await tenant.save();

    // Create audit log
    await new AuditLog({
      actor_user_id: req.user.id,
      actor_ip: req.ip,
      actor_user_agent: req.get('User-Agent'),
      action: 'tenant.reinstate',
      resource_type: 'tenant',
      resource_id: tenant._id
    }).save();

    res.json({ message: 'Tenant reinstated successfully' });

  } catch (error) {
    console.error('Error reinstating tenant:', error);
    res.status(500).json({ error: 'Failed to reinstate tenant' });
  }
});

// Reset default admin password
router.post('/tenants/:id/reset-default-admin', requireManagedAdmin, async (req, res) => {
  try {
    const tenant = await findTenantByIdOrSlug(req.params.id);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const defaultAdmin = await User.findOne({
      tenant_id: tenant._id,
      is_default_admin: true
    });

    if (!defaultAdmin) {
      return res.status(404).json({ error: 'Default admin not found' });
    }

    // Generate new temporary password
    const tempPassword = generateTempPassword();
    defaultAdmin.password = tempPassword;
    defaultAdmin.must_change_password = true;
    await defaultAdmin.save();

    // Create audit log
    await new AuditLog({
      actor_user_id: req.user.id,
      actor_ip: req.ip,
      actor_user_agent: req.get('User-Agent'),
      action: 'user.reset_password',
      resource_type: 'user',
      resource_id: defaultAdmin._id,
      details: {
        tenant_id: tenant._id,
        tenant_name: tenant.name
      }
    }).save();

    res.json({
      message: 'Default admin password reset successfully',
      temp_password: tempPassword,
      admin_email: defaultAdmin.email
    });

  } catch (error) {
    console.error('Error resetting default admin password:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Reset password for a specific admin (by adminId)
router.post('/tenants/:id/admins/:adminId/reset-password', requireManagedAdmin, async (req, res) => {
  try {
    const tenant = await findTenantByIdOrSlug(req.params.id);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const adminId = req.params.adminId;
    const adminUser = await User.findOne({ _id: adminId, tenant_id: tenant._id });
    if (!adminUser) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const tempPassword = generateTempPassword();
    adminUser.password = tempPassword;
    adminUser.must_change_password = true;
    await adminUser.save();

    // Audit log
    await new AuditLog({
      actor_user_id: req.user.id,
      actor_ip: req.ip,
      actor_user_agent: req.get('User-Agent'),
      action: 'user.reset_password',
      resource_type: 'user',
      resource_id: adminUser._id,
      details: { tenant_id: tenant._id, tenant_name: tenant.name }
    }).save();

    res.json({ message: 'Admin password reset successfully', temp_password: tempPassword, admin_id: adminUser._id });
  } catch (error) {
    console.error('Error resetting admin password:', error);
    res.status(500).json({ error: 'Failed to reset admin password' });
  }
});

// Reset password for an admin identified by username or email (legacy path)
router.post('/tenants/:id/admins/reset-password', requireManagedAdmin, async (req, res) => {
  try {
    const tenant = await findTenantByIdOrSlug(req.params.id);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const { username, email, usernameOrEmail } = req.body || {};
    const key = String(username || email || usernameOrEmail || '').toLowerCase();
    if (!key) {
      return res.status(400).json({ error: 'username or email is required' });
    }

    const adminUser = await User.findOne({
      tenant_id: tenant._id,
      $or: [ { username: key }, { email: key } ]
    });

    if (!adminUser) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const tempPassword = generateTempPassword();
    adminUser.password = tempPassword;
    adminUser.must_change_password = true;
    await adminUser.save();

    try {
      await new AuditLog({
        actor_user_id: req.user.id,
        actor_ip: req.ip,
        actor_user_agent: req.get('User-Agent'),
        action: 'user.reset_password',
        resource_type: 'user',
        resource_id: adminUser._id,
        details: { tenant_id: tenant._id, tenant_name: tenant.name, via: 'usernameOrEmail' }
      }).save();
    } catch (_) {}

    return res.json({ message: 'Admin password reset successfully', temp_password: tempPassword, admin_id: adminUser._id });
  } catch (error) {
    console.error('Error resetting admin password (legacy):', error);
    return res.status(500).json({ error: 'Failed to reset admin password' });
  }
});

// Delete a specific admin (by adminId)
router.delete('/tenants/:id/admins/:adminId', requireManagedAdmin, async (req, res) => {
  try {
    const tenant = await findTenantByIdOrSlug(req.params.id);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const adminId = req.params.adminId;
    const adminUser = await User.findOne({ _id: adminId, tenant_id: tenant._id });
    if (!adminUser) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    // Prevent deleting default admin without explicit override (simple guard)
    if (adminUser.is_default_admin) {
      return res.status(400).json({ error: 'Cannot delete default admin' });
    }

    await User.deleteOne({ _id: adminUser._id });

    // Audit log
    await new AuditLog({
      actor_user_id: req.user.id,
      actor_ip: req.ip,
      actor_user_agent: req.get('User-Agent'),
      action: 'user.delete',
      resource_type: 'user',
      resource_id: adminUser._id,
      details: { tenant_id: tenant._id, tenant_name: tenant.name }
    }).save();

    res.json({ message: 'Admin deleted successfully' });
  } catch (error) {
    console.error('Error deleting admin:', error);
    res.status(500).json({ error: 'Failed to delete admin' });
  }
});

// Danger: Clear all users for a tenant (optionally keep default admin)
router.delete('/tenants/:id/users', requireManagedAdmin, async (req, res) => {
  try {
    const tenant = await findTenantByIdOrSlug(req.params.id);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const includeDefault = String(req.query.includeDefault || 'false').toLowerCase() === 'true';

    const filter = { tenant_id: tenant._id };
    if (!includeDefault) {
      filter.is_default_admin = { $ne: true };
    }

    const result = await User.deleteMany(filter);

    try {
      await new AuditLog({
        actor_user_id: req.user?.id,
        actor_ip: req.ip,
        actor_user_agent: req.get('User-Agent'),
        action: 'tenant.clear_users',
        resource_type: 'tenant',
        resource_id: tenant._id,
        details: { includeDefault, deletedCount: result.deletedCount }
      }).save();
    } catch (_) {}

    return res.json({ message: 'Users cleared', deleted: result.deletedCount });
  } catch (error) {
    console.error('Error clearing users:', error);
    return res.status(500).json({ error: 'Failed to clear users' });
  }
});

// Remove tenant (soft delete)
router.delete('/tenants/:id', requireManagedAdmin, async (req, res) => {
  try {
    const { hard = false } = req.query;
    const tenant = await Tenant.findById(req.params.id);
    
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    if (hard === 'true') {
      // Hard delete - remove all tenant data
      await User.deleteMany({ tenant_id: tenant._id });
      await Tenant.findByIdAndDelete(tenant._id);
      
      // Create audit log
      await new AuditLog({
        actor_user_id: req.user.id,
        actor_ip: req.ip,
        actor_user_agent: req.get('User-Agent'),
        action: 'tenant.delete',
        resource_type: 'tenant',
        resource_id: tenant._id,
        details: { hard_delete: true }
      }).save();
    } else {
      // Soft delete
      tenant.deleted_at = new Date();
      tenant.suspended = true;
      await tenant.save();
      
      // Create audit log
      await new AuditLog({
        actor_user_id: req.user.id,
        actor_ip: req.ip,
        actor_user_agent: req.get('User-Agent'),
        action: 'tenant.remove',
        resource_type: 'tenant',
        resource_id: tenant._id,
        details: { soft_delete: true }
      }).save();
    }

    res.json({ message: `Tenant ${hard === 'true' ? 'deleted' : 'removed'} successfully` });

  } catch (error) {
    console.error('Error removing tenant:', error);
    res.status(500).json({ error: 'Failed to remove tenant' });
  }
});

// Get audit logs
router.get('/audit-logs', requireManagedAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, action, resource_type } = req.query;
    
    let query = {};
    if (action) query.action = action;
    if (resource_type) query.resource_type = resource_type;

    const auditLogs = await AuditLog.find(query)
      .sort({ created_at: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('actor_user_id', 'username email')
      .lean();

    const total = await AuditLog.countDocuments(query);

    res.json({
      audit_logs: auditLogs,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Ensure a platform admin has super_admin role (backend sync)
router.post('/admins/ensure-superadmin', requireManagedAdmin, async (req, res) => {
  try {
    const { usernameOrEmail } = req.body || {};
    if (!usernameOrEmail) {
      return res.status(400).json({ error: 'usernameOrEmail is required' });
    }

    // Normalize input for lookup
    const key = String(usernameOrEmail).toLowerCase();

    // Update any matching users across tenants
    const result = await User.updateMany(
      {
        $or: [
          { username: key },
          { email: key }
        ]
      },
      { $set: { role: 'super_admin' } }
    );

    // Audit
    try {
      await new AuditLog({
        actor_user_id: req.user?.id,
        actor_ip: req.ip,
        actor_user_agent: req.get('User-Agent'),
        action: 'admin.ensure_super_admin',
        resource_type: 'user',
        resource_id: null,
        details: { usernameOrEmail: key, matchedCount: result.matchedCount, modifiedCount: result.modifiedCount }
      }).save();
    } catch (_) {}

    return res.json({ matched: result.matchedCount || 0, updated: result.modifiedCount || 0 });
  } catch (error) {
    console.error('Error ensuring super_admin role:', error);
    return res.status(500).json({ error: 'Failed to ensure super_admin role' });
  }
});

// Global admin endpoint: purge users across all tenants or a specific tenant
// DELETE /api/admins/purge-users?tenant=<idOrSlug>&includeDefault=true|false
router.delete('/admins/purge-users', requireManagedAdmin, async (req, res) => {
  try {
    const { tenant: tenantIdOrSlug, includeDefault = 'false' } = req.query || {};

    let tenantFilter = {};
    if (tenantIdOrSlug) {
      const tenant = await findTenantByIdOrSlug(tenantIdOrSlug);
      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }
      tenantFilter.tenant_id = tenant._id;
    }

    const filter = { ...tenantFilter };
    if (String(includeDefault).toLowerCase() !== 'true') {
      filter.is_default_admin = { $ne: true };
    }

    const result = await User.deleteMany(filter);

    try {
      await new AuditLog({
        actor_user_id: req.user?.id,
        actor_ip: req.ip,
        actor_user_agent: req.get('User-Agent'),
        action: 'admin.purge_users',
        resource_type: 'system',
        resource_id: null,
        details: { tenant: tenantIdOrSlug || 'ALL', includeDefault: String(includeDefault), deletedCount: result.deletedCount }
      }).save();
    } catch (_) {}

    return res.json({ message: 'Users purged', scope: tenantIdOrSlug ? 'tenant' : 'all', deleted: result.deletedCount });
  } catch (error) {
    console.error('Error purging users (global):', error);
    return res.status(500).json({ error: 'Failed to purge users' });
  }
});

module.exports = router;
