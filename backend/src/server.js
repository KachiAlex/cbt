const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const connectDB = require('./config/database');
require('dotenv').config();

// Models
const User = require('./models/User');
const Tenant = require('./models/Tenant');
const Exam = require('./models/Exam');
const Result = require('./models/Result');
const Question = require('./models/Question');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to database
connectDB();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Rate limiting
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Root redirect to admin UI
app.get('/', (req, res) => {
	res.redirect('/admin');
});

// Health check endpoint
app.get('/health', (req, res) => {
	res.status(200).json({ 
		status: 'healthy', 
		timestamp: new Date().toISOString(),
		environment: process.env.NODE_ENV || 'development',
		database: process.env.DB_TYPE || 'mongodb'
	});
});

// API info
app.get('/api', (req, res) => {
	res.json({ 
		message: 'CBT Backend API is running',
		version: '2.0.3-FINAL',
		database: process.env.DB_TYPE || 'mongodb',
		multi_tenant: true,
		deployment: 'final-version-' + Date.now(),
		endpoints: {
			health: '/health',
			landing_page: '/',
			admin_ui: '/admin',
			managed_admin_ui: '/managed-admin',
			admin_ui_alt: '/admin-ui',
			exams: '/api/exams',
			questions: '/api/questions',
			results: '/api/results',
			users: '/api/users',
			managed_admin: '/api/v1/managed-admin',
			database: '/api/v1/database'
		}
	});
});

// Import new routes (commented out for now)
// const managedAdminRoutes = require('./routes/managedAdmin');
// const databaseRoutes = require('./routes/database');

// Serve Managed Admin UI
app.get('/admin', (req, res) => {
	res.sendFile(path.join(__dirname, '../managed-admin-ui.html'));
});

app.get('/managed-admin', (req, res) => {
	res.sendFile(path.join(__dirname, '../managed-admin-ui.html'));
});

// Serve admin UI from public directory as well
app.get('/admin-ui', (req, res) => {
	res.sendFile(path.join(__dirname, '../public/admin-ui.html'));
});

// Simple authentication endpoint for Managed Admin
app.post('/api/auth/login', async (req, res) => {
	try {
		const { username, password } = req.body;
		
		// Check for super admin credentials
		if (username === 'superadmin' && password === 'superadmin123') {
			res.json({
				success: true,
				token: 'super-admin-token',
				role: 'super_admin',
				fullName: 'Super Administrator',
				email: 'superadmin@cbt-system.com'
			});
		}
		// Check for managed admin credentials
		else if (username === 'managedadmin' && password === 'managedadmin123') {
			res.json({
				success: true,
				token: 'managed-admin-token',
				role: 'managed_admin',
				fullName: 'Managed Administrator',
				email: 'managedadmin@cbt-system.com'
			});
		}
		// Check for regular admin credentials
		else if (username === 'admin' && password === 'admin123') {
			res.json({
				success: true,
				token: 'admin-token',
				role: 'admin',
				fullName: 'System Administrator',
				email: 'admin@healthschool.com'
			});
		}
		else {
			res.status(401).json({ 
				success: false, 
				message: 'Invalid credentials' 
			});
		}
	} catch (error) {
		res.status(500).json({ 
			success: false, 
			message: 'Authentication error' 
		});
	}
});

// Read-only API routes
app.get('/api/exams', async (req, res, next) => {
	try {
		const items = await Exam.find({}).lean();
		res.json(items);
	} catch (err) { next(err); }
});

app.get('/api/questions', async (req, res, next) => {
	try {
		const items = await Question.find({}).lean();
		res.json(items);
	} catch (err) { next(err); }
});

app.get('/api/results', async (req, res, next) => {
	try {
		const items = await Result.find({}).lean();
		res.json(items);
	} catch (err) { next(err); }
});

app.get('/api/users', async (req, res, next) => {
	try {
		const items = await User.find({}).select('-password').lean();
		res.json(items);
	} catch (err) { next(err); }
});

 // Multi-tenant authentication endpoint
 app.post('/api/auth/login', async (req, res, next) => {
 	try {
 		const { username, password, tenant_slug } = req.body;
 		
 		if (!username || !password) {
 			return res.status(400).json({ error: 'Username and password are required' });
 		}
 		
 		// Find tenant by slug
 		const tenant = await Tenant.findOne({ 
 			slug: tenant_slug,
 			deleted_at: null,
 			suspended: false
 		});
 		
 		if (!tenant) {
 			return res.status(401).json({ error: 'Invalid tenant or tenant is suspended' });
 		}
 		
 		// Find user by username within tenant (case-insensitive)
 		const user = await User.findOne({ 
 			tenant_id: tenant._id,
 			username: { $regex: new RegExp(`^${username}$`, 'i') },
 			is_active: true
 		});
 		
 		if (!user) {
 			return res.status(401).json({ error: 'Invalid credentials' });
 		}
 		
 		// Check password
 		if (user.password !== password) {
 			return res.status(401).json({ error: 'Invalid credentials' });
 		}
 		
 		// Update last login
 		user.last_login = new Date();
 		await user.save();
 		
 		// Return user data with tenant info
 		const { password: _, ...userData } = user.toObject();
 		res.json({
 			...userData,
 			tenant: {
 				id: tenant._id,
 				name: tenant.name,
 				slug: tenant.slug,
 				logo_url: tenant.logo_url,
 				plan: tenant.plan
 			}
 		});
 		
 	} catch (err) { next(err); }
 });

// Initialize admin user endpoint - only creates the default admin if no admin exists
app.post('/api/init-admin', async (req, res, next) => {
	try {
		// Check if any admin user exists
		const existingAdmin = await User.findOne({ role: 'admin' });
		
		if (existingAdmin) {
			return res.json({ 
				message: 'Admin user already exists',
				exists: true 
			});
		}
		
		// Create default admin user only if no admin exists
		const adminUser = new User({
			username: 'admin',
			password: 'admin123',
			role: 'admin',
			fullName: 'System Administrator',
			email: 'admin@healthschool.com',
			createdAt: new Date(),
			isDefaultAdmin: true,
			canDeleteDefaultAdmin: true
		});
		
		await adminUser.save();
		
		res.status(201).json({
			message: 'Default admin user created successfully',
			exists: false,
			user: {
				username: adminUser.username,
				role: adminUser.role,
				fullName: adminUser.fullName,
				email: adminUser.email,
				isDefaultAdmin: true
			}
		});
		
	} catch (err) { next(err); }
});

// Create new admin user (only default admin can do this)
app.post('/api/admin/create', async (req, res, next) => {
	try {
		const { username, password, fullName, email, requestingAdmin } = req.body;
		
		if (!username || !password || !fullName || !email || !requestingAdmin) {
			return res.status(400).json({ error: 'All fields are required' });
		}
		
		// Check if requesting user is the default admin
		const defaultAdmin = await User.findOne({ 
			username: requestingAdmin,
			isDefaultAdmin: true 
		});
		
		if (!defaultAdmin) {
			return res.status(403).json({ error: 'Only the default admin can create new admin users' });
		}
		
		// Check if username already exists
		const existingUser = await User.findOne({ 
			username: { $regex: new RegExp(`^${username}$`, 'i') }
		});
		
		if (existingUser) {
			return res.status(400).json({ error: 'Username already exists' });
		}
		
		// Create new admin user
		const newAdmin = new User({
			username,
			password,
			role: 'admin',
			fullName,
			email,
			createdAt: new Date(),
			isDefaultAdmin: false,
			createdBy: requestingAdmin,
			canDeleteDefaultAdmin: false
		});
		
		await newAdmin.save();
		
		res.status(201).json({
			message: 'Admin user created successfully',
			user: {
				username: newAdmin.username,
				role: newAdmin.role,
				fullName: newAdmin.fullName,
				email: newAdmin.email,
				isDefaultAdmin: false,
				createdBy: newAdmin.createdBy
			}
		});
		
	} catch (err) { next(err); }
});

// Delete admin user (only default admin can delete other admins)
app.delete('/api/admin/:username', async (req, res, next) => {
	try {
		const { username } = req.params;
		const { requestingAdmin } = req.body;
		
		if (!requestingAdmin) {
			return res.status(400).json({ error: 'Requesting admin username is required' });
		}
		
		// Check if requesting user is the default admin
		const defaultAdmin = await User.findOne({ 
			username: requestingAdmin,
			isDefaultAdmin: true 
		});
		
		if (!defaultAdmin) {
			return res.status(403).json({ error: 'Only the default admin can delete admin users' });
		}
		
		// Prevent deletion of the default admin
		if (username.toLowerCase() === 'admin') {
			return res.status(403).json({ error: 'Cannot delete the default admin user' });
		}
		
		// Find and delete the admin user
		const adminToDelete = await User.findOne({ 
			username: { $regex: new RegExp(`^${username}$`, 'i') },
			role: 'admin'
		});
		
		if (!adminToDelete) {
			return res.status(404).json({ error: 'Admin user not found' });
		}
		
		await User.findByIdAndDelete(adminToDelete._id);
		
		res.json({
			message: 'Admin user deleted successfully',
			deletedUser: {
				username: adminToDelete.username,
				fullName: adminToDelete.fullName
			}
		});
		
	} catch (err) { next(err); }
});

// Get all admin users (only default admin can see this)
app.get('/api/admin/list', async (req, res, next) => {
	try {
		const { requestingAdmin } = req.query;
		
		if (!requestingAdmin) {
			return res.status(400).json({ error: 'Requesting admin username is required' });
		}
		
		// Check if requesting user is the default admin
		const defaultAdmin = await User.findOne({ 
			username: requestingAdmin,
			isDefaultAdmin: true 
		});
		
		if (!defaultAdmin) {
			return res.status(403).json({ error: 'Only the default admin can view admin list' });
		}
		
		// Get all admin users
		const adminUsers = await User.find({ role: 'admin' })
			.select('-password')
			.lean();
		
		res.json(adminUsers);
		
	} catch (err) { next(err); }
});

// POST endpoints for creating/updating data
app.post('/api/users', async (req, res, next) => {
	try {
		const users = req.body;
		
		// Clear existing users and insert new ones
		await User.deleteMany({});
		
		// Insert all users (including admin)
		const createdUsers = await User.insertMany(users);
		
		res.status(201).json({
			message: 'Users updated successfully',
			count: createdUsers.length
		});
	} catch (err) { next(err); }
});

app.post('/api/exams', async (req, res, next) => {
	try {
		const exams = req.body;
		
		// Clear existing exams and insert new ones
		await Exam.deleteMany({});
		
		// Insert all exams
		const createdExams = await Exam.insertMany(exams);
		
		res.status(201).json({
			message: 'Exams updated successfully',
			count: createdExams.length
		});
	} catch (err) { next(err); }
});

app.post('/api/questions', async (req, res, next) => {
	try {
		const questions = req.body;
		
		// Clear existing questions and insert new ones
		await Question.deleteMany({});
		
		// Insert all questions
		const createdQuestions = await Question.insertMany(questions);
		
		res.status(201).json({
			message: 'Questions updated successfully',
			count: createdQuestions.length
		});
	} catch (err) { next(err); }
});

app.post('/api/results', async (req, res, next) => {
	try {
		const results = req.body;
		
		// Clear existing results and insert new ones
		await Result.deleteMany({});
		
		// Insert all results
		const createdResults = await Result.insertMany(results);
		
		res.status(201).json({
			message: 'Results updated successfully',
			count: createdResults.length
		});
	} catch (err) { next(err); }
});

// Test endpoint for Managed Admin
app.get('/api/v1/test', async (req, res) => {
    try {
        res.json({ 
            message: 'Test endpoint working',
            timestamp: new Date().toISOString(),
            server_version: '2.0.0-simplified',
            models: {
                tenant: 'Tenant model loaded',
                user: 'User model loaded',
                auditLog: 'AuditLog model loaded'
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Simple test tenant creation endpoint
app.post('/api/v1/test-tenant', async (req, res) => {
    try {
        console.log('Test tenant creation:', req.body);
        res.status(201).json({
            message: 'Test tenant created successfully',
            data: req.body,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// FINAL REAL DATABASE TENANT CREATION ENDPOINT
app.post('/api/v1/managed-admin/tenants', async (req, res) => {
    try {
        console.log('Received tenant creation request:', req.body);
        
        const { name, address, contact_phone, plan, timezone, default_admin } = req.body;
        
                 // Validate required fields
         if (!name || !default_admin?.email || !default_admin?.username) {
             return res.status(400).json({ error: 'Missing required fields: name, default_admin.email, and default_admin.username' });
         }
        
        // Generate slug from name
        const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        
        // Check if slug already exists
        const existingTenant = await Tenant.findOne({ slug });
        if (existingTenant) {
            return res.status(400).json({ error: 'Institution with this name already exists' });
        }
        
                 // Create tenant in database
         const tenant = new Tenant({
             name: name,
             slug: slug,
             address: address || '',
             contact_email: default_admin.email,
             contact_phone: contact_phone || '',
             plan: plan || 'basic',
             timezone: timezone || 'UTC',
             suspended: false,
             default_admin: {
                 username: default_admin.username,
                 email: default_admin.email,
                 fullName: default_admin.fullName,
                 phone: default_admin.phone || '',
                 password: default_admin.password
             }
         });
         
         await tenant.save();
         
         // Create default admin user
         const defaultAdminUser = new User({
             tenant_id: tenant._id,
             username: default_admin.username,
             email: default_admin.email,
             fullName: default_admin.fullName,
             phone: default_admin.phone || '',
             password: default_admin.password,
             role: 'tenant_admin',
             is_default_admin: true,
             is_active: true
         });
         
         await defaultAdminUser.save();
        
        res.status(201).json({
            message: '✅ TENANT SAVED TO REAL DATABASE - DEPLOYMENT WORKING',
            tenant: {
                id: tenant._id,
                name: tenant.name,
                slug: tenant.slug,
                contact_email: tenant.contact_email,
                plan: tenant.plan,
                created_at: tenant.created_at
            },
                         default_admin: {
                 id: 'admin-' + Date.now(),
                 email: default_admin.email,
                 username: default_admin.username,
                 fullName: default_admin.fullName,
                 temp_password: default_admin.password
             }
        });
        
    } catch (error) {
        console.error('Error creating tenant:', error);
        res.status(500).json({ error: 'Failed to create tenant' });
    }
});

// Simple tenant listing endpoint (temporary workaround)
app.get('/api/v1/managed-admin/tenants', async (req, res) => {
    try {
                 // Fetch all tenants from database (not deleted)
         const tenants = await Tenant.find({ deleted_at: null })
             .select('name slug contact_email plan suspended created_at default_admin')
             .sort({ created_at: -1 })
             .lean();
        
        res.json({
            tenants: tenants,
            total: tenants.length,
            page: 1,
            totalPages: 1
        });
    } catch (error) {
        console.error('Error fetching tenants:', error);
        res.status(500).json({ error: 'Failed to fetch tenants' });
    }
});

// Remove tenant endpoint
app.delete('/api/v1/managed-admin/tenants/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Find the tenant
        const tenant = await Tenant.findById(id);
        if (!tenant) {
            return res.status(404).json({ error: 'Tenant not found' });
        }
        
        // Soft delete by setting deleted_at timestamp
        tenant.deleted_at = new Date();
        await tenant.save();
        
        res.json({
            message: 'Tenant removed successfully',
            tenant: {
                id: tenant._id,
                name: tenant.name,
                slug: tenant.slug
            }
        });
        
    } catch (error) {
        console.error('Error removing tenant:', error);
        res.status(500).json({ error: 'Failed to remove tenant' });
    }
});

// Suspend/Activate tenant endpoint
app.patch('/api/v1/managed-admin/tenants/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { suspended } = req.body;
        
        // Find the tenant
        const tenant = await Tenant.findById(id);
        if (!tenant) {
            return res.status(404).json({ error: 'Tenant not found' });
        }
        
        // Update suspension status
        tenant.suspended = suspended;
        await tenant.save();
        
        res.json({
            message: `Tenant ${suspended ? 'suspended' : 'activated'} successfully`,
            tenant: {
                id: tenant._id,
                name: tenant.name,
                slug: tenant.slug,
                suspended: tenant.suspended
            }
        });
        
    } catch (error) {
        console.error('Error updating tenant status:', error);
        res.status(500).json({ error: 'Failed to update tenant status' });
    }
});

 // Profile management endpoints
 app.get('/api/tenant/:slug/profile', async (req, res) => {
     try {
         const { slug } = req.params;
         
         const tenant = await Tenant.findOne({ 
             slug: slug,
             deleted_at: null,
             suspended: false
         });
         
         if (!tenant) {
             return res.status(404).json({ error: 'Tenant not found' });
         }
         
         res.json({
             name: tenant.name,
             logo_url: tenant.logo_url,
             address: tenant.address,
             contact_email: tenant.contact_email,
             contact_phone: tenant.contact_phone,
             plan: tenant.plan,
             timezone: tenant.timezone
         });
     } catch (error) {
         console.error('Error fetching tenant profile:', error);
         res.status(500).json({ error: 'Failed to fetch profile' });
     }
 });
 
 app.put('/api/tenant/:slug/profile', async (req, res) => {
     try {
         const { slug } = req.params;
         const { name, logo_url, address, contact_phone } = req.body;
         
         const tenant = await Tenant.findOne({ 
             slug: slug,
             deleted_at: null,
             suspended: false
         });
         
         if (!tenant) {
             return res.status(404).json({ error: 'Tenant not found' });
         }
         
         // Update tenant profile
         if (name) tenant.name = name;
         if (logo_url) tenant.logo_url = logo_url;
         if (address) tenant.address = address;
         if (contact_phone) tenant.contact_phone = contact_phone;
         
         await tenant.save();
         
         res.json({
             message: 'Profile updated successfully',
             tenant: {
                 name: tenant.name,
                 logo_url: tenant.logo_url,
                 address: tenant.address,
                 contact_email: tenant.contact_email,
                 contact_phone: tenant.contact_phone,
                 plan: tenant.plan
             }
         });
     } catch (error) {
         console.error('Error updating tenant profile:', error);
         res.status(500).json({ error: 'Failed to update profile' });
     }
 });
 
 // Admin management endpoints
 app.get('/api/tenant/:slug/admins', async (req, res) => {
     try {
         const { slug } = req.params;
         
         const tenant = await Tenant.findOne({ slug: slug, deleted_at: null });
         if (!tenant) {
             return res.status(404).json({ error: 'Tenant not found' });
         }
         
         const admins = await User.find({ 
             tenant_id: tenant._id,
             role: 'tenant_admin',
             is_active: true
         }).select('-password').lean();
         
         res.json(admins);
     } catch (error) {
         console.error('Error fetching admins:', error);
         res.status(500).json({ error: 'Failed to fetch admins' });
     }
 });
 
 app.post('/api/tenant/:slug/admins', async (req, res) => {
     try {
         const { slug } = req.params;
         const { username, email, fullName, phone, password, requesting_user_id } = req.body;
         
         const tenant = await Tenant.findOne({ slug: slug, deleted_at: null });
         if (!tenant) {
             return res.status(404).json({ error: 'Tenant not found' });
         }
         
         // Check if requesting user is default admin
         const requestingUser = await User.findOne({ 
             _id: requesting_user_id,
             tenant_id: tenant._id,
             is_default_admin: true
         });
         
         if (!requestingUser) {
             return res.status(403).json({ error: 'Only default admin can create new admins' });
         }
         
         // Check if username already exists in tenant
         const existingUser = await User.findOne({ 
             tenant_id: tenant._id,
             username: { $regex: new RegExp(`^${username}$`, 'i') }
         });
         
         if (existingUser) {
             return res.status(400).json({ error: 'Username already exists' });
         }
         
         // Create new admin
         const newAdmin = new User({
             tenant_id: tenant._id,
             username,
             email,
             fullName,
             phone: phone || '',
             password,
             role: 'tenant_admin',
             is_default_admin: false,
             is_active: true
         });
         
         await newAdmin.save();
         
         const { password: _, ...adminData } = newAdmin.toObject();
         res.status(201).json({
             message: 'Admin created successfully',
             admin: adminData
         });
     } catch (error) {
         console.error('Error creating admin:', error);
         res.status(500).json({ error: 'Failed to create admin' });
     }
 });
 
 app.delete('/api/tenant/:slug/admins/:admin_id', async (req, res) => {
     try {
         const { slug, admin_id } = req.params;
         const { requesting_user_id } = req.body;
         
         const tenant = await Tenant.findOne({ slug: slug, deleted_at: null });
         if (!tenant) {
             return res.status(404).json({ error: 'Tenant not found' });
         }
         
         // Check if requesting user is default admin
         const requestingUser = await User.findOne({ 
             _id: requesting_user_id,
             tenant_id: tenant._id,
             is_default_admin: true
         });
         
         if (!requestingUser) {
             return res.status(403).json({ error: 'Only default admin can remove admins' });
         }
         
         // Find admin to remove
         const adminToRemove = await User.findOne({ 
             _id: admin_id,
             tenant_id: tenant._id,
             role: 'tenant_admin',
             is_default_admin: false
         });
         
         if (!adminToRemove) {
             return res.status(404).json({ error: 'Admin not found' });
         }
         
         await User.findByIdAndDelete(admin_id);
         
         res.json({
             message: 'Admin removed successfully',
             removed_admin: {
                 username: adminToRemove.username,
                 fullName: adminToRemove.fullName
             }
         });
     } catch (error) {
         console.error('Error removing admin:', error);
         res.status(500).json({ error: 'Failed to remove admin' });
     }
 });
 
 // Mount new routes (commented out for now)
 // app.use('/api/v1/managed-admin', managedAdminRoutes);
 // app.use('/api/v1/database', databaseRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
	console.error(err.stack);
	res.status(500).json({ 
		error: 'Something went wrong!',
		message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
	});
});

// 404 handler
app.use('*', (req, res) => {
	res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
	console.log(`🚀 CBT Backend server running on port ${PORT}`);
	console.log(`📊 Health check: http://localhost:${PORT}/health`);
	console.log(`🔗 API base: http://localhost:${PORT}/api`);
	console.log(`🗄️ Database: ${process.env.DB_TYPE || 'mongodb'}`);
});

module.exports = app; 