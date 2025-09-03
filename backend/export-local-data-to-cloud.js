const mongoose = require('mongoose');
require('dotenv').config();
const connectDB = require('./src/config/database');
const Tenant = require('./src/models/Tenant');
const User = require('./src/models/User');
const Exam = require('./src/models/Exam');
const Question = require('./src/models/Question');
const Result = require('./src/models/Result');
const fs = require('fs');

async function exportLocalDataToCloud() {
  try {
    console.log('📤 Exporting Local Database to Cloud...');
    
    // Connect to local database
    await connectDB();
    console.log('✅ Connected to local database');
    
    // Export all data
    console.log('\n📊 Exporting data from local database...');
    
    const tenants = await Tenant.find({}).lean();
    const users = await User.find({}).lean();
    const exams = await Exam.find({}).lean();
    const questions = await Question.find({}).lean();
    const results = await Result.find({}).lean();
    
    console.log(`🏥 Tenants: ${tenants.length}`);
    console.log(`👥 Users: ${users.length}`);
    console.log(`📝 Exams: ${exams.length}`);
    console.log(`❓ Questions: ${questions.length}`);
    console.log(`📊 Results: ${results.length}`);
    
    // Prepare data for cloud import
    const exportData = {
      exportDate: new Date().toISOString(),
      source: 'local_database',
      target: 'mongodb_atlas',
      data: {
        tenants,
        users,
        exams,
        questions,
        results
      }
    };
    
    // Save to file
    const exportFile = `cloud-import-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(exportFile, JSON.stringify(exportData, null, 2));
    
    console.log(`\n💾 Data exported to: ${exportFile}`);
    console.log(`📁 File size: ${(fs.statSync(exportFile).size / 1024).toFixed(2)} KB`);
    
    // Create import script for cloud database
    const importScript = `import-to-cloud-${new Date().toISOString().split('T')[0]}.js`;
    
    const importScriptContent = `const mongoose = require('mongoose');
require('dotenv').config();

// Cloud database connection string
const CLOUD_MONGODB_URI = 'mongodb+srv://Kachianietie:Dabonega$reus2660@cluster0.1mos0xn.mongodb.net/cbt_database?retryWrites=true&w=majority&appName=Cluster0';

async function importToCloud() {
  try {
    console.log('☁️ Connecting to MongoDB Atlas...');
    
    // Connect to cloud database
    await mongoose.connect(CLOUD_MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');
    
    // Import data
    const importData = require('./${exportFile}');
    
    console.log('\\n📥 Importing data to cloud database...');
    
    // Clear existing data (optional - be careful!)
    console.log('🗑️ Clearing existing data...');
    await mongoose.connection.db.dropDatabase();
    console.log('✅ Database cleared');
    
    // Import tenants
    console.log('\\n🏥 Importing tenants...');
    const Tenant = require('./src/models/Tenant');
    for (const tenant of importData.data.tenants) {
      const newTenant = new Tenant(tenant);
      await newTenant.save();
      console.log(\`✅ Tenant imported: \${tenant.name}\`);
    }
    
    // Import users
    console.log('\\n👥 Importing users...');
    const User = require('./src/models/User');
    for (const user of importData.data.users) {
      const newUser = new User(user);
      await newUser.save();
      console.log(\`✅ User imported: \${user.username}\`);
    }
    
    // Import exams
    console.log('\\n📝 Importing exams...');
    const Exam = require('./src/models/Exam');
    for (const exam of importData.data.exams) {
      const newExam = new Exam(exam);
      await newExam.save();
      console.log(\`✅ Exam imported: \${exam.title}\`);
    }
    
    // Import questions
    console.log('\\n❓ Importing questions...');
    const Question = require('./src/models/Question');
    for (const question of importData.data.questions) {
      const newQuestion = new Question(question);
      await newQuestion.save();
      console.log(\`✅ Question imported: \${question.question.substring(0, 50)}...\`);
    }
    
    // Import results
    console.log('\\n📊 Importing results...');
    const Result = require('./src/models/Result');
    for (const result of importData.data.results) {
      const newResult = new Result(result);
      await newResult.save();
      console.log(\`✅ Result imported: \${result._id}\`);
    }
    
    console.log('\\n🎉 Data import completed successfully!');
    console.log('\\n📊 Final counts:');
    console.log(\`Tenants: \${await Tenant.countDocuments()}\`);
    console.log(\`Users: \${await User.countDocuments()}\`);
    console.log(\`Exams: \${await Exam.countDocuments()}\`);
    console.log(\`Questions: \${await Question.countDocuments()}\`);
    console.log(\`Results: \${await Result.countDocuments()}\`);
    
  } catch (error) {
    console.error('❌ Error importing to cloud:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Cloud database connection closed');
  }
}

importToCloud();`;
    
    fs.writeFileSync(importScript, importScriptContent);
    console.log(`\n📝 Import script created: ${importScript}`);
    
    console.log('\n🔧 Next Steps:');
    console.log('1. Update your local .env file with the cloud MongoDB URI');
    console.log('2. Run the import script to sync data to cloud');
    console.log('3. Restart your local backend to use cloud database');
    console.log('4. Everything will be centralized!');
    
  } catch (error) {
    console.error('❌ Error exporting data:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Local database connection closed');
  }
}

exportLocalDataToCloud();
