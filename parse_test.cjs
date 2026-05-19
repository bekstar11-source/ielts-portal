const fs = require('fs');
const data = JSON.parse(fs.readFileSync("cLQsQziJn3Lbq1KT5TRQ.json", 'utf8'));

// The Firestore REST API structure has fields under fields.
// Let's recursively unpack the Firestore document values.
function unpack(value) {
    if (!value) return null;
    if (value.stringValue !== undefined) return value.stringValue;
    if (value.doubleValue !== undefined) return value.doubleValue;
    if (value.integerValue !== undefined) return parseInt(value.integerValue);
    if (value.booleanValue !== undefined) return value.booleanValue;
    if (value.arrayValue !== undefined) {
        return (value.arrayValue.values || []).map(unpack);
    }
    if (value.mapValue !== undefined) {
        const obj = {};
        const fields = value.mapValue.fields || {};
        for (const k in fields) {
            obj[k] = unpack(fields[k]);
        }
        return obj;
    }
    return null;
}

const fields = {};
for (const k in data.fields) {
    fields[k] = unpack(data.fields[k]);
}

console.log("Unpacked test title:", fields.title);
console.log("Unpacked testId field:", fields.testId);

// Let's look at the matching group
const matchingGroup = fields.questions.find(q => q.type === 'matching');
if (matchingGroup) {
    console.log("Found Matching Group!");
    console.log("Items:");
    console.log(JSON.stringify(matchingGroup.items, null, 2));
} else {
    console.log("No Matching Group found in questions!");
}
