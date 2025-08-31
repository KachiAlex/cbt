const fs = require('fs');
const path = require('path');

console.log('🔧 Creating clean working App.js...');

const appJsPath = path.join(__dirname, 'src', 'App.js');

try {
  // Read the current file
  let content = fs.readFileSync(appJsPath, 'utf8');
  
  // Split into lines and process
  const lines = content.split('\n');
  const newLines = [];
  let skipNextLines = false;
  let braceCount = 0;
  let functionFound = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this line contains the problematic function declaration
    if (line.includes('const ensureAdminUserExists = () => {')) {
      console.log(`Found ensureAdminUserExists at line ${i + 1}`);
      skipNextLines = true;
      braceCount = 1;
      functionFound = true;
      newLines.push('  // Admin user creation logic is now inline in useEffect');
      continue;
    }
    
    if (skipNextLines) {
      // Count braces to know when the function ends
      for (let char of line) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
      }
      
      if (braceCount === 0) {
        skipNextLines = false;
        console.log(`Function ended at line ${i + 1}`);
      }
      continue;
    }
    
    newLines.push(line);
  }
  
  // Write the fixed content back
  const newContent = newLines.join('\n');
  fs.writeFileSync(appJsPath, newContent, 'utf8');
  
  console.log('✅ Clean App.js created!');
  console.log(`🔍 Function found and removed: ${functionFound}`);
  
  // Verify the fix
  const verifyContent = fs.readFileSync(appJsPath, 'utf8');
  const functionCount = (verifyContent.match(/ensureAdminUserExists/g) || []).length;
  console.log(`🔍 Verification: Found ${functionCount} remaining instances of ensureAdminUserExists`);
  
} catch (error) {
  console.error('❌ Error creating clean App.js:', error.message);
} 