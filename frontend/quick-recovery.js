const fs = require('fs');
const { exec } = require('child_process');

console.log('🚀 CBT Application Quick Recovery Tool');
console.log('=====================================');

async function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.log(`❌ Error: ${error.message}`);
        reject(error);
        return;
      }
      if (stderr) {
        console.log(`⚠️  Warning: ${stderr}`);
      }
      console.log(`✅ ${stdout}`);
      resolve(stdout);
    });
  });
}

async function quickRecovery() {
  try {
    console.log('\n🔧 Step 1: Fixing compilation errors...');
    await runCommand('node fix-compilation-error.js');
    
    console.log('\n🧹 Step 2: Clearing cache...');
    await runCommand('rmdir /s /q node_modules\\.cache 2>nul');
    
    console.log('\n🔍 Step 3: Checking for duplicate declarations...');
    await runCommand('node pre-commit-check.js');
    
    console.log('\n🚀 Step 4: Starting development server...');
    console.log('Starting npm start in background...');
    
    // Start the development server
    const child = exec('npm start', (error, stdout, stderr) => {
      if (error) {
        console.log(`❌ Server error: ${error.message}`);
        return;
      }
      console.log(stdout);
    });
    
    child.stdout.on('data', (data) => {
      console.log(data.toString());
    });
    
    child.stderr.on('data', (data) => {
      console.log(data.toString());
    });
    
    console.log('\n🎉 Recovery complete!');
    console.log('📱 Your app should be running at: http://localhost:3000');
    console.log('🔐 Admin login: admin / admin123');
    console.log('\n💡 If you see compilation errors, run: node fix-compilation-error.js');
    
  } catch (error) {
    console.log(`❌ Recovery failed: ${error.message}`);
    console.log('🔧 Try running: node fix-compilation-error.js manually');
  }
}

// Run recovery
quickRecovery(); 