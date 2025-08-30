const fs = require('fs');
const path = require('path');

console.log('🔍 Running pre-commit checks...');

function checkForDuplicates(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    const declarations = new Map();
    const duplicates = [];
    
    lines.forEach((line, index) => {
      // Check for function declarations
      const functionMatch = line.match(/const\s+(\w+)\s*=/);
      if (functionMatch) {
        const funcName = functionMatch[1];
        if (declarations.has(funcName)) {
          duplicates.push({
            name: funcName,
            line1: declarations.get(funcName),
            line2: index + 1
          });
        } else {
          declarations.set(funcName, index + 1);
        }
      }
    });
    
    if (duplicates.length > 0) {
      console.log(`❌ Found duplicate declarations in ${filePath}:`);
      duplicates.forEach(dup => {
        console.log(`   - "${dup.name}" declared at lines ${dup.line1} and ${dup.line2}`);
      });
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Error checking ${filePath}:`, error.message);
    return false;
  }
}

// Check main files
const filesToCheck = [
  'src/App.js',
  'src/services/dataService.js'
];

let allGood = true;

filesToCheck.forEach(file => {
  if (!checkForDuplicates(file)) {
    allGood = false;
  }
});

if (allGood) {
  console.log('✅ No duplicate declarations found!');
  console.log('🚀 Safe to commit changes.');
} else {
  console.log('❌ Duplicate declarations found!');
  console.log('🔧 Please fix before committing.');
  process.exit(1);
} 