import fetch from 'node-fetch';

async function testUserCountEndpoint() {
  const API_BASE_URL = 'https://cbt-rew7.onrender.com';
  
  try {
    console.log('🧪 Testing user count endpoint...');
    
    // First, let's get the list of tenants
    const tenantsResponse = await fetch(`${API_BASE_URL}/api/tenants`);
    console.log('📡 Tenants response status:', tenantsResponse.status);
    
    if (!tenantsResponse.ok) {
      console.log('❌ Failed to get tenants');
      return;
    }
    
    const tenants = await tenantsResponse.json();
    console.log('📊 Found tenants:', tenants.length);
    
    if (tenants.length === 0) {
      console.log('❌ No tenants found');
      return;
    }
    
    // Test the first tenant
    const firstTenant = tenants[0];
    console.log(`🔍 Testing tenant: ${firstTenant.slug} (${firstTenant.name})`);
    
    // Test the user count endpoint
    const usersResponse = await fetch(`${API_BASE_URL}/api/tenants/${firstTenant.slug}/users`);
    console.log('📡 Users response status:', usersResponse.status);
    
    if (!usersResponse.ok) {
      const errorText = await usersResponse.text();
      console.log('❌ Failed to get users:', errorText);
      return;
    }
    
    const usersData = await usersResponse.json();
    console.log('✅ Users data received:', usersData);
    console.log(`📊 User count: ${usersData.users ? usersData.users.length : 'No users array'}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testUserCountEndpoint();
