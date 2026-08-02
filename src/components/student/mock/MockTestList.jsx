/**
 * Mock ro'yxati: tab'lar (soni bilan), qidiruv va kartalar.
 *
 * Tab'lar endi nechta test borligini ko'rsatadi — ilgari bo'sh tabga o'tib
 * ketish yagona bilish usuli edi.
 */

import React from 'react';
import { FileText, MagnifyingGlass, CircleNotch, WarningCircle } from '@phosphor-icons/react';
import MockTestCard from './MockTestCard';
import { CARD_CLS, MUTED_CLS } from './mockHelpers';

function Tab({ active, label, count, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-selected={active}
            role="tab"
            className={`relative pb-3 text-[15px] font-medium transition-colors ${
                active
                    ? 'text-warm-ink dark:text-warm-on-dark'
                    : 'text-warm-muted dark:text-warm-on-dark-soft hover:text-warm-ink dark:hover:text-warm-on-dark'
            }`}
        >
            {label}
            <span className={`ml-2 text-[13px] tabular-nums ${active ? 'text-warm-primary' : ''}`}>{count}</span>
            {active && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-warm-primary rounded-full" />}
        </button>
    );
}

export default function MockTestList({
    t, lang, activeTab, setActiveTab, upcomingCount, pastCount, mocks,
    search, setSearch, loading, error, userData,
    onStart, onSchedule, onReview, onGoToStore,
}) {
    const isSearching = search.trim().length > 0;

    return (
        <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div role="tablist" className="flex items-center gap-8 border-b border-warm-hairline dark:border-white/10 flex-1">
                    <Tab
                        active={activeTab === 'upcoming'}
                        label={t('mock.upcomingTests')}
                        count={upcomingCount}
                        onClick={() => setActiveTab('upcoming')}
                    />
                    <Tab
                        active={activeTab === 'past'}
                        label={t('mock.pastTests')}
                        count={pastCount}
                        onClick={() => setActiveTab('past')}
                    />
                </div>

                <div className="relative sm:w-64">
                    <MagnifyingGlass size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${MUTED_CLS}`} />
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t('mock.searchPlaceholder')}
                        aria-label={t('mock.searchPlaceholder')}
                        className="w-full rounded-xl border border-warm-hairline dark:border-white/10 bg-white dark:bg-warm-dark-elevated pl-9 pr-3 py-2.5 text-[14px] outline-none transition-colors focus:border-warm-primary placeholder:text-warm-muted-soft"
                    />
                </div>
            </div>

            {loading ? (
                <div className={`${CARD_CLS} py-20 text-center`}>
                    <CircleNotch size={26} className={`animate-spin mx-auto ${MUTED_CLS}`} />
                    <p className={`mt-3 text-[13px] ${MUTED_CLS}`}>{t('mock.authenticating')}</p>
                </div>
            ) : error ? (
                <div className={`${CARD_CLS} py-16 text-center`}>
                    <WarningCircle size={26} className="mx-auto text-warm-error" />
                    <p className="mt-3 text-[14px] font-medium">{t('mock.loadFailed')}</p>
                </div>
            ) : mocks.length > 0 ? (
                <div className="space-y-4">
                    {mocks.map((test) => (
                        <MockTestCard
                            key={test.id || test.mockKey}
                            test={test}
                            tab={activeTab}
                            t={t}
                            lang={lang}
                            userData={userData}
                            onStart={() => onStart(test)}
                            onSchedule={() => onSchedule(test)}
                            onReview={() => onReview(test)}
                        />
                    ))}
                </div>
            ) : (
                <div className={`${CARD_CLS} py-16 px-6 text-center`}>
                    <FileText size={26} className={`mx-auto ${MUTED_CLS}`} />
                    <p className="mt-3 text-[14px] font-medium">
                        {isSearching
                            ? t('mock.noSearchResults')
                            : activeTab === 'upcoming' ? t('mock.noUpcoming') : t('mock.noPast')}
                    </p>
                    {!isSearching && activeTab === 'upcoming' && (
                        <>
                            <p className={`mt-1 text-[13px] ${MUTED_CLS}`}>{t('mock.emptyUpcomingCta')}</p>
                            <button
                                type="button"
                                onClick={onGoToStore}
                                className="mt-5 rounded-xl px-5 py-2.5 text-[14px] font-medium bg-warm-primary text-warm-on-primary transition-colors hover:bg-warm-primary-active"
                            >
                                {t('mock.goToStore')}
                            </button>
                        </>
                    )}
                </div>
            )}
        </section>
    );
}
