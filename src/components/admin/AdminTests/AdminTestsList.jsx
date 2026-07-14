import React from 'react';
import { MoreHorizontal, Edit2, Edit3, Trash2, Globe, Lock, Eye, Copy, Folder } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { normalizeTestSegments } from '../../../utils/normalizeTestSegments';
import { formatQuestionType, getMatchSnippet, findParentMergedTest, getTypeMeta, getTestStructure } from './testListHelpers';

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
                        const { qTypes, passageCount, totalGroups, unitLabel } = getTestStructure(test);
                        const segments = normalizeTestSegments(test);
                        const isSelected = selectedTests.includes(test.id);
                        const isHighlighted = test.id === highlightedTestId;
                        const { Icon: TypeIcon, tile } = getTypeMeta(test.type);

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
                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${isDark ? tile.dark : tile.light}`}>
                                            <TypeIcon size={16} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 flex-wrap">
                                                <span>{test.title || "Untitled Test"}</span>
                                                {test.isFree && (
                                                    <span className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500 text-white leading-none">FREE</span>
                                                )}
                                                {(test.isMerged || (test.title?.toLowerCase().startsWith("merged:") && !test.isMergedSource)) && (
                                                    <span className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full bg-purple-600 text-white leading-none">MERGED</span>
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
                                                            className={`text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full flex items-center gap-1 leading-none transition-all hover:scale-105 active:scale-95 ${
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
                                                    <span key={i} className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full select-none ${
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
                                                {passageCount} {unitLabel}
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
                                                        className={`text-[10px] font-black px-2 py-0.5 rounded border transition-all select-none ${
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
                                                <span key={i} className={`text-[10px] px-2 py-0.5 rounded-sm border font-bold ${
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
