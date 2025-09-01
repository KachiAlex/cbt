const axios = require('axios');

async function testCloudAPI() {
  try {
    console.log('🔑 Testing login to cloud API...');
    const loginResponse = await axios.post('https://cbt-rew7.onrender.com/api/multi-tenant-admin/login', {
      username: 'superadmin',
      password: 'superadmin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    console.log('\n📋 Testing get institutions from cloud API...');
    const response = await axios.get('https://cbt-rew7.onrender.com/api/tenants', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    
    console.log('✅ Response status:', response.status);
    console.log('✅ Institutions found:', response.data.length);
    
    if (response.data.length > 0) {
      console.log('\n📋 Institutions in cloud:');
      response.data.forEach((inst, index) => {
        console.log(`${index + 1}. ${inst.name} (${inst.slug})`);
        console.log(`   Status: ${inst.suspended ? 'Suspended' : 'Active'}`);
        console.log(`   Created: ${inst.createdAt}`);
        console.log('');
      });
    } else {
      console.log('❌ No institutions found in cloud API');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
  }
}

testCloudAPI();
