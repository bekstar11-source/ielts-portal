/**
 * Utility functions for ReadingRightPane
 */
import { getNumeralPrefix, collectQuestionNumbers } from '../../../utils/ieltsScoring.js';

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
// The numeral written in the option text always wins: lists are often stored as
// "iv Heading" (space, no dot) and are not always in numeral order, so falling back
// to the positional numeral there would store the wrong label as the student's answer.
// `getNumeralPrefix` only accepts a space-separated prefix when it is a real numeral,
// so "I visited the museum" is still treated as plain text.
export const getHeadingOptionLabels = (options) => {
    if (!Array.isArray(options)) return [];
    const used = new Set();

    return options.map((opt, idx) => {
        const optText = typeof opt === 'object' ? opt.text : opt;

        let label = getNumeralPrefix(optText);

        // Fall back to the object's label/id if no numeral found in text
        if (!label && typeof opt === 'object') {
            label = opt.label || opt.id || null;
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
    // Savol raqamlarini yig'ish qoidasi `ieltsScoring.collectQuestionNumbers` da —
    // ball hisobi va savol sanagich bilan AYNI yuruvchi. Ilgari bu yerda
    // `rows → cells → content/parts` zanjiri qo'lda yozilgan edi va u
    // `groups`/`sections` ichiga kirmasdi: sarlavhada "Questions 27–30"
    // ko'rinardi-yu, guruhda aslida 32-savolgacha bo'lardi.
    const uniqueIds = [...collectQuestionNumbers(group)].sort((a, b) => a - b);

    if (uniqueIds.length <= 1) return "";
    return `Questions ${uniqueIds[0]}–${uniqueIds[uniqueIds.length - 1]}`;
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
