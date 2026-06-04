import fs from 'fs';

if (fs.existsSync('cLQsQziJn3Lbq1KT5TRQ.json')) {
    const testData = JSON.parse(fs.readFileSync('cLQsQziJn3Lbq1KT5TRQ.json', 'utf8'));
    console.log("Analyzing cLQsQziJn3Lbq1KT5TRQ.json...");
    const questions = testData.questions || [];
    questions.forEach((g, gIdx) => {
        const gt = String(g.type || "").toLowerCase();
        const gi = String(g.instruction || "").toLowerCase();
        if (gt.includes('matching')) {
            const hasHeadingKeyword = gi.includes('heading') || gt.includes('heading');
            const hasParagraphKeyword = gi.includes('paragraph');
            const hasLongOption = g.options && g.options.some(opt => {
                const t = String(typeof opt === 'object' ? opt.text : opt).toLowerCase();
                return t.length > 15;
            });
            const isHeadingMatched = gt.includes('matching') && (
                hasHeadingKeyword || (hasLongOption && hasParagraphKeyword)
            );
            console.log(`Group ${gIdx + 1}: gt="${gt}", gi="${gi.substring(0, 40)}...", options length: ${g.options?.length}`);
            if (g.options) {
                console.log(`  Options:`, g.options.slice(0, 3));
            }
            console.log(`  Is Matched as Headings: ${isHeadingMatched} (hasHeadingKeyword: ${hasHeadingKeyword}, hasLongOption: ${hasLongOption}, hasParagraphKeyword: ${hasParagraphKeyword})`);
            console.log('-----------------------------------');
        }
    });
} else {
    console.log("File cLQsQziJn3Lbq1KT5TRQ.json does not exist");
}
