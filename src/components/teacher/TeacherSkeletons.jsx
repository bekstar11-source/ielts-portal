/**
 * O'qituvchi panelining yuklanish holatlari.
 *
 * Qoida: skeleton haqiqiy tarkibning O'LCHAMINI takrorlaydi. Shunda
 * ma'lumot kelganda layout siljimaydi va kutish "bo'sh ekran" emas,
 * "shakllanayotgan sahifa" bo'lib ko'rinadi.
 *
 * Vizual til Dashboard bilan bir xil: `warm` palitrasi, 2xl radius,
 * hairline chegara, hech qanday qo'shimcha rang shkalasi yo'q — faqat
 * sirt ustidan sekin o'tuvchi yorug'lik.
 */

import React from 'react';

/* Skeleton sirti — yorug'lik shu blok ichida yuradi. */
export function Shimmer({ className = '', rounded = 'rounded-xl', style }) {
    return (
        <div
            aria-hidden="true"
            style={style}
            className={`relative overflow-hidden isolate ${rounded} bg-warm-hairline/55 dark:bg-white/[0.055] ${className}`}
        >
            <div className="absolute inset-y-0 -inset-x-full w-1/2 animate-shimmer-sweep bg-gradient-to-r from-transparent via-white/55 to-transparent dark:via-white/[0.07]" />
        </div>
    );
}

/** Skeleton karta — haqiqiy `CARD_CLS` bilan bir xil sirt. */
function SkeletonCard({ className = '', children, stagger = 0 }) {
    return (
        <div
            style={{ '--stagger': stagger }}
            className={`stagger-in animate-content-in rounded-2xl border border-warm-hairline dark:border-white/10 bg-white dark:bg-warm-dark-elevated ${className}`}
        >
            {children}
        </div>
    );
}

/**
 * Fonda yangilanish indikatori — ma'lumot ekranda turganda skeletonga
 * qaytish o'rniga sahifa tepasida ingichka chiziq yuguradi.
 */
export function RefreshBar({ active }) {
    if (!active) return null;
    return (
        <div
            role="status"
            aria-label="Yangilanmoqda"
            className="fixed top-0 left-0 right-0 z-[60] h-[2px] overflow-hidden bg-transparent pointer-events-none"
        >
            <div className="h-full w-1/3 animate-refresh-bar rounded-full bg-gradient-to-r from-transparent via-warm-primary to-transparent" />
        </div>
    );
}

/** Sarlavha + tavsif + amal tugmasi. */
function HeaderSkeleton() {
    return (
        <div className="stagger-in animate-content-in flex flex-wrap items-end justify-between gap-4 mb-lg" style={{ '--stagger': 0 }}>
            <div className="space-y-2.5">
                <Shimmer className="h-8 w-56 sm:w-72" rounded="rounded-lg" />
                <Shimmer className="h-3.5 w-40 sm:w-56" rounded="rounded" />
            </div>
            <Shimmer className="h-9 w-36" rounded="rounded-full" />
        </div>
    );
}

/** 4 ta ko'rsatkich katakchasi — Dashboard tepasidagi panel. */
function StatTilesSkeleton() {
    return (
        <div
            style={{ '--stagger': 1 }}
            className="stagger-in animate-content-in grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden mb-lg rounded-2xl border border-warm-hairline dark:border-white/10 bg-warm-hairline dark:bg-white/10"
        >
            {[0, 1, 2, 3].map((i) => (
                <div key={i} className="px-md py-md bg-white dark:bg-warm-dark-elevated space-y-2.5">
                    <Shimmer className="h-7 w-14" rounded="rounded-lg" />
                    <Shimmer className="h-3 w-24" rounded="rounded" />
                    <Shimmer className="h-2.5 w-16" rounded="rounded" />
                </div>
            ))}
        </div>
    );
}

/** Ro'yxat qatorlari — har biri kichik kechikish bilan chiqadi. */
export function RowsSkeleton({ rows = 5, stagger = 0 }) {
    return (
        <SkeletonCard stagger={stagger} className="overflow-hidden divide-y divide-warm-hairline dark:divide-white/10">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-4 px-5 py-4">
                    <div className="flex items-center gap-sm min-w-0 flex-1">
                        <Shimmer className="h-4 w-4 flex-shrink-0" rounded="rounded" />
                        <div className="min-w-0 flex-1 space-y-2">
                            <Shimmer className="h-3.5" rounded="rounded" style={{ width: `${52 + ((i * 13) % 30)}%` }} />
                            <Shimmer className="h-2.5" rounded="rounded" style={{ width: `${30 + ((i * 17) % 25)}%` }} />
                        </div>
                    </div>
                    <Shimmer className="h-4 w-9 flex-shrink-0" rounded="rounded" />
                </div>
            ))}
        </SkeletonCard>
    );
}

/** Kunlik faollik chizig'i (ActivityStrip o'rni). */
function ActivityStripSkeleton() {
    return (
        <SkeletonCard stagger={2} className="mb-lg px-5 py-4">
            <div className="flex items-center justify-between mb-3">
                <Shimmer className="h-3 w-28" rounded="rounded" />
                <Shimmer className="h-3 w-16" rounded="rounded" />
            </div>
            <div className="flex items-end gap-1 h-12">
                {Array.from({ length: 14 }).map((_, i) => (
                    <Shimmer
                        key={i}
                        rounded="rounded-sm"
                        className="flex-1"
                        // Balandliklar aniq (tasodifiy emas) — har renderda
                        // sakramaydi va jonli diagramma taassurotini beradi.
                        style={{ height: `${28 + ((i * 29) % 70)}%` }}
                    />
                ))}
            </div>
        </SkeletonCard>
    );
}

function SectionHeaderSkeleton() {
    return (
        <div className="flex items-center justify-between mb-sm">
            <Shimmer className="h-4 w-32" rounded="rounded" />
            <Shimmer className="h-3 w-16" rounded="rounded" />
        </div>
    );
}

/* ── Sahifa skeletonlari ─────────────────────────────────────────── */

/** O'qituvchi bosh sahifasi. */
export function TeacherDashboardSkeleton() {
    return (
        <div className="font-sans" aria-busy="true">
            <StatTilesSkeleton />
            <ActivityStripSkeleton />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
                <section className="lg:col-span-7 space-y-lg">
                    <div>
                        <SectionHeaderSkeleton />
                        <RowsSkeleton rows={6} stagger={3} />
                    </div>
                    <SkeletonCard stagger={4} className="px-5 py-4 space-y-4">
                        <Shimmer className="h-4 w-28" rounded="rounded" />
                        {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-3">
                                <Shimmer className="h-3 w-16" rounded="rounded" />
                                <Shimmer className="h-2 flex-1" rounded="rounded-full" />
                                <Shimmer className="h-3 w-7" rounded="rounded" />
                            </div>
                        ))}
                    </SkeletonCard>
                </section>
                <section className="lg:col-span-5 space-y-lg">
                    <div>
                        <SectionHeaderSkeleton />
                        <RowsSkeleton rows={4} stagger={5} />
                    </div>
                    <div>
                        <SectionHeaderSkeleton />
                        <RowsSkeleton rows={3} stagger={6} />
                    </div>
                </section>
            </div>
        </div>
    );
}

/** Guruh statistikasi sahifasi. */
export function TeacherGroupStatsSkeleton() {
    return (
        <div className="space-y-5" aria-busy="true">
            <Shimmer className="h-11 w-full" rounded="rounded-2xl" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[0, 1, 2, 3].map((i) => (
                    <SkeletonCard key={i} stagger={i} className="h-[108px] p-4 space-y-3">
                        <Shimmer className="h-3 w-20" rounded="rounded" />
                        <Shimmer className="h-7 w-16" rounded="rounded-lg" />
                        <Shimmer className="h-2.5 w-24" rounded="rounded" />
                    </SkeletonCard>
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <SkeletonCard stagger={4} className="lg:col-span-2 p-5">
                    <Shimmer className="h-3.5 w-32 mb-5" rounded="rounded" />
                    <div className="flex items-end gap-1.5 h-52">
                        {Array.from({ length: 20 }).map((_, i) => (
                            <Shimmer key={i} rounded="rounded-sm" className="flex-1"
                                style={{ height: `${22 + ((i * 37) % 76)}%` }} />
                        ))}
                    </div>
                </SkeletonCard>
                <SkeletonCard stagger={5} className="p-5 space-y-4">
                    <Shimmer className="h-3.5 w-24" rounded="rounded" />
                    {[0, 1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex items-center gap-3">
                            <Shimmer className="h-3 w-14" rounded="rounded" />
                            <Shimmer className="h-2 flex-1" rounded="rounded-full" />
                        </div>
                    ))}
                </SkeletonCard>
            </div>
            <RowsSkeleton rows={6} stagger={6} />
        </div>
    );
}

/** Tayinlangan testlar sahifasi. */
export function TeacherTestsSkeleton({ cards = 3 }) {
    return (
        <div className="flex flex-col gap-3" aria-busy="true">
            {Array.from({ length: cards }).map((_, i) => (
                <SkeletonCard key={i} stagger={i} className="p-5 space-y-3.5">
                    <div className="flex items-center justify-between gap-4">
                        <Shimmer className="h-4 w-44" rounded="rounded" />
                        <Shimmer className="h-5 w-20" rounded="rounded-full" />
                    </div>
                    <Shimmer className="h-3 w-64 max-w-full" rounded="rounded" />
                    <Shimmer className="h-12 w-full" rounded="rounded-xl" />
                </SkeletonCard>
            ))}
        </div>
    );
}

/** Barcha natijalar jadvali. */
export function TeacherResultsSkeleton({ rows = 8 }) {
    return (
        <div className="space-y-3" aria-busy="true">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[0, 1, 2, 3].map((i) => (
                    <Shimmer key={i} className="h-10" rounded="rounded-xl" />
                ))}
            </div>
            <SkeletonCard stagger={1} className="overflow-hidden divide-y divide-warm-hairline dark:divide-white/10">
                {Array.from({ length: rows }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                        <Shimmer className="h-8 w-8 flex-shrink-0" rounded="rounded-full" />
                        <div className="min-w-0 flex-1 space-y-2">
                            <Shimmer className="h-3.5" rounded="rounded" style={{ width: `${44 + ((i * 19) % 32)}%` }} />
                            <Shimmer className="h-2.5" rounded="rounded" style={{ width: `${26 + ((i * 23) % 28)}%` }} />
                        </div>
                        <Shimmer className="hidden sm:block h-3 w-20 flex-shrink-0" rounded="rounded" />
                        <Shimmer className="h-4 w-10 flex-shrink-0" rounded="rounded" />
                    </div>
                ))}
            </SkeletonCard>
        </div>
    );
}

/** Yozma ishlarni tekshirish sahifasi. */
export function TeacherWritingReviewSkeleton({ rows = 6 }) {
    return (
        <div className="space-y-3" aria-busy="true">
            <Shimmer className="h-10 w-full max-w-sm" rounded="rounded-xl" />
            <RowsSkeleton rows={rows} stagger={1} />
        </div>
    );
}
