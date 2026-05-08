import React from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useAdminResults } from "../hooks/useAdminResults";
import { Icons } from "../components/Icons";

// Components
import ResultsFilters from "../components/admin/AdminResults/ResultsFilters";
import ResultsTable from "../components/admin/AdminResults/ResultsTable";

export default function AdminResults() {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const {
        loading, filteredResults, currentItems,
        searchTerm, setSearchTerm, typeFilter, setTypeFilter,
        statusFilter, setStatusFilter, currentPage, setCurrentPage,
        totalPages, indexOfFirstItem, indexOfLastItem, handleDelete
    } = useAdminResults();

    const renderPagination = () => {
        const pages = [];
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
                pages.push(
                    <button
                        key={i}
                        onClick={() => setCurrentPage(i)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
                            currentPage === i ? "bg-blue-600 text-white shadow-md" : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
                        }`}
                    >
                        {i}
                    </button>
                );
            } else if (i === currentPage - 3 || i === currentPage + 3) {
                pages.push(<span key={i} className="px-1 text-gray-400">...</span>);
            }
        }
        return pages;
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#121212]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    );

    return (
        <div className={`min-h-screen p-6 font-sans transition-colors duration-200 ${isDark ? 'bg-[#121212] text-white' : 'bg-[#F5F5F7] text-slate-800'}`}>
            <div className="max-w-7xl mx-auto">
                {/* Back Button */}
                <div className="mb-4">
                    <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-medium text-sm group">
                        <div className="w-8 h-8 bg-white dark:bg-[#1E1E1E] rounded-full flex items-center justify-center border border-gray-200 dark:border-white/5 shadow-sm group-hover:border-gray-300 transition-all">
                            <Icons.ArrowLeft className="w-4 h-4" />
                        </div>
                        Bosh sahifa
                    </button>
                </div>

                <ResultsFilters 
                    searchTerm={searchTerm} setSearchTerm={setSearchTerm}
                    typeFilter={typeFilter} setTypeFilter={setTypeFilter}
                    statusFilter={statusFilter} setStatusFilter={setStatusFilter}
                    isDark={isDark} totalCount={filteredResults.length}
                />

                <ResultsTable 
                    items={currentItems}
                    onDelete={handleDelete}
                    onReview={(res) => {
                        if (res.type === 'writing') navigate('/admin/writing-review', { state: { selectedId: res.id } });
                        else navigate(`/review/${res.id}`);
                    }}
                    isDark={isDark}
                    navigate={navigate}
                />

                {/* Pagination */}
                <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-1">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded bg-white disabled:opacity-50"><Icons.ChevronLeft className="w-4 h-4" /></button>
                        <div className="flex gap-1">{renderPagination()}</div>
                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded bg-white disabled:opacity-50"><Icons.ChevronRight className="w-4 h-4" /></button>
                    </div>
                    <span className="text-[13px] font-medium text-gray-500">
                        {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredResults.length)} of {filteredResults.length} natijalar
                    </span>
                </div>
            </div>
        </div>
    );
}