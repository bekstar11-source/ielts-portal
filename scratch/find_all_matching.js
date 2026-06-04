import fs from 'fs';

const data = JSON.parse(fs.readFileSync('test_list.json', 'utf8'));
const documents = data.documents || [];

console.log("Analyzing all matching question groups in test_list.json...\n");

documents.forEach(doc => {
    const fields = doc.fields || {};
    const title = fields.title?.stringValue || "Untitled";
    
    const questionsVal = fields.questions?.arrayValue?.values || [];
    questionsVal.forEach((qVal, qIdx) => {
        const qMap = qVal.mapValue?.fields || {};
        const gt = String(qMap.type?.stringValue || "").toLowerCase();
        const gi = String(qMap.instruction?.stringValue || "").toLowerCase();
        
        if (gt.includes('matching')) {
            const optionsVal = qMap.options?.arrayValue?.values || [];
            const options = optionsVal.map(optVal => {
                if (optVal.stringValue) return optVal.stringValue;
                if (optVal.mapValue?.fields) {
                    const fields = optVal.mapValue.fields;
                    return {
                        label: fields.label?.stringValue || "",
                        text: fields.text?.stringValue || ""
                    };
                }
                return "";
            });

            console.log(`Test: "${title}" | Group ${qIdx + 1}`);
            console.log(`  Instruction: "${qMap.instruction?.stringValue}"`);
            console.log(`  Type: "${qMap.type?.stringValue}"`);
            console.log(`  Options Count: ${options.length}`);
            console.log(`  First 3 Options:`, options.slice(0, 3));
            console.log('-------------------------------------------');
        }
    });
});
