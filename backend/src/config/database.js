const mongoose = require('mongoose');

// Database configuration
const connectDB = async () => {
  const dbType = process.env.DB_TYPE || 'mongodb';
  
  try {
    if (dbType === 'mongodb') {
      // MongoDB Atlas connection
      const conn = await mongoose.connect(process.env.MONGODB_URI, {
        // Cloud database connection options
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferMaxEntries: 0,
        bufferCommands: false
      });
      console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host}`);
      console.log(`🌐 Database: ${conn.connection.name}`);
      console.log(`🔗 Connection String: ${process.env.MONGODB_URI.includes('mongodb+srv://') ? 'Cloud (Atlas)' : 'Local'}`);
    } else if (dbType === 'supabase') {
      // Supabase connection (PostgreSQL)
      // Note: For Supabase, you'd typically use a different ORM like Prisma or Sequelize
      console.log('⚠️ Supabase connection requires additional setup with Prisma/Sequelize');
      console.log('📝 For now, using MongoDB. To use Supabase, update DB_TYPE=supabase');
    }
  } catch (error) {
    console.error(`❌ Database connection error: ${error.message}`);
    console.error(`🔍 Check your MONGODB_URI and network connection`);
    process.exit(1);
  }
};

module.exports = connectDB; 