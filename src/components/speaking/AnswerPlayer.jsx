/**
 * O'quvchining o'z javobini eshitishi uchun pleyer.
 *
 * Brauzerning `<audio controls>` elementi har platformada boshqacha
 * ko'rinadi va sahnaning qorong'i, iliq muhitiga umuman tushmaydi —
 * shuning uchun boshqaruv shu yerda qo'lda yig'ilgan: bitta play tugmasi,
 * bosib bo'ladigan chiziq va vaqt. Ortiqcha tugma yo'q, chunki bu yerda
 * o'quvchiga faqat bitta ish kerak — o'zini eshitish.
 *
 * `stage` — qorong'i sahna uchun (cho'g' rangli chiziq).
 * `inline` — tarix ro'yxati uchun: kichikroq va ikkala mavzuga moslashadi.
 */

import React, { useCallback, useRef, useState } from 'react';
import { Play, Pause } from '@phosphor-icons/react';

import { formatTime } from './stage';

const TEXT = {
    uz: { transcript: 'matnni o‘qish', hide: 'matnni yopish' },
    en: { transcript: 'read transcript', hide: 'hide transcript' },
};

/**
 * @param {object} props
 * @param {string} props.src
 * @param {string} [props.transcript] - berilsa, chiziq yonida ochish tugmasi chiqadi
 * @param {number} [props.duration] - ma'lum bo'lsa, metadata yuklanmasdan ko'rsatiladi
 * @param {'stage'|'inline'} [props.variant]
 * @param {'uz'|'en'} [props.lang]
 * @param {string} [props.className]
 */
export default function AnswerPlayer({
    src,
    transcript = '',
    duration: knownDuration,
    variant = 'stage',
    lang = 'uz',
    className = '',
}) {
    const t = TEXT[lang] || TEXT.uz;
    const audioRef = useRef(null);
    const trackRef = useRef(null);

    const [playing, setPlaying] = useState(false);
    const [current, setCurrent] = useState(0);
    const [total, setTotal] = useState(knownDuration || 0);
    const [showText, setShowText] = useState(false);
    const [loadedSrc, setLoadedSrc] = useState(src);

    const stage = variant === 'stage';

    // Yangi yozuv kelganda holat eskisidan qolib ketmasin — reset render
    // paytida bo'ladi, aks holda bir zumga eski vaqt ko'rinib qoladi.
    if (loadedSrc !== src) {
        setLoadedSrc(src);
        setPlaying(false);
        setCurrent(0);
        setTotal(knownDuration || 0);
    }

    const toggle = useCallback(() => {
        const el = audioRef.current;
        if (!el) return;
        if (el.paused) {
            el.play().catch(() => setPlaying(false));
        } else {
            el.pause();
        }
    }, []);

    // Chiziq bo'ylab bosish va sudrash — vaqtni tanlash.
    const seekTo = useCallback(
        (clientX) => {
            const el = audioRef.current;
            const track = trackRef.current;
            if (!el || !track || !total) return;
            const { left, width } = track.getBoundingClientRect();
            const ratio = Math.min(1, Math.max(0, (clientX - left) / width));
            el.currentTime = ratio * total;
            setCurrent(el.currentTime);
        },
        [total],
    );

    const onTrackPointerDown = useCallback(
        (event) => {
            event.preventDefault();
            seekTo(event.clientX);
            const move = (e) => seekTo(e.clientX);
            const up = () => {
                window.removeEventListener('pointermove', move);
                window.removeEventListener('pointerup', up);
            };
            window.addEventListener('pointermove', move);
            window.addEventListener('pointerup', up);
        },
        [seekTo],
    );

    const onKeyDown = useCallback(
        (event) => {
            const el = audioRef.current;
            if (!el) return;
            if (event.key === 'ArrowRight') {
                event.preventDefault();
                el.currentTime = Math.min(total, el.currentTime + 5);
            } else if (event.key === 'ArrowLeft') {
                event.preventDefault();
                el.currentTime = Math.max(0, el.currentTime - 5);
            } else if (event.key === ' ' || event.key === 'Enter') {
                event.preventDefault();
                toggle();
            }
        },
        [total, toggle],
    );

    if (!src) return null;

    const progress = total > 0 ? Math.min(100, (current / total) * 100) : 0;
    const iconSize = stage ? 15 : 13;

    const shell = stage
        ? 'gap-3.5 rounded-2xl border border-white/[0.09] bg-white/[0.04] px-3.5 py-3'
        : 'gap-2.5 rounded-xl border border-warm-hairline-soft dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.04] px-2.5 py-2';

    const button = stage
        ? 'w-[38px] h-[38px] text-white/85 bg-white/[0.08] hover:bg-white/[0.16] border border-white/[0.1]'
        : 'w-8 h-8 text-warm-ink dark:text-white/85 bg-black/[0.04] dark:bg-white/[0.08] hover:bg-black/[0.08] dark:hover:bg-white/[0.16] border border-warm-hairline-soft dark:border-white/[0.1]';

    const trackBg = stage ? 'bg-white/[0.13]' : 'bg-black/[0.09] dark:bg-white/[0.13]';
    const fill = stage ? '#F0894A' : '#cc785c';
    const timeText = stage ? 'text-white/45' : 'text-warm-muted dark:text-white/45';
    const quietText = stage
        ? 'text-white/50 hover:text-white/80'
        : 'text-warm-muted hover:text-warm-ink dark:text-white/50 dark:hover:text-white/80';

    return (
        <div className={`grid gap-2 ${className}`}>
            <div className={`flex items-center ${shell}`}>
                <audio
                    ref={audioRef}
                    src={src}
                    preload="metadata"
                    onLoadedMetadata={(e) => {
                        // MediaRecorder yozuvlarida davomiylik ba'zan Infinity
                        // bo'lib keladi — bunda tashqaridan berilgani ishonchliroq.
                        const value = e.currentTarget.duration;
                        if (Number.isFinite(value) && value > 0) setTotal(value);
                    }}
                    onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                    onEnded={() => {
                        setPlaying(false);
                        setCurrent(0);
                    }}
                    className="hidden"
                />

                <button
                    type="button"
                    onClick={toggle}
                    aria-label={playing ? 'Pause' : 'Play'}
                    className={`shrink-0 grid place-items-center rounded-full transition-colors ${button}`}
                >
                    {playing ? (
                        <Pause size={iconSize} weight="fill" />
                    ) : (
                        <Play size={iconSize} weight="fill" className="translate-x-[1px]" />
                    )}
                </button>

                <div
                    ref={trackRef}
                    role="slider"
                    tabIndex={0}
                    aria-label="Seek"
                    aria-valuemin={0}
                    aria-valuemax={Math.round(total)}
                    aria-valuenow={Math.round(current)}
                    onPointerDown={onTrackPointerDown}
                    onKeyDown={onKeyDown}
                    className="group relative flex-1 min-w-0 h-4 flex items-center cursor-pointer touch-none outline-none"
                >
                    <div className={`h-[3px] w-full rounded-full overflow-hidden ${trackBg}`}>
                        <div
                            className="h-full rounded-full"
                            style={{ width: `${progress}%`, background: fill }}
                        />
                    </div>
                    <span
                        aria-hidden="true"
                        className="absolute -translate-x-1/2 w-[9px] h-[9px] rounded-full opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity"
                        style={{ left: `${progress}%`, background: fill }}
                    />
                </div>

                <span className={`shrink-0 font-mono text-[11.5px] tabular-nums ${timeText}`}>
                    {formatTime(current)} / {formatTime(total)}
                </span>

                {transcript && (
                    <>
                        <span
                            aria-hidden="true"
                            className={`shrink-0 w-px h-4 ${stage ? 'bg-white/[0.12]' : 'bg-black/[0.08] dark:bg-white/[0.12]'}`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowText((prev) => !prev)}
                            aria-expanded={showText}
                            className={`shrink-0 text-[11.5px] transition-colors ${quietText}`}
                        >
                            {showText ? t.hide : t.transcript}
                        </button>
                    </>
                )}
            </div>

            {transcript && showText && (
                <p
                    className={`text-[13px] leading-[1.7] ${stage ? 'text-white/60' : 'text-warm-body dark:text-warm-on-dark-soft'}`}
                >
                    {transcript}
                </p>
            )}
        </div>
    );
}
