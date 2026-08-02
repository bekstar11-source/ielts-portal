/**
 * Sahifadagi barcha modal oynalar uchun yagona qobiq: fon, markazlash,
 * `Escape` bilan yopish va sahifa aylanishini bloklash.
 */

import React, { useEffect } from 'react';
import { X } from '@phosphor-icons/react';

export default function Modal({ open, onClose, title, description, children, maxWidth = 'max-w-md' }) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => e.key === 'Escape' && onClose?.();
        document.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
                onClick={onClose}
                aria-hidden="true"
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className={`relative w-full ${maxWidth} bg-white dark:bg-[#202022] border border-gray-200 dark:border-white/[0.08] rounded-t-3xl sm:rounded-2xl shadow-xl max-h-[85vh] overflow-y-auto custom-scrollbar`}
            >
                <div className="flex items-start justify-between gap-4 p-5 pb-3">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
                        {description && (
                            <p className="text-xs mt-1 text-gray-500 dark:text-gray-400 leading-relaxed">
                                {description}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Yopish"
                        className="p-1.5 -mr-1 -mt-1 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
                <div className="px-5 pb-5">{children}</div>
            </div>
        </div>
    );
}
