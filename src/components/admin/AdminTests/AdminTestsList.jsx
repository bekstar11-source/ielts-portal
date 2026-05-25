import React from 'react';
import { MoreHorizontal, Edit2, Trash2, Globe, Lock, BookOpen, Headphones, PenTool, Mic2, Eye, Award } from 'lucide-react';

const passagePartNumber = (p, idx, kind) => {
    const idNum = Number(p.id);
    if (!Number.isNaN(idNum)) {
        // CreateTest listening parts use ids like 100, 101, 102…
        if (idNum >= 100) return idNum - 100 + 1;
        if (idNum >= 1 && idNum <= (kind === 'listening' ? 4 : 3)) return idNum;
    }
    const idStr = p.id != null ? String(p.id) : '';
    const idMatch = idStr.match(/_(\d+)/) || idStr.match(/-(\d+)/) || idStr.match(/(\d+)/);
    if (idMatch) return parseInt(idMatch[1], 10);
    const titlePattern = kind === 'listening' ? /Part\s*(\d+)/i : /Passage\s*(\d+)/i;
    const titleMatch = p.title?.match(titlePattern) || p.title?.match(/(\d+)/);
    if (titleMatch) return parseInt(titleMatch[1], 10);
    return idx + 1;
};

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
            const num = passagePartNumber(p, idx, 'reading');
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
            const num = passagePartNumber(p, idx, 'listening');
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
    return [];
};

const AdminTestsList = ({ 
    tests, selectedTests, onToggleSelect, onDelete, onEdit, onView, isDark 
}) => {
    return (
        <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                    <tr className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        <th className="py-4 pl-4 w-12 text-center">
                            <input type="checkbox" className="accent-blue-600" />
                        </th>
                        <th className="py-4 pl-4">Test Title</th>
                        <th className="py-4 px-4">Structure</th>
                        <th className="py-4 px-4">Question Types</th>
                        <th className="py-4 px-4">Created At</th>
                        <th className="py-4 pr-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                    {tests.map(test => {
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
                                segments = [1, 2, 3, 4].map(num => ({
                                    label: `Pt${num}`,
                                    title: `Part ${num}`,
                                    exists: !!test.parts[`part${num}`]
                                }));
                            } else if (test.type === 'reading' && typeof test.passages === 'object' && test.passages !== null) {
                                const passKeys = Object.keys(test.passages);
                                passageCount = passKeys.length;
                                passKeys.forEach(k => {
                                    const pass = test.passages[k];
                                    (pass.qTypes || []).forEach(t => { if (!qTypes.includes(t)) qTypes.push(t); });
                                });
                                segments = [1, 2, 3].map(num => ({
                                    label: `P${num}`,
                                    title: `Passage ${num}`,
                                    exists: !!test.passages[`passage${num}`]
                                }));
                            } else if (test.type === 'writing') {
                                passageCount = test.writingTasks?.length || 2;
                                segments = [1, 2].map(num => ({
                                    label: `T${num}`,
                                    title: `Task ${num}`,
                                    exists: num <= passageCount
                                }));
                            } else {
                                passageCount = test.type === 'listening' ? 4 : (test.type === 'reading' ? 3 : 0);
                            }
                        }
                        return (
                            <tr key={test.id} className={`group hover:bg-zinc-50/50 dark:hover:bg-white/5 transition-colors ${selectedTests.includes(test.id) ? (isDark ? 'bg-blue-500/5' : 'bg-blue-50/50') : ''}`}>
                                <td className="py-4 pl-4 text-center">
                                    <input 
                                        type="checkbox" 
                                        className="accent-blue-600"
                                        checked={selectedTests.includes(test.id)}
                                        onChange={() => onToggleSelect(test.id)}
                                    />
                                </td>
                                <td className="py-4 pl-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDark ? 'bg-white/5 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                                            {test.type === 'reading' ? <BookOpen size={16} /> : 
                                             test.type === 'listening' ? <Headphones size={16} /> : 
                                             test.type === 'writing' ? <PenTool size={16} /> : 
                                             test.type === 'mock' ? <Award size={16} /> : <Mic2 size={16} />}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold truncate max-w-[300px]">{test.title || "Untitled Test"}</div>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {(test.tags || []).map((tag, i) => (
                                                    <span key={i} className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isDark ? 'bg-blue-500/10 text-blue-400 border border-blue-500/10' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                {test.isPublic ? <Globe size={10} className="text-emerald-500" /> : <Lock size={10} className="text-zinc-400" />}
                                                <span className="text-[10px] text-zinc-400">ID: {test.id.slice(0, 8)}...</span>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-4 px-4">
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex flex-col gap-0.5">
                                            <span className={`text-xs font-bold ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                                                {passageCount} {test.type === 'listening' ? 'Parts' : test.type === 'writing' ? 'Tasks' : test.type === 'mock' ? 'Modules' : 'Passages'}
                                            </span>
                                            <span className="text-[10px] text-zinc-400">
                                                {totalGroups} question groups
                                            </span>
                                        </div>
                                        {segments.length > 0 && (
                                            <div className="flex gap-1 items-center">
                                                {segments.map((seg, i) => (
                                                    <span
                                                        key={i}
                                                        title={`${seg.title} ${seg.exists ? '(Mavjud)' : '(Mavjud emas)'}`}
                                                        className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border transition-all select-none ${
                                                            seg.exists
                                                                ? (isDark 
                                                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                                                                    : 'bg-blue-50 text-blue-600 border-blue-100')
                                                                : (isDark 
                                                                    ? 'bg-zinc-800/10 text-zinc-500 border-dashed border-zinc-700/40 opacity-30' 
                                                                    : 'bg-zinc-50 text-zinc-300 border-dashed border-zinc-200 opacity-60')
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
                                            <span key={i} className={`text-[9px] px-1.5 py-0.5 rounded-md border font-medium ${isDark ? 'bg-white/5 border-white/5 text-zinc-400' : 'bg-zinc-50 border-zinc-100 text-zinc-500'}`}>
                                                {formatQuestionType(type)}
                                            </span>
                                        )) : <span className="text-[10px] text-zinc-400">No types defined</span>}
                                    </div>
                                </td>
                                <td className="py-4 px-4 text-[11px] text-zinc-400">
                                    {test.createdAt ? new Date(test.createdAt).toLocaleDateString() : 'N/A'}
                                </td>
                                <td className="py-4 pr-4 text-right">
                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {test.type !== 'mock' && (
                                            <button onClick={() => onView(test.id)} className="p-2 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400 rounded-lg transition-colors"><Eye size={14} /></button>
                                        )}
                                        <button onClick={() => onEdit(test.id)} className="p-2 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10 dark:hover:text-blue-400 rounded-lg transition-colors"><Edit2 size={14} /></button>
                                        <button onClick={() => onDelete(test.id, test.title)} className="p-2 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 rounded-lg transition-colors"><Trash2 size={14} /></button>
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
