const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');
require('dotenv').config();

// Models
const User = require('./models/User');
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

// Rate limiting
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

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
		version: '1.0.0',
		database: process.env.DB_TYPE || 'mongodb',
		endpoints: {
			health: '/health',
			exams: '/api/exams',
			questions: '/api/questions',
			results: '/api/results',
			users: '/api/users'
		}
	});
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