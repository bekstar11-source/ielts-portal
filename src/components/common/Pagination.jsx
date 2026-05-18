import React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

export default function Pagination({ currentPage, totalPages, onPageChange }) {
    if (totalPages <= 1) return null;

    const renderPageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 5;

        if (totalPages <= 6) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (currentPage <= 3) {
                pages.push(1, 2, 3, 4);
                pages.push('ellipsis-end');
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1);
                pages.push('ellipsis-start');
                pages.push(totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
            } else {
                pages.push(1);
                pages.push('ellipsis-start');
                pages.push(currentPage - 1, currentPage, currentPage + 1);
                pages.push('ellipsis-end');
                pages.push(totalPages);
            }
        }

        return pages.map((page, index) => {
            if (page === 'ellipsis-start' || page === 'ellipsis-end') {
                return (
                    <span key={`ellipsis-${index}`} className="px-1 text-zinc-400">
                        <MoreHorizontal size={14} />
                    </span>
                );
            }

            const isActive = page === currentPage;
            return (
                <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    className={`
                        min-w-[32px] h-8 px-2 rounded-lg flex items-center justify-center text-[11px] font-black transition-all duration-200
                        ${isActive
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-105'
                            : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white'}
                    `}
                >
                    {page}
                </button>
            );
        });
    };

    return (
        <div className="flex items-center justify-center gap-4 py-2">
            <button
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-zinc-200 dark:border-white/5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
            >
                <ChevronLeft size={16} />
            </button>

            <div className="flex items-center gap-1">
                {renderPageNumbers()}
            </div>

            <button
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-zinc-200 dark:border-white/5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
            >
                <ChevronRight size={16} />
            </button>
        </div>
    );
}
