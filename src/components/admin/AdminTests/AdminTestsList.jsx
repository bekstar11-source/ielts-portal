import React from 'react';
import { MoreHorizontal, Edit2, Edit3, Trash2, Globe, Lock, BookOpen, Headphones, PenTool, Mic2, Eye, Award, Copy } from 'lucide-react';

import { getPassageOrPartNum } from '../CreateTest/CreateTestUtils';

const formatQuestionType = (type) => {
    const label = typeof type === 'string' ? type : (type?.name || type?.type || String(type ?? ''));
    return label.replace(/([A-Z])/g, ' $1').trim();
};

const getSegments = (test) => {
    const type = test.type || '';
    if (type === 'mock') {
        return [
            { label: 'R', title: 'Reading Module', exists: !!test.subTests?.readingId },
            { label: 'L', title: 'Listening Module', exists: !!test.subTests?.listeningId },
            { label: 'W', title: 'Writing Module', exists: !!test.subTests?.writingId }
        ];
    }
    if (type === 'reading') {
        const present = new Set();
        (test.passages || []).forEach((p, idx) => {
            const num = getPassageOrPartNum(p, idx, 'reading', test.questions || []);
            if (num >= 1 && num <= 3) present.add(num);
        });
        return [1, 2, 3].map(num => ({
            label: `P${num}`,
            title: `Passage ${num}`,
            exists: present.has(num)
        }));
    }
    if (type === 'listening') {
        const present = new Set();
        (test.passages || []).forEach((p, idx) => {
            const num = getPassageOrPartNum(p, idx, 'listening', test.questions || []);
            if (num >= 1 && num <= 4) present.add(num);
        });
        return [1, 2, 3, 4].map(num => ({
            label: `Pt${num}`,
            title: `Part ${num}`,
            exists: present.has(num)
        }));
    }
    if (type === 'writing') {
        const present = new Set();
        (test.writingTasks || []).forEach((t, idx) => {
            const idNum = parseInt(t.id);
            if (!isNaN(idNum)) {
                present.add(idNum);
            } else {
                const titleMatch = t.title?.match(/Task\s*(\d+)/i) || t.title?.match(/(\d+)/);
                if (titleMatch) {
                    present.add(parseInt(titleMatch[1]));
                } else {
                    present.add(idx + 1);
                }
            }
        });
        return [1, 2].map(num => ({
            label: `T${num}`,
            title: `Task ${num}`,
            exists: present.has(num)
        }));
    }
    if (type === 'speaking') {
        const present = new Set();
        (test.speakingTasks || test.parts || []).forEach((t, idx) => {
            present.add(idx + 1);
        });
        return [1, 2, 3].map(num => ({
            label: `S${num}`,
            title: `Part ${num}`,
            exists: present.has(num)
        }));
    }
    return [];
};

const AdminTestsList = ({ 
    tests = [], selectedTests = [], onToggleSelect, onSelectAll, onDelete, onEdit, onQuickEdit, onView, onDuplicate, isDark 
}) => {
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
                        // Support both full test docs and lightweight metadata-only docs
                        const hasFullPassages = Array.isArray(test.passages) && test.passages.length > 0;
                        
                        let qTypes = [];
                        let passageCount = 0;
                        let totalGroups = 0;
                        let segments = [];

                        if (hasFullPassages) {
                            // Full test document: extract from arrays
                            const flatQuestions = test.questions || [];
                            const passageQuestions = (test.passages || []).flatMap(p => p.questions || []);
                            const allQuestions = [...flatQuestions, ...passageQuestions];
                            qTypes = Array.from(new Set(allQuestions.map(q => q.questionType || q.type))).filter(Boolean);
                            passageCount = test.type === 'writing'
                                ? (test.writingTasks?.length || 2)
                                : test.passages.length;
                            totalGroups = allQuestions.length;
                            segments = getSegments(test);
                        } else {
                            // Metadata-only document: use summary fields
                            qTypes = test.questionTypes || [];
                            if (test.type === 'mock') {
                                passageCount = 3;
                                qTypes = ["Reading", "Listening", "Writing"];
                                segments = [
                                    { label: 'R', title: 'Reading Module', exists: !!test.subTests?.readingId },
                                    { label: 'L', title: 'Listening Module', exists: !!test.subTests?.listeningId },
                                    { label: 'W', title: 'Writing Module', exists: !!test.subTests?.writingId }
                                ];
                            } else if (test.type === 'listening' && test.parts) {
                                const partKeys = Object.keys(test.parts);
                                passageCount = partKeys.length;
                                partKeys.forEach(k => {
                                    const part = test.parts[k];
                                    (part.qTypes || []).forEach(t => { if (!qTypes.includes(t)) qTypes.push(t); });
                                });
                                const isArray = Array.isArray(test.parts);
                                segments = [1, 2, 3, 4].map(num => {
                                    const exists = isArray
                                        ? test.parts.some((part, idx) => getPassageOrPartNum(part, idx, 'listening', test.questions || []) === num)
                                        : (test.parts[`part${num}`] !== undefined || test.parts[`Part${num}`] !== undefined);
                                    return {
                                        label: `Pt${num}`,
                                        title: `Part ${num}`,
                                        exists
                                    };
                                });
                            } else if (test.type === 'reading' && typeof test.passages === 'object' && test.passages !== null) {
                                const passKeys = Object.keys(test.passages);
                                passageCount = passKeys.length;
                                passKeys.forEach(k => {
                                    const pass = test.passages[k];
                                    (pass.qTypes || []).forEach(t => { if (!qTypes.includes(t)) qTypes.push(t); });
                                });
                                const isArray = Array.isArray(test.passages);
                                segments = [1, 2, 3].map(num => {
                                    const exists = isArray
                                        ? test.passages.some((pass, idx) => getPassageOrPartNum(pass, idx, 'reading', test.questions || []) === num)
                                        : (test.passages[`passage${num}`] !== undefined || test.passages[`Passage${num}`] !== undefined);
                                    return {
                                        label: `P${num}`,
                                        title: `Passage ${num}`,
                                        exists
                                    };
                                });
                            } else if (test.type === 'writing') {
                                passageCount = test.writingTasks?.length || 2;
                                segments = [1, 2].map(num => ({
                                    label: `T${num}`,
                                    title: `Task ${num}`,
                                    exists: num <= passageCount
                                }));
                            } else if (test.type === 'speaking') {
                                passageCount = test.parts ? Object.keys(test.parts).length : 3;
                                segments = [1, 2, 3].map(num => ({
                                    label: `S${num}`,
                                    title: `Part ${num}`,
                                    exists: num <= passageCount
                                }));
                            } else {
                                passageCount = test.type === 'listening' ? 4 : (test.type === 'reading' ? 3 : 0);
                            }
                        }

                        const isSelected = selectedTests.includes(test.id);

                        return (
                            <tr 
                                key={test.id} 
                                className={`group transition-all duration-150 border-l-2 ${
                                    isSelected 
                                        ? (isDark ? 'bg-blue-500/10 border-blue-500/80' : 'bg-blue-500/5 border-blue-600') 
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
                                                {test.isMergedSource && (
                                                    <span 
                                                        className={`text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full flex items-center gap-1 leading-none ${
                                                            isDark 
                                                                ? 'bg-purple-500/10 border border-purple-500/20 text-purple-400' 
                                                                : 'bg-purple-50 border border-purple-150 text-purple-600'
                                                        }`}
                                                        title="Birlashtirilgan test tarkibiy qismi (Manba test)"
                                                    >
                                                        <span className="text-[10px]">🔗</span> Source
                                                    </span>
                                                )}
                                            </div>
                                            
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
                                                <span className="text-[10px] text-zinc-400 font-medium">ID: {test.id.slice(0, 8)}...</span>
                                                
                                                {/* Tags */}
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
                                                {passageCount}{" "}{test.type === 'listening' ? 'Parts' : test.type === 'writing' ? 'Tasks' : test.type === 'mock' ? 'Modules' : 'Passages'}
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
                                        {qTypes.length > 0 ? qTypes.map((type, i) => (
                                            <span key={i} className={`text-[9px] px-2 py-0.5 rounded-full border font-bold ${
                                                isDark ? 'bg-white/5 border-white/5 text-zinc-400' : 'bg-zinc-50 border-zinc-150 text-zinc-600'
                                            }`}>
                                                {formatQuestionType(type)}
                                            </span>
                                        )) : <span className="text-[10px] text-zinc-400 font-medium italic">No types defined</span>}
                                    </div>
                                </td>
                                <td className="py-4 px-4 text-[11px] text-zinc-450 dark:text-zinc-500 font-bold">
                                    {test.createdAt ? new Date(test.createdAt).toLocaleDateString() : 'N/A'}
                                </td>
                                <td className="py-4 pr-4 text-right">
                                    <div className="flex justify-end gap-1 opacity-70 lg:opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity">
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
