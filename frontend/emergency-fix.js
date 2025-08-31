const fs = require('fs');
const path = require('path');

console.log('🚨 EMERGENCY FIX: Removing duplicate function...');

const appJsPath = path.join(__dirname, 'src', 'App.js');

try {
  // Read the file
  let content = fs.readFileSync(appJsPath, 'utf8');
  
  // Remove the problematic function declaration completely
  const lines = content.split('\n');
  const newLines = [];
  let skipNextLines = false;
  let braceCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this is the start of the problematic function
    if (line.includes('const ensureAdminUserExists = () => {')) {
      console.log(`Found duplicate function at line ${i + 1}`);
      skipNextLines = true;
      braceCount = 1;
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
      }
      continue;
    }
    
    newLines.push(line);
  }
  
  // Write the fixed content back
  const newContent = newLines.join('\n');
  fs.writeFileSync(appJsPath, newContent, 'utf8');
  
  console.log('✅ Duplicate function removed!');
  console.log('🚀 The app should now compile successfully.');
  
} catch (error) {
  console.error('❌ Error fixing file:', error.message);
} 