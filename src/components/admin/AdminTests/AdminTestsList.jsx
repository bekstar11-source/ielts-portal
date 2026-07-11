import React from 'react';
import { MoreHorizontal, Edit2, Edit3, Trash2, Globe, Lock, BookOpen, Headphones, PenTool, Mic2, Eye, Award, Copy, Folder } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { normalizeTestSegments } from '../../../utils/normalizeTestSegments';

const QTYPE_LABELS = {
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

const formatQuestionType = (type) => {
    const raw = typeof type === 'string' ? type : (type?.name || type?.type || String(type ?? ''));
    if (QTYPE_LABELS[raw]) return QTYPE_LABELS[raw];
    return raw.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
};

const getMatchSnippet = (content, term) => {
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

    const regex = new RegExp(`(${cleanTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    const parts = snippet.split(regex);
    
    return (
        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1.5 inline-flex items-center gap-1 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/10 px-2 py-1 rounded max-w-xl break-all">
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

const findParentMergedTest = (test, allTestsList) => {
    if (!test.isMergedSource) return null;
    const testTitleLower = (test.title || "").toLowerCase().trim();
    
    return allTestsList.find(t => {
        const isMerged = t.isMerged || (t.title?.toLowerCase().startsWith("merged:") && !t.isMergedSource);
        if (!isMerged) return false;
        
        // Match by mergedSourceIds
        if (Array.isArray(t.mergedSourceIds) && t.mergedSourceIds.includes(test.id)) {
            return true;
        }
        
        // Match by title parsing (e.g. "Merged: Test A + Test B")
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

const AdminTestsList = ({
    tests = [], collections = [], allTests = [], onSelectCollection,
    highlightedTestId = null, onHighlightTest,
    selectedTests = [], onToggleSelect, onSelectAll, onDelete, onEdit, onQuickEdit, onView, onDuplicate, searchTerm = "", contentSearchTerm = ""
}) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const masterCheckboxRef = React.useRef(null);

    React.useEffect(() => {
        if (masterCheckboxRef.current) {
            masterCheckboxRef.current.indeterminate = selectedTests.length > 0 && selectedTests.length < tests.length;
        }
    }, [selectedTests, tests]);

    const isAllSelected = tests.length > 0 && selectedTests.length === tests.length;

    return (
        <div className={`w-full overflow-x-auto rounded-xl border transition-colors ${
            isDark ? 'bg-[#181818] border-white/5' : 'bg-white border-zinc-200'
        }`}>
            <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                    <tr className={`text-[10px] font-black uppercase tracking-widest border-b select-none ${
                        isDark ? 'text-zinc-500 border-white/5 bg-white/5' : 'text-zinc-400 border-zinc-200 bg-zinc-50/50'
                    }`}>
                        <th className="py-3.5 pl-4 w-12 text-center">
                            <input
                                ref={masterCheckboxRef}
                                type="checkbox"
                                className="accent-blue-600 w-4 h-4 cursor-pointer rounded border-zinc-300 focus:ring-blue-500"
                                checked={isAllSelected}
                                onChange={(e) => onSelectAll && onSelectAll(e.target.checked)}
                            />
                        </th>
                        <th className="py-3.5 pl-4 font-black">Test Title</th>
                        <th className="py-3.5 px-4 font-black">Structure</th>
                        <th className="py-3.5 px-4 font-black">Question Types</th>
                        <th className="py-3.5 px-4 font-black">Created At</th>
                        <th className="py-3.5 pr-4 text-right font-black">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                    {tests.length === 0 ? (
                        <tr>
                            <td colSpan="6" className="py-12 text-center text-sm font-semibold text-zinc-400 dark:text-zinc-500">
                                No tests found.
                            </td>
                        </tr>
                    ) : tests.map(test => {
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
                                const partKeys = Array.isArray(test.parts)
                                    ? test.parts
                                    : Object.keys(test.parts);
                                passageCount = Array.isArray(partKeys) ? partKeys.length : partKeys.length;
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

                        const segments = normalizeTestSegments(test);
                        const isSelected = selectedTests.includes(test.id);
                        const isHighlighted = test.id === highlightedTestId;

                        return (
                            <tr
                                key={test.id}
                                className={`group transition-all duration-300 border-l-2 ${
                                    isSelected
                                        ? (isDark ? 'bg-blue-500/10 border-blue-500/80' : 'bg-blue-500/5 border-blue-600')
                                        : isHighlighted
                                            ? (isDark 
                                                ? 'bg-purple-650/30 border-purple-500 ring-2 ring-purple-500/30 scale-[1.005] shadow-lg shadow-purple-500/5 z-10' 
                                                : 'bg-purple-50/85 border-purple-600 ring-2 ring-purple-500/20 scale-[1.005] shadow-lg shadow-purple-500/5 z-10')
                                            : 'border-transparent hover:bg-zinc-50/80 dark:hover:bg-white/5'
                                }`}
                            >
                                <td className="py-4 pl-4 text-center">
                                    <input
                                        type="checkbox"
                                        className="accent-blue-600 w-4 h-4 cursor-pointer rounded border-zinc-300"
                                        checked={isSelected}
                                        onChange={() => onToggleSelect(test.id)}
                                    />
                                </td>
                                <td className="py-4 pl-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                                            test.type === 'reading'
                                                ? (isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-600')
                                                : test.type === 'listening'
                                                    ? (isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-amber-50 border-amber-100 text-amber-600')
                                                    : test.type === 'writing'
                                                        ? (isDark ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-100 text-blue-600')
                                                        : test.type === 'mock'
                                                            ? (isDark ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-rose-55/10 border-rose-100 text-rose-600')
                                                            : (isDark ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' : 'bg-purple-50 border-purple-100 text-purple-600')
                                        }`}>
                                            {test.type === 'reading' ? <BookOpen size={16} /> :
                                             test.type === 'listening' ? <Headphones size={16} /> :
                                             test.type === 'writing' ? <PenTool size={16} /> :
                                             test.type === 'mock' ? <Award size={16} /> : <Mic2 size={16} />}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 flex-wrap">
                                                <span>{test.title || "Untitled Test"}</span>
                                                {test.isFree && (
                                                    <span className="text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500 text-white leading-none">FREE</span>
                                                )}
                                                {(test.isMerged || (test.title?.toLowerCase().startsWith("merged:") && !test.isMergedSource)) && (
                                                    <span className="text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full bg-purple-600 text-white leading-none">MERGED</span>
                                                )}
                                                {test.isMergedSource && (() => {
                                                    const parent = findParentMergedTest(test, allTests);
                                                    const parentCol = parent ? collections.find(c => c.id === parent.collectionId) : null;
                                                    const tooltipTitle = parentCol 
                                                        ? `Birlashtirilgan test to'plami: ${parentCol.name}. To'plamni ko'rish uchun bosing.` 
                                                        : (parent ? "Birlashtirilgan test tarkibiy qismi. Birlashtirilgan testlarni ko'rish uchun bosing." : "Birlashtirilgan test tarkibiy qismi (Manba test)");
                                                    
                                                    const handleClick = (e) => {
                                                        e.stopPropagation();
                                                        if (parent) {
                                                            if (onSelectCollection) {
                                                                if (parent.collectionId) {
                                                                    onSelectCollection(parent.collectionId);
                                                                } else {
                                                                    onSelectCollection("Merged");
                                                                }
                                                            }
                                                            if (onHighlightTest) {
                                                                onHighlightTest(parent.id);
                                                            }
                                                        }
                                                    };

                                                    return (
                                                        <button
                                                            onClick={handleClick}
                                                            className={`text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full flex items-center gap-1 leading-none transition-all hover:scale-105 active:scale-95 ${
                                                                isDark
                                                                    ? 'bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-400'
                                                                    : 'bg-purple-50 hover:bg-purple-100 border border-purple-150 text-purple-600'
                                                            }`}
                                                            title={tooltipTitle}
                                                        >
                                                            <span className="text-[10px]">🔗</span> Source
                                                        </button>
                                                    );
                                                })()}
                                            </div>
                                            {contentSearchTerm && getMatchSnippet(test.combinedContent, contentSearchTerm)}

                                            <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                                                <div className="flex items-center gap-1 select-none">
                                                    {test.isPublic ? (
                                                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/10">
                                                            <Globe size={10} /> Public
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 bg-zinc-500/5 dark:bg-white/5 px-1.5 py-0.5 rounded border border-zinc-500/10">
                                                            <Lock size={10} /> Private
                                                        </span>
                                                    )}
                                                </div>
                                                {test.collectionId ? (
                                                    (() => {
                                                        const col = collections.find(c => c.id === test.collectionId);
                                                        const isListening = col?.type === 'listening';
                                                        const isReading = col?.type === 'reading';
                                                        const isMock = col?.type === 'mock';
                                                        return (
                                                            <span
                                                                title={`To'plam: ${col?.name || "Noma'lum"}`}
                                                                className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border max-w-[150px] truncate select-none ${
                                                                    isDark
                                                                        ? 'text-blue-400 bg-blue-500/5 border-blue-500/10'
                                                                        : 'text-blue-600 bg-blue-50 border border-blue-100'
                                                                }`}
                                                            >
                                                                <Folder size={10} className={
                                                                    isListening ? 'text-amber-500 shrink-0' :
                                                                    isReading ? 'text-emerald-500 shrink-0' :
                                                                    isMock ? 'text-blue-500 shrink-0' : 'text-zinc-400 shrink-0'
                                                                } />
                                                                <span className="truncate">{col?.name || "To'plam"}</span>
                                                            </span>
                                                        );
                                                    })()
                                                ) : (
                                                    <span className="text-[10px] text-zinc-400 font-medium">ID: {test.id.slice(0, 8)}...</span>
                                                )}

                                                {(test.tags || []).map((tag, i) => (
                                                    <span key={i} className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full select-none ${
                                                        isDark ? 'bg-blue-500/10 text-blue-400 border border-blue-500/10' : 'bg-blue-50 text-blue-600 border border-blue-100'
                                                    }`}>
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-4 px-4">
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex flex-col">
                                            <span className={`text-xs font-bold ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                                                {passageCount}{" "}{
                                                test.type === 'listening' ? (passageCount === 1 ? 'Part' : 'Parts') :
                                                test.type === 'writing' ? (passageCount === 1 ? 'Task' : 'Tasks') :
                                                test.type === 'mock' ? (passageCount === 1 ? 'Module' : 'Modules') :
                                                (passageCount === 1 ? 'Passage' : 'Passages')
                                            }
                                            </span>
                                            {totalGroups > 0 && (
                                                <span className="text-[10px] text-zinc-400 font-medium mt-0.5">
                                                    {totalGroups} question groups
                                                </span>
                                            )}
                                        </div>
                                        {segments.length > 0 && (
                                            <div className="flex gap-1 items-center">
                                                {segments.map((seg, i) => (
                                                    <span
                                                        key={i}
                                                        title={`${seg.title} ${seg.exists ? '(Mavjud)' : '(Mavjud emas)'}`}
                                                        className={`text-[9px] font-black px-2 py-0.5 rounded border transition-all select-none ${
                                                            seg.exists
                                                                ? (isDark
                                                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                                    : 'bg-blue-50 text-blue-600 border-blue-100')
                                                                : (isDark
                                                                    ? 'bg-zinc-800/10 text-zinc-650 border-dashed border-zinc-700/40 opacity-30'
                                                                    : 'bg-zinc-50 text-zinc-350 border-dashed border-zinc-200 opacity-60')
                                                        }`}
                                                    >
                                                        {seg.label}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="py-4 px-4">
                                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                                        {qTypes.length > 0 ? (
                                            qTypes.map((type, i) => (
                                                <span key={i} className={`text-[9px] px-2 py-0.5 rounded-sm border font-bold ${
                                                    isDark ? 'bg-white/5 border-white/5 text-zinc-400' : 'bg-zinc-50 border-zinc-150 text-zinc-600'
                                                }`}>
                                                    {formatQuestionType(type)}
                                                </span>
                                            ))
                                        ) : <span className="text-[10px] text-zinc-400 font-medium italic">No types defined</span>}
                                    </div>
                                </td>
                                <td className="py-4 px-4 text-[11px] text-zinc-450 dark:text-zinc-500 font-bold">
                                    {test.createdAt ? new Date(test.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                                </td>
                                <td className="py-4 pr-4 text-right">
                                    <div className="flex justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                                        {test.type !== 'mock' && (
                                            <button
                                                onClick={() => onView(test.id)}
                                                className="p-1.5 text-zinc-400 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-emerald-500/5 rounded-full transition-all"
                                                title="Ko'rish"
                                            >
                                                <Eye size={14} />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => onDuplicate && onDuplicate(test.id, test.title)}
                                            className="p-1.5 text-zinc-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-500/5 rounded-full transition-all"
                                            title="Nusxalash (Duplicate)"
                                        >
                                            <Copy size={14} />
                                        </button>
                                        <button
                                            onClick={() => onQuickEdit(test)}
                                            className="p-1.5 text-zinc-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-500/5 rounded-full transition-all"
                                            title="Tezkor tahrirlash (Nomi va to'plam)"
                                        >
                                            <Edit3 size={14} />
                                        </button>
                                        <button
                                            onClick={() => onEdit(test.id)}
                                            className="p-1.5 text-zinc-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-500/5 rounded-full transition-all"
                                            title={test.type === 'mock' ? "Modullarni tahrirlash" : "Savollarni tahrirlash"}
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button
                                            onClick={() => onDelete(test.id, test.title)}
                                            className="p-1.5 text-zinc-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-500/5 rounded-full transition-all"
                                            title="O'chirish"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default AdminTestsList;
