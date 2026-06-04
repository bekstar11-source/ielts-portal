import fs from 'fs';

const testDataArray = JSON.parse(fs.readFileSync('/Users/bekstar11gmail.com/Downloads/ielts_tests_export_1780494853757.json', 'utf8'));
const testData = testDataArray[0];

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
        console.log(`  Option ${idx + 1}: "${t}" (length: ${t.length})`);
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

const passageQuestions = testData.questions || [];
const matched = findMatchingHeadingsGroup(passageQuestions);
console.log("\nMatched Headings Group:", matched ? "YES (instruction: " + matched.instruction.substring(0, 50) + "...)" : "NO");
