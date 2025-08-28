const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

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
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes (to be implemented)
app.get('/api', (req, res) => {
  res.json({ 
    message: 'CBT Backend API is running',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      exams: '/api/exams',
      questions: '/api/questions',
      results: '/api/results',
      users: '/api/users'
    }
  });
});

// Placeholder routes for future implementation
app.get('/api/exams', (req, res) => {
  res.json({ message: 'Exams endpoint - to be implemented' });
});

app.get('/api/questions', (req, res) => {
  res.json({ message: 'Questions endpoint - to be implemented' });
});

app.get('/api/results', (req, res) => {
  res.json({ message: 'Results endpoint - to be implemented' });
});

app.get('/api/users', (req, res) => {
  res.json({ message: 'Users endpoint - to be implemented' });
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
});

module.exports = app; 