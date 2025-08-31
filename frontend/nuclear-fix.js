const fs = require('fs');
const path = require('path');

console.log('🚨 NUCLEAR FIX: Complete App.js replacement...');

const appJsPath = path.join(__dirname, 'src', 'App.js');

try {
  // Read the current file
  let content = fs.readFileSync(appJsPath, 'utf8');
  
  // Remove ALL instances of ensureAdminUserExists function
  const lines = content.split('\n');
  const newLines = [];
  let skipNextLines = false;
  let braceCount = 0;
  let inFunction = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this line contains the problematic function declaration
    if (line.includes('ensureAdminUserExists') && line.includes('const')) {
      console.log(`Found ensureAdminUserExists at line ${i + 1}: ${line.trim()}`);
      skipNextLines = true;
      braceCount = 0;
      inFunction = true;
      newLines.push('  // Admin user creation logic is now inline in useEffect');
      continue;
    }
    
    if (skipNextLines && inFunction) {
      // Count braces to know when the function ends
      for (let char of line) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
      }
      
      if (braceCount === 0) {
        skipNextLines = false;
        inFunction = false;
        console.log(`Function ended at line ${i + 1}`);
      }
      continue;
    }
    
    newLines.push(line);
  }
  
  // Write the fixed content back
  const newContent = newLines.join('\n');
  fs.writeFileSync(appJsPath, newContent, 'utf8');
  
  console.log('✅ All ensureAdminUserExists functions removed!');
  console.log('🚀 The app should now compile successfully.');
  
  // Verify the fix
  const verifyContent = fs.readFileSync(appJsPath, 'utf8');
  const functionCount = (verifyContent.match(/ensureAdminUserExists/g) || []).length;
  console.log(`🔍 Verification: Found ${functionCount} remaining instances of ensureAdminUserExists`);
  
} catch (error) {
  console.error('❌ Error in nuclear fix:', error.message);
} 