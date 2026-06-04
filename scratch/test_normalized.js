import fs from 'fs';

const testDataArray = JSON.parse(fs.readFileSync('/Users/bekstar11gmail.com/Downloads/ielts_tests_export_1780494853757.json', 'utf8'));
const testData = testDataArray[0];

const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];

const normalizeOptionsList = (optionsList) => {
    if (!optionsList || !Array.isArray(optionsList)) return optionsList;
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

const normalizeQuestions = (questions) => {
    if (!questions || !Array.isArray(questions)) return [];
    return questions.map(group => {
        let normalizedGroup = { ...group };
        if (group.options) {
            normalizedGroup.options = normalizeOptionsList(group.options);
        }
        return normalizedGroup;
    });
};

const normalizedQuestions = normalizeQuestions(testData.questions);

const findMatchingHeadingsGroup = (passageQuestions) => {
  return passageQuestions.find(g => {
    const gt = String(g.type || "").toLowerCase();
    const gi = String(g.instruction || "").toLowerCase();
    
    const hasHeadingKeyword = gi.includes('heading') || gt.includes('heading');
    const hasParagraphKeyword = gi.includes('paragraph');
    
    const hasLongOption = g.options && g.options.some(opt => {
      const t = String(typeof opt === 'object' ? opt.text : opt).toLowerCase();
      return t.length > 15;
    });

    console.log(`Checking group: gt="${gt}", gi_has_paragraph=${gi.includes('paragraph')}, hasLongOption=${hasLongOption}`);
    if (g.options) {
      g.options.forEach((opt, idx) => {
        const t = String(typeof opt === 'object' ? opt.text : opt).toLowerCase();
        console.log(`  Option ${idx + 1}: label="${opt.label}" text="${t}" (length: ${t.length})`);
      });
    }

    return gt.includes('matching') && (
      gi.includes('heading') || gt.includes('heading') ||
      (g.options && g.options.some(opt => {
        const t = String(typeof opt === 'object' ? opt.text : opt).toLowerCase();
        return t.length > 15;
      }) && gi.includes('paragraph'))
    );
  });
};

const matched = findMatchingHeadingsGroup(normalizedQuestions);
console.log("\nMatched Headings Group after normalization:", matched ? "YES (instruction: " + matched.instruction.substring(0, 50) + "...)" : "NO");
