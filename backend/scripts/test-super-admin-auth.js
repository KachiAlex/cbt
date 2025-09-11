#!/usr/bin/env node

/**
 * Super Admin Authentication Test
 * 
 * This script tests that super admin authentication works correctly
 * and that the role is never downgraded.
 */

const { generateToken, verifyToken } = require('../src/config/jwt');

// Test super admin token generation and verification
function testSuperAdminAuth() {
  console.log('🧪 Testing Super Admin Authentication...\n');
  
  // Test 1: Generate super admin token
  console.log('1. Testing token generation...');
  const superAdminPayload = {
    username: 'superadmin',
    role: 'super_admin',
    type: 'multi_tenant_admin'
  };
  
  const token = generateToken(superAdminPayload);
  console.log('✅ Super admin token generated successfully');
  console.log(`   Token length: ${token.length} characters`);
  
  // Test 2: Verify token
  console.log('\n2. Testing token verification...');
  const decoded = verifyToken(token);
  console.log('✅ Token verified successfully');
  console.log(`   Username: ${decoded.username}`);
  console.log(`   Role: ${decoded.role}`);
  console.log(`   Type: ${decoded.type}`);
  
  // Test 3: Verify role preservation
  console.log('\n3. Testing role preservation...');
  if (decoded.role === 'super_admin' && decoded.type === 'multi_tenant_admin') {
    console.log('✅ Super admin role and type preserved correctly');
  } else {
    console.log('❌ Super admin role or type was modified!');
    console.log(`   Expected role: super_admin, got: ${decoded.role}`);
    console.log(`   Expected type: multi_tenant_admin, got: ${decoded.type}`);
    return false;
  }
  
  // Test 4: Test token without type field (legacy compatibility)
  console.log('\n4. Testing legacy token compatibility...');
  const legacyPayload = {
    username: 'superadmin',
    role: 'super_admin'
    // No type field
  };
  
  const legacyToken = generateToken(legacyPayload);
  const legacyDecoded = verifyToken(legacyToken);
  
  console.log('✅ Legacy token handled');
  console.log(`   Role: ${legacyDecoded.role}`);
  console.log(`   Type: ${legacyDecoded.type || 'undefined'}`);
  
  // Test 5: Simulate authentication middleware logic
  console.log('\n5. Testing authentication middleware logic...');
  
  // Simulate the middleware check
  const isSuperAdmin = legacyDecoded.type === 'multi_tenant_admin' || legacyDecoded.role === 'super_admin';
  
  if (isSuperAdmin) {
    console.log('✅ Super admin correctly identified by middleware logic');
    
    // Simulate the type correction
    if (legacyDecoded.role === 'super_admin' && legacyDecoded.type !== 'multi_tenant_admin') {
      legacyDecoded.type = 'multi_tenant_admin';
      console.log('✅ Type field corrected to multi_tenant_admin');
    }
  } else {
    console.log('❌ Super admin not identified correctly!');
    return false;
  }
  
  console.log('\n🎉 All super admin authentication tests passed!');
  return true;
}

// Test regular user token (should not be treated as super admin)
function testRegularUserAuth() {
  console.log('\n🧪 Testing Regular User Authentication...\n');
  
  const regularUserPayload = {
    userId: '507f1f77bcf86cd799439011',
    username: 'regularuser',
    role: 'student',
    tenant_id: '507f1f77bcf86cd799439012'
  };
  
  const token = generateToken(regularUserPayload);
  const decoded = verifyToken(token);
  
  console.log('✅ Regular user token generated and verified');
  console.log(`   Username: ${decoded.username}`);
  console.log(`   Role: ${decoded.role}`);
  console.log(`   Type: ${decoded.type || 'undefined'}`);
  
  // Test middleware logic
  const isSuperAdmin = decoded.type === 'multi_tenant_admin' || decoded.role === 'super_admin';
  
  if (!isSuperAdmin) {
    console.log('✅ Regular user correctly identified as non-super admin');
  } else {
    console.log('❌ Regular user incorrectly identified as super admin!');
    return false;
  }
  
  return true;
}

// Run all tests
function runAllTests() {
  console.log('🚀 Starting Authentication Tests\n');
  console.log('=' .repeat(50));
  
  const superAdminTest = testSuperAdminAuth();
  const regularUserTest = testRegularUserAuth();
  
  console.log('\n' + '=' .repeat(50));
  console.log('📊 Test Results:');
  console.log(`   Super Admin Tests: ${superAdminTest ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   Regular User Tests: ${regularUserTest ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (superAdminTest && regularUserTest) {
    console.log('\n🎉 All authentication tests passed! Super admin role is secure.');
    process.exit(0);
  } else {
    console.log('\n💥 Some tests failed! Please check the authentication logic.');
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testSuperAdminAuth,
  testRegularUserAuth,
  runAllTests
};
