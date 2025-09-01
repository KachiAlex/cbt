const axios = require('axios');

async function testDeleteWithParams() {
  try {
    console.log('🔑 Logging into cloud API...');
    const loginResponse = await axios.post('https://cbt-rew7.onrender.com/api/multi-tenant-admin/login', {
      username: 'superadmin',
      password: 'superadmin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    const testSlug = 'test-school';
    console.log(`\n🧪 Testing delete for: ${testSlug}`);
    
    // Test 1: Basic delete
    console.log('\n1️⃣ Testing basic delete...');
    try {
      const response1 = await axios.delete(`https://cbt-rew7.onrender.com/api/tenants/${testSlug}`, {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      console.log('✅ Basic delete successful:', response1.data);
    } catch (error) {
      console.log('❌ Basic delete failed:', error.response?.status, error.response?.data);
    }
    
    // Test 2: Delete with hard parameter
    console.log('\n2️⃣ Testing delete with hard=true...');
    try {
      const response2 = await axios.delete(`https://cbt-rew7.onrender.com/api/tenants/${testSlug}?hard=true`, {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      console.log('✅ Hard delete successful:', response2.data);
    } catch (error) {
      console.log('❌ Hard delete failed:', error.response?.status, error.response?.data);
    }
    
    // Test 3: Delete with force parameter
    console.log('\n3️⃣ Testing delete with force=true...');
    try {
      const response3 = await axios.delete(`https://cbt-rew7.onrender.com/api/tenants/${testSlug}?force=true`, {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      console.log('✅ Force delete successful:', response3.data);
    } catch (error) {
      console.log('❌ Force delete failed:', error.response?.status, error.response?.data);
    }
    
    // Test 4: Check if tenant still exists
    console.log('\n4️⃣ Checking if tenant still exists...');
    try {
      const response4 = await axios.get(`https://cbt-rew7.onrender.com/api/tenant/${testSlug}/profile`);
      console.log('✅ Tenant still exists:', response4.data);
    } catch (error) {
      console.log('❌ Tenant not found:', error.response?.status, error.response?.data);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testDeleteWithParams();
