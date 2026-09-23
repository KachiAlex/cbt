#!/usr/bin/env node

/**
 * API Validation Script
 * 
 * This script validates that all expected methods exist in the API Data Service
 * and that the API contract is maintained across updates.
 */

const fs = require('fs');
const path = require('path');

// Expected methods that must exist in the API Data Service
const REQUIRED_METHODS = {
  // Institution Management
  'getInstitutions': 'Institution[]',
  'getInstitution': 'Institution',
  'getInstitutionSummary': 'Summary',
  'getInstitutionBySlug': 'Institution',
  'createInstitution': 'Institution',
  'updateInstitution': 'boolean',
  'updateInstitutionStatus': 'boolean',
  'deleteInstitution': 'boolean',

  // User Management
  'getInstitutionUsers': 'User[]',
  'getInstitutionStudents': 'User[]',
  'getPublicDepartments': 'Department[]',
  'registerStudent': 'User',
  'institutionLogin': 'Session',
  'getSession': 'Session',
  'logout': 'boolean',
  'getInstitutionDepartments': 'Department[]',
  'createInstitutionDepartment': 'Department',
  'updateInstitutionDepartment': 'boolean',
  'deleteInstitutionDepartment': 'boolean',
  'createUser': 'User',
  'updateUser': 'boolean',
  'deleteUser': 'boolean',
  'deleteUsers': 'number',
  'updateInstitutionUserCount': 'number',

  // Admin Management
  'getInstitutionAdmins': 'Admin[]',
  'createAdmin': 'Admin',
  'updateAdminPassword': 'boolean',
  'updateAdmin': 'boolean',
  'deleteAdmin': 'boolean',
  'deleteInstitutionAdmins': 'boolean',

  // Exam Management
  'getInstitutionExams': 'Exam[]',
  'getExams': 'Exam[]',
  'startExamAttempt': 'Attempt',
  'createExam': 'Exam',
  'updateExam': 'boolean',
  'deleteExam': 'boolean',

  // Question Management
  'getInstitutionQuestions': 'Question[]',
  'getQuestions': 'Question[]',
  'createQuestion': 'Question',
  'addQuestions': 'Question[]',
  'updateQuestion': 'boolean',
  'deleteQuestion': 'boolean',
  'deleteQuestions': 'number',
  'countQuestionsByExam': 'number',
  'deleteQuestionsByExam': 'boolean',

  // Results Management
  'getInstitutionResults': 'Result[]',
  'getResults': 'Result[]',
  'getResultsByExam': 'Result[]',
  'getResultsByUser': 'Result[]',
  'getResultById': 'Result',
  'getResultReview': 'ResultReview',
  'createResult': 'Result',
  'saveExamResult': 'Result',
  'submitExamResult': 'Result',
  'updateResult': 'boolean',
  'deleteResult': 'boolean',
  'deleteResults': 'number',

  // Blogs and lead management
  'getBlogs': 'Blog[]',
  'getAllBlogs': 'Blog[]',
  'getBlog': 'Blog',
  'createBlog': 'Blog',
  'updateBlog': 'boolean',
  'publishBlog': 'boolean',
  'unpublishBlog': 'boolean',
  'deleteBlog': 'boolean',
  'getDemoRequests': 'Lead[]',
  'updateDemoRequestStatus': 'boolean',

  // Utility Methods
  'getAllUsers': 'User[]',
  'safeToDate': 'Date | null'
};

function validateDataService() {
  console.log('🔍 Validating Data Service API...\n');

  const dataServicePath = path.join(__dirname, '../src/services/dataService.js');
  
  if (!fs.existsSync(dataServicePath)) {
    console.error('❌ Error: dataService.js not found at expected path');
    process.exit(1);
  }

  const dataServiceContent = fs.readFileSync(dataServicePath, 'utf8');
  
  let hasErrors = false;
  const missingMethods = [];
  const foundMethods = [];

  // Check for each required method
  Object.keys(REQUIRED_METHODS).forEach(methodName => {
    // Check for both async and regular methods
    const asyncPattern = new RegExp(`async\\s+${methodName}\\s*\\(`, 'g');
    const regularPattern = new RegExp(`${methodName}\\s*\\(`, 'g');
    
    const foundAsync = asyncPattern.test(dataServiceContent);
    const foundRegular = regularPattern.test(dataServiceContent);
    const found = foundAsync || foundRegular;
    
    if (found) {
      foundMethods.push(methodName);
      console.log(`✅ ${methodName} - Found`);
    } else {
      missingMethods.push(methodName);
      console.log(`❌ ${methodName} - MISSING`);
      hasErrors = true;
    }
  });

  console.log(`\n📊 Summary:`);
  console.log(`✅ Found methods: ${foundMethods.length}`);
  console.log(`❌ Missing methods: ${missingMethods.length}`);

  if (missingMethods.length > 0) {
    console.log(`\n🚨 Missing Methods:`);
    missingMethods.forEach(method => {
      console.log(`   - ${method}(): Expected return type ${REQUIRED_METHODS[method]}`);
    });
  }

  if (!foundMethods.includes('getInstitutionStudents')) {
    console.error('The getInstitutionStudents data-service method is required by the API contract.');
    hasErrors = true;
  }

  if (hasErrors) {
    console.log(`\n💡 Recommendations:`);
    console.log(`   1. Add missing methods to dataService.js`);
    console.log(`   2. Run this validation script before deploying`);
    console.log(`   3. Consider adding TypeScript for compile-time checking`);
    console.log(`   4. Add unit tests to catch these issues early`);
    
    process.exit(1);
  } else {
    console.log(`\n🎉 All required methods are present!`);
    console.log(`   The API contract is satisfied.`);
  }
}

function checkUsageConsistency() {
  console.log(`\n🔍 Checking method usage consistency...\n`);

  const componentsPath = path.join(__dirname, '../src/components');
  
  if (!fs.existsSync(componentsPath)) {
    console.warn('⚠️  Components directory not found, skipping usage check');
    return;
  }

  const componentFiles = fs.readdirSync(componentsPath)
    .filter(file => file.endsWith('.js') || file.endsWith('.jsx'))
    .map(file => path.join(componentsPath, file));

  const methodCalls = new Set();
  
  componentFiles.forEach(filePath => {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    
    // Look for dataService method calls
    const methodCallPattern = /\bdataService\.(\w+)\(/g;
    let match;
    
    while ((match = methodCallPattern.exec(content)) !== null) {
      const methodName = match[1];
      methodCalls.add(methodName);
      
      if (!REQUIRED_METHODS.hasOwnProperty(methodName)) {
        console.log(`⚠️  ${fileName}: Calls unknown method '${methodName}'`);
      } else {
        console.log(`✅ ${fileName}: Calls '${methodName}' (valid)`);
      }
    }
  });

  console.log(`\n📊 Method Usage Summary:`);
  console.log(`   Total unique method calls found: ${methodCalls.size}`);
  
  const unusedMethods = Object.keys(REQUIRED_METHODS).filter(method => !methodCalls.has(method));
  if (unusedMethods.length > 0) {
    console.log(`   Potentially unused methods: ${unusedMethods.join(', ')}`);
  }
}

// Run validations
try {
  validateDataService();
  checkUsageConsistency();
  
  console.log(`\n🎯 Validation Complete!`);
  console.log(`   No API contract violations found.`);
  
} catch (error) {
  console.error(`\n💥 Validation failed with error:`, error.message);
  process.exit(1);
}
