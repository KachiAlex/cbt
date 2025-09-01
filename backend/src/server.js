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

// Middleware
const { authenticateMultiTenantAdmin, loginMultiTenantAdmin } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to database
connectDB();

// Middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000', 
      'http://localhost:5000', 
      'https://cbt.netlify.app', 
      'https://cbtexam.netlify.app'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin', 'Accept'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

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
		version: '2.0.8-FINAL', // Fixed User model enum to include admin role
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

// Multi-tenant admin authentication middleware (already imported above)

// Multi-tenant admin login endpoint
app.options('/api/multi-tenant-admin/login', cors());
app.post('/api/multi-tenant-admin/login', cors(), loginMultiTenantAdmin);

// Multi-tenant admin routes (moved to line 1018)

// GET /api/tenants endpoint moved to line 1099

// DELETE /api/tenants/:slug endpoint moved to line 1114

// PATCH /api/tenants/:slug/toggle-status endpoint moved to line 1153

// Profile endpoints moved to line 1185 and 1215

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

// Institution-specific landing page
app.get('/institution/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        
        // Find the institution
        const tenant = await Tenant.findOne({ 
            slug: slug,
            deleted_at: null,
            suspended: false
        });
        
        if (!tenant) {
            return res.status(404).send(`
                <html>
                    <head><title>Institution Not Found</title></head>
                    <body>
                        <h1>Institution Not Found</h1>
                        <p>The requested institution does not exist or has been suspended.</p>
                    </body>
                </html>
            `);
        }
        
        // Serve institution-specific login page
        const loginPage = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${tenant.name} - CBT System</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
                .gradient-bg { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
            </style>
        </head>
        <body class="gradient-bg min-h-screen">
            <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div class="max-w-md w-full space-y-8">
                    <div class="text-center">
                        ${tenant.logo_url ? `<img class="mx-auto h-20 w-auto mb-4" src="${tenant.logo_url}" alt="${tenant.name} Logo">` : ''}
                        <h2 class="mt-6 text-center text-3xl font-extrabold text-white">
                            ${tenant.name}
                        </h2>
                        <p class="mt-2 text-center text-sm text-gray-200">
                            Computer-Based Test System
                        </p>
                    </div>
                    
                    <div class="bg-white rounded-lg shadow-xl p-8">
                        <div class="mb-6">
                            <h3 class="text-lg font-medium text-gray-900 mb-4">Sign in to your account</h3>
                            
                            <div class="space-y-4">
                                <button onclick="showAdminLogin()" class="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                    Admin Login
                                </button>
                                
                                <button onclick="showStudentLogin()" class="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                                    Student Login
                                </button>
                            </div>
                        </div>
                        
                        <!-- Admin Login Form -->
                        <div id="adminLoginForm" class="hidden">
                            <form onsubmit="handleAdminLogin(event)" class="space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Username</label>
                                    <input type="text" id="adminUsername" required class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Password</label>
                                    <input type="password" id="adminPassword" required class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                                </div>
                                <div class="flex space-x-3">
                                    <button type="submit" class="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">Login</button>
                                    <button type="button" onclick="hideForms()" class="flex-1 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600">Cancel</button>
                                </div>
                            </form>
                        </div>
                        
                        <!-- Student Login Form -->
                        <div id="studentLoginForm" class="hidden">
                            <form onsubmit="handleStudentLogin(event)" class="space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Student ID</label>
                                    <input type="text" id="studentId" required class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Password</label>
                                    <input type="password" id="studentPassword" required class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                                </div>
                                <div class="flex space-x-3">
                                    <button type="submit" class="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">Login</button>
                                    <button type="button" onclick="hideForms()" class="flex-1 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600">Cancel</button>
                                </div>
                            </form>
                        </div>
                        
                        <div id="errorMessage" class="hidden mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded"></div>
                    </div>
                </div>
            </div>
            
            <script>
                const institutionSlug = '${tenant.slug}';
                const institutionName = '${tenant.name}';
                
                function showAdminLogin() {
                    document.getElementById('adminLoginForm').classList.remove('hidden');
                    document.getElementById('studentLoginForm').classList.add('hidden');
                    document.getElementById('errorMessage').classList.add('hidden');
                }
                
                function showStudentLogin() {
                    document.getElementById('studentLoginForm').classList.remove('hidden');
                    document.getElementById('adminLoginForm').classList.add('hidden');
                    document.getElementById('errorMessage').classList.add('hidden');
                }
                
                function hideForms() {
                    document.getElementById('adminLoginForm').classList.add('hidden');
                    document.getElementById('studentLoginForm').classList.add('hidden');
                    document.getElementById('errorMessage').classList.add('hidden');
                }
                
                async function handleAdminLogin(event) {
                    event.preventDefault();
                    
                    const username = document.getElementById('adminUsername').value;
                    const password = document.getElementById('adminPassword').value;
                    
                    try {
                        const response = await fetch('/api/auth/login', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                username,
                                password,
                                tenant_slug: institutionSlug,
                                user_type: 'admin'
                            })
                        });
                        
                        const data = await response.json();
                        
                        if (response.ok) {
                            // Store user data
                            localStorage.setItem('user', JSON.stringify(data));
                            localStorage.setItem('tenant', JSON.stringify(data.tenant));
                            localStorage.setItem('userType', 'admin');
                            
                                                         // Redirect to frontend admin dashboard
                             window.location.href = 'https://cbt.netlify.app/admin-dashboard';
                        } else {
                            showError(data.error || 'Login failed');
                        }
                    } catch (error) {
                        showError('Network error. Please try again.');
                    }
                }
                
                async function handleStudentLogin(event) {
                    event.preventDefault();
                    
                    const studentId = document.getElementById('studentId').value;
                    const password = document.getElementById('studentPassword').value;
                    
                    try {
                        const response = await fetch('/api/auth/login', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                username: studentId,
                                password,
                                tenant_slug: institutionSlug,
                                user_type: 'student'
                            })
                        });
                        
                        const data = await response.json();
                        
                        if (response.ok) {
                            // Store user data
                            localStorage.setItem('user', JSON.stringify(data));
                            localStorage.setItem('tenant', JSON.stringify(data.tenant));
                            localStorage.setItem('userType', 'student');
                            
                                                         // Redirect to frontend student dashboard
                             window.location.href = 'https://cbt.netlify.app/student-dashboard';
                        } else {
                            showError(data.error || 'Login failed');
                        }
                    } catch (error) {
                        showError('Network error. Please try again.');
                    }
                }
                
                function showError(message) {
                    const errorDiv = document.getElementById('errorMessage');
                    errorDiv.textContent = message;
                    errorDiv.classList.remove('hidden');
                }
            </script>
        </body>
        </html>
        `;
        
        res.send(loginPage);
        
    } catch (error) {
        console.error('Error serving institution page:', error);
        res.status(500).send('Internal server error');
    }
});

// Institution-specific authentication endpoint
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password, tenant_slug, user_type } = req.body;
        
        // Handle managed admin login (no tenant_slug required)
        if (!tenant_slug) {
            // Check for super admin credentials
            if (username === 'superadmin' && password === 'superadmin123') {
                return res.json({
                    success: true,
                    token: 'super-admin-token',
                    role: 'super_admin',
                    fullName: 'Super Administrator',
                    email: 'superadmin@cbt-system.com'
                });
            }
            // Check for managed admin credentials
            else if (username === 'managedadmin' && password === 'managedadmin123') {
                return res.json({
                    success: true,
                    token: 'managed-admin-token',
                    role: 'managed_admin',
                    fullName: 'Managed Administrator',
                    email: 'managedadmin@cbt-system.com'
                });
            }
            // Check for regular admin credentials
            else if (username === 'admin' && password === 'admin123') {
                return res.json({
                    success: true,
                    token: 'admin-token',
                    role: 'admin',
                    fullName: 'System Administrator',
                    email: 'admin@healthschool.com'
                });
            }
            else {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Invalid credentials' 
                });
            }
        }
        
        // Institution-specific login
        if (!username || !password || !tenant_slug) {
            return res.status(400).json({ error: 'Username, password, and institution are required' });
        }
        
        // Find tenant by slug
        const tenant = await Tenant.findOne({ 
            slug: tenant_slug,
            deleted_at: null,
            suspended: false
        });
        
        if (!tenant) {
            return res.status(401).json({ error: 'Invalid institution or institution is suspended' });
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
        
        // Validate user type if specified
        if (user_type && user.role !== user_type) {
            return res.status(401).json({ error: 'Invalid user type for this login' });
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
        
    } catch (err) { 
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
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

// ===== MULTI-TENANT ADMIN API ENDPOINTS =====

// CORS preflight for login endpoint
app.options('/api/multi-tenant-admin/login', cors());

// Login endpoint for multi-tenant admin
app.post('/api/multi-tenant-admin/login', cors(), loginMultiTenantAdmin);

// Protected routes - require authentication
app.post('/api/tenants', cors(), authenticateMultiTenantAdmin, async (req, res) => {
  try {
    console.log('Received tenant creation request:', req.body);
    
    const { name, address, contact_phone, plan, timezone, default_admin } = req.body;
    
    // Validate required fields
    if (!name || !default_admin?.email || !default_admin?.username) {
      return res.status(400).json({ error: 'Missing required fields: name, default_admin.email, and default_admin.username' });
    }
    
    // Generate slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    
    // Check if slug already exists (only for active tenants)
    const existingTenant = await Tenant.findOne({ slug, deleted_at: null });
    if (existingTenant) {
      return res.status(400).json({ error: 'Institution with this name already exists' });
    }
    
    // Create tenant in database
    console.log('Plan value before tenant creation:', plan);
    console.log('Plan type:', typeof plan);
    
    const tenant = new Tenant({
      name: name,
      slug: slug,
      address: address || '',
      contact_email: default_admin.email,
      contact_phone: contact_phone || '',
      plan: plan || 'Basic',
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
    
    console.log('Tenant plan value:', tenant.plan);
    
    await tenant.save();
    
    // Create default admin user
    const defaultAdminUser = new User({
      tenant_id: tenant._id,
      username: default_admin.username,
      email: default_admin.email,
      fullName: default_admin.fullName,
      phone: default_admin.phone || '',
      password: default_admin.password,
      role: 'admin', // Changed from 'tenant_admin' to 'admin'
      is_default_admin: true,
      is_active: true
    });
    
    await defaultAdminUser.save();
    
    res.status(201).json({
      message: '✅ Tenant created successfully in MongoDB Atlas',
      tenant: {
        id: tenant._id,
        name: tenant.name,
        slug: tenant.slug,
        contact_email: tenant.contact_email,
        plan: tenant.plan,
        created_at: tenant.createdAt
      },
      default_admin: {
        id: defaultAdminUser._id,
        email: default_admin.email,
        username: default_admin.username,
        fullName: default_admin.fullName
      }
    });
    
  } catch (error) {
    console.error('Error creating tenant:', error);
    console.error('Error details:', error.message);
    if (error.name === 'ValidationError') {
      console.error('Validation errors:', error.errors);
    }
    res.status(500).json({ error: 'Failed to create tenant: ' + error.message });
  }
});

// Get all tenants endpoint
app.get('/api/tenants', cors(), authenticateMultiTenantAdmin, async (req, res) => {
  try {
    const tenants = await Tenant.find({ deleted_at: null })
      .select('name slug contact_email plan suspended createdAt default_admin')
      .sort({ createdAt: -1 })
      .lean();
    
    res.json(tenants);
  } catch (error) {
    console.error('Error fetching tenants:', error);
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
});

// Delete tenant endpoint
app.delete('/api/tenants/:slug', cors(), authenticateMultiTenantAdmin, async (req, res) => {
  try {
    const { slug } = req.params;
    const { hard, force } = req.query;
    console.log(`Attempting to delete tenant with slug: ${slug}, hard: ${hard}, force: ${force}`);
    
    // Find the tenant - try without deleted_at filter first
    let tenant = await Tenant.findOne({ slug });
    if (!tenant) {
      console.log(`Tenant not found with slug: ${slug}`);
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    console.log(`Found tenant: ${tenant.name} (ID: ${tenant._id})`);
    
    // Check if this is a hard delete
    if (hard === 'true' && force === 'true') {
      console.log(`Performing HARD DELETE for tenant: ${tenant.name}`);
      
      // Hard delete all users associated with this tenant
      try {
        const userDeleteResult = await User.deleteMany({ tenant_id: tenant._id });
        console.log(`Hard deleted ${userDeleteResult.deletedCount} users`);
      } catch (userError) {
        console.log(`Warning: Could not delete users: ${userError.message}`);
      }
      
      // Hard delete all exams associated with this tenant
      try {
        const examDeleteResult = await Exam.deleteMany({ tenant_id: tenant._id });
        console.log(`Hard deleted ${examDeleteResult.deletedCount} exams`);
      } catch (examError) {
        console.log(`Warning: Could not delete exams: ${examError.message}`);
      }
      
      // Hard delete all questions associated with this tenant
      try {
        const questionDeleteResult = await Question.deleteMany({ tenant_id: tenant._id });
        console.log(`Hard deleted ${questionDeleteResult.deletedCount} questions`);
      } catch (questionError) {
        console.log(`Warning: Could not delete questions: ${questionError.message}`);
      }
      
      // Hard delete all results associated with this tenant
      try {
        const resultDeleteResult = await Result.deleteMany({ tenant_id: tenant._id });
        console.log(`Hard deleted ${resultDeleteResult.deletedCount} results`);
      } catch (resultError) {
        console.log(`Warning: Could not delete results: ${resultError.message}`);
      }
      
      // Hard delete the tenant itself
      try {
        await Tenant.findByIdAndDelete(tenant._id);
        console.log(`Successfully hard-deleted tenant: ${tenant.name}`);
      } catch (tenantError) {
        console.log(`Error hard-deleting tenant: ${tenantError.message}`);
        throw tenantError;
      }
      
      res.json({
        message: 'Tenant and all associated data permanently deleted from database',
        tenant: {
          id: tenant._id,
          name: tenant.name,
          slug: tenant.slug
        }
      });
      
    } else {
      // Soft delete (original behavior)
      console.log(`Performing SOFT DELETE for tenant: ${tenant.name}`);
      
      // Try to soft delete all users associated with this tenant
      try {
        const userUpdateResult = await User.updateMany(
      { tenant_id: tenant._id },
      { 
        is_active: false,
        updatedAt: new Date()
      }
    );
        console.log(`Updated ${userUpdateResult.modifiedCount} users`);
      } catch (userError) {
        console.log(`Warning: Could not update users: ${userError.message}`);
      }
    
    // Soft delete the tenant by setting deleted_at timestamp
      try {
    tenant.deleted_at = new Date();
    await tenant.save();
        console.log(`Successfully soft-deleted tenant: ${tenant.name}`);
      } catch (saveError) {
        console.log(`Error saving tenant: ${saveError.message}`);
        // Try alternative approach - direct database update
        try {
          await Tenant.updateOne(
            { _id: tenant._id },
            { deleted_at: new Date() }
          );
          console.log(`Successfully updated tenant via direct update`);
        } catch (updateError) {
          console.log(`Error updating tenant: ${updateError.message}`);
          throw updateError;
        }
      }
    
    res.json({
        message: 'Tenant soft-deleted successfully',
      tenant: {
        id: tenant._id,
        name: tenant.name,
        slug: tenant.slug
      }
    });
    }
    
  } catch (error) {
    console.error('Error deleting tenant:', error);
    res.status(500).json({ error: 'Failed to delete tenant: ' + error.message });
  }
});

// Toggle tenant status endpoint
app.patch('/api/tenants/:slug/toggle-status', cors(), authenticateMultiTenantAdmin, async (req, res) => {
  try {
    const { slug } = req.params;
    const { suspended } = req.body;
    console.log(`Attempting to toggle status for tenant: ${slug}, suspended: ${suspended}`);
    
    // Find the tenant - try without deleted_at filter first
    let tenant = await Tenant.findOne({ slug });
    if (!tenant) {
      console.log(`Tenant not found with slug: ${slug}`);
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    console.log(`Found tenant: ${tenant.name} (ID: ${tenant._id})`);
    
    // Update suspension status
    try {
    tenant.suspended = suspended;
    await tenant.save();
      console.log(`Successfully updated tenant status: ${tenant.name}`);
    } catch (saveError) {
      console.log(`Error saving tenant: ${saveError.message}`);
      // Try alternative approach - direct database update
      try {
        await Tenant.updateOne(
          { _id: tenant._id },
          { suspended: suspended }
        );
        console.log(`Successfully updated tenant status via direct update`);
      } catch (updateError) {
        console.log(`Error updating tenant: ${updateError.message}`);
        throw updateError;
      }
    }
    
    res.json({
      message: `Tenant ${suspended ? 'suspended' : 'activated'} successfully`,
      tenant: {
        id: tenant._id,
        name: tenant.name,
        slug: tenant.slug,
        suspended: suspended
      }
    });
    
  } catch (error) {
    console.error('Error updating tenant status:', error);
    res.status(500).json({ error: 'Failed to update tenant status: ' + error.message });
  }
});

// Get tenant profile endpoint
app.get('/api/tenant/:slug/profile', cors(), async (req, res) => {
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

// Update tenant profile endpoint
app.put('/api/tenant/:slug/profile', cors(), async (req, res) => {
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
 
 // Mount new routes (commented out for now)
 // app.use('/api/v1/managed-admin', managedAdminRoutes);
 // app.use('/api/v1/database', databaseRoutes);

// Admin Dashboard for institution users
app.get('/admin-dashboard', (req, res) => {
    const dashboardPage = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Admin Dashboard - CBT System</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100">
        <div id="app" class="min-h-screen">
            <nav class="bg-white shadow-sm border-b">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="flex justify-between h-16">
                        <div class="flex items-center">
                            <h1 class="text-xl font-semibold text-gray-900">CBT Admin Dashboard</h1>
                        </div>
                        <div class="flex items-center space-x-4">
                            <span id="institutionName" class="text-sm text-gray-700"></span>
                            <button onclick="logout()" class="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700">Logout</button>
                        </div>
                    </div>
                </div>
            </nav>
            
            <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div class="px-4 py-6 sm:px-0">
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div class="bg-white overflow-hidden shadow rounded-lg">
                            <div class="p-5">
                                <div class="flex items-center">
                                    <div class="flex-shrink-0">
                                        <div class="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">
                                            <span class="text-white font-bold">E</span>
                                        </div>
                                    </div>
                                    <div class="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt class="text-sm font-medium text-gray-500 truncate">Exams</dt>
                                            <dd class="text-lg font-medium text-gray-900">Manage Exams</dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="bg-white overflow-hidden shadow rounded-lg">
                            <div class="p-5">
                                <div class="flex items-center">
                                    <div class="flex-shrink-0">
                                        <div class="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                                            <span class="text-white font-bold">S</span>
                                        </div>
                                    </div>
                                    <div class="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt class="text-sm font-medium text-gray-500 truncate">Students</dt>
                                            <dd class="text-lg font-medium text-gray-900">Manage Students</dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="bg-white overflow-hidden shadow rounded-lg">
                            <div class="p-5">
                                <div class="flex items-center">
                                    <div class="flex-shrink-0">
                                        <div class="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                                            <span class="text-white font-bold">R</span>
                                        </div>
                                    </div>
                                    <div class="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt class="text-sm font-medium text-gray-500 truncate">Results</dt>
                                            <dd class="text-lg font-medium text-gray-900">View Results</dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="bg-white overflow-hidden shadow rounded-lg">
                            <div class="p-5">
                                <div class="flex items-center">
                                    <div class="flex-shrink-0">
                                        <div class="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                                            <span class="text-white font-bold">P</span>
                                        </div>
                                    </div>
                                    <div class="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt class="text-sm font-medium text-gray-500 truncate">Profile</dt>
                                            <dd class="text-lg font-medium text-gray-900">Institution Profile</dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="bg-white overflow-hidden shadow rounded-lg">
                            <div class="p-5">
                                <div class="flex items-center">
                                    <div class="flex-shrink-0">
                                        <div class="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                                            <span class="text-white font-bold">A</span>
                                        </div>
                                    </div>
                                    <div class="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt class="text-sm font-medium text-gray-500 truncate">Admins</dt>
                                            <dd class="text-lg font-medium text-gray-900">Manage Admins</dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="bg-white overflow-hidden shadow rounded-lg">
                            <div class="p-5">
                                <div class="flex items-center">
                                    <div class="flex-shrink-0">
                                        <div class="w-8 h-8 bg-gray-500 rounded-md flex items-center justify-center">
                                            <span class="text-white font-bold">S</span>
                                        </div>
                                    </div>
                                    <div class="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt class="text-sm font-medium text-gray-500 truncate">Settings</dt>
                                            <dd class="text-lg font-medium text-gray-900">Account Settings</dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
        
        <script>
            // Load user and tenant data
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const tenant = JSON.parse(localStorage.getItem('tenant') || '{}');
            
            // Display institution name
            document.getElementById('institutionName').textContent = tenant.name || 'Unknown Institution';
            
            // Check if user is logged in
            if (!user._id) {
                window.location.href = '/';
            }
            
            function logout() {
                localStorage.clear();
                window.location.href = '/';
            }
        </script>
    </body>
    </html>
    `;
    
    res.send(dashboardPage);
});

// Student Dashboard for institution users
app.get('/student-dashboard', (req, res) => {
    const dashboardPage = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Student Dashboard - CBT System</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100">
        <div id="app" class="min-h-screen">
            <nav class="bg-white shadow-sm border-b">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="flex justify-between h-16">
                        <div class="flex items-center">
                            <h1 class="text-xl font-semibold text-gray-900">CBT Student Dashboard</h1>
                        </div>
                        <div class="flex items-center space-x-4">
                            <span id="studentName" class="text-sm text-gray-700"></span>
                            <span id="institutionName" class="text-sm text-gray-700"></span>
                            <button onclick="logout()" class="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700">Logout</button>
                        </div>
                    </div>
                </div>
            </nav>
            
            <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div class="px-4 py-6 sm:px-0">
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div class="bg-white overflow-hidden shadow rounded-lg">
                            <div class="p-5">
                                <div class="flex items-center">
                                    <div class="flex-shrink-0">
                                        <div class="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                                            <span class="text-white font-bold">T</span>
                                        </div>
                                    </div>
                                    <div class="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt class="text-sm font-medium text-gray-500 truncate">Take Exam</dt>
                                            <dd class="text-lg font-medium text-gray-900">Available Exams</dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="bg-white overflow-hidden shadow rounded-lg">
                            <div class="p-5">
                                <div class="flex items-center">
                                    <div class="flex-shrink-0">
                                        <div class="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                                            <span class="text-white font-bold">R</span>
                                        </div>
                                    </div>
                                    <div class="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt class="text-sm font-medium text-gray-500 truncate">Results</dt>
                                            <dd class="text-lg font-medium text-gray-900">My Results</dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="bg-white overflow-hidden shadow rounded-lg">
                            <div class="p-5">
                                <div class="flex items-center">
                                    <div class="flex-shrink-0">
                                        <div class="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                                            <span class="text-white font-bold">P</span>
                                        </div>
                                    </div>
                                    <div class="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt class="text-sm font-medium text-gray-500 truncate">Profile</dt>
                                            <dd class="text-lg font-medium text-gray-900">My Profile</dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="bg-white overflow-hidden shadow rounded-lg">
                            <div class="p-5">
                                <div class="flex items-center">
                                    <div class="flex-shrink-0">
                                        <div class="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                                            <span class="text-white font-bold">H</span>
                                        </div>
                                    </div>
                                    <div class="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt class="text-sm font-medium text-gray-500 truncate">History</dt>
                                            <dd class="text-lg font-medium text-gray-900">Exam History</dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="bg-white overflow-hidden shadow rounded-lg">
                            <div class="p-5">
                                <div class="flex items-center">
                                    <div class="flex-shrink-0">
                                        <div class="w-8 h-8 bg-gray-500 rounded-md flex items-center justify-center">
                                            <span class="text-white font-bold">S</span>
                                        </div>
                                    </div>
                                    <div class="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt class="text-sm font-medium text-gray-500 truncate">Settings</dt>
                                            <dd class="text-lg font-medium text-gray-900">Account Settings</dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
        
        <script>
            // Load user and tenant data
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const tenant = JSON.parse(localStorage.getItem('tenant') || '{}');
            
            // Display student name and institution
            document.getElementById('studentName').textContent = user.fullName || 'Unknown Student';
            document.getElementById('institutionName').textContent = tenant.name || 'Unknown Institution';
            
            // Check if user is logged in
            if (!user._id) {
                window.location.href = '/';
            }
            
            function logout() {
                localStorage.clear();
                window.location.href = '/';
            }
        </script>
    </body>
    </html>
    `;
    
    res.send(dashboardPage);
});

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