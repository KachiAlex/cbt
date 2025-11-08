// Test Production Authentication
// Run this in browser console on https://cbtpromax.web.app

console.log('🧪 Testing Production Database Authentication...');

// Test 1: Check if Firebase Auth is working
if (window.firebase && window.firebase.auth) {
  console.log('✅ Firebase Auth available');
  
  // Test 2: Check current user
  const currentUser = firebase.auth().currentUser;
  if (currentUser) {
    console.log('✅ User authenticated:', currentUser.email);
  } else {
    console.log('⚠️ No user authenticated - this is expected for visitors');
  }
  
  // Test 3: Test anonymous access (should fail)
  firebase.firestore().collection('test').doc('test').get()
    .then(() => {
      console.log('❌ SECURITY ISSUE: Anonymous access allowed!');
    })
    .catch((error) => {
      if (error.code === 'permission-denied') {
        console.log('✅ SECURITY WORKING: Anonymous access blocked');
      } else {
        console.log('⚠️ Unexpected error:', error.message);
      }
    });
    
} else {
  console.log('❌ Firebase not available');
}

console.log('🎯 Production database test complete!');
console.log('📝 Next: Test super admin login at /super-admin');
