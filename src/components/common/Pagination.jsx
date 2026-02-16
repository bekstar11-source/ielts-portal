import React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

export default function Pagination({ currentPage, totalPages, onPageChange }) {
    if (totalPages <= 1) return null;

    const renderPageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 5;

        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Always show first page
            pages.push(1);

            if (currentPage > 3) {
                pages.push('ellipsis-start');
            }

            // Show pages around current page
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            if (currentPage < totalPages - 2) {
                pages.push('ellipsis-end');
            }

            // Always show last page
            pages.push(totalPages);
        }

        return pages.map((page, index) => {
            if (page === 'ellipsis-start' || page === 'ellipsis-end') {
                return (
                    <span key={`ellipsis-${index}`} className="px-2 py-2 text-gray-500">
                        <MoreHorizontal size={20} />
                    </span>
                );
            }

            const isActive = page === currentPage;
            return (
                <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    className={`
                        w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-300
                        ${isActive
                            ? 'bg-vetra-orange text-white shadow-[0_0_15px_rgba(255,85,32,0.4)] scale-110'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'}
                    `}
                >
                    {page}
                </button>
            );
        });
    };

    return (
        <div className="flex items-center justify-center gap-2 mt-12 mb-8">
            <button
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
                <ChevronLeft size={20} />
            </button>

            <div className="flex items-center gap-2 bg-[#181210]/50 backdrop-blur-md p-1.5 rounded-2xl border border-white/5">
                {renderPageNumbers()}
            </div>

            <button
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
                <ChevronRight size={20} />
            </button>
        </div>
    );
}
