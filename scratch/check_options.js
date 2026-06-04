import fs from 'fs';

const data = JSON.parse(fs.readFileSync('test_list.json', 'utf8'));
const documents = data.documents || [];

documents.forEach(doc => {
    const fields = doc.fields || {};
    const title = fields.title?.stringValue || "Untitled";
    const type = fields.type?.stringValue || "";
    
    const questionsVal = fields.questions?.arrayValue?.values || [];
    questionsVal.forEach((qVal, qIdx) => {
        const qMap = qVal.mapValue?.fields || {};
        const gt = String(qMap.type?.stringValue || "").toLowerCase();
        const gi = String(qMap.instruction?.stringValue || "").toLowerCase();
        
        if (gt.includes('matching')) {
            const hasHeadingKeyword = gi.includes('heading') || gt.includes('heading');
            const hasParagraphKeyword = gi.includes('paragraph');
            
            const optionsVal = qMap.options?.arrayValue?.values || [];
            const options = optionsVal.map(optVal => {
                // Could be stringValue or mapValue (if normalized object)
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

            const hasLongOption = options.some(opt => {
                const text = String(typeof opt === 'object' ? opt.text : opt).toLowerCase();
                return text.length > 15;
            });
            
            const isHeadingMatchedCurrent = hasHeadingKeyword || (hasLongOption && hasParagraphKeyword);

            if (isHeadingMatchedCurrent && !hasHeadingKeyword) {
                console.log(`Test: "${title}" | Group ${qIdx + 1}`);
                console.log(`  Instruction: "${qMap.instruction?.stringValue}"`);
                console.log(`  Type: "${qMap.type?.stringValue}"`);
                console.log(`  Options:`, options);
                console.log(`  Has Long Option (>15):`, hasLongOption);
                console.log('-------------------------------------------');
            }
        }
    });
});
