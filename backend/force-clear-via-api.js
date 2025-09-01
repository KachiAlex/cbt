const axios = require('axios');

async function forceClearViaAPI() {
  try {
    console.log('🔑 Logging into cloud API...');
    const loginResponse = await axios.post('https://cbt-rew7.onrender.com/api/multi-tenant-admin/login', {
      username: 'superadmin',
      password: 'superadmin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    console.log('\n📋 Getting institutions from cloud API...');
    const response = await axios.get('https://cbt-rew7.onrender.com/api/tenants', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    
    const institutions = response.data;
    console.log(`✅ Found ${institutions.length} institutions in cloud API`);
    
    if (institutions.length === 0) {
      console.log('✅ No institutions to clear');
      return;
    }
    
    console.log('\n🗑️ FORCE CLEARING INSTITUTIONS...');
    
    for (const institution of institutions) {
      console.log(`\n🗑️ Attempting to clear: ${institution.name} (${institution.slug})`);
      
      // Try multiple approaches to delete
      let deleted = false;
      
      // Approach 1: Try suspend first
      try {
        console.log('   🔄 Trying to suspend...');
        await axios.patch(`https://cbt-rew7.onrender.com/api/tenants/${institution.slug}/toggle-status`, {
          suspended: true
        }, {
          headers: { 
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
          }
        });
        console.log('   ✅ Suspended successfully');
      } catch (error) {
        console.log(`   ❌ Suspend failed: ${error.response?.status}`);
      }
      
      // Approach 2: Try delete with different parameters
      const deleteParams = ['', '?hard=true', '?force=true', '?permanent=true'];
      
      for (const param of deleteParams) {
        if (deleted) break;
        
        try {
          console.log(`   🗑️ Trying delete${param}...`);
          await axios.delete(`https://cbt-rew7.onrender.com/api/tenants/${institution.slug}${param}`, {
            headers: { 'Authorization': 'Bearer ' + token }
          });
          console.log(`   ✅ Delete${param} successful`);
          deleted = true;
        } catch (error) {
          console.log(`   ❌ Delete${param} failed: ${error.response?.status}`);
        }
      }
      
      if (!deleted) {
        console.log(`   ⚠️ Could not delete ${institution.name} via API`);
      }
    }
    
    console.log('\n🔄 Checking if institutions are cleared...');
    
    // Wait a moment and check again
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      const checkResponse = await axios.get('https://cbt-rew7.onrender.com/api/tenants', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      
      const remainingInstitutions = checkResponse.data;
      console.log(`📋 Remaining institutions: ${remainingInstitutions.length}`);
      
      if (remainingInstitutions.length === 0) {
        console.log('🎉 SUCCESS: All institutions cleared!');
      } else {
        console.log('⚠️ Some institutions may still exist');
        remainingInstitutions.forEach(inst => {
          console.log(`   - ${inst.name} (${inst.slug})`);
        });
      }
      
    } catch (error) {
      console.log('❌ Could not verify remaining institutions');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

forceClearViaAPI();
