const axios = require('axios');

async function clearCloudInstitutions() {
  try {
    console.log('🔑 Logging into cloud API...');
    const loginResponse = await axios.post('https://cbt-rew7.onrender.com/api/multi-tenant-admin/login', {
      username: 'superadmin',
      password: 'superadmin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    console.log('\n📋 Getting institutions from cloud...');
    const response = await axios.get('https://cbt-rew7.onrender.com/api/tenants', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    
    const institutions = response.data;
    console.log(`✅ Found ${institutions.length} institutions to delete`);
    
    if (institutions.length === 0) {
      console.log('✅ No institutions to delete');
      return;
    }
    
    console.log('\n🗑️ Deleting institutions...');
    
    for (const institution of institutions) {
      try {
        console.log(`Deleting: ${institution.name} (${institution.slug})`);
        
        const deleteResponse = await axios.delete(`https://cbt-rew7.onrender.com/api/tenants/${institution.slug}`, {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        
        console.log(`✅ Deleted: ${institution.name}`);
        
      } catch (error) {
        console.error(`❌ Failed to delete ${institution.name}:`, error.response?.data || error.message);
      }
    }
    
    console.log('\n✅ All institutions deleted from cloud database');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

clearCloudInstitutions();
