import React from 'react';
import { Edit2, Edit3, Trash2, Globe, Lock, Eye, Copy, Folder } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { normalizeTestSegments } from '../../../utils/normalizeTestSegments';
import { formatQuestionType, getMatchSnippet, findParentMergedTest, getTypeMeta, getTestStructure } from './testListHelpers';

const QTYPE_VISIBLE = 3;

const AdminTestsGrid = ({
    tests = [], collections = [], allTests = [], onSelectCollection,
    highlightedTestId = null, onHighlightTest,
    selectedTests = [], onToggleSelect, onSelectAll, onDelete, onEdit, onQuickEdit, onView, onDuplicate, searchTerm = "", contentSearchTerm = ""
}) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const isAllSelected = tests.length > 0 && selectedTests.length === tests.length;
    const isIndeterminate = selectedTests.length > 0 && selectedTests.length < tests.length;

    if (tests.length === 0) {
        return (
            <div className={`w-full rounded-xl border py-16 text-center text-sm font-semibold ${
                isDark ? 'bg-[#181818] border-white/5 text-zinc-500' : 'bg-white border-zinc-200 text-zinc-400'
            }`}>
                No tests found.
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className={`flex items-center gap-2.5 px-1 select-none`}>
                <input
                    type="checkbox"
                    ref={el => { if (el) el.indeterminate = isIndeterminate; }}
                    className="accent-blue-600 w-4 h-4 cursor-pointer rounded border-zinc-300 focus:ring-blue-500"
                    checked={isAllSelected}
                    onChange={(e) => onSelectAll && onSelectAll(e.target.checked)}
                />
                <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    Hammasini tanlash ({tests.length})
                </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {tests.map(test => {
                    const { qTypes, passageCount, totalGroups, unitLabel } = getTestStructure(test);
                    const segments = normalizeTestSegments(test);
                    const isSelected = selectedTests.includes(test.id);
                    const isHighlighted = test.id === highlightedTestId;
                    const { Icon: TypeIcon, tile } = getTypeMeta(test.type);
                    const col = test.collectionId ? collections.find(c => c.id === test.collectionId) : null;
                    const visibleQTypes = qTypes.slice(0, QTYPE_VISIBLE);
                    const hiddenQTypeCount = qTypes.length - visibleQTypes.length;

                    return (
                        <div
                            key={test.id}
                            className={`group relative flex flex-col rounded-2xl border p-3.5 transition-all duration-300 ${
                                isSelected
                                    ? (isDark ? 'bg-blue-500/10 border-blue-500/60 ring-1 ring-blue-500/40' : 'bg-blue-50/60 border-blue-300 ring-1 ring-blue-300')
                                    : isHighlighted
                                        ? (isDark
                                            ? 'bg-purple-650/30 border-purple-500 ring-2 ring-purple-500/30 shadow-lg shadow-purple-500/5 z-10'
                                            : 'bg-purple-50/85 border-purple-500 ring-2 ring-purple-500/20 shadow-lg shadow-purple-500/5 z-10')
                                        : (isDark ? 'bg-[#1c1c1c] border-white/5 hover:border-white/10' : 'bg-white border-zinc-200 hover:border-zinc-300 hover:shadow-sm')
                            }`}
                        >
                            <input
                                type="checkbox"
                                className={`absolute top-3 left-3 z-10 accent-blue-600 w-4 h-4 cursor-pointer rounded border-zinc-300 transition-opacity ${
                                    isSelected ? 'opacity-100' : 'opacity-100 md:opacity-0 md:group-hover:opacity-100'
                                }`}
                                checked={isSelected}
                                onChange={() => onToggleSelect(test.id)}
                            />

                            <div className="flex items-start justify-between gap-2 mb-2.5">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${isDark ? tile.dark : tile.light}`}>
                                    <TypeIcon size={18} />
                                </div>
                                <div className="flex items-center gap-1 flex-wrap justify-end">
                                    {test.isFree && (
                                        <span className="text-[9px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded-full bg-emerald-500 text-white leading-none">FREE</span>
                                    )}
                                    {(test.isMerged || (test.title?.toLowerCase().startsWith("merged:") && !test.isMergedSource)) && (
                                        <span className="text-[9px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded-full bg-purple-600 text-white leading-none">MERGED</span>
                                    )}
                                </div>
                            </div>

                            <h3 className={`text-sm font-bold leading-snug line-clamp-2 mb-1.5 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                                {test.title || "Untitled Test"}
                            </h3>

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
                                            onSelectCollection(parent.collectionId || "Merged");
                                        }
                                        if (onHighlightTest) onHighlightTest(parent.id);
                                    }
                                };

                                return (
                                    <button
                                        onClick={handleClick}
                                        className={`self-start mb-1.5 text-[9px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded-full flex items-center gap-1 leading-none transition-all hover:scale-105 active:scale-95 ${
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

                            {contentSearchTerm && getMatchSnippet(test.combinedContent, contentSearchTerm)}

                            <div className="flex items-center gap-1.5 flex-wrap mt-1 mb-2.5">
                                {test.isPublic ? (
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/10">
                                        <Globe size={9} /> Public
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 bg-zinc-500/5 dark:bg-white/5 px-1.5 py-0.5 rounded border border-zinc-500/10">
                                        <Lock size={9} /> Private
                                    </span>
                                )}
                                {col ? (
                                    <span
                                        title={`To'plam: ${col.name}`}
                                        className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border max-w-[120px] truncate select-none ${
                                            isDark ? 'text-blue-400 bg-blue-500/5 border-blue-500/10' : 'text-blue-600 bg-blue-50 border border-blue-100'
                                        }`}
                                    >
                                        <Folder size={9} className="shrink-0" />
                                        <span className="truncate">{col.name}</span>
                                    </span>
                                ) : null}
                            </div>

                            <div className="flex flex-col gap-1.5 mb-2.5">
                                <div className="flex items-center gap-1.5">
                                    <span className={`text-xs font-bold ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                                        {passageCount} {unitLabel}
                                    </span>
                                    {totalGroups > 0 && (
                                        <span className="text-[10px] text-zinc-400 font-medium">· {totalGroups} groups</span>
                                    )}
                                </div>
                                {segments.length > 0 && (
                                    <div className="flex gap-1 items-center flex-wrap">
                                        {segments.map((seg, i) => (
                                            <span
                                                key={i}
                                                title={`${seg.title} ${seg.exists ? '(Mavjud)' : '(Mavjud emas)'}`}
                                                className={`text-[9px] font-black px-1.5 py-0.5 rounded border transition-all select-none ${
                                                    seg.exists
                                                        ? (isDark ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-600 border-blue-100')
                                                        : (isDark ? 'bg-zinc-800/10 text-zinc-650 border-dashed border-zinc-700/40 opacity-30' : 'bg-zinc-50 text-zinc-350 border-dashed border-zinc-200 opacity-60')
                                                }`}
                                            >
                                                {seg.label}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-1 mb-3">
                                {visibleQTypes.length > 0 ? (
                                    <>
                                        {visibleQTypes.map((type, i) => (
                                            <span key={i} className={`text-[9px] px-1.5 py-0.5 rounded-sm border font-bold ${
                                                isDark ? 'bg-white/5 border-white/5 text-zinc-400' : 'bg-zinc-50 border-zinc-150 text-zinc-600'
                                            }`}>
                                                {formatQuestionType(type)}
                                            </span>
                                        ))}
                                        {hiddenQTypeCount > 0 && (
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded-sm border font-bold ${
                                                isDark ? 'bg-white/5 border-white/5 text-zinc-500' : 'bg-zinc-50 border-zinc-150 text-zinc-500'
                                            }`}>
                                                +{hiddenQTypeCount}
                                            </span>
                                        )}
                                    </>
                                ) : <span className="text-[10px] text-zinc-400 font-medium italic">No types defined</span>}
                            </div>

                            <div className={`mt-auto pt-2.5 border-t flex items-center justify-between ${isDark ? 'border-white/5' : 'border-zinc-100'}`}>
                                <span className="text-[10px] text-zinc-450 dark:text-warm-muted font-bold">
                                    {test.createdAt ? new Date(test.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                                </span>
                                <div className="flex items-center gap-0.5 opacity-40 group-hover:opacity-100 transition-opacity">
                                    {test.type !== 'mock' && (
                                        <button
                                            onClick={() => onView(test.id)}
                                            className="p-1.5 text-zinc-400 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-emerald-500/5 rounded-full transition-all"
                                            title="Ko'rish"
                                        >
                                            <Eye size={13} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => onDuplicate && onDuplicate(test.id, test.title)}
                                        className="p-1.5 text-zinc-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-500/5 rounded-full transition-all"
                                        title="Nusxalash (Duplicate)"
                                    >
                                        <Copy size={13} />
                                    </button>
                                    <button
                                        onClick={() => onQuickEdit(test)}
                                        className="p-1.5 text-zinc-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-500/5 rounded-full transition-all"
                                        title="Tezkor tahrirlash (Nomi va to'plam)"
                                    >
                                        <Edit3 size={13} />
                                    </button>
                                    <button
                                        onClick={() => onEdit(test.id)}
                                        className="p-1.5 text-zinc-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-500/5 rounded-full transition-all"
                                        title={test.type === 'mock' ? "Modullarni tahrirlash" : "Savollarni tahrirlash"}
                                    >
                                        <Edit2 size={13} />
                                    </button>
                                    <button
                                        onClick={() => onDelete(test.id, test.title)}
                                        className="p-1.5 text-zinc-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-500/5 rounded-full transition-all"
                                        title="O'chirish"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AdminTestsGrid;
