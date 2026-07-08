/**
 * Utility functions for ReadingRightPane
 */

export const toRoman = (num) => {
    const lookup = { m: 1000, cm: 900, d: 500, cd: 400, c: 100, xc: 90, l: 50, xl: 40, x: 10, ix: 9, v: 5, iv: 4, i: 1 };
    let roman = '', i;
    for (i in lookup) {
        while (num >= lookup[i]) {
            roman += i;
            num -= lookup[i];
        }
    }
    return roman;
};

// Derives a stable, collision-free label ("i", "ii", ...) for each heading option.
// Only treats a leading "i"/"v"/"x"/digit run as a numeral marker when it's followed by
// "." or ")" (a real list marker) — a bare space after "I"/"V"/"X" is almost always just
// the start of an English sentence, not a numeral, so it must not be matched here.
export const getHeadingOptionLabels = (options) => {
    if (!Array.isArray(options)) return [];
    const used = new Set();

    return options.map((opt, idx) => {
        const optText = typeof opt === 'object' ? opt.text : opt;
        let label = typeof opt === 'object' ? (opt.label || opt.id) : null;

        if (!label) {
            const match = String(optText || '').trim().match(/^([ivx\d]+)[\.\)]/i);
            label = match ? match[1].toLowerCase() : null;
        }

        let candidate = label ? String(label).toLowerCase() : null;
        if (!candidate || used.has(candidate)) {
            let fallbackNum = idx + 1;
            candidate = toRoman(fallbackNum);
            while (used.has(candidate)) {
                fallbackNum += 1;
                candidate = toRoman(fallbackNum);
            }
        }

        used.add(candidate);
        return candidate;
    });
};

export const getRangeLabel = (group) => {
    let allItems = group.items ? [...group.items] : [];
    if (group.questions) allItems = [...allItems, ...group.questions];
    if (group.groups) {
        group.groups.forEach(sub => {
            if (sub.items) allItems = [...allItems, ...sub.items];
            if (sub.questions) allItems = [...allItems, ...sub.questions];
        });
    }
    
    if (group.rows) {
        group.rows.forEach(row => {
            const cells = Array.isArray(row) ? row : (row.cells || []);
            cells.forEach(cell => {
                if (cell.id) allItems.push(cell);
                if (cell.content) cell.content.forEach(c => { if (c.id) allItems.push(c); });
                if (cell.parts) cell.parts.forEach(p => { if (p.id) allItems.push(p); });
            });
        });
    }
    
    const qIds = [];
    allItems.forEach(it => {
        const idStr = String(it.id || "");
        if (/^\d+\s*[\-–_]\s*\d+$/.test(idStr)) {
            const parts = idStr.split(/[\-–_]/);
            const start = parseInt(parts[0].trim());
            const end = parseInt(parts[1].trim());
            if (!isNaN(start) && !isNaN(end)) {
                for (let n = Math.min(start, end); n <= Math.max(start, end); n++) qIds.push(n);
            }
        } else {
            const num = parseInt(idStr);
            if (!isNaN(num)) qIds.push(num);
        }
    });
    qIds.sort((a, b) => a - b);
    const uniqueIds = [...new Set(qIds)];
    return uniqueIds.length > 0 ? `Questions ${uniqueIds[0]}${uniqueIds.length > 1 ? '–' + uniqueIds[uniqueIds.length - 1] : ''}` : "";
};

export const cleanInstructions = (group, isTFNG) => {
    let displayInstruction = group.instruction || "";
    displayInstruction = displayInstruction
        .replace(/^(?:<[^>]*>)*Questions?\s+\d+(?:\s*(?:[\-–]|to|and)\s*\d+)?\s*/gi, '')
        .replace(/^(?:<[^>]*>)*[\-–]\d+\s*/g, '')
        .replace(/^\s*\d{1,2}[\s.]*/g, '')
        .replace(/Write (?:your |the correct )?[^.]+?[\s]*in boxes? [\d\s\-–,and]+ on (?:your |the )?answer sheet\.?/gi, '')
        .trim();

    if (displayInstruction.toLowerCase().includes("choose the correct letter")) {
        displayInstruction = "Choose the correct letter, A, B, C or D.";
    } else {
        displayInstruction = displayInstruction.replace(/^\d{1,2}[\s.]+/g, '');
    }
    
    if (group.items && group.items.length > 0) {
        group.items.forEach(q => {
            if (q.text) {
                const cleanQText = q.text.trim();
                if (cleanQText.length > 10 && displayInstruction.includes(cleanQText)) {
                    displayInstruction = displayInstruction.replace(cleanQText, '').trim();
                }
            }
        });
    }

    displayInstruction = displayInstruction.replace(/(NO MORE THAN [^.]+(?:WORDS?|NUMBERS?|A NUMBER)|ONE WORD ONLY|AND\/OR A NUMBER|TWO WORDS|THREE WORDS)/gi, '<strong>$1</strong>');

    if (isTFNG) {
        displayInstruction = displayInstruction.replace(/In boxes \d+(?:\s*[\-–]\s*\d+)? on your answer sheet,? write:?\s*/gi, '');
        displayInstruction = displayInstruction.replace(/(TRUE|FALSE|NOT GIVEN|YES|NO)/g, '<br /><strong>$1</strong>');
        displayInstruction = displayInstruction.replace(/(<br\s*\/?>\s*)+<br\s*\/?>/g, '<br />');
    }
    return displayInstruction;
};
