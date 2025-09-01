const axios = require('axios');

async function forceDeleteInstitutions() {
  try {
    console.log('🔑 Logging into cloud API...');
    const loginResponse = await axios.post('https://cbt-rew7.onrender.com/api/multi-tenant-admin/login', {
      username: 'superadmin',
      password: 'superadmin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    console.log('\n📋 Getting institutions...');
    const response = await axios.get('https://cbt-rew7.onrender.com/api/tenants', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    
    const institutions = response.data;
    console.log(`✅ Found ${institutions.length} institutions to delete`);
    
    for (const institution of institutions) {
      console.log(`\n🗑️ Attempting to delete: ${institution.name} (${institution.slug})`);
      
      // Try different delete approaches
      try {
        // Approach 1: Try suspend first
        console.log('   🔄 Trying to suspend first...');
        const suspendResponse = await axios.patch(`https://cbt-rew7.onrender.com/api/tenants/${institution.slug}/toggle-status`, {
          suspended: true
        }, {
          headers: { 
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
          }
        });
        console.log(`   ✅ Suspended: ${suspendResponse.data.message}`);
        
        // Approach 2: Try delete with hard delete parameter
        console.log('   🗑️ Trying hard delete...');
        const deleteResponse = await axios.delete(`https://cbt-rew7.onrender.com/api/tenants/${institution.slug}?hard=true`, {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        console.log(`   ✅ Deleted: ${deleteResponse.data.message}`);
        
      } catch (error) {
        console.error(`   ❌ Failed: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
        
        // Try alternative delete endpoint
        try {
          console.log('   🔄 Trying alternative delete approach...');
          const altDeleteResponse = await axios.delete(`https://cbt-rew7.onrender.com/api/tenants/${institution.slug}`, {
            headers: { 'Authorization': 'Bearer ' + token }
          });
          console.log(`   ✅ Alternative delete successful: ${altDeleteResponse.data.message}`);
        } catch (altError) {
          console.error(`   ❌ Alternative delete also failed: ${altError.response?.status} - ${altError.response?.data?.error || altError.message}`);
        }
      }
    }
    
    console.log('\n✅ All deletion attempts completed');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

forceDeleteInstitutions();
