import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, X } from 'lucide-react';
import { usePromoSpotlights } from '../../hooks/usePromoSpotlights';
import { useSpotlightNotice } from '../../hooks/useSpotlightNotice';
import { useAuth } from '../../context/AuthContext';

const ROTATE_MS = 9000;

/* ---------------------------------- ui atoms --------------------------------- */

const PreviewShell = ({ label, compact, children }) => (
    <div className={`flex flex-col ${compact ? 'gap-2.5' : 'gap-3'}`}>
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-warm-muted dark:text-warm-on-dark-soft">
            {label}
        </span>
        {children}
    </div>
);

const Verdict = ({ correct, explanation }) => (
    <div className="flex items-start gap-2 pt-0.5">
        <span
            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                correct ? 'bg-warm-success/15 text-warm-success' : 'bg-warm-error/15 text-warm-error'
            }`}
        >
            {correct ? <Check size={11} strokeWidth={3} /> : <X size={11} strokeWidth={3} />}
        </span>
        <p className="text-[12.5px] leading-relaxed text-warm-muted dark:text-warm-on-dark-soft">
            {explanation}
        </p>
    </div>
);

/** Javob variantlari — tanlangandan keyin to'g'ri/noto'g'ri ochiladi. */
const OptionRow = ({ option, picked, answered, isAnswer, onPick, dense }) => {
    const state = !answered
        ? 'idle'
        : isAnswer
        ? 'correct'
        : picked
        ? 'wrong'
        : 'muted';

    const styles = {
        idle: 'border-warm-hairline dark:border-white/10 text-warm-body dark:text-warm-on-dark-soft hover:border-warm-primary/60 hover:text-warm-ink dark:hover:text-warm-on-dark',
        correct: 'border-warm-success/50 bg-warm-success/10 text-warm-ink dark:text-warm-on-dark',
        wrong: 'border-warm-error/50 bg-warm-error/10 text-warm-ink dark:text-warm-on-dark',
        muted: 'border-warm-hairline dark:border-white/10 text-warm-muted-soft dark:text-warm-on-dark-soft/60',
    }[state];

    return (
        <button
            type="button"
            disabled={answered}
            onClick={() => onPick(option)}
            className={`flex w-full items-center justify-between rounded-xl border font-medium transition-colors disabled:cursor-default ${
                dense
                    ? 'gap-1 px-2 py-2 text-center text-[12px]'
                    : 'gap-3 px-3.5 py-2.5 text-left text-[13.5px]'
            } ${styles}`}
        >
            <span className={dense ? 'mx-auto whitespace-nowrap' : undefined}>{option}</span>
            {answered && isAnswer && <Check size={14} strokeWidth={2.5} className="text-warm-success shrink-0" />}
            {answered && picked && !isAnswer && <X size={14} strokeWidth={2.5} className="text-warm-error shrink-0" />}
        </button>
    );
};

/* --------------------------------- previews --------------------------------- */

function ChoicePreview({ preview, picked, onPick, compact }) {
    const answered = picked != null;
    const isTfng = preview.kind === 'tfng';

    return (
        <PreviewShell label={preview.label} compact={compact}>
            {isTfng ? (
                <p className="rounded-xl bg-warm-surface/70 dark:bg-white/[0.04] p-3.5 text-[13px] leading-[1.6] text-warm-body dark:text-warm-on-dark-soft">
                    {preview.passage}
                </p>
            ) : (
                <div className="flex flex-col gap-2 rounded-xl bg-warm-surface/70 dark:bg-white/[0.04] p-3.5">
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold tabular-nums text-warm-muted dark:text-warm-on-dark-soft">
                            {preview.audioLine}
                        </span>
                        <span className="flex h-3 items-end gap-[2px]" aria-hidden="true">
                            {[6, 11, 4, 9, 7].map((h, i) => (
                                <span
                                    key={i}
                                    className="w-[2px] rounded-full bg-warm-primary/70"
                                    style={{ height: `${h}px` }}
                                />
                            ))}
                        </span>
                    </div>
                    <p className="text-[13px] italic leading-[1.6] text-warm-body dark:text-warm-on-dark-soft">
                        {preview.transcriptHint}
                    </p>
                </div>
            )}

            <p className="text-[14px] font-medium leading-snug text-warm-ink dark:text-warm-on-dark">
                {isTfng ? preview.statement : preview.question}
            </p>

            <div className={isTfng ? 'grid grid-cols-3 gap-2' : 'flex flex-col gap-2'}>
                {preview.options.map((opt) => (
                    <OptionRow
                        key={opt}
                        option={opt}
                        picked={picked === opt}
                        answered={answered}
                        isAnswer={opt === preview.answer}
                        onPick={onPick}
                        dense={isTfng}
                    />
                ))}
            </div>

            {answered && <Verdict correct={picked === preview.answer} explanation={preview.explanation} />}
        </PreviewShell>
    );
}

function GapFillPreview({ preview, picked, onPick, compact }) {
    const answered = picked != null;

    return (
        <PreviewShell label={preview.label} compact={compact}>
            <p className="rounded-xl bg-warm-surface/70 dark:bg-white/[0.04] p-3.5 text-[13px] leading-[1.6] text-warm-body dark:text-warm-on-dark-soft">
                {preview.passage}
            </p>

            <p className="text-[14px] leading-relaxed text-warm-ink dark:text-warm-on-dark">
                {preview.before}{' '}
                <button
                    type="button"
                    disabled={answered}
                    onClick={() => onPick(preview.answer)}
                    className={`mx-0.5 inline-flex min-w-[92px] items-center justify-center rounded-md border px-2 py-0.5 text-[13px] font-semibold transition-colors ${
                        answered
                            ? 'border-warm-success/50 bg-warm-success/10 text-warm-ink dark:text-warm-on-dark'
                            : 'border-dashed border-warm-hairline dark:border-white/20 text-warm-muted dark:text-warm-on-dark-soft hover:border-warm-primary/60'
                    }`}
                >
                    {answered ? preview.answer : 'javobni ko‘rish'}
                </button>
                {preview.after}
            </p>

            {answered && <Verdict correct explanation={preview.explanation} />}
        </PreviewShell>
    );
}

/* --------------------------------- section ---------------------------------- */

/**
 * @param {object}   props
 * @param {Array}    [props.slides]  Tayyor slaydlar (admin panel preview'i uchun).
 *                                   Berilmasa — Firestore'dan o'qiladi.
 * @param {boolean}  [props.compact] Tor ustun (feed) uchun: hamma narsa bir
 *                                   ustunda, zichroq tipografiya bilan.
 */
export default function PromoSpotlight({ slides: slidesProp, className = '', compact = false }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const [index, setIndex] = useState(0);
    const [picks, setPicks] = useState({});
    const [paused, setPaused] = useState(false);
    const [highlighted, setHighlighted] = useState(false);
    const timerRef = useRef(null);
    const sectionRef = useRef(null);
    const jumpedToRef = useRef(null);

    const controlled = Array.isArray(slidesProp);
    const { slides: remoteSlides, loading } = usePromoSpotlights({ enabled: !controlled });
    const slides = controlled ? slidesProp : remoteSlides;

    const { markSeen } = useSpotlightNotice(controlled ? null : user);

    // O'quvchi bo'limni ko'rdi — badge va toast o'chsin.
    useEffect(() => {
        if (!controlled && slides.length > 0) markSeen();
    }, [controlled, slides.length, markSeen]);

    // Bildirishnomadan kelinganda (`/dashboard?spotlight=<id>`): kerakli slaydga
    // o'tamiz, ekranni shu joyga surib, bir necha soniya belgilab qo'yamiz.
    const targetId = controlled ? null : new URLSearchParams(location.search).get('spotlight');

    useEffect(() => {
        if (!targetId || slides.length === 0 || jumpedToRef.current === targetId) return undefined;
        jumpedToRef.current = targetId;

        // Bir kadr kutamiz: feed to'liq joylashib bo'lgach scroll aniq tushadi.
        let fadeTimer;
        const frame = requestAnimationFrame(() => {
            const i = slides.findIndex((s) => s.id === targetId);
            if (i >= 0) setIndex(i);
            sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHighlighted(true);
            fadeTimer = setTimeout(() => setHighlighted(false), 2600);
        });

        return () => { cancelAnimationFrame(frame); clearTimeout(fadeTimer); };
    }, [targetId, slides]);

    // Slaydlar soni kamayib qolsa (admin o'chirsa) — indeks chegaradan chiqmasin.
    const activeIndex = index < slides.length ? index : 0;
    const slide = slides[activeIndex];
    const picked = picks[slide?.id] ?? null;
    // Foydalanuvchi savol bilan ishlayotgan bo'lsa — slayd o'z-o'zidan almashmasin.
    const frozen = paused || picked != null;

    const goTo = useCallback((i) => setIndex(((i % slides.length) + slides.length) % slides.length), [slides.length]);

    useEffect(() => {
        if (frozen || slides.length < 2) return undefined;
        timerRef.current = setTimeout(() => goTo(activeIndex + 1), ROTATE_MS);
        return () => clearTimeout(timerRef.current);
    }, [activeIndex, frozen, slides.length, goTo]);

    const handlePick = (option) => setPicks((prev) => ({ ...prev, [slide.id]: option }));

    const accentStyle = useMemo(() => ({ backgroundColor: slide?.accent }), [slide?.accent]);

    if (loading && !slide) {
        return (
            <section className={`w-full ${className}`} aria-hidden="true">
                <div className={`animate-pulse rounded-3xl border border-warm-hairline bg-warm-surface/50 dark:border-white/10 dark:bg-white/[0.03] ${compact ? 'h-[280px]' : 'h-[340px] md:h-[300px]'}`} />
            </section>
        );
    }

    // Admin hech narsa e'lon qilmagan bo'lsa — bo'sh joy qoldirmaymiz.
    if (!slide) return null;

    // Slayd faqat e'lon, faqat savol yoki ikkalasi bo'lishi mumkin.
    const hasPromo = slide.mode !== 'question';
    const hasQuestion = slide.mode !== 'promo';
    const both = hasPromo && hasQuestion;
    const promoOnlyWide = hasPromo && !both && !compact;

    return (
        <section
            ref={sectionRef}
            className={`w-full scroll-mt-24 ${className}`}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            aria-label="Yangiliklar va savol namunalari"
        >
            <div
                className={`overflow-hidden rounded-3xl border bg-warm-canvas transition-all duration-500 dark:bg-warm-dark-elevated ${
                    highlighted
                        ? 'border-warm-primary ring-4 ring-warm-primary/20'
                        : 'border-warm-hairline dark:border-white/10'
                }`}
            >
                <div
                    key={slide.id}
                    className={`grid animate-content-in grid-cols-1 ${both && !compact ? 'md:grid-cols-[1.05fr_1fr]' : ''}`}
                >
                    {/* E'lon bloki — faqat matnli slaydda butun kenglikni egallaydi */}
                    {hasPromo && (
                        <div
                            className={
                                compact
                                    ? 'flex flex-col gap-3 p-5'
                                    : both
                                    ? 'flex flex-col justify-between gap-8 p-6 md:p-8'
                                    : 'flex flex-col items-start justify-between gap-6 p-6 md:flex-row md:items-center md:p-8'
                            }
                        >
                            <div className={`flex flex-col ${compact ? 'gap-2' : 'gap-4'} ${promoOnlyWide ? 'max-w-2xl' : ''}`}>
                                <span
                                    className={`inline-flex w-fit items-center rounded-full font-bold uppercase tracking-wider text-white ${
                                        compact ? 'px-2 py-0.5 text-[10px]' : 'gap-1.5 px-2.5 py-1 text-[11px]'
                                    }`}
                                    style={accentStyle}
                                >
                                    {slide.tag}
                                </span>
                                <h2
                                    className={`font-normal leading-tight text-warm-ink dark:text-warm-on-dark ${
                                        compact ? 'text-warm-title-lg' : 'text-warm-display-sm md:text-warm-display-md'
                                    }`}
                                >
                                    {slide.title}
                                </h2>
                                {slide.description && (
                                    <p
                                        className={`text-warm-muted dark:text-warm-on-dark-soft ${
                                            compact ? 'text-[13px] leading-relaxed' : 'max-w-md text-warm-body-sm'
                                        }`}
                                    >
                                        {slide.description}
                                    </p>
                                )}
                            </div>

                            <div
                                className={`flex flex-wrap items-center ${compact ? 'gap-2 pt-0.5' : 'gap-3'} ${
                                    promoOnlyWide ? 'shrink-0' : ''
                                }`}
                            >
                                <button
                                    onClick={() => navigate(slide.cta.to)}
                                    className={`inline-flex items-center gap-1.5 rounded-full bg-warm-ink font-bold text-white transition-colors hover:bg-warm-body-strong dark:bg-warm-on-dark dark:text-warm-ink dark:hover:bg-white ${
                                        compact ? 'px-4 py-2 text-[13px]' : 'px-6 py-3 text-sm'
                                    }`}
                                >
                                    {slide.cta.label}
                                    <ArrowRight size={compact ? 13 : 15} strokeWidth={2.5} />
                                </button>
                                {slide.secondary && (
                                    <button
                                        onClick={() => navigate(slide.secondary.to)}
                                        className={`rounded-full border border-warm-hairline font-bold text-warm-body transition-colors hover:border-warm-primary hover:text-warm-ink dark:border-white/10 dark:text-warm-on-dark-soft dark:hover:text-warm-on-dark ${
                                            compact ? 'px-4 py-2 text-[13px]' : 'px-6 py-3 text-sm'
                                        }`}
                                    >
                                        {slide.secondary.label}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Savol parchasi — e'lonsiz slaydda o'zi yolg'iz turadi */}
                    {hasQuestion && (
                        <div
                            className={
                                compact
                                    ? `p-5 ${hasPromo ? 'border-t border-warm-hairline bg-warm-surface/40 dark:border-white/10 dark:bg-white/[0.02]' : ''}`
                                    : `p-6 md:p-8 ${
                                          both
                                              ? 'border-t border-warm-hairline bg-warm-surface/40 dark:border-white/10 dark:bg-white/[0.02] md:border-l md:border-t-0'
                                              : ''
                                      }`
                            }
                        >
                            <div className={both || compact ? '' : 'mx-auto max-w-2xl'}>
                                {/* Savol yolg'iz kelganda tag savol ustida turadi */}
                                {!hasPromo && (
                                    <span
                                        className="mb-3 inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                                        style={accentStyle}
                                    >
                                        {slide.tag}
                                    </span>
                                )}

                                {slide.preview.kind === 'gapfill' ? (
                                    <GapFillPreview preview={slide.preview} picked={picked} onPick={handlePick} compact={compact} />
                                ) : (
                                    <ChoicePreview preview={slide.preview} picked={picked} onPick={handlePick} compact={compact} />
                                )}

                                {/* E'lon bo'lmasa ham CTA kerak bo'lishi mumkin — matnli havola sifatida */}
                                {!hasPromo && slide.cta.label && (
                                    <button
                                        onClick={() => navigate(slide.cta.to)}
                                        className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-bold text-warm-primary transition-colors hover:text-warm-primary-active"
                                    >
                                        {slide.cta.label}
                                        <ArrowRight size={14} strokeWidth={2.5} />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Slayd indikatorlari */}
                {slides.length > 1 && (
                    <div className={`flex items-center justify-between border-t border-warm-hairline dark:border-white/10 ${compact ? 'px-5 py-2.5' : 'px-6 py-3'}`}>
                        <div className="flex items-center gap-2">
                            {slides.map((s, i) => (
                                <button
                                    key={s.id}
                                    onClick={() => goTo(i)}
                                    aria-label={s.title}
                                    aria-current={i === activeIndex}
                                    className={`h-1.5 rounded-full transition-all ${
                                        i === activeIndex
                                            ? 'w-6 bg-warm-ink dark:bg-warm-on-dark'
                                            : 'w-1.5 bg-warm-hairline hover:bg-warm-muted-soft dark:bg-white/20'
                                    }`}
                                />
                            ))}
                        </div>
                        <button
                            onClick={() => goTo(activeIndex + 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-warm-muted transition-colors hover:bg-warm-surface hover:text-warm-ink dark:text-warm-on-dark-soft dark:hover:bg-white/5 dark:hover:text-warm-on-dark"
                            aria-label="Keyingi"
                        >
                            <ArrowRight size={16} />
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
}
