import React from 'react';
import { BookOpen, Headphones, PenTool, Mic2, Award, Layers } from 'lucide-react';

export const QTYPE_LABELS = {
    'multiple_choice': 'MCQ', 'multi_choice': 'MCQ', 'multipleChoice': 'MCQ', 'Multiple Choice': 'MCQ',
    'true_false': 'TFNG', 'trueFalse': 'TFNG', 'TFNG/YNNG': 'TFNG',
    'yes_no': 'YNNG', 'yesNo': 'YNNG',
    'matching_headings': 'Match Heads', 'matchingHeadings': 'Match Heads', 'Matching Headings': 'Match Heads',
    'matching': 'Matching',
    'gap_fill': 'Gap Fill', 'gapFill': 'Gap Fill',
    'note_completion': 'Completion', 'sentence_completion': 'Completion', 'summary_completion': 'Completion',
    'table_completion': 'Table', 'tableCompletion': 'Table', 'Table Completion': 'Table',
    'short_answer': 'Short Ans', 'shortAnswer': 'Short Ans', 'Short Answer': 'Short Ans',
    'flow_chart': 'Flow Chart', 'flowChart': 'Flow Chart',
    'map_labeling': 'Map/Diag', 'mapLabeling': 'Map/Diag', 'Map/Diagram': 'Map/Diag',
    'pick_two': 'Pick Two', 'pickTwo': 'Pick Two',
    'diagram_labeling': 'Diagram',
};

export const formatQuestionType = (type) => {
    const raw = typeof type === 'string' ? type : (type?.name || type?.type || String(type ?? ''));
    if (QTYPE_LABELS[raw]) return QTYPE_LABELS[raw];
    return raw.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
};

export const getMatchSnippet = (content, term) => {
    if (!term || !content) return null;
    const cleanTerm = term.trim().toLowerCase();
    if (cleanTerm.length < 2) return null;

    const cleanContent = content.replace(/\s+/g, ' ');
    const idx = cleanContent.toLowerCase().indexOf(cleanTerm);
    if (idx === -1) return null;

    const start = Math.max(0, idx - 45);
    const end = Math.min(cleanContent.length, idx + cleanTerm.length + 45);
    let snippet = cleanContent.slice(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < cleanContent.length) snippet = snippet + '...';

    const regex = new RegExp(`(${cleanTerm.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    const parts = snippet.split(regex);

    return (
        <span className="text-[11px] text-zinc-500 dark:text-warm-on-dark-soft mt-1.5 inline-flex items-center gap-1 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/10 px-2 py-1 rounded max-w-xl break-all">
            <span className="font-semibold text-amber-600 dark:text-amber-400 shrink-0 text-[10px] uppercase tracking-wider">Matnda:</span>
            <span>
                {parts.map((part, i) =>
                    part.toLowerCase() === cleanTerm
                        ? <mark key={i} className="bg-amber-200 dark:bg-amber-950 text-zinc-950 dark:text-amber-250 font-bold px-0.5 rounded">{part}</mark>
                        : part
                )}
            </span>
        </span>
    );
};

export const findParentMergedTest = (test, allTestsList) => {
    if (!test.isMergedSource) return null;
    const testTitleLower = (test.title || "").toLowerCase().trim();

    return allTestsList.find(t => {
        const isMerged = t.isMerged || (t.title?.toLowerCase().startsWith("merged:") && !t.isMergedSource);
        if (!isMerged) return false;

        if (Array.isArray(t.mergedSourceIds) && t.mergedSourceIds.includes(test.id)) {
            return true;
        }

        let content = t.title || "";
        if (content.toLowerCase().startsWith("merged:")) {
            content = content.slice(7).trim();
        }
        if (content) {
            const parts = content.split(" + ").map(p => p.trim().toLowerCase());
            if (parts.includes(testTitleLower)) {
                return true;
            }
        }

        return false;
    });
};

// Shared type -> icon/color mapping, used by the toolbar filter, table rows, and grid cards
// so the four places that render a test-type badge stay visually consistent.
const TYPE_META = {
    reading: {
        Icon: BookOpen,
        iconClass: 'text-emerald-500',
        tile: { dark: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', light: 'bg-emerald-50 border-emerald-100 text-emerald-600' },
    },
    listening: {
        Icon: Headphones,
        iconClass: 'text-amber-500',
        tile: { dark: 'bg-amber-500/10 border-amber-500/20 text-amber-400', light: 'bg-amber-50 border-amber-100 text-amber-600' },
    },
    writing: {
        Icon: PenTool,
        iconClass: 'text-blue-500',
        tile: { dark: 'bg-blue-500/10 border-blue-500/20 text-blue-400', light: 'bg-blue-50 border-blue-100 text-blue-600' },
    },
    mock: {
        Icon: Award,
        iconClass: 'text-rose-500',
        tile: { dark: 'bg-rose-500/10 border-rose-500/20 text-rose-400', light: 'bg-rose-50 border-rose-100 text-rose-600' },
    },
    speaking: {
        Icon: Mic2,
        iconClass: 'text-purple-500',
        tile: { dark: 'bg-purple-500/10 border-purple-500/20 text-purple-400', light: 'bg-purple-50 border-purple-100 text-purple-600' },
    },
};

const DEFAULT_TYPE_META = {
    Icon: Layers,
    iconClass: 'text-zinc-500 dark:text-warm-on-dark-soft',
    tile: { dark: 'bg-purple-500/10 border-purple-500/20 text-purple-400', light: 'bg-purple-50 border-purple-100 text-purple-600' },
};

export const getTypeMeta = (type) => TYPE_META[type] || DEFAULT_TYPE_META;

// Derives displayed structure (passage/part count, question types) from either
// full test payloads (passages/questions arrays) or lightweight metadata docs.
export const getTestStructure = (test) => {
    const hasFullPassages = Array.isArray(test.passages) && test.passages.length > 0;
    let qTypes = [];
    let passageCount = 0;
    let totalGroups = 0;

    if (hasFullPassages) {
        const flatQuestions = test.questions || [];
        const passageQuestions = test.passages.flatMap(p => p.questions || []);
        const allQuestions = [...flatQuestions, ...passageQuestions];
        qTypes = Array.from(new Set(allQuestions.map(q => q.questionType || q.type))).filter(Boolean);
        passageCount = test.type === 'writing'
            ? (test.writingTasks?.length || 2)
            : test.passages.length;
        totalGroups = allQuestions.length;
    } else {
        qTypes = test.questionTypes || [];
        if (test.type === 'mock') {
            passageCount = 3;
            qTypes = ["Reading", "Listening", "Writing"];
        } else if (test.type === 'listening' && test.parts) {
            const partKeys = Array.isArray(test.parts) ? test.parts : Object.keys(test.parts);
            passageCount = partKeys.length;
            if (!Array.isArray(test.parts)) {
                partKeys.forEach(k => {
                    (test.parts[k].qTypes || []).forEach(t => {
                        if (!qTypes.includes(t)) qTypes.push(t);
                    });
                });
            }
        } else if (test.type === 'reading' && test.passages && !Array.isArray(test.passages)) {
            const passKeys = Object.keys(test.passages);
            passageCount = passKeys.length;
            passKeys.forEach(k => {
                (test.passages[k].qTypes || []).forEach(t => {
                    if (!qTypes.includes(t)) qTypes.push(t);
                });
            });
        } else if (test.type === 'writing') {
            passageCount = test.writingTasks?.length || 2;
        } else if (test.type === 'speaking') {
            passageCount = test.parts ? Object.keys(test.parts).length : 3;
        } else {
            passageCount = test.type === 'listening' ? 4 : (test.type === 'reading' ? 3 : 0);
        }
    }

    const unitLabel = test.type === 'listening' ? (passageCount === 1 ? 'Part' : 'Parts') :
        test.type === 'writing' ? (passageCount === 1 ? 'Task' : 'Tasks') :
        test.type === 'mock' ? (passageCount === 1 ? 'Module' : 'Modules') :
        (passageCount === 1 ? 'Passage' : 'Passages');

    return { qTypes, passageCount, totalGroups, unitLabel };
};
