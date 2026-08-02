/**
 * Mock ochish paneli: kalit kiritish + do'kon havolasi.
 *
 * Ilgari bu ikkita to'q gradientli "banner" edi — sahifaning qolgan qismi
 * bilan bir xil tilda gaplashmasdi. Endi bitta qatorda ikkita sokin sirt:
 * urg'u faqat asosiy tugmada.
 */

import React from 'react';
import { Key, ShoppingBag, CaretRight, CircleNotch, WarningCircle, CheckCircle } from '@phosphor-icons/react';
import { CARD_CLS, MUTED_CLS } from './mockHelpers';

// Kalitlar 6 ta belgidan iborat (KeyManager: A–Z/2–9, chalkashadigan harflarsiz).
const KEY_LENGTH = 6;

export default function MockAccessPanel({
    t, mockKey, setMockKey, onSubmit, loading, activated, error, onGoToStore,
}) {
    const handleChange = (e) => {
        // Kalit serverda ham katta harfga keltiriladi — foydalanuvchi kiritayotgan
        // paytda ham xuddi shu ko'rinishda bo'lsin, bo'sh joy va tirelar tushib qolsin.
        const cleaned = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, KEY_LENGTH);
        setMockKey(cleaned);
    };

    return (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Kalit */}
            <form onSubmit={onSubmit} className={`${CARD_CLS} p-6 flex flex-col`}>
                <div className="flex items-center gap-2.5">
                    <Key size={18} weight="regular" className="text-warm-primary" />
                    <h2 className="text-warm-title-sm font-medium">{t('mock.keyPanelTitle')}</h2>
                </div>
                <p className={`text-[13px] mt-1.5 ${MUTED_CLS}`}>{t('mock.keyPanelDesc')}</p>

                <div className="mt-auto pt-5 flex flex-col sm:flex-row gap-2">
                    <input
                        type="text"
                        inputMode="text"
                        autoComplete="off"
                        spellCheck={false}
                        value={mockKey}
                        onChange={handleChange}
                        maxLength={KEY_LENGTH}
                        placeholder={t('mock.keyPlaceholder')}
                        aria-label={t('mock.keyPanelTitle')}
                        aria-invalid={Boolean(error)}
                        className="flex-1 rounded-xl border border-warm-hairline dark:border-white/10 bg-warm-canvas dark:bg-warm-dark px-4 py-3 text-[15px] font-medium tracking-[0.25em] uppercase outline-none transition-colors focus:border-warm-primary placeholder:tracking-normal placeholder:font-normal placeholder:text-warm-muted-soft"
                    />
                    <button
                        type="submit"
                        disabled={loading || activated || mockKey.length < KEY_LENGTH}
                        className="rounded-xl px-5 py-3 text-[14px] font-medium bg-warm-primary text-warm-on-primary transition-colors hover:bg-warm-primary-active disabled:opacity-40 disabled:hover:bg-warm-primary flex items-center justify-center gap-2"
                    >
                        {loading && <CircleNotch size={16} className="animate-spin" />}
                        {activated && <CheckCircle size={16} weight="fill" />}
                        {activated ? t('mock.activated') : t('mock.activate')}
                    </button>
                </div>

                {error && (
                    <p role="alert" className="mt-2.5 text-[13px] text-warm-error flex items-start gap-1.5">
                        <WarningCircle size={15} className="mt-0.5 shrink-0" />
                        {error}
                    </p>
                )}
            </form>

            {/* Do'kon */}
            <div className={`${CARD_CLS} p-6 flex flex-col`}>
                <div className="flex items-center gap-2.5">
                    <ShoppingBag size={18} weight="regular" className="text-warm-primary" />
                    <h2 className="text-warm-title-sm font-medium">{t('mock.storeTitle')}</h2>
                </div>
                <p className={`text-[13px] mt-1.5 ${MUTED_CLS}`}>{t('mock.storeDesc')}</p>

                <div className="mt-auto pt-5">
                    <button
                        type="button"
                        onClick={onGoToStore}
                        className="w-full sm:w-auto rounded-xl border border-warm-hairline dark:border-white/10 px-5 py-3 text-[14px] font-medium transition-colors hover:bg-warm-surface dark:hover:bg-white/5 flex items-center justify-center gap-1.5"
                    >
                        {t('mock.goToStore')}
                        <CaretRight size={14} />
                    </button>
                </div>
            </div>
        </section>
    );
}
