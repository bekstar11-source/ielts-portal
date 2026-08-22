import React from 'react';
import { MagnifyingGlass, Sparkle, X } from '@phosphor-icons/react';
import { dateToMillis } from '../../../hooks/useWritingReview';
import { useTranslation } from '../../../context/LanguageContext';

const formatSubmissionDate = (d, lang) => {
    const ms = dateToMillis(d);
    if (!ms) return '';
    return new Date(ms).toLocaleDateString(lang === 'uz' ? 'uz-UZ' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' });
};

const WritingReviewSidebar = ({
    writings, students, filter, setFilter, searchTerm, setSearchTerm, selectedId, setSelectedId, isDark,
    selectedIds = [], onToggleSelect, onSelectMany, onClearSelection, bulkState, onBulkCheck,
}) => {
    const { t, lang } = useTranslation();
    const getStudentName = (w) => students.find(s => s.id === w.userId)?.fullName || w.userName || (lang === 'uz' ? 'O\'quvchi' : 'Student');

    const filtered = writings.filter(w => {
        const matchesFilter = filter === 'all' ? true : filter === 'pending' ? (!w.writingBand) : (!!w.writingBand);
        const name = getStudentName(w);
        return matchesFilter && (name.toLowerCase().includes(searchTerm.toLowerCase()) || (w.testTitle || '').toLowerCase().includes(searchTerm.toLowerCase()));
    });

    const filterLabels = {
        pending: t('teacher.writingReview.sidebar.pendingTab') || (lang === 'uz' ? 'Kutilmoqda' : 'Pending'),
        reviewed: t('teacher.writingReview.sidebar.reviewedTab') || (lang === 'uz' ? 'Baholangan' : 'Graded'),
        all: t('teacher.writingReview.sidebar.allTab') || (lang === 'uz' ? 'Barchasi' : 'All')
    };
    const pendingCount = writings.filter(w => !w.writingBand).length;

    const selectedSet = new Set(selectedIds);
    const selectionEnabled = typeof onToggleSelect === 'function';
    const allVisibleSelected = filtered.length > 0 && filtered.every(w => selectedSet.has(w.id));
    const bulkRunning = Boolean(bulkState?.running);

    const checkboxCls = `w-4 h-4 shrink-0 rounded accent-blue-600 cursor-pointer ${isDark ? 'bg-white/10' : ''}`;

    return (
        <div
            className={`absolute inset-y-0 left-0 z-20 w-full transform-gpu will-change-transform transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none lg:static lg:z-auto lg:w-[300px] lg:translate-x-0 lg:transition-none flex-shrink-0 flex flex-col border-r ${
                selectedId ? '-translate-x-full' : 'translate-x-0'
            } ${isDark ? 'bg-[#181715] border-white/5' : 'bg-white border-gray-100'}`}
        >
            <div className="p-5 pb-3 space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-lg font-semibold tracking-tight">
                        {t('teacher.writingReview.sidebar.title') || (lang === 'uz' ? 'Insholar' : 'Essays')}
                    </h1>
                    {pendingCount > 0 && (
                        <span className="text-xs text-gray-400">
                            {(t('teacher.writingReview.sidebar.pendingCount') || (lang === 'uz' ? '{count} kutilmoqda' : '{count} pending')).replace('{count}', pendingCount)}
                        </span>
                    )}
                </div>

                <div className={`flex p-1 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                    {['pending', 'reviewed', 'all'].map(f => (
                        <button key={f} onClick={() => setFilter(f)} className={`flex-1 py-1.5 text-[11px] font-medium rounded-md transition-all ${filter === f ? (isDark ? 'bg-[#2A2A2A] text-white' : 'bg-white text-slate-800 shadow-sm') : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                            {filterLabels[f]}
                        </button>
                    ))}
                </div>

                <div className={`flex items-center px-3 py-2 rounded-lg border ${isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                    <MagnifyingGlass size={14} className="text-gray-400 mr-2 shrink-0" />
                    <input
                        type="text"
                        placeholder={t('teacher.writingReview.sidebar.searchPlaceholder') || (lang === 'uz' ? 'Qidirish...' : 'Search...')}
                        className="bg-transparent border-none outline-none text-xs w-full"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                {selectionEnabled && filtered.length > 0 && (
                    <label className="flex items-center gap-2 text-[11px] text-gray-500 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            className={checkboxCls}
                            checked={allVisibleSelected}
                            disabled={bulkRunning}
                            onChange={() => onSelectMany(filtered.map(w => w.id), !allVisibleSelected)}
                        />
                        {allVisibleSelected
                            ? (lang === 'uz' ? 'Belgilashni olib tashlash' : 'Clear selection')
                            : (lang === 'uz' ? `Hammasini belgilash (${filtered.length})` : `Select all (${filtered.length})`)}
                    </label>
                )}
            </div>

            {selectionEnabled && selectedIds.length > 0 && (
                <div className={`mx-3 mb-3 p-3 rounded-xl border space-y-2.5 ${isDark ? 'bg-white/5 border-white/10' : 'bg-blue-50/60 border-blue-100'}`}>
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium">
                            {(lang === 'uz' ? `${selectedIds.length} ta tanlandi` : `${selectedIds.length} selected`)}
                        </span>
                        <button
                            onClick={onClearSelection}
                            disabled={bulkRunning}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-40"
                            aria-label={lang === 'uz' ? 'Belgilashni bekor qilish' : 'Clear selection'}
                        >
                            <X size={13} />
                        </button>
                    </div>

                    <button
                        onClick={() => onBulkCheck({ autoApply: true })}
                        disabled={bulkRunning}
                        className="w-full h-9 bg-[#0071e3] hover:bg-[#0066cc] text-white rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        {bulkRunning ? (
                            <>
                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                {bulkState.done}/{bulkState.total}
                            </>
                        ) : (
                            <>
                                <Sparkle size={13} />
                                {lang === 'uz' ? 'AI tekshirib, baholash' : 'AI check & grade'}
                            </>
                        )}
                    </button>

                    <button
                        onClick={() => onBulkCheck({ autoApply: false })}
                        disabled={bulkRunning}
                        className={`w-full h-8 rounded-lg text-[11px] font-medium border transition-colors disabled:opacity-50 ${
                            isDark ? 'border-white/10 text-white hover:bg-white/5' : 'border-gray-200 text-slate-700 hover:bg-white'
                        }`}
                    >
                        {lang === 'uz' ? 'Faqat AI tekshiruvi' : 'AI check only'}
                    </button>

                    <p className="text-[10px] leading-relaxed text-gray-400">
                        {lang === 'uz'
                            ? "Baholashda AI mezonlaridan band hisoblanadi. Ustoz izohi yozilgan ishlar izohi saqlanadi."
                            : "Bands are computed from the AI criteria. Existing teacher feedback is kept."}
                    </p>
                </div>
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-3 space-y-0.5">
                {filtered.length === 0 && (
                    <div className="flex flex-col items-center justify-center text-center gap-1 py-16 text-gray-400">
                        <p className="text-xs font-medium">
                            {t('teacher.writingReview.sidebar.nothingFound') || (lang === 'uz' ? 'Hech narsa topilmadi' : 'Nothing found')}
                        </p>
                        <p className="text-[11px]">
                            {searchTerm 
                                ? (t('teacher.writingReview.sidebar.noMatchingSearch') || (lang === 'uz' ? 'Qidiruvga mos topshiriq yo\'q' : 'No tasks match search')) 
                                : (t('teacher.writingReview.sidebar.noTasksInFilter') || (lang === 'uz' ? 'Bu bo\'limda topshiriqlar yo\'q' : 'No tasks in this section'))}
                        </p>
                    </div>
                )}
                {filtered.map((w) => {
                    const isSelected = selectedId === w.id;
                    const isChecked = selectedSet.has(w.id);
                    const initials = getStudentName(w).split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                    return (
                        <div key={w.id} className={`flex items-center gap-2 rounded-lg pl-2 transition-colors ${isSelected ? (isDark ? 'bg-white/10' : 'bg-gray-100') : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}>
                            {selectionEnabled && (
                                <input
                                    type="checkbox"
                                    className={checkboxCls}
                                    checked={isChecked}
                                    disabled={bulkRunning}
                                    onChange={() => onToggleSelect(w.id)}
                                    aria-label={`${getStudentName(w)} — ${lang === 'uz' ? 'tanlash' : 'select'}`}
                                />
                            )}
                            <button onClick={() => setSelectedId(w.id)} className="flex-1 min-w-0 text-left py-3 pr-3 flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-full flex shrink-0 items-center justify-center font-medium text-xs relative ${isDark ? 'bg-white/5 text-gray-300' : 'bg-gray-100 text-slate-500'}`}>
                                    {initials}
                                    {!w.writingBand && <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full ring-2 ring-white dark:ring-[#181715]" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-medium truncate">{getStudentName(w)}</h3>
                                    <p className="text-[11px] text-gray-400 truncate">{w.testTitle || 'Untitled'}</p>
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                    <span className="text-[10px] text-gray-400 whitespace-nowrap">{formatSubmissionDate(w.date, lang)}</span>
                                    {w.writingBand && <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">{w.writingBand}</div>}
                                </div>
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default WritingReviewSidebar;
