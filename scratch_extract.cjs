const fs = require('fs');
const content = fs.readFileSync('src/components/teacher/tests/AssignTestForm.jsx', 'utf8');
const lines = content.split('\n');

let startLine = -1;
let endLine = -1;
let braceCount = 0;
let foundStart = false;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('if (showMonitorPage')) {
        startLine = i;
        foundStart = true;
    }
    
    if (foundStart) {
        braceCount += (lines[i].match(/\{/g) || []).length;
        braceCount -= (lines[i].match(/\}/g) || []).length;
        
        if (braceCount === 0) {
            endLine = i;
            break;
        }
    }
}

console.log(`Monitor block is from line ${startLine + 1} to ${endLine + 1}`);
