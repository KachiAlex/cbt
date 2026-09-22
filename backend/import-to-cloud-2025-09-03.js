const mongoose = require('mongoose');
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
    const importData = require('./cloud-import-2025-09-03.json');
    
    console.log('\n📥 Importing data to cloud database...');
    
    // Clear existing data (optional - be careful!)
    console.log('🗑️ Clearing existing data...');
    await mongoose.connection.db.dropDatabase();
    console.log('✅ Database cleared');
    
    // Import tenants
    console.log('\n🏥 Importing tenants...');
    const Tenant = require('./src/models/Tenant');
    for (const tenant of importData.data.tenants) {
      const newTenant = new Tenant(tenant);
      await newTenant.save();
      console.log(`✅ Tenant imported: ${tenant.name}`);
    }
    
    // Import users
    console.log('\n👥 Importing users...');
    const User = require('./src/models/User');
    for (const user of importData.data.users) {
      const newUser = new User(user);
      await newUser.save();
      console.log(`✅ User imported: ${user.username}`);
    }
    
    // Import exams
    console.log('\n📝 Importing exams...');
    const Exam = require('./src/models/Exam');
    for (const exam of importData.data.exams) {
      const newExam = new Exam(exam);
      await newExam.save();
      console.log(`✅ Exam imported: ${exam.title}`);
    }
    
    // Import questions
    console.log('\n❓ Importing questions...');
    const Question = require('./src/models/Question');
    for (const question of importData.data.questions) {
      const newQuestion = new Question(question);
      await newQuestion.save();
      console.log(`✅ Question imported: ${question.question.substring(0, 50)}...`);
    }
    
    // Import results
    console.log('\n📊 Importing results...');
    const Result = require('./src/models/Result');
    for (const result of importData.data.results) {
      const newResult = new Result(result);
      await newResult.save();
      console.log(`✅ Result imported: ${result._id}`);
    }
    
    console.log('\n🎉 Data import completed successfully!');
    console.log('\n📊 Final counts:');
    console.log(`Tenants: ${await Tenant.countDocuments()}`);
    console.log(`Users: ${await User.countDocuments()}`);
    console.log(`Exams: ${await Exam.countDocuments()}`);
    console.log(`Questions: ${await Question.countDocuments()}`);
    console.log(`Results: ${await Result.countDocuments()}`);
    
  } catch (error) {
    console.error('❌ Error importing to cloud:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Cloud database connection closed');
  }
}

importToCloud();