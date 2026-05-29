const fs = require('fs');
const path = require('path');

const files = ['test_list.json', 'cLQsQziJn3Lbq1KT5TRQ.json', 'matched_test_prod.json'];

files.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${file}`);
        return;
    }
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        
        console.log(`\n=== Analyzing ${file} ===`);
        const tests = Array.isArray(data) ? data : [data];
        
        tests.forEach((test, idx) => {
            const testType = test.type || test.testType;
            if (testType !== 'listening') return;
            
            console.log(`Test: ${test.title || test.id || idx} (Type: ${testType})`);
            
            if (test.questions && Array.isArray(test.questions)) {
                test.questions.forEach((group, gIdx) => {
                    console.log(`  Group ${gIdx + 1}: type="${group.type}" | questionsCount=${group.questions?.length || group.items?.length || 0} | groupsCount=${group.groups?.length || 0}`);
                    if (group.groups) {
                        group.groups.forEach((g, subIdx) => {
                            console.log(`    Subgroup ${subIdx + 1}: type="${g.type}" | itemsCount=${g.items?.length || g.questions?.length || 0}`);
                        });
                    }
                });
            } else {
                console.log('  No questions array found in test root.');
            }
        });
    } catch (e) {
        console.error(`Error processing ${file}:`, e.message);
    }
});
