import { getPassageOrPartNum } from '../components/admin/CreateTest/CreateTestUtils';

export function normalizeTestSegments(test) {
    const type = test.type || '';
    const hasFullPassages = Array.isArray(test.passages) && test.passages.length > 0;

    if (type === 'mock') {
        return [
            { label: 'R', title: 'Reading Module', exists: !!test.subTests?.readingId },
            { label: 'L', title: 'Listening Module', exists: !!test.subTests?.listeningId },
            { label: 'W', title: 'Writing Module', exists: !!test.subTests?.writingId }
        ];
    }

    if (type === 'reading') {
        const present = new Set();
        if (hasFullPassages) {
            test.passages.forEach((p, idx) => {
                const num = getPassageOrPartNum(p, idx, 'reading', test.questions || []);
                if (num >= 1 && num <= 3) present.add(num);
            });
        } else if (test.passages && typeof test.passages === 'object') {
            if (Array.isArray(test.passages)) {
                test.passages.forEach((p, idx) => {
                    const num = getPassageOrPartNum(p, idx, 'reading', test.questions || []);
                    if (num >= 1 && num <= 3) present.add(num);
                });
            } else {
                [1, 2, 3].forEach(num => {
                    if (test.passages[`passage${num}`] !== undefined || test.passages[`Passage${num}`] !== undefined) {
                        present.add(num);
                    }
                });
            }
        }
        return [1, 2, 3].map(num => ({ label: `P${num}`, title: `Passage ${num}`, exists: present.has(num) }));
    }

    if (type === 'listening') {
        const present = new Set();
        if (hasFullPassages) {
            test.passages.forEach((p, idx) => {
                const num = getPassageOrPartNum(p, idx, 'listening', test.questions || []);
                if (num >= 1 && num <= 4) present.add(num);
            });
        } else if (test.parts) {
            if (Array.isArray(test.parts)) {
                test.parts.forEach((p, idx) => {
                    const num = getPassageOrPartNum(p, idx, 'listening', test.questions || []);
                    if (num >= 1 && num <= 4) present.add(num);
                });
            } else {
                [1, 2, 3, 4].forEach(num => {
                    if (test.parts[`part${num}`] !== undefined || test.parts[`Part${num}`] !== undefined) {
                        present.add(num);
                    }
                });
            }
        }
        return [1, 2, 3, 4].map(num => ({ label: `Pt${num}`, title: `Part ${num}`, exists: present.has(num) }));
    }

    if (type === 'writing') {
        const present = new Set();
        if (hasFullPassages) {
            (test.writingTasks || []).forEach((t, idx) => {
                const idNum = parseInt(t.id);
                if (!isNaN(idNum)) {
                    present.add(idNum);
                } else {
                    const match = t.title?.match(/Task\s*(\d+)/i) || t.title?.match(/(\d+)/);
                    present.add(match ? parseInt(match[1]) : idx + 1);
                }
            });
        } else {
            const count = test.writingTasks?.length || 2;
            [1, 2].forEach(num => { if (num <= count) present.add(num); });
        }
        return [1, 2].map(num => ({ label: `T${num}`, title: `Task ${num}`, exists: present.has(num) }));
    }

    if (type === 'speaking') {
        const present = new Set();
        const tasks = test.speakingTasks || (Array.isArray(test.parts) ? test.parts : null);
        if (tasks) {
            tasks.forEach((_, idx) => present.add(idx + 1));
        } else if (test.parts && typeof test.parts === 'object') {
            Object.keys(test.parts).forEach((_, idx) => present.add(idx + 1));
        }
        return [1, 2, 3].map(num => ({ label: `S${num}`, title: `Part ${num}`, exists: present.has(num) }));
    }

    return [];
}
