/**
 * Guruh sahifasining "hero" bloki — 1a yo'nalishi.
 *
 * Hamma narsa bitta qora kartada: sarlavha, dars vaqti, holatlar chizig'i va
 * uchta bosiladigan plitka. Ro'yxat pastga surilganda karta YIG'ILADI:
 * sarlavha kichrayadi, izohlar yo'qoladi, foizlar esa sarlavha yoniga
 * suriladi — ya'ni sticky sarlavha ham qisqa, ham ma'lumotli bo'lib qoladi.
 *
 * MUHIM: yig'ilish `state` orqali emas, to'g'ridan-to'g'ri DOM ga yoziladi.
 * Har bir scroll kadrida `setState` chaqirilsa React qayta render qiladi,
 * bu esa scroll konteynerini "sakratib" yuboradi. Shuning uchun bu yerda
 * `requestAnimationFrame` + ref lar ishlatiladi va komponent scroll paytida
 * umuman qayta render bo'lmaydi.
 */

import React, { useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import {
    ArrowUpRight,
    CaretLeft,
    DotsThreeVertical,
    PencilSimple,
} from '@phosphor-icons/react';

import { useTranslation } from '../../../context/LanguageContext';
import { clamp01, COLLAPSE_RANGE, HERO_COLORS as C, px, TONES } from './heroTokens';

/** Ekrandagi tartib — chiziq, plitkalar va foizlar bir xil ketma-ketlikda. */
const ORDER = ['toza', 'qarzdor', 'yozib'];

/** Doira shaklidagi ikonka tugmasi (ortga, menyu, tahrirlash). */
function IconButton({ icon: Icon, label, size = 40, onClick, dark = false }) {
    const idle = dark ? 'rgba(255,255,255,.1)' : 'rgba(23,23,26,.07)';
    const hover = dark ? 'rgba(255,255,255,.2)' : 'rgba(23,23,26,.14)';
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            title={label}
            style={{ width: size, height: size, background: idle, color: dark ? '#fff' : C.dark }}
            onMouseEnter={(e) => { e.currentTarget.style.background = hover; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = idle; }}
            onFocus={(e) => { e.currentTarget.style.background = hover; }}
            onBlur={(e) => { e.currentTarget.style.background = idle; }}
            className="flex-none flex items-center justify-center rounded-full border-0 cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#f2683c] focus-visible:ring-offset-2"
        >
            {Icon && <Icon size={size >= 40 ? 19 : 17} weight="bold" />}
        </button>
    );
}

/**
 * @param {object}   group        — { name, lessonTime, days }
 * @param {object}   summary      — { total, counts, percentages }
 * @param {string}   selected     — tanlangan holat kaliti
 * @param {Function} onSelect     — holat tanlanganda
 * @param {string}   countdown    — tayyor hisoblangan matn
 * @param {Function} onBack/onMenu/onEdit/onTakeAttendance/onOpenFull — amallar
 */
const GroupHero = React.forwardRef(function GroupHero(
    { group, summary, selected, onSelect, countdown, onBack, onMenu, onEdit, onTakeAttendance, onOpenFull },
    ref
) {
    const { t } = useTranslation();

    const stickyRef = useRef(null);
    const cardRef = useRef(null);
    const kickerRef = useRef(null);
    const titleRef = useRef(null);
    const infoRef = useRef(null);
    const pctsRef = useRef(null);
    const barRef = useRef(null);
    const statsRef = useRef(null);

    /**
     * Scroll o'rnini (0…1) o'lchamlarga aylantiradi va DOM ga yozadi.
     * Ota komponent buni har bir scroll kadrida chaqiradi.
     */
    const applyCollapse = useCallback((scrollTop) => {
        const p = clamp01(scrollTop / COLLAPSE_RANGE);
        // Izohlar sarlavhadan ancha oldin yo'qolsin — shuning uchun tezroq so'nadi.
        const fade = Math.max(0, 1 - p * 1.7);

        if (stickyRef.current) {
            stickyRef.current.style.paddingBottom = px(8 + 4 * p);
            stickyRef.current.style.boxShadow = p > 0.02
                ? `0 ${px(10 * p)} ${px(18 * p)} rgba(23,23,26,${(0.09 * p).toFixed(3)})`
                : 'none';
        }
        if (cardRef.current) {
            cardRef.current.style.borderRadius = px(26 - 6 * p);
            cardRef.current.style.padding = `${px(18 - 6 * p)} ${px(18 - 3 * p)} ${px(16 - 6 * p)}`;
        }
        if (kickerRef.current) {
            kickerRef.current.style.height = px(17 * (1 - p));
            kickerRef.current.style.opacity = fade;
        }
        if (titleRef.current) {
            titleRef.current.style.fontSize = px(34 - 14 * p);
            titleRef.current.style.marginTop = px(6 - 6 * p);
        }
        if (pctsRef.current) {
            // Foizlar sarlavha kichrayib bo'lgach paydo bo'ladi, aks holda ustma-ust tushadi.
            const appear = clamp01((p - 0.45) / 0.55);
            pctsRef.current.style.opacity = appear;
            pctsRef.current.style.transform = `translateX(${px(8 * (1 - appear))})`;
        }
        if (infoRef.current) {
            infoRef.current.style.maxHeight = px(62 * (1 - p));
            infoRef.current.style.opacity = fade;
        }
        if (barRef.current) {
            barRef.current.style.marginTop = px(18 - 8 * p);
            barRef.current.style.height = px(12 - 4 * p);
        }
        if (statsRef.current) {
            statsRef.current.style.maxHeight = px(176 * (1 - p));
            statsRef.current.style.opacity = fade;
        }
    }, []);

    useImperativeHandle(ref, () => ({ applyCollapse }), [applyCollapse]);

    // Birinchi chizilishda ham boshlang'ich o'lchamlar qo'yilsin.
    useEffect(() => { applyCollapse(0); }, [applyCollapse]);

    const { counts, percentages } = summary;
    const days = (group.days || []).join(' · ');

    return (
        <div
            ref={stickyRef}
            className="sticky top-0 z-10"
            style={{ background: C.canvas, paddingBottom: 8 }}
        >
            <div className="flex items-center gap-3 px-5 pt-3.5">
                <IconButton icon={CaretLeft} label={t('common.back')} onClick={onBack} />
                <div className="flex-1" />
                <IconButton icon={DotsThreeVertical} label={t('teacher.groupDetail.moreActions')} onClick={onMenu} />
            </div>

            <div
                ref={cardRef}
                className="mx-4 mt-3.5 text-white"
                style={{ background: C.dark, borderRadius: 26, padding: '18px 18px 16px' }}
            >
                <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                        <div ref={kickerRef} className="flex items-center gap-2 overflow-hidden" style={{ height: 17 }}>
                            <span className="flex-none rounded-full" style={{ width: 7, height: 7, background: C.orange }} />
                            <span
                                className="text-[11px] font-semibold uppercase whitespace-nowrap"
                                style={{ letterSpacing: '.12em', color: C.orange }}
                            >
                                {t('teacher.groupDetail.todaysLesson')}
                            </span>
                        </div>

                        {/* Sarlavha va foizlar bir qatorda: foizlar `absolute` bo'lgani
                            uchun paydo bo'lganda sarlavhani surib yubormaydi. */}
                        <div className="relative flex items-baseline w-max max-w-full">
                            <h1
                                ref={titleRef}
                                className="m-0 font-extrabold leading-none whitespace-nowrap text-white"
                                style={{ fontSize: 34, marginTop: 6, letterSpacing: '-.03em' }}
                            >
                                {group.name}
                            </h1>
                            <div
                                ref={pctsRef}
                                aria-hidden="true"
                                className="absolute left-full bottom-px ml-3 flex items-center gap-2.5 whitespace-nowrap pointer-events-none opacity-0"
                            >
                                {ORDER.map((key) => (
                                    <span
                                        key={key}
                                        className="flex items-center gap-1 text-xs font-bold tabular-nums"
                                        style={{ color: TONES[key].pct }}
                                    >
                                        <span className="rounded-full" style={{ width: 6, height: 6, background: TONES[key].dot }} />
                                        {percentages[key]}%
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div ref={infoRef} className="overflow-hidden" style={{ maxHeight: 62 }}>
                            <div className="pt-[7px] text-[13px] font-medium" style={{ color: 'rgba(255,255,255,.55)' }}>
                                {group.lessonTime}{days ? ` · ${days}` : ''}
                            </div>
                            {countdown && (
                                <div
                                    className="mt-2 inline-flex items-center gap-[7px] rounded-full py-[5px] pl-2 pr-[11px]"
                                    style={{ background: 'rgba(242,104,60,.18)' }}
                                >
                                    <span className="rounded-full" style={{ width: 5, height: 5, background: C.orange }} />
                                    <span className="text-xs font-semibold" style={{ color: C.orangeSoft }}>{countdown}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <IconButton icon={PencilSimple} label={t('teacher.groupDetail.editGroup')} size={36} onClick={onEdit} dark />
                </div>

                {/* Nisbat chizig'i — segmentlar tanlov tugmasi ham. Kenglik
                    haqiqiy sonlarga (`flexGrow`) bog'liq, foizga emas. */}
                <div ref={barRef} className="flex gap-[3px]" style={{ marginTop: 18, height: 12 }} role="group" aria-label={t('teacher.groupDetail.distribution')}>
                    {ORDER.map((key) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => onSelect(key)}
                            aria-pressed={selected === key}
                            aria-label={`${t(`teacher.groupDetail.status.${key}`)} — ${counts[key]}`}
                            style={{ flexGrow: counts[key] || 0.001, flexBasis: 0, background: TONES[key].bar }}
                            className="border-0 p-0 rounded-full cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                        />
                    ))}
                </div>

                <div ref={statsRef} className="overflow-hidden" style={{ maxHeight: 176 }}>
                    <div className="grid grid-cols-3 gap-2 pt-3">
                        {ORDER.map((key) => {
                            const tone = TONES[key];
                            const active = selected === key;
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => onSelect(key)}
                                    aria-pressed={active}
                                    style={{ background: tone.tile }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = tone.tileHover; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = tone.tile; }}
                                    className="relative text-left border-0 rounded-2xl px-[11px] py-2.5 cursor-pointer font-[inherit] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                                >
                                    {active && (
                                        <span
                                            aria-hidden="true"
                                            className="absolute inset-0 rounded-2xl pointer-events-none"
                                            style={{ border: `1.5px solid ${tone.ring}` }}
                                        />
                                    )}
                                    <div className="flex items-baseline gap-[5px]">
                                        <span className="text-xl font-extrabold leading-none text-white tabular-nums">{counts[key]}</span>
                                        <span className="text-[11px] font-semibold tabular-nums" style={{ color: 'rgba(255,255,255,.45)' }}>
                                            {percentages[key]}%
                                        </span>
                                    </div>
                                    <div
                                        className="mt-1 text-[10px] font-semibold uppercase truncate"
                                        style={{ letterSpacing: '.06em', color: tone.label }}
                                    >
                                        {t(`teacher.groupDetail.status.${key}`)}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex gap-2 pt-3.5">
                        <button
                            type="button"
                            onClick={onTakeAttendance}
                            style={{ background: C.orange }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = C.orangeDeep; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = C.orange; }}
                            className="flex-1 border-0 rounded-full text-white font-[inherit] text-sm font-bold px-4 py-[13px] cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                        >
                            {t('teacher.groupDetail.takeAttendance')}
                        </button>
                        <IconButton icon={ArrowUpRight} label={t('teacher.groupDetail.openFull')} size={46} onClick={onOpenFull} dark />
                    </div>
                </div>
            </div>
        </div>
    );
});

export default GroupHero;
