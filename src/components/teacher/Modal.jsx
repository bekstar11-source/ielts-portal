/**
 * O'qituvchi panelidagi BARCHA modal oynalar uchun yagona qobiq.
 *
 * Ilgari panelda beshta mustaqil modal bor edi va ularning xulqi bir xil
 * emasdi: biri fonni bosganda yopilardi, ikkinchisi yopilmasdi, hech biri
 * orqadagi sahifa aylanishini to'xtatmasdi (mobilda modal ustida ro'yxat
 * "suzib" ketardi). Bu yerda o'sha xulq bitta joyda:
 *   • fonni bosish va `Escape` — yopadi
 *   • ochiq turganda `body` scroll qulflanadi
 *   • fokus oyna ichiga olinadi va `Tab` undan chiqib ketmaydi
 *
 * Uzun tarkib uchun `footer` proplari bor: sarlavha va tugmalar joyida
 * qoladi, faqat o'rtadagi qism aylanadi.
 */

import React, { useEffect, useRef } from 'react';
import { X } from '@phosphor-icons/react';
import { useTranslation } from '../../context/LanguageContext';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Modal({
    open,
    onClose,
    title,
    description,
    children,
    footer = null,
    maxWidth = 'max-w-md',
    closeOnBackdrop = true,
}) {
    const { t } = useTranslation();
    const panelRef = useRef(null);

    useEffect(() => {
        if (!open) return undefined;

        const previouslyFocused = document.activeElement;
        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose?.();
                return;
            }
            if (e.key !== 'Tab' || !panelRef.current) return;

            const items = [...panelRef.current.querySelectorAll(FOCUSABLE)];
            if (!items.length) return;
            const first = items[0];
            const last = items[items.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', onKeyDown);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        panelRef.current?.querySelector(FOCUSABLE)?.focus();

        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = prevOverflow;
            if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
                onClick={closeOnBackdrop ? onClose : undefined}
                aria-hidden="true"
            />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className={`relative w-full ${maxWidth} flex flex-col max-h-[85vh] bg-white dark:bg-[#202022] border border-gray-200 dark:border-white/[0.08] rounded-t-3xl sm:rounded-2xl shadow-xl`}
            >
                <div className="flex items-start justify-between gap-4 p-5 pb-3 shrink-0">
                    <div className="min-w-0">
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
                        aria-label={t('common.close')}
                        className="p-1.5 -mr-1 -mt-1 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="px-5 pb-5 overflow-y-auto custom-scrollbar flex-1">{children}</div>

                {footer && (
                    <div className="shrink-0 flex items-center gap-2 px-5 py-3.5 border-t border-gray-100 dark:border-white/[0.08]">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
