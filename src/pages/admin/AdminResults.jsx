import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Loader2, Trash2, X } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useAdminResults, PAGE_SIZE_OPTIONS } from "../../hooks/useAdminResults";
import { Icons } from "../../components/Icons";

// Components
import ResultsStats from "../../components/admin/AdminResults/ResultsStats";
import ResultsFilters from "../../components/admin/AdminResults/ResultsFilters";
import ResultsTable from "../../components/admin/AdminResults/ResultsTable";
import ConfirmDialog from "../../components/admin/CreateTest/ConfirmDialog";
import Pagination from "../../components/common/Pagination";

const TableSkeleton = ({ isDark }) => (
    <div className={`border rounded-2xl overflow-hidden ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-white border-gray-200'}`}>
        {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={`flex items-center gap-4 px-4 py-4 ${i > 0 ? (isDark ? 'border-t border-white/5' : 'border-t border-gray-100') : ''}`}>
                <div className={`h-8 w-8 rounded-full animate-pulse ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
                <div className={`h-3 rounded w-20 animate-pulse ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
                <div className={`h-3 rounded flex-1 animate-pulse ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
                <div className={`h-3 rounded w-16 animate-pulse ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
                <div className={`h-3 rounded w-24 animate-pulse ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
            </div>
        ))}
    </div>
);

export default function AdminResults() {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const {
        loading, refreshing, error, clearError, toast, dismissToast,
        deletingId, bulkDeleting, stats,
        filteredResults, currentItems,
        searchTerm, setSearchTerm, typeFilter, setTypeFilter,
        statusFilter, setStatusFilter, dateRange, setDateRange,
        sort, toggleSort,
        currentPage, setCurrentPage, totalPages,
        itemsPerPage, setItemsPerPage,
        indexOfFirstItem, indexOfLastItem,
        selectedIds, toggleSelect, togglePageSelection, clearSelection, pageSelectionState,
        hasActiveFilters, resetFilters, handleDelete, handleBulkDelete, exportCsv, refresh
    } = useAdminResults();

    const [pendingDelete, setPendingDelete] = useState(null);
    const [confirmBulk, setConfirmBulk] = useState(false);

    const confirmDelete = async () => {
        const target = pendingDelete;
        setPendingDelete(null);
        if (target) await handleDelete(target.id);
    };

    const confirmBulkDelete = async () => {
        setConfirmBulk(false);
        await handleBulkDelete();
    };

    const handleReview = (res) => {
        if (res.type === 'podcast') return; // podcast uchun ko'rish sahifasi mavjud emas
        if (res.type === 'writing') navigate('/admin/writing-review', { state: { selectedId: res.id } });
        else navigate(`/review/${res.id}`);
    };

    const rangeStart = filteredResults.length === 0 ? 0 : indexOfFirstItem + 1;
    const rangeEnd = Math.min(indexOfLastItem, filteredResults.length);
    const selectedCount = selectedIds.size;

    return (
        <div className={`h-full overflow-y-auto custom-scrollbar p-6 font-sans transition-colors duration-200 ${isDark ? 'bg-[#121212] text-white' : 'bg-[#F5F5F7] text-slate-800'}`}>
            <div className="max-w-7xl mx-auto pb-24">
                {/* Sarlavha */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/admin')}
                            aria-label="Bosh sahifaga qaytish"
                            className="w-9 h-9 bg-white dark:bg-[#1E1E1E] rounded-xl flex items-center justify-center border border-gray-200 dark:border-white/5 shadow-sm text-gray-500 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 transition-all"
                        >
                            <Icons.ArrowLeft className="w-4 h-4" />
                        </button>
                        <div>
                            <h1 className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Natijalar</h1>
                            <p className="text-[12px] text-gray-500 font-medium">
                                O'quvchilar topshirgan barcha testlar va ularning baholari
                            </p>
                        </div>
                    </div>
                </div>

                <ResultsStats
                    stats={stats}
                    isDark={isDark}
                    loading={loading}
                    statusFilter={statusFilter}
                    onSelectStatus={(f) => setStatusFilter(statusFilter === f && f !== 'all' ? 'all' : f)}
                />

                <ResultsFilters
                    searchTerm={searchTerm} setSearchTerm={setSearchTerm}
                    typeFilter={typeFilter} setTypeFilter={setTypeFilter}
                    dateRange={dateRange} setDateRange={setDateRange}
                    isDark={isDark} totalCount={filteredResults.length}
                    onRefresh={refresh} refreshing={refreshing}
                    hasActiveFilters={hasActiveFilters} onResetFilters={resetFilters}
                    onExport={exportCsv} selectedCount={selectedCount}
                />

                {error && (
                    <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10 px-4 py-3">
                        <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                        <p className="flex-1 text-[13px] font-medium text-red-700 dark:text-red-300">{error}</p>
                        <button onClick={clearError} aria-label="Xabarni yopish" className="text-red-500 hover:text-red-700 dark:hover:text-red-200">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {loading ? (
                    <TableSkeleton isDark={isDark} />
                ) : (
                    <ResultsTable
                        items={currentItems}
                        onDelete={setPendingDelete}
                        onReview={handleReview}
                        isDark={isDark}
                        deletingId={deletingId}
                        sort={sort}
                        onSort={toggleSort}
                        hasActiveFilters={hasActiveFilters}
                        onResetFilters={resetFilters}
                        selectedIds={selectedIds}
                        onToggleSelect={toggleSelect}
                        onTogglePage={togglePageSelection}
                        pageSelectionState={pageSelectionState}
                    />
                )}

                {/* Pagination */}
                {!loading && filteredResults.length > 0 && (
                    <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-3 order-2 sm:order-1">
                            <span className="text-[11px] font-black uppercase tracking-widest text-zinc-400 tabular-nums">
                                {rangeStart}-{rangeEnd} / {filteredResults.length}
                            </span>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                aria-label="Sahifadagi qatorlar soni"
                                className={`px-2 py-1 rounded-lg text-[12px] font-semibold cursor-pointer outline-none transition-colors ${
                                    isDark ? 'bg-white/5 text-gray-300 hover:bg-white/10' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                                }`}
                            >
                                {PAGE_SIZE_OPTIONS.map((size) => (
                                    <option key={size} value={size}>{size} / sahifa</option>
                                ))}
                            </select>
                        </div>
                        <div className="order-1 sm:order-2">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Tanlanganlar uchun pastdagi amal paneli */}
            {selectedCount > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 w-full max-w-lg animate-content-in">
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-md ${
                        isDark ? 'bg-[#1E1E1E]/95 border-white/10' : 'bg-white/95 border-gray-200'
                    }`}>
                        <span className="flex items-center justify-center min-w-[28px] h-7 px-2 rounded-lg bg-blue-600 text-white text-[12px] font-bold tabular-nums">
                            {selectedCount}
                        </span>
                        <span className={`text-[13px] font-semibold flex-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            ta natija tanlandi
                        </span>
                        <button
                            onClick={exportCsv}
                            className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${
                                isDark ? 'text-gray-300 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            CSV
                        </button>
                        <button
                            onClick={() => setConfirmBulk(true)}
                            disabled={bulkDeleting}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-[12px] font-semibold hover:bg-red-700 disabled:opacity-60 transition-colors"
                        >
                            {bulkDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            O'chirish
                        </button>
                        <button
                            onClick={clearSelection}
                            aria-label="Tanlovni bekor qilish"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div
                    role="status"
                    className={`fixed top-6 right-6 z-[210] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl border text-[13px] font-semibold animate-content-in ${
                        toast.type === 'error'
                            ? 'bg-red-600 border-red-500 text-white'
                            : isDark ? 'bg-[#1E1E1E] border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'
                    }`}
                >
                    {toast.type !== 'error' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    {toast.message}
                    <button onClick={dismissToast} aria-label="Yopish" className="ml-1 opacity-50 hover:opacity-100">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            <ConfirmDialog
                show={Boolean(pendingDelete)}
                title="Natijani o'chirish"
                message={pendingDelete
                    ? `"${pendingDelete.userName}" ning "${pendingDelete.testTitle}" natijasi butunlay o'chiriladi. Bu amalni orqaga qaytarib bo'lmaydi.`
                    : ''}
                confirmLabel="O'chirish"
                tone="red"
                onConfirm={confirmDelete}
                onCancel={() => setPendingDelete(null)}
                isDark={isDark}
            />

            <ConfirmDialog
                show={confirmBulk}
                title={`${selectedCount} ta natijani o'chirish`}
                message="Tanlangan barcha natijalar butunlay o'chiriladi. Bu amalni orqaga qaytarib bo'lmaydi."
                confirmLabel="Hammasini o'chirish"
                tone="red"
                onConfirm={confirmBulkDelete}
                onCancel={() => setConfirmBulk(false)}
                isDark={isDark}
            />
        </div>
    );
}
