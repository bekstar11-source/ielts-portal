import fs from 'fs';

const data = JSON.parse(fs.readFileSync('test_list.json', 'utf8'));
const documents = data.documents || [];

console.log("Analyzing all tests in test_list.json for false positive heading matching...\n");

const normalizeOptionsList = (optionsList) => {
    if (!optionsList || !Array.isArray(optionsList)) return optionsList;
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
    return optionsList.map((opt, idx) => {
        if (typeof opt === 'object' && opt !== null) {
            if (opt.label) return opt;
            return {
                label: letters[idx] || 'A',
                text: opt.text || ''
            };
        }
        const str = String(opt || '').trim();
        const match = str.match(/^([A-Z])[\.\)\s]\s*(.*)$/i);
        if (match) {
            return {
                label: match[1].toUpperCase(),
                text: match[2].trim()
            };
        }
        return {
            label: letters[idx] || 'A',
            text: str
        };
    });
};

documents.forEach(doc => {
    const fields = doc.fields || {};
    const title = fields.title?.stringValue || "Untitled";
    
    const questionsVal = fields.questions?.arrayValue?.values || [];
    const questions = questionsVal.map(qVal => {
        const qMap = qVal.mapValue?.fields || {};
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
        return {
            type: qMap.type?.stringValue || "",
            instruction: qMap.instruction?.stringValue || "",
            options: options
        };
    });

    // Run normalized check
    const normalizedQuestions = questions.map(group => {
        let normalizedGroup = { ...group };
        if (group.options) {
            normalizedGroup.options = normalizeOptionsList(group.options);
        }
        return normalizedGroup;
    });

    const checkGroup = (g, name) => {
        const gt = String(g.type || "").toLowerCase();
        const gi = String(g.instruction || "").toLowerCase();
        
        const hasHeadingKeyword = gi.includes('heading') || gt.includes('heading');
        
        const hasLongOption = g.options && g.options.some(opt => {
            const t = String(typeof opt === 'object' ? opt.text : opt).toLowerCase();
            return t.length > 15;
        });
        
        const giIncludesParagraph = gi.includes('paragraph');
        
        const isHeadingMatched = gt.includes('matching') && (
            hasHeadingKeyword || (hasLongOption && giIncludesParagraph)
        );

        if (isHeadingMatched && !hasHeadingKeyword) {
            console.log(`FOUND FALSE POSITIVE in test "${title}" (${name}):`);
            console.log(`  Instruction: "${g.instruction}"`);
            console.log(`  Options:`, g.options);
            console.log(`  giIncludesParagraph:`, giIncludesParagraph);
            console.log(`  hasLongOption (>15):`, hasLongOption);
            console.log('-------------------------------------------');
        }
    };

    questions.forEach((g, idx) => checkGroup(g, `raw group ${idx + 1}`));
    normalizedQuestions.forEach((g, idx) => checkGroup(g, `normalized group ${idx + 1}`));
});
