/**
 * Javob berish sahnasi.
 *
 * Chap tomonda — xona: tirik yorug'lik, savol va bitta katta tugma.
 * Savol sahnadagi eng katta narsa, qolgan hamma narsa uning atrofida
 * sokin turadi.
 *
 * O'ng tomonda — rail: gapirish paytida kerak bo'ladigan, lekin diqqatni
 * tortmasligi kerak bo'lgan narsalar (ohang, cue card, qaydlar, hisob).
 *
 * Butun funksional yuk `useSpeakingSession` da qoladi — bu komponent
 * faqat holatni ko'rsatadi va uch xil signalni qaytaradi: boshlash,
 * to'xtatish, qayta yuborish.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    Microphone,
    Stop,
    SpinnerGap,
    Warning,
    SpeakerHigh,
    SpeakerSlash,
    ArrowClockwise,
    PencilSimple,
    ArrowLeft,
} from '@phosphor-icons/react';

import VoiceOrb from './VoiceOrb';
import ToneSelector from './ToneSelector';
import {
    StageLabel,
    StageButton,
    Rail,
    RailTop,
    RailBody,
    RailBottom,
    BandBar,
    Pip,
    formatTime,
    statusDot,
    EMBER,
} from './stage';

const PART_LABEL = {
    1: 'Part 1',
    2: 'Part 2 · Cue card',
    3: 'Part 3',
};

/** Part 2 da imtihonda beriladigan tayyorgarlik vaqti (sekund). */
const PREP_SECONDS = 60;

const TEXT = {
    uz: {
        listen: 'Savolni eshitish',
        stopListen: "To'xtatish",
        prepTitle: 'Tayyorgarlik',
        prepHint: 'Bir daqiqa o‘ylang va qisqa reja yozing — imtihondagidek.',
        prepStart: 'Tayyorgarlikni boshlash',
        prepSkip: 'Tayyorman, boshlaymiz',
        notes: 'Qaydlar (faqat sizga ko‘rinadi)',
        notesPlaceholder: 'kim / qachon / nima qildi / nega muhim',
        idle: 'Bosing va gapiring',
        idleHint: 'shoshilmang — tayyor bo‘lganda',
        recordingCta: 'To‘xtatish va baholash',
        recordingHint: 'gapirib bo‘lgach bosing',
        processing: 'Javobingiz tinglanmoqda...',
        retry: 'O‘sha yozuvni qayta yuborish',
        retryHint: 'Qaytadan gapirish shart emas — yozuvingiz saqlanib turibdi.',
        quota: (used, limit) => `Bugun ${used} / ${limit} javob`,
        micQuiet: 'Ovoz juda past — mikrofonga yaqinroq',
        statusIdle: 'Tayyor',
        statusRecording: 'Tinglanyapti',
        statusProcessing: 'Baholanyapti',
        statusPrep: 'Tayyorgarlik',
        railTitle: 'Bu suhbat',
        hints: {
            1: 'Ikki-uch gap yetarli. Avval aniq javob, keyin bitta sabab — shu Part 1 uchun to‘liq javob.',
            2: 'Ikki daqiqagacha gapiring. Qaydlaringizdagi tartibda boring va oxirida nega bu muhimligini ayting.',
            3: 'Bu — muhokama. Fikringizni ayting, keyin misol yoki qarama-qarshi tomonni qo‘shing.',
        },
        cueCard: 'Nimalarni aytish kerak',
        tone: 'Suhbatdosh',
        runningBand: 'Hozirgi band',
        noBandYet: 'Birinchi javobdan keyin ko‘rinadi',
        answered: (n) => `${n} ta javob baholandi`,
        back: 'Chiqish',
    },
    en: {
        listen: 'Hear the question',
        stopListen: 'Stop',
        prepTitle: 'Preparation',
        prepHint: 'Take one minute to plan — exactly like the real exam.',
        prepStart: 'Start preparation',
        prepSkip: 'I am ready, start',
        notes: 'Notes (only you see these)',
        notesPlaceholder: 'who / when / what happened / why it matters',
        idle: 'Tap and talk',
        idleHint: 'no rush — whenever you are ready',
        recordingCta: 'Stop & get feedback',
        recordingHint: 'tap again when you finish',
        processing: 'Listening to your answer...',
        retry: 'Send the same recording again',
        retryHint: 'No need to speak again — your recording is still here.',
        quota: (used, limit) => `Today ${used} / ${limit} answers`,
        micQuiet: 'Very quiet — move closer to the mic',
        statusIdle: 'Ready',
        statusRecording: 'Listening',
        statusProcessing: 'Scoring',
        statusPrep: 'Preparing',
        railTitle: 'This exchange',
        hints: {
            1: 'Two or three sentences is plenty. Give a direct answer, then one reason — that is a full Part 1 answer.',
            2: 'Speak for up to two minutes. Follow the order in your notes and finish with why it mattered.',
            3: 'This is a discussion. State your view, then add an example or the other side of it.',
        },
        cueCard: 'You should say',
        tone: 'Talking to',
        runningBand: 'Band so far',
        noBandYet: 'Appears after your first answer',
        answered: (n) => `${n} answer${n === 1 ? '' : 's'} scored`,
        back: 'Leave',
    },
};

const CRITERIA = [
    { key: 'fluency', label: 'Fluency' },
    { key: 'lexical', label: 'Lexis' },
    { key: 'grammar', label: 'Grammar' },
    { key: 'pronunciation', label: 'Pronunciation' },
];

/**
 * @param {object} props
 * @param {{ id: string, text: string, part?: 1|2|3, cueCard?: string }} props.question
 * @param {'idle'|'recording'|'processing'|'done'|'error'} props.status
 * @param {number} props.elapsed
 * @param {number} props.maxSeconds
 * @param {string} [props.error]
 * @param {string} props.mode - feedback ohangi
 * @param {'uz'|'en'} [props.lang]
 * @param {number} [props.level] - mikrofon darajasi (0..1)
 * @param {number} props.index - joriy savol tartibi (0 dan)
 * @param {number} props.total - jami savollar
 * @param {object|null} [props.runningBands] - shu paytgacha yig'ilgan o'rtacha
 * @param {number} [props.answeredCount]
 * @param {boolean} [props.canRetry]
 * @param {boolean} [props.isQuestionPlaying]
 * @param {{ used: number, limit: number }} [props.quota]
 * @param {() => void} [props.onExit]
 * @param {(mode: string) => void} props.onModeChange
 * @param {() => void} props.onStart
 * @param {() => void} props.onStop
 * @param {() => void} [props.onRetry]
 * @param {() => void} [props.onPlayQuestion]
 * @param {() => void} [props.onStopQuestion]
 */
export default function StageRecorder({
    question,
    status,
    elapsed,
    maxSeconds,
    error,
    mode,
    lang = 'uz',
    level = 0,
    index = 0,
    total = 1,
    runningBands = null,
    answeredCount = 0,
    canRetry = false,
    isQuestionPlaying = false,
    quota,
    onExit,
    onModeChange,
    onStart,
    onStop,
    onRetry,
    onPlayQuestion,
    onStopQuestion,
}) {
    const t = TEXT[lang] || TEXT.uz;
    const isRecording = status === 'recording';
    const isProcessing = status === 'processing';

    // Part 2 tayyorgarligi: 1 daqiqa o'ylash + qaydlar. Real imtihonda bu
    // vaqt beriladi, shusiz Part 2 mashqi imtihondan ancha qiyin bo'lib qoladi.
    const needsPrep = question.part === 2;
    // Tayyorgarlik tugash payti (timestamp) — sanoq shundan hisoblanadi,
    // ya'ni taymer bir tik o'tkazib yuborsa ham vaqt siljib ketmaydi.
    const [prepEndsAt, setPrepEndsAt] = useState(null);
    const [prepLeft, setPrepLeft] = useState(null);
    const [notes, setNotes] = useState('');

    // Savol almashganda tayyorgarlik va qaydlar tozalanadi. Effekt emas,
    // render paytidagi tiklash — effektda setState qo'shimcha render beradi.
    const [prevQuestionId, setPrevQuestionId] = useState(question.id);
    if (question.id !== prevQuestionId) {
        setPrevQuestionId(question.id);
        setPrepEndsAt(null);
        setPrepLeft(null);
        setNotes('');
    }

    useEffect(() => {
        if (!prepEndsAt) return undefined;
        const interval = setInterval(() => {
            const left = Math.ceil((prepEndsAt - Date.now()) / 1000);
            if (left > 0) {
                setPrepLeft(left);
                return;
            }
            // Vaqt tugadi — imtihondagidek, javob o'zi boshlanadi.
            setPrepEndsAt(null);
            setPrepLeft(null);
            onStart();
        }, 250);
        return () => clearInterval(interval);
    }, [prepEndsAt, onStart]);

    const startPrep = useCallback(() => {
        setPrepEndsAt(Date.now() + PREP_SECONDS * 1000);
        setPrepLeft(PREP_SECONDS);
    }, []);

    const skipPrep = useCallback(() => {
        setPrepEndsAt(null);
        setPrepLeft(null);
        onStart();
    }, [onStart]);

    const isPreparing = prepLeft !== null;
    const orbMode = isRecording ? 'user' : isProcessing ? 'ai' : 'idle';
    const statusText = isRecording
        ? t.statusRecording
        : isProcessing
          ? t.statusProcessing
          : isPreparing
            ? t.statusPrep
            : t.statusIdle;
    // Vaqt: yozuv paytida sanoq, tayyorgarlikda qolgan vaqt.
    const clock = isRecording
        ? `${formatTime(elapsed)} / ${formatTime(maxSeconds)}`
        : isPreparing
          ? formatTime(prepLeft)
          : formatTime(maxSeconds);

    return (
        <div className="grid lg:grid-cols-[1.34fr_.66fr] min-h-0 h-full bg-[#0B0806]">
            {/* ——— Sahna ——— */}
            <div
                className="relative flex flex-col min-h-[560px] lg:min-h-0 overflow-hidden"
                style={{
                    background:
                        'radial-gradient(115% 100% at 38% 22%,#2E2016 0%,#150F0A 56%,#0A0705 100%)',
                }}
            >
                <VoiceOrb mode={orbMode} level={isRecording ? level : undefined} />
                {/* Yorug'lik matn ostida qolishi uchun — yuqori va pastda qorayadi. */}
                <div
                    aria-hidden="true"
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background:
                            'linear-gradient(180deg,rgba(10,7,5,.6) 0%,transparent 24%,transparent 44%,rgba(10,7,5,.9) 100%)',
                    }}
                />

                {/* Yuqori qator */}
                <div className="relative flex items-center justify-between gap-3 px-5 sm:px-7 py-[22px]">
                    <div className="flex items-center gap-3 min-w-0">
                        {onExit && (
                            <button
                                type="button"
                                onClick={onExit}
                                aria-label={t.back}
                                className="shrink-0 w-9 h-9 grid place-items-center rounded-full border border-white/[0.13] bg-white/[0.05] text-white/80 hover:bg-white/[0.14] transition-colors"
                            >
                                <ArrowLeft size={16} />
                            </button>
                        )}
                        <span className="hidden sm:block text-[12.5px] text-white/50 truncate">
                            {PART_LABEL[question.part] || PART_LABEL[1]}
                        </span>
                    </div>

                    {/* Qayerdaligi — foiz emas, chiziqchalar. "Test topshirilyapti"
                        degan bosimni bermaydi. */}
                    {/* To'liq mockda savol ko'p bo'lishi mumkin — chiziqchalar
                        qatorga sig'ishi uchun qisqaradi, o'ralib ketmaydi. */}
                    <div className="flex items-center gap-[7px] flex-1 justify-center max-w-[280px] mx-2">
                        {Array.from({ length: total }).map((_, i) => (
                            <span
                                key={i}
                                className="h-[3px] flex-1 max-w-[26px] min-w-[6px] rounded-full transition-colors duration-500"
                                style={{
                                    background:
                                        i < index
                                            ? 'rgba(240,137,74,.45)'
                                            : i === index
                                              ? EMBER
                                              : 'rgba(255,255,255,.15)',
                                }}
                            />
                        ))}
                    </div>

                    <div className="flex items-center gap-[9px] rounded-full border border-white/[0.11] bg-white/[0.05] px-[13px] py-[7px]">
                        <span
                            className={`w-[7px] h-[7px] rounded-full ${isRecording ? 'animate-pulse' : ''}`}
                            style={{ background: statusDot(orbMode) }}
                        />
                        <span className="font-mono text-[12px] text-white/60 tabular-nums">
                            {clock}
                        </span>
                    </div>
                </div>

                {/* Savol — ekrandagi eng katta narsa. Serif shrift topshiriqni
                    "test savoli" emas, aytilgan gap kabi ko'rsatadi. */}
                <div className="relative mt-auto px-5 sm:px-11 grid gap-4">
                    <div className="flex items-center gap-[11px] flex-wrap">
                        <span className="w-[22px] h-px bg-[#F0A165]/70" />
                        <StageLabel tone="ember">
                            {PART_LABEL[question.part] || PART_LABEL[1]} · {index + 1}/{total}
                        </StageLabel>
                        <StageLabel>{statusText}</StageLabel>
                    </div>
                    <h2 className="font-serif-display font-normal text-[clamp(28px,4.4vw,44px)] leading-[1.1] text-white/[0.97] max-w-[640px] text-pretty">
                        {question.text}
                    </h2>
                </div>

                {/* Boshqaruv */}
                <div className="relative px-5 sm:px-11 pt-7 pb-8 sm:pb-9 grid gap-3.5">
                    {/* PART 2 — tayyorgarlik. Sahnada turadi, chunki bu ham
                        javobning bir qismi. */}
                    {needsPrep && isPreparing && (
                        <div className="rounded-2xl border border-white/[0.1] bg-black/30 backdrop-blur-md p-4 max-w-[560px]">
                            <div className="flex items-center justify-between gap-3">
                                <StageLabel>{t.notes}</StageLabel>
                                <span
                                    className="text-[15px] font-medium tabular-nums"
                                    style={{ color: EMBER }}
                                >
                                    {formatTime(prepLeft)}
                                </span>
                            </div>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                                placeholder={t.notesPlaceholder}
                                className="mt-2.5 w-full rounded-xl border border-white/[0.12] bg-white/[0.04] p-3 text-[13px] leading-relaxed text-white/90 placeholder:text-white/25 outline-none focus:border-[#F0894A]/60 resize-none"
                            />
                        </div>
                    )}

                    {/* Qaydlar javob paytida ham ko'rinib turadi — imtihonda
                        qog'oz qo'lda qoladi. */}
                    {needsPrep && notes && isRecording && (
                        <div className="rounded-2xl border border-white/[0.09] bg-white/[0.04] p-3.5 max-w-[560px]">
                            <p className="text-[12.5px] leading-relaxed text-white/70 whitespace-pre-line">
                                {notes}
                            </p>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-start gap-2.5 rounded-2xl border border-[#E2564A]/30 bg-[#E2564A]/10 p-3.5 max-w-[560px]">
                            <Warning size={16} weight="fill" className="shrink-0 mt-0.5 text-[#FF9C8F]" />
                            <p className="text-xs leading-relaxed text-[#FFB3A8]">{error}</p>
                        </div>
                    )}

                    {/* Tarmoq uzilsa yoki server xato bersa — yozuv saqlanib
                        turadi, o'quvchi 2 daqiqalik javobini qaytadan gapirmaydi. */}
                    {canRetry && onRetry && (
                        <div className="max-w-[560px]">
                            <StageButton onClick={onRetry} className="w-full">
                                <ArrowClockwise size={15} weight="bold" />
                                {t.retry}
                            </StageButton>
                            <p className="mt-2 text-[11px] text-white/35">{t.retryHint}</p>
                        </div>
                    )}

                    <div className="flex items-center gap-3 flex-wrap">
                        {/* PART 2 — tayyorgarlikni boshlash. Yozuv tugmasi o'rniga
                            turadi: imtihonda ham avval o'ylash, keyin gapirish. */}
                        {needsPrep && status === 'idle' && !isPreparing ? (
                            <button
                                type="button"
                                onClick={startPrep}
                                className="flex items-center gap-3 rounded-full bg-white/[0.08] hover:bg-white/[0.15] py-1.5 pl-1.5 pr-6 transition-colors"
                            >
                                <span className="w-[50px] h-[50px] rounded-full grid place-items-center border border-white/20 text-white/85">
                                    <PencilSimple size={20} />
                                </span>
                                <span className="grid gap-0.5 text-left">
                                    <span className="text-[13.5px] font-medium text-white">
                                        {t.prepStart}
                                    </span>
                                    <span className="text-[11px] text-white/45">{t.prepHint}</span>
                                </span>
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={isRecording ? onStop : onStart}
                                disabled={isProcessing}
                                aria-label={isRecording ? t.recordingCta : t.idle}
                                className="flex items-center gap-3 rounded-full bg-white/[0.08] hover:bg-white/[0.15] py-1.5 pl-1.5 pr-6 transition-colors disabled:opacity-60 disabled:pointer-events-none"
                            >
                                <span
                                    className="relative w-[50px] h-[50px] rounded-full grid place-items-center text-white"
                                    style={{
                                        background:
                                            'radial-gradient(120% 120% at 30% 22%,#FFD494,#E9591F 74%)',
                                        boxShadow: '0 8px 24px rgba(233,89,31,.45)',
                                    }}
                                >
                                    {isProcessing ? (
                                        <SpinnerGap size={22} weight="bold" className="animate-spin" />
                                    ) : isRecording ? (
                                        <Stop size={18} weight="fill" />
                                    ) : (
                                        <Microphone size={22} weight="fill" />
                                    )}
                                </span>
                                <span className="grid gap-0.5 text-left">
                                    <span className="text-[13.5px] font-medium text-white">
                                        {isProcessing
                                            ? t.processing
                                            : isRecording
                                              ? t.recordingCta
                                              : isPreparing
                                                ? t.prepSkip
                                                : t.idle}
                                    </span>
                                    <span className="text-[11px] text-white/45">
                                        {isRecording ? (
                                            level < 0.05 ? (
                                                <span className="text-[#FFC891]">{t.micQuiet}</span>
                                            ) : (
                                                t.recordingHint
                                            )
                                        ) : (
                                            t.idleHint
                                        )}
                                    </span>
                                </span>
                            </button>
                        )}

                        {/* Savolni examiner ovozida eshitish — suhbatda savol
                            qog'ozda emas, quloqqa keladi. */}
                        {onPlayQuestion && !isRecording && (
                            <StageButton onClick={isQuestionPlaying ? onStopQuestion : onPlayQuestion}>
                                {isQuestionPlaying ? (
                                    <SpeakerSlash size={14} />
                                ) : (
                                    <SpeakerHigh size={14} />
                                )}
                                {isQuestionPlaying ? t.stopListen : t.listen}
                            </StageButton>
                        )}

                        {isPreparing && (
                            <StageButton onClick={skipPrep}>{t.prepSkip}</StageButton>
                        )}
                    </div>
                </div>
            </div>

            {/* ——— Rail ——— */}
            <Rail>
                <RailTop className="flex items-center justify-between gap-3">
                    <StageLabel>{t.railTitle}</StageLabel>
                    {quota && (
                        <span className="text-[11.5px] text-white/30 tabular-nums">
                            {t.quota(quota.used, quota.limit)}
                        </span>
                    )}
                </RailTop>

                <RailBody>
                    {/* Shu qism uchun bitta maslahat. Javob paytida ekranda
                        boshqa o'qiladigan narsa yo'q — o'quvchi savolga
                        qaraydi, bu esa chekkada turadi. */}
                    <div className="grid grid-cols-[auto_1fr] gap-3">
                        <Pip tone="ember" className="w-6 h-6 mt-0.5">
                            C
                        </Pip>
                        <p className="text-[14px] leading-[1.62] text-white/45">
                            {t.hints[question.part] || t.hints[1]}
                        </p>
                    </div>

                    {/* Ohang javobdan oldin tanlanadi — yozuv boshlangach
                        o'zgartirish diqqatni bo'ladi. */}
                    {onModeChange && status === 'idle' && !isPreparing && (
                        <div className="grid gap-2.5">
                            <StageLabel>{t.tone}</StageLabel>
                            <ToneSelector mode={mode} lang={lang} onChange={onModeChange} onStage />
                        </div>
                    )}

                    {question.cueCard && (
                        <div className="grid gap-2.5">
                            <StageLabel>{t.cueCard}</StageLabel>
                            <p className="text-[13.5px] leading-[1.62] text-white/72 whitespace-pre-line">
                                {question.cueCard}
                            </p>
                        </div>
                    )}

                    {isRecording && (
                        <div className="grid gap-2.5">
                            <StageLabel>{t.statusRecording}</StageLabel>
                            {/* Mikrofon darajasi — ovoz olinayotgani sahnadan
                                tashqarida ham ko'rinib tursin. */}
                            <div className="h-1 rounded-full bg-white/[0.09] overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-[width] duration-100 ease-out"
                                    style={{
                                        width: `${Math.min(100, Math.round(level * 160))}%`,
                                        background: EMBER,
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </RailBody>

                <RailBottom>
                    <div className="flex items-end justify-between gap-3">
                        <div className="grid gap-0.5">
                            <StageLabel>{t.runningBand}</StageLabel>
                            <span className="font-serif-display text-[40px] leading-[1.1] text-white tabular-nums">
                                {runningBands ? runningBands.overall.toFixed(1) : '—'}
                            </span>
                        </div>
                        <span className="text-[11.5px] text-white/35 pb-2">
                            {runningBands ? t.answered(answeredCount) : t.noBandYet}
                        </span>
                    </div>

                    {runningBands && (
                        <div className="grid gap-2">
                            {CRITERIA.slice(0, 3).map(({ key, label }) => (
                                <BandBar key={key} label={label} band={runningBands[key]} />
                            ))}
                        </div>
                    )}

                    {!runningBands && (
                        <div className="flex items-center gap-2.5 text-[12.5px] text-white/40">
                            <Pip tone="ember" className="w-5 h-5">
                                {index + 1}
                            </Pip>
                            {t.idleHint}
                        </div>
                    )}
                </RailBottom>
            </Rail>
        </div>
    );
}
