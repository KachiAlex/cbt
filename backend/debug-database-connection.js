const mongoose = require('mongoose');
require('dotenv').config();
const connectDB = require('./src/config/database');
const Tenant = require('./src/models/Tenant');

async function debugDatabaseConnection() {
  try {
    console.log('🔍 Debugging Database Connection Issues...');
    
    // Check environment variables
    console.log('\n📋 Environment Variables:');
    console.log(`DB_TYPE: ${process.env.DB_TYPE || 'Not set (defaults to mongodb)'}`);
    console.log(`MONGODB_URI: ${process.env.MONGODB_URI ? 'Set' : 'Not set'}`);
    
    // Connect to database
    await connectDB();
    console.log('\n✅ Database connected successfully');
    
    // Check connection details
    const connection = mongoose.connection;
    console.log('\n🔌 Connection Details:');
    console.log(`Host: ${connection.host}`);
    console.log(`Port: ${connection.port}`);
    console.log(`Database: ${connection.name}`);
    console.log(`Ready State: ${connection.readyState}`);
    console.log(`Connection ID: ${connection.id}`);
    
    // Check if there are multiple connections
    const connections = mongoose.connections;
    console.log(`\n📊 Total Connections: ${connections.length}`);
    
    if (connections.length > 1) {
      console.log('⚠️ Multiple connections detected!');
      connections.forEach((conn, index) => {
        console.log(`Connection ${index + 1}:`);
        console.log(`  Host: ${conn.host}`);
        console.log(`  Database: ${conn.name}`);
        console.log(`  Ready State: ${conn.readyState}`);
      });
    }
    
    // Test the exact query that the API endpoint uses
    console.log('\n🧪 Testing API Endpoint Query:');
    console.log('Query: Tenant.find({ deleted_at: null })');
    
    const apiQueryResult = await Tenant.find({ deleted_at: null })
      .select('name slug contact_email plan suspended createdAt default_admin')
      .sort({ createdAt: -1 })
      .lean();
    
    console.log(`API Query Result: ${apiQueryResult.length} tenants`);
    apiQueryResult.forEach((tenant, index) => {
      console.log(`  ${index + 1}. ${tenant.name} (${tenant.slug})`);
    });
    
    // Test without any filters
    console.log('\n🧪 Testing Raw Query (no filters):');
    const rawQueryResult = await Tenant.find({}).lean();
    console.log(`Raw Query Result: ${rawQueryResult.length} tenants`);
    rawQueryResult.forEach((tenant, index) => {
      console.log(`  ${index + 1}. ${tenant.name} (${tenant.slug}) - Deleted: ${tenant.deleted_at ? 'Yes' : 'No'}`);
    });
    
    // Check for any transactions or uncommitted changes
    console.log('\n🔍 Checking for Active Transactions:');
    const session = await mongoose.startSession();
    console.log(`Session ID: ${session.id}`);
    console.log(`Session Active: ${session.inTransaction()}`);
    await session.endSession();
    
    // Check database stats
    console.log('\n📊 Database Stats:');
    const dbStats = await connection.db.admin().dbStats();
    console.log(`Collections: ${dbStats.collections}`);
    console.log(`Data Size: ${dbStats.dataSize} bytes`);
    console.log(`Storage Size: ${dbStats.storageSize} bytes`);
    
    // Check if there are any indexes that might affect queries
    console.log('\n🔍 Checking Tenant Collection Indexes:');
    const tenantIndexes = await Tenant.collection.indexes();
    console.log(`Indexes: ${tenantIndexes.length}`);
    tenantIndexes.forEach((index, i) => {
      console.log(`  ${i + 1}. ${JSON.stringify(index.key)}`);
    });
    
    console.log('\n🔍 Analysis:');
    if (apiQueryResult.length !== rawQueryResult.length) {
      console.log('❌ Mismatch detected!');
      console.log(`API Query: ${apiQueryResult.length} tenants`);
      console.log(`Raw Query: ${rawQueryResult.length} tenants`);
      console.log('This suggests there are tenants with deleted_at set to a value');
    } else {
      console.log('✅ Query results match - no filtering issues');
    }
    
    console.log('\n🔍 Possible Issues:');
    console.log('1. Multiple database connections');
    console.log('2. Connection pooling issues');
    console.log('3. Uncommitted transactions');
    console.log('4. Index inconsistencies');
    console.log('5. Replication lag (if using MongoDB Atlas)');
    
  } catch (error) {
    console.error('❌ Error during debugging:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

debugDatabaseConnection();
