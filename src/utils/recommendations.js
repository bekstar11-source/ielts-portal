export function getRecommendations(stats, allTests, uniqueCompletedTestIds) {
    if (!allTests || allTests.length === 0) return [];

    // 1. Filter out completed tests
    let availableTests = allTests.filter(t => !uniqueCompletedTestIds.includes(t.id));

    // 2. Determine Focus Areas
    const focusSkills = [];
    const averages = stats.skillAverages;

    if (averages.reading > 0 && averages.reading < 7.0) focusSkills.push('reading');
    if (averages.listening > 0 && averages.listening < 7.0) focusSkills.push('listening');
    if (averages.writing > 0 && averages.writing < 6.5) focusSkills.push('writing');
    if (averages.speaking > 0 && averages.speaking < 6.5) focusSkills.push('speaking');

    // Agar hammasi yaxshi bo'lsa yoki ma'lumot bo'lmasa, Random
    if (focusSkills.length === 0) {
        // Shuffle array
        return availableTests.sort(() => 0.5 - Math.random()).slice(0, 5);
    }

    // 3. Score tests based on relevance
    const scoredTests = availableTests.map(test => {
        let score = 0;
        // Turi mos kelsa
        if (test.type && focusSkills.includes(test.type.toLowerCase())) score += 10;

        // Yangi bo'lsa (created recently logic omitted for now)

        return { ...test, relevanceScore: score };
    });

    // 4. Sort by score
    scoredTests.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return scoredTests.slice(0, 5); // Top 5
}
