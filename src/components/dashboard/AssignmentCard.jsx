/**
 * Ustoz tayinlagan vazifaning feed'dagi kartasi.
 *
 * Vizual til `warm-*` tokenlariga tayanadi: bitta sirt, yupqa hairline chegara,
 * urg'u faqat `warm-primary` da. Ilgari bu yerda gradient chiziq, uchta rangli
 * "pill", pulsatsiyalanuvchi ikonka va rangli izoh qutisi bor edi — ularning
 * hech biri holat haqida qo'shimcha ma'lumot bermas, faqat ko'z chalg'itardi.
 *
 * Muhimi — endi karta o'quvchining haqiqiy holatini ko'rsatadi: nechta urinish
 * qolgani, natija tayyorligi va nima uchun tugma yopiqligi.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, Lock, CalendarX } from 'lucide-react';
import { useTranslation } from '../../context/LanguageContext';
import {
    getBundleProgress,
    getDeadlineState,
    getTaskRoute,
    getTaskState,
    getTypeLabel,
    formatDeadline,
} from './assignmentHelpers';

const MUTED = 'text-warm-muted dark:text-warm-on-dark-soft';
const HAIRLINE = 'border-warm-hairline dark:border-white/10';

const PRIMARY_BTN =
    'inline-flex items-center justify-center gap-2 rounded-xl bg-warm-primary text-warm-on-primary ' +
    'font-medium hover:bg-warm-primary-active active:scale-[0.99] transition-all';
const GHOST_BTN =
    `inline-flex items-center justify-center gap-2 rounded-xl border ${HAIRLINE} font-medium ` +
    'hover:bg-warm-surface/70 dark:hover:bg-white/5 active:scale-[0.99] transition-all';
const DISABLED_BTN =
    `inline-flex items-center justify-center gap-2 rounded-xl border ${HAIRLINE} font-medium ` +
    'text-warm-muted-soft dark:text-warm-on-dark-soft cursor-not-allowed';

/**
 * Holatdan tugmalarni chiqaradi.
 *
 * Asosiy qoida: agar biror ish qilish mumkin bo'lsa — u asosiy tugma bo'ladi.
 * Topshirib bo'lingan va urinish qolmagan vazifada bosiladigan yagona amal
 * natijani ko'rish, shuning uchun "Bajarildi" degan o'lik tugma o'rniga
 * o'sha amal ko'rsatiladi.
 */
function resolveActions(state, t) {
    const review = { label: t('assignment.viewResult'), icon: ArrowRight, action: 'review' };

    switch (state.status) {
        case 'completed':
            return {
                primary: { label: t('assignment.retry'), icon: ArrowRight, action: 'start' },
                secondary: state.canReview ? review : null,
            };
        case 'done':
            return state.canReview
                ? { primary: review, secondary: null }
                : { primary: { label: t('assignment.completed'), icon: Check, action: null }, secondary: null };
        case 'locked':
            return state.canReview
                ? { primary: review, secondary: null }
                : { primary: { label: t('assignment.limitReached'), icon: Lock, action: null }, secondary: null };
        case 'expired':
            return { primary: { label: t('assignment.expired'), icon: CalendarX, action: null }, secondary: null };
        default:
            return { primary: { label: t('assignment.start'), icon: ArrowRight, action: 'start' }, secondary: null };
    }
}

export default function AssignmentCard({ post, assignments = [] }) {
    const navigate = useNavigate();
    const { t, lang } = useTranslation();
    const [confirm, setConfirm] = useState(null); // { entry, state }

    // Muddat matni o'zidan o'zi eskirmasin: sahifa ochiq turganda ham
    // "2 soat qoldi" -> "1 soat qoldi" ga o'tishi kerak.
    const [, setTick] = useState(0);
    useEffect(() => {
        if (!post.deadline) return undefined;
        const id = setInterval(() => setTick(n => n + 1), 60000);
        return () => clearInterval(id);
    }, [post.deadline]);

    const deadline = getDeadlineState(post.deadline, t);
    const tests = Array.isArray(post.tests) ? post.tests : [];
    const isBundle = tests.length > 1;

    const singleEntry = useMemo(() => {
        if (tests.length === 1) return tests[0];
        if (!post.testId) return null;
        return { id: post.testId, title: post.testTitle || post.content, type: post.testType };
    }, [tests, post.testId, post.testTitle, post.testType, post.content]);

    const bundle = useMemo(
        () => getBundleProgress(tests, assignments, post.maxAttempts, deadline.isExpired),
        [tests, assignments, post.maxAttempts, deadline.isExpired]
    );

    const singleState = useMemo(
        () => getTaskState({
            assignments,
            testId: singleEntry?.id,
            fallbackMaxAttempts: post.maxAttempts,
            isExpired: deadline.isExpired,
        }),
        [assignments, singleEntry, post.maxAttempts, deadline.isExpired]
    );

    const isHighPriority = String(post.priority || '').toLowerCase() === 'high';
    const title = isBundle
        ? t('assignment.bundleTitle').replace('{count}', tests.length)
        : (singleEntry?.title || post.content || post.testTitle || t('assignment.fallbackTitle'));

    const runAction = (action, entry, state) => {
        if (action === 'start') setConfirm({ entry, state });
        else if (action === 'review') navigate(`/review/${state.result.id}`);
    };

    const startTask = () => {
        const entry = confirm?.entry;
        setConfirm(null);
        if (!entry) return;
        const { path, state } = getTaskRoute(entry);
        navigate(path, state ? { state } : undefined);
    };

    /** Urinishlar / muddat kabi ikkilamchi ma'lumot — bitta muted qator. */
    const metaLine = (state) => {
        const parts = [];
        if (!state.unlimited) {
            parts.push(t('assignment.attempts').replace('{used}', state.used).replace('{max}', state.max));
        }
        if (state.score != null && !Number.isNaN(state.score)) {
            parts.push(t('assignment.band').replace('{score}', state.score.toFixed(1)));
        }
        return parts.join(' · ');
    };

    return (
        <div className="px-4 pb-1">
            <article className={`rounded-2xl border ${HAIRLINE} bg-warm-canvas dark:bg-warm-dark-elevated`}>
                <div className="p-4 flex flex-col gap-3">
                    {/* Sarlavha ustidagi kontekst: tur, muhimlik, muddat */}
                    <div className="flex items-center gap-2 text-[12px]">
                        <span className={`font-medium ${MUTED}`}>
                            {isBundle ? t('assignment.badge') : getTypeLabel(singleEntry?.type || post.testType, t)}
                        </span>
                        {isHighPriority && (
                            <>
                                <span className={MUTED} aria-hidden="true">·</span>
                                <span className="font-medium text-warm-warning">{t('assignment.important')}</span>
                            </>
                        )}
                        <span
                            title={formatDeadline(deadline.date, lang)}
                            className={`ml-auto shrink-0 font-medium ${
                                deadline.isExpired
                                    ? 'text-warm-error'
                                    : deadline.isUrgent
                                        ? 'text-warm-warning'
                                        : MUTED
                            }`}
                        >
                            {deadline.label}
                        </span>
                    </div>

                    <h3 className="text-warm-title-sm font-medium text-warm-ink dark:text-warm-on-dark">
                        {title}
                    </h3>

                    {post.teacherNote && (
                        <p className={`border-l-2 ${HAIRLINE} pl-3 text-[13px] leading-relaxed ${MUTED}`}>
                            {post.teacherNote}
                        </p>
                    )}

                    {isBundle ? (
                        <>
                            <p className={`text-[12px] ${MUTED}`}>
                                {t('assignment.progress')
                                    .replace('{done}', bundle.done)
                                    .replace('{total}', bundle.total)}
                            </p>

                            <ul className={`rounded-xl border ${HAIRLINE} divide-y divide-warm-hairline dark:divide-white/10 overflow-hidden`}>
                                {bundle.states.map(({ test, state }, index) => {
                                    const { primary } = resolveActions(state, t);
                                    const interactive = Boolean(primary.action);
                                    return (
                                        <li key={`${test.id}-${index}`}>
                                            <button
                                                type="button"
                                                onClick={() => runAction(primary.action, test, state)}
                                                disabled={!interactive}
                                                className={`w-full flex items-center gap-3 px-3.5 py-3 text-left transition-colors ${
                                                    interactive
                                                        ? 'hover:bg-warm-surface/70 dark:hover:bg-white/5'
                                                        : 'cursor-not-allowed'
                                                }`}
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <p className={`text-[14px] truncate ${
                                                        state.completed
                                                            ? MUTED
                                                            : 'text-warm-ink dark:text-warm-on-dark'
                                                    }`}>
                                                        {test.title}
                                                    </p>
                                                    <p className={`text-[12px] mt-0.5 ${MUTED}`}>
                                                        {[getTypeLabel(test.type, t), metaLine(state)]
                                                            .filter(Boolean)
                                                            .join(' · ')}
                                                    </p>
                                                </div>
                                                {state.completed && (
                                                    <Check size={16} className="shrink-0 text-warm-success" />
                                                )}
                                                <span className={`shrink-0 text-[12px] font-medium ${
                                                    interactive ? 'text-warm-primary' : MUTED
                                                }`}>
                                                    {primary.label}
                                                </span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </>
                    ) : (
                        <>
                            {metaLine(singleState) && (
                                <p className={`text-[12px] ${MUTED}`}>{metaLine(singleState)}</p>
                            )}

                            {(() => {
                                const { primary, secondary } = resolveActions(singleState, t);
                                const Icon = primary.icon;
                                return (
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => runAction(primary.action, singleEntry, singleState)}
                                            disabled={!primary.action}
                                            className={`flex-1 py-3 text-[14px] ${
                                                primary.action ? PRIMARY_BTN : DISABLED_BTN
                                            }`}
                                        >
                                            {primary.label}
                                            <Icon size={15} />
                                        </button>

                                        {secondary && (
                                            <button
                                                type="button"
                                                onClick={() => runAction(secondary.action, singleEntry, singleState)}
                                                className={`${GHOST_BTN} px-4 py-3 text-[14px] text-warm-body dark:text-warm-on-dark`}
                                            >
                                                {secondary.label}
                                            </button>
                                        )}
                                    </div>
                                );
                            })()}
                        </>
                    )}
                </div>
            </article>

            <AnimatePresence>
                {confirm && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setConfirm(null)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.97, y: 8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.97, y: 8 }}
                            transition={{ duration: 0.16, ease: 'easeOut' }}
                            role="dialog"
                            aria-modal="true"
                            className={`relative z-10 w-full max-w-[340px] rounded-2xl border ${HAIRLINE} bg-warm-canvas dark:bg-warm-dark-elevated p-5`}
                        >
                            <h3 className="text-warm-title-sm font-medium text-warm-ink dark:text-warm-on-dark">
                                {t('assignment.confirmTitle')}
                            </h3>
                            <p className={`mt-2 text-[13px] leading-relaxed ${MUTED}`}>
                                {t('assignment.confirmBody').replace('{title}', confirm.entry?.title || '')}
                            </p>
                            {!confirm.state.unlimited && (
                                <p className={`mt-1.5 text-[12px] ${MUTED}`}>
                                    {t('assignment.confirmAttempts')
                                        .replace('{current}', confirm.state.used + 1)
                                        .replace('{max}', confirm.state.max)}
                                </p>
                            )}
                            <div className="mt-5 flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setConfirm(null)}
                                    className={`${GHOST_BTN} flex-1 py-2.5 text-[14px] text-warm-body dark:text-warm-on-dark`}
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="button"
                                    onClick={startTask}
                                    className={`${PRIMARY_BTN} flex-1 py-2.5 text-[14px]`}
                                >
                                    {t('assignment.start')}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
