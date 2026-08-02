/**
 * Modal qobig'i: fon, markazlash, Esc va fonga bosish orqali yopish.
 *
 * Ilgari kalit tasdiqlangandan keyingi oyna hech qanday yopish yo'lini
 * bermasdi — foydalanuvchi ikkita tugmadan birini bosmaguncha sahifaga
 * qaytolmasdi.
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from '@phosphor-icons/react';

export default function MockModalShell({ open, onClose, title, closeLabel, children, maxWidth = 'max-w-md' }) {
    useEffect(() => {
        if (!open) return undefined;
        const onKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKeyDown);
        // Modal ochiq turganda orqadagi sahifa "sirg'anib" ketmasin.
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = previousOverflow;
        };
    }, [open, onClose]);

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-warm-ink/40 dark:bg-black/60 backdrop-blur-sm"
                >
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-label={title}
                        initial={{ opacity: 0, scale: 0.98, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 8 }}
                        transition={{ duration: 0.16 }}
                        onClick={(e) => e.stopPropagation()}
                        className={`w-full ${maxWidth} rounded-2xl border border-warm-hairline dark:border-white/10 bg-white dark:bg-warm-dark-elevated text-warm-ink dark:text-warm-on-dark shadow-xl`}
                    >
                        <div className="flex items-start justify-between gap-4 px-6 pt-5">
                            <h2 className="text-warm-title-sm font-medium">{title}</h2>
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label={closeLabel}
                                className="-mr-2 -mt-1 p-2 rounded-lg text-warm-muted dark:text-warm-on-dark-soft transition-colors hover:bg-warm-surface dark:hover:bg-white/5"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        {children}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
