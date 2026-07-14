import fs from 'fs';

const data = JSON.parse(fs.readFileSync('./test_list.json', 'utf8'));

const types = new Set();

const walk = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    
    if (obj.type && obj.type.stringValue) {
        types.add(obj.type.stringValue);
    }
    
    for (const key of Object.keys(obj)) {
        walk(obj[key]);
    }
};

walk(data);

console.log("All unique question/group types in test_list.json:", Array.from(types));
