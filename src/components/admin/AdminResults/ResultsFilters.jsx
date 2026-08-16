import React, { useEffect, useRef } from 'react';
import { Download, RefreshCw, Search, SlidersHorizontal, X } from 'lucide-react';
import { DATE_RANGES } from '../../../hooks/useAdminResults';

const ResultsFilters = ({
    searchTerm, setSearchTerm, typeFilter, setTypeFilter,
    dateRange, setDateRange,
    isDark, totalCount, onRefresh, refreshing,
    hasActiveFilters, onResetFilters, onExport, selectedCount
}) => {
    const searchRef = useRef(null);

    // "/" tugmasi qidiruvga fokus beradi, Esc esa tozalaydi
    useEffect(() => {
        const onKeyDown = (e) => {
            const tag = e.target.tagName;
            const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;
            if (e.key === '/' && !typing) {
                e.preventDefault();
                searchRef.current?.focus();
            } else if (e.key === 'Escape' && e.target === searchRef.current) {
                setSearchTerm('');
                searchRef.current?.blur();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [setSearchTerm]);

    const fieldBase = isDark
        ? 'bg-white/5 text-gray-200 placeholder-gray-500 hover:bg-white/[0.07] focus:bg-white/[0.09]'
        : 'bg-white text-gray-800 placeholder-gray-400 border border-gray-200 hover:border-gray-300 focus:border-gray-300';

    return (
        <div className={`rounded-2xl border p-4 mb-6 transition-colors ${isDark ? 'bg-[#1f1e1b] border-white/5' : 'bg-white border-gray-200'}`}>
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                {/* Qidiruv */}
                <div className="relative flex-1 min-w-0 group">
                    <Search className={`absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none transition-colors ${isDark ? 'text-gray-600 group-focus-within:text-blue-400' : 'text-gray-400 group-focus-within:text-blue-500'}`} />
                    <input
                        ref={searchRef}
                        type="text"
                        placeholder="Ism, test yoki ID bo'yicha qidirish..."
                        aria-label="Natijalarni qidirish"
                        className={`w-full pl-11 pr-20 py-2.5 rounded-xl outline-none text-sm font-medium transition-all focus:ring-2 focus:ring-blue-500/30 ${fieldBase}`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm ? (
                        <button
                            onClick={() => setSearchTerm('')}
                            aria-label="Qidiruvni tozalash"
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    ) : (
                        <kbd className={`hidden sm:block absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded border text-[10px] font-mono ${isDark ? 'border-white/10 text-gray-600' : 'border-gray-200 text-gray-400'}`}>
                            /
                        </kbd>
                    )}
                </div>

                {/* Tur */}
                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    aria-label="Tur bo'yicha filtr"
                    className={`w-full lg:w-40 px-3 py-2.5 rounded-xl outline-none cursor-pointer text-sm font-medium transition-all focus:ring-2 focus:ring-blue-500/30 ${fieldBase}`}
                >
                    <option value="all">Barcha turlar</option>
                    <option value="reading">Reading</option>
                    <option value="listening">Listening</option>
                    <option value="writing">Writing</option>
                    <option value="speaking">Speaking</option>
                    <option value="podcast">Podcast</option>
                    <option value="other">Boshqa</option>
                </select>

                {/* Sana oralig'i */}
                <div className={`flex p-1 rounded-xl gap-0.5 ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                    {Object.entries(DATE_RANGES).map(([key, { label }]) => (
                        <button
                            key={key}
                            onClick={() => setDateRange(key)}
                            aria-pressed={dateRange === key}
                            className={`flex-1 lg:flex-none px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-all ${
                                dateRange === key
                                    ? isDark ? 'bg-white/10 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={onExport}
                        title={selectedCount > 0 ? `${selectedCount} ta tanlangan natijani CSV ga yuklash` : 'Filtrlangan natijalarni CSV ga yuklash'}
                        className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
                            isDark ? 'bg-white/5 text-gray-300 hover:bg-white/10' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden xl:inline">CSV</span>
                    </button>
                    <button
                        onClick={onRefresh}
                        disabled={refreshing}
                        title="Ma'lumotlarni yangilash"
                        className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                            isDark ? 'bg-white/5 text-gray-300 hover:bg-white/10' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                        <span className="hidden xl:inline">{refreshing ? 'Yuklanmoqda' : 'Yangilash'}</span>
                    </button>
                </div>
            </div>

            {hasActiveFilters && (
                <div className={`flex items-center justify-between gap-3 mt-3 pt-3 border-t ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                    <span className="flex items-center gap-2 text-[12px] font-medium text-gray-500">
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        Filtr bo'yicha <strong className={isDark ? 'text-white' : 'text-gray-900'}>{totalCount}</strong> ta natija
                    </span>
                    <button
                        onClick={onResetFilters}
                        className="text-[12px] font-semibold text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
                    >
                        Filtrlarni tozalash
                    </button>
                </div>
            )}
        </div>
    );
};

export default ResultsFilters;
