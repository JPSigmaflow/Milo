// Quick fix script to remove duplicate portfolio code

const fs = require('fs');

let content = fs.readFileSync('index.html', 'utf8');

// Find and remove the original portfolio forEach loop
const startMarker = '  // Portfolio with accordion\n  const listDiv = $(\'#portfolioList\');';
const endMarker = '  });';

const lines = content.split('\n');
let startIndex = -1;
let endIndex = -1;
let bracketCount = 0;
let insideLoop = false;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('// Portfolio with accordion') && lines[i].includes('const listDiv')) {
    startIndex = i;
    continue;
  }
  
  if (startIndex !== -1 && lines[i].trim() === 'active.forEach(h => {') {
    insideLoop = true;
    bracketCount = 1;
    continue;
  }
  
  if (insideLoop) {
    // Count brackets to find the end of forEach
    const openBrackets = (lines[i].match(/\{/g) || []).length;
    const closeBrackets = (lines[i].match(/\}/g) || []).length;
    bracketCount += openBrackets - closeBrackets;
    
    if (bracketCount === 0 && lines[i].includes('});')) {
      endIndex = i;
      break;
    }
  }
}

if (startIndex !== -1 && endIndex !== -1) {
  console.log(`Removing lines ${startIndex + 1} to ${endIndex + 1}`);
  
  // Keep only the listDiv declaration, remove the rest
  const newLines = [
    ...lines.slice(0, startIndex),
    '  // Portfolio with accordion - SORTABLE',
    '  const listDiv = $(\'#portfolioList\');',
    '  ',
    ...lines.slice(endIndex + 1)
  ];
  
  fs.writeFileSync('index.html', newLines.join('\n'));
  console.log('✅ Duplicate portfolio code removed');
} else {
  console.log('❌ Could not find the duplicate code');
}