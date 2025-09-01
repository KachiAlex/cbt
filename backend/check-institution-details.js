const axios = require('axios');

async function checkInstitutionDetails() {
  try {
    console.log('🔑 Logging into cloud API...');
    const loginResponse = await axios.post('https://cbt-rew7.onrender.com/api/multi-tenant-admin/login', {
      username: 'superadmin',
      password: 'superadmin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    console.log('\n📋 Getting detailed institution info...');
    const response = await axios.get('https://cbt-rew7.onrender.com/api/tenants', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    
    const institutions = response.data;
    console.log(`✅ Found ${institutions.length} institutions`);
    
    for (const institution of institutions) {
      console.log(`\n🏢 Institution: ${institution.name}`);
      console.log(`   Slug: ${institution.slug}`);
      console.log(`   ID: ${institution._id}`);
      console.log(`   Status: ${institution.suspended ? 'Suspended' : 'Active'}`);
      console.log(`   Deleted: ${institution.deleted_at ? 'Yes' : 'No'}`);
      console.log(`   Created: ${institution.createdAt}`);
      console.log(`   Admin: ${institution.default_admin?.username || 'N/A'}`);
      
      // Try to get more details about this specific institution
      try {
        const detailResponse = await axios.get(`https://cbt-rew7.onrender.com/api/tenant/${institution.slug}/profile`);
        console.log(`   ✅ Profile accessible: Yes`);
        console.log(`   Contact: ${detailResponse.data.contact_email}`);
      } catch (error) {
        console.log(`   ❌ Profile error: ${error.response?.status} - ${error.response?.data?.error}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

checkInstitutionDetails();
