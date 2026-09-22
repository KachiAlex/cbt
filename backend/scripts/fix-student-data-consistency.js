#!/usr/bin/env node

/**
 * Data Consistency Fix Script
 * 
 * This script fixes the data inconsistency issue where students have
 * undefined studentId and userId fields, causing matching failures.
 * 
 * Run with: node scripts/fix-student-data-consistency.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../src/models/User');
const Tenant = require('../src/models/Tenant');

async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

async function fixStudentDataConsistency() {
  try {
    console.log('🔍 Starting data consistency fix...');
    
    // Get all users with role 'student'
    const students = await User.find({ role: 'student' });
    console.log(`📊 Found ${students.length} students to process`);
    
    let fixedCount = 0;
    let errorCount = 0;
    
    for (const student of students) {
      try {
        const updates = {};
        let needsUpdate = false;
        
        // Fix missing studentId
        if (!student.studentId || student.studentId === undefined) {
          // Generate studentId from username or email
          const baseId = student.username || student.email || student._id.toString();
          updates.studentId = `student_${baseId.replace(/[^a-zA-Z0-9]/g, '_')}`;
          needsUpdate = true;
        }
        
        // Fix missing userId
        if (!student.userId || student.userId === undefined) {
          updates.userId = student._id.toString();
          needsUpdate = true;
        }
        
        // Ensure tenant_id is properly set
        if (!student.tenant_id) {
          console.log(`⚠️  Student ${student.username} has no tenant_id, skipping...`);
          continue;
        }
        
        if (needsUpdate) {
          await User.findByIdAndUpdate(student._id, updates);
          console.log(`✅ Fixed student: ${student.username} (${student.fullName})`);
          console.log(`   - studentId: ${updates.studentId || student.studentId}`);
          console.log(`   - userId: ${updates.userId || student.userId}`);
          fixedCount++;
        } else {
          console.log(`✅ Student already consistent: ${student.username}`);
        }
        
      } catch (error) {
        console.error(`❌ Error fixing student ${student.username}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n📈 Migration Summary:');
    console.log(`✅ Successfully fixed: ${fixedCount} students`);
    console.log(`❌ Errors encountered: ${errorCount} students`);
    console.log(`📊 Total processed: ${students.length} students`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function validateDataConsistency() {
  try {
    console.log('\n🔍 Validating data consistency...');
    
    const inconsistentStudents = await User.find({
      role: 'student',
      $or: [
        { studentId: { $exists: false } },
        { studentId: null },
        { studentId: undefined },
        { userId: { $exists: false } },
        { userId: null },
        { userId: undefined }
      ]
    });
    
    if (inconsistentStudents.length === 0) {
      console.log('✅ All student records are now consistent!');
    } else {
      console.log(`⚠️  Found ${inconsistentStudents.length} still inconsistent students:`);
      inconsistentStudents.forEach(student => {
        console.log(`   - ${student.username}: studentId=${student.studentId}, userId=${student.userId}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
  }
}

async function createBackup() {
  try {
    console.log('💾 Creating backup before migration...');
    
    const students = await User.find({ role: 'student' });
    const backupData = {
      timestamp: new Date().toISOString(),
      students: students.map(student => ({
        _id: student._id,
        username: student.username,
        email: student.email,
        fullName: student.fullName,
        studentId: student.studentId,
        userId: student.userId,
        tenant_id: student.tenant_id,
        role: student.role
      }))
    };
    
    const fs = require('fs');
    const path = require('path');
    const backupDir = path.join(__dirname, '../backups');
    
    // Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const backupFile = path.join(backupDir, `student-data-backup-${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    
    console.log(`✅ Backup created: ${backupFile}`);
    return backupFile;
    
  } catch (error) {
    console.error('❌ Backup creation failed:', error);
    throw error;
  }
}

async function main() {
  try {
    await connectToDatabase();
    
    // Create backup first
    await createBackup();
    
    // Fix data consistency
    await fixStudentDataConsistency();
    
    // Validate the fix
    await validateDataConsistency();
    
    console.log('\n🎉 Data consistency fix completed successfully!');
    
  } catch (error) {
    console.error('💥 Script failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  fixStudentDataConsistency,
  validateDataConsistency,
  createBackup
};
