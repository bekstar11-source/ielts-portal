import React from 'react';
import { ArrowUp, ArrowDown, ChevronsUpDown, Eye, Loader2, Trash2, SearchX } from 'lucide-react';
import { formatDateTime, isGraded } from '../../../hooks/useAdminResults';

const TYPE_STYLES = {
    reading: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20',
    listening: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/20',
    writing: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20',
    speaking: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-500/10 dark:text-pink-300 dark:border-pink-500/20',
    podcast: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-300 dark:border-teal-500/20',
    other: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-white/5 dark:text-gray-300 dark:border-white/10',
};

const STATUS_LABELS = {
    graded: 'Baholangan',
    published: 'Baholangan',
    pending: 'Kutilmoqda',
    submitted: 'Topshirilgan',
};

// Podcast natijalari uchun alohida ko'rish sahifasi yo'q
const isReviewable = (res) => res.type !== 'podcast';

// Ism bo'yicha avatar bosh harflari
const initials = (name = '') =>
    name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('') || '?';

const AVATAR_COLORS = [
    'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
    'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    'bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300',
];
const avatarColor = (name = '') =>
    AVATAR_COLORS[[...name].reduce((acc, c) => acc + c.charCodeAt(0), 0) % AVATAR_COLORS.length];

// Band ball rangi (IELTS shkalasi bo'yicha)
const bandTone = (value) => {
    const n = typeof value === 'number' ? value : parseFloat(value);
    if (!Number.isFinite(n)) return 'text-gray-500';
    if (n >= 7) return 'text-emerald-600 dark:text-emerald-400';
    if (n >= 5.5) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-500 dark:text-red-400';
};

const SortHeader = ({ label, sortKey, sort, onSort, align = 'left' }) => {
    const active = sort?.key === sortKey;
    return (
        <th scope="col" className={`py-3 px-4 ${align === 'center' ? 'text-center' : 'text-left'}`}>
            <button
                type="button"
                onClick={() => onSort(sortKey)}
                aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
            >
                {label}
                {active
                    ? (sort.dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)
                    : <ChevronsUpDown size={12} className="opacity-40" />}
            </button>
        </th>
    );
};

const Checkbox = ({ checked, indeterminate, onChange, label }) => (
    <input
        type="checkbox"
        aria-label={label}
        checked={checked}
        ref={(el) => { if (el) el.indeterminate = Boolean(indeterminate); }}
        onChange={onChange}
        onClick={(e) => e.stopPropagation()}
        className="w-4 h-4 rounded border-gray-300 dark:border-white/20 text-blue-600 focus:ring-2 focus:ring-blue-500/40 cursor-pointer accent-blue-600"
    />
);

const ResultsTable = ({
    items, onDelete, onReview, isDark, deletingId, sort, onSort,
    hasActiveFilters, onResetFilters, selectedIds, onToggleSelect,
    onTogglePage, pageSelectionState
}) => {
    const headBg = isDark ? 'bg-[#232323]' : 'bg-gray-50';

    return (
        <div className={`border rounded-2xl shadow-sm overflow-hidden transition-colors ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-white border-gray-200'}`}>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left border-collapse font-sans">
                    <thead className={headBg}>
                        <tr className={`border-b ${isDark ? 'border-white/5' : 'border-gray-200'}`}>
                            <th scope="col" className="py-3 pl-4 pr-2 w-10">
                                <Checkbox
                                    label="Sahifadagi barcha natijalarni tanlash"
                                    checked={pageSelectionState === 'all'}
                                    indeterminate={pageSelectionState === 'some'}
                                    onChange={onTogglePage}
                                />
                            </th>
                            <SortHeader label="Sana" sortKey="date" sort={sort} onSort={onSort} />
                            <SortHeader label="O'quvchi" sortKey="user" sort={sort} onSort={onSort} />
                            <th scope="col" className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">Test</th>
                            <th scope="col" className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-gray-500 text-center">Vaqt</th>
                            <SortHeader label="Baho" sortKey="score" sort={sort} onSort={onSort} align="center" />
                            <th scope="col" className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-gray-500 text-center">Status</th>
                            <th scope="col" className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-gray-500 text-center">Amal</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                        {items.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="p-16 text-center">
                                    <div className={`w-12 h-12 mx-auto rounded-2xl flex items-center justify-center mb-4 ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                                        <SearchX className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <p className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                        {hasActiveFilters ? "Filtrlarga mos natija topilmadi" : "Hozircha natijalar yo'q"}
                                    </p>
                                    <p className="text-[12px] text-gray-500 mt-1">
                                        {hasActiveFilters
                                            ? "Boshqa filtr yoki qidiruv so'zini sinab ko'ring"
                                            : "O'quvchilar test topshirgach, natijalar shu yerda ko'rinadi"}
                                    </p>
                                    {hasActiveFilters && (
                                        <button
                                            onClick={onResetFilters}
                                            className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white text-[13px] font-semibold hover:bg-blue-700 transition-colors"
                                        >
                                            Filtrlarni tozalash
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ) : (
                            items.map((res) => {
                                const { date, time } = formatDateTime(res.date);
                                const graded = isGraded(res.status);
                                const isDeleting = deletingId === res.id;
                                const reviewable = isReviewable(res);
                                const selected = selectedIds?.has(res.id);
                                const scoreValue = res.bandScore ?? res.score;
                                const hasScore = scoreValue !== undefined && scoreValue !== null && scoreValue !== '' && scoreValue !== '-';

                                return (
                                    <tr
                                        key={res.id}
                                        onClick={() => reviewable && onReview(res)}
                                        onKeyDown={(e) => {
                                            if (reviewable && (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
                                                e.preventDefault();
                                                onReview(res);
                                            }
                                        }}
                                        tabIndex={reviewable ? 0 : -1}
                                        role={reviewable ? 'button' : undefined}
                                        aria-label={reviewable ? `${res.userName} — ${res.testTitle} natijasini ochish` : undefined}
                                        className={`group transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${
                                            reviewable ? 'cursor-pointer' : ''
                                        } ${isDeleting ? 'opacity-50 pointer-events-none' : ''} ${
                                            selected
                                                ? (isDark ? 'bg-blue-500/10' : 'bg-blue-50/70')
                                                : res.isOrphan
                                                    ? (isDark ? 'bg-red-500/[0.07] hover:bg-red-500/[0.12]' : 'bg-red-50/40 hover:bg-red-50/70')
                                                    : (isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50')
                                        }`}
                                    >
                                        <td className="py-3 pl-4 pr-2 align-middle">
                                            <Checkbox
                                                label={`${res.userName} natijasini tanlash`}
                                                checked={Boolean(selected)}
                                                onChange={() => onToggleSelect(res.id)}
                                            />
                                        </td>
                                        <td className="py-3 px-4 whitespace-nowrap align-middle">
                                            <div className="flex flex-col leading-tight">
                                                <span className={`text-[13px] font-medium tabular-nums ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{date}</span>
                                                <span className="text-[11px] text-gray-500 mt-0.5 tabular-nums">{time}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 align-middle">
                                            <div className="flex items-center gap-2.5">
                                                <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold ${avatarColor(res.userName)}`}>
                                                    {initials(res.userName)}
                                                </div>
                                                <div className="flex flex-col leading-tight min-w-0">
                                                    <span className={`text-[13.5px] font-semibold truncate max-w-[150px] ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                        {res.userName}
                                                    </span>
                                                    <span className="text-[10.5px] text-gray-500 font-mono mt-0.5" title={res.id}>
                                                        {res.id.slice(0, 8)}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 align-middle">
                                            <div className="flex flex-col gap-1">
                                                <span
                                                    title={res.testTitle}
                                                    className={`text-[13px] font-medium truncate max-w-[240px] ${
                                                        res.isOrphan ? 'text-red-500 line-through' : isDark ? 'text-gray-200' : 'text-gray-700'
                                                    }`}
                                                >
                                                    {res.testTitle}
                                                </span>
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`w-fit px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${TYPE_STYLES[res.type] || TYPE_STYLES.other}`}>
                                                        {res.type}
                                                    </span>
                                                    {res.isOrphan && (
                                                        <span
                                                            title="Bu natijaga bog'langan test o'chirilgan"
                                                            className="w-fit px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20"
                                                        >
                                                            Arxiv
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 align-middle text-center">
                                            <span className="text-[12px] font-medium tabular-nums px-2 py-1 rounded-md bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300">
                                                {res.durationDisplay}
                                            </span>
                                        </td>
                                        <td className={`py-3 px-4 align-middle text-center text-[15px] font-bold tabular-nums ${hasScore ? bandTone(res.bandScore ?? res.score) : 'text-gray-400'}`}>
                                            {hasScore ? scoreValue : '—'}
                                        </td>
                                        <td className="py-3 px-4 align-middle text-center">
                                            <span
                                                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold border whitespace-nowrap ${
                                                    graded
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20'
                                                        : 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/20'
                                                }`}
                                            >
                                                <span className={`w-1.5 h-1.5 rounded-full ${graded ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                                                {STATUS_LABELS[res.status] || res.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 align-middle">
                                            {/* Tugmalar sensorli qurilmada doim ko'rinadi, desktopda hover/fokusda chiqadi */}
                                            <div className="flex items-center justify-center gap-1 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 md:focus-within:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onReview(res); }}
                                                    disabled={!reviewable}
                                                    title={reviewable ? "Natijani ko'rish" : "Podcast natijasi uchun ko'rish sahifasi yo'q"}
                                                    aria-label={`${res.userName} natijasini ko'rish`}
                                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onDelete(res); }}
                                                    disabled={isDeleting}
                                                    title="O'chirish"
                                                    aria-label={`${res.userName} natijasini o'chirish`}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors disabled:cursor-not-allowed"
                                                >
                                                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ResultsTable;
