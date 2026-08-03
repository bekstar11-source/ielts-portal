/**
 * Javobdan keyingi holat — coach nima deganini o'sha sahnaning o'zida
 * ko'rsatadi.
 *
 * Muhim qaror: baho o'quvchini boshqa ekranga olib chiqmaydi. Savol qayerda
 * turgan bo'lsa, javob ham o'sha yerda — shu sababli o'quvchi "test tugadi,
 * endi natija" emas, "suhbat davom etyapti" hissida qoladi.
 *
 * Chapda — coachning gapi (eng katta narsa), o'z yozuvi va ikkita yo'l:
 * tuzatish bilan qayta javob berish yoki keyingi savol.
 * O'ngda — raqamlar: band, mezonlar, bitta tuzatish, saqlab qolishga
 * arziydigan iboralar. Batafsil o'lchovlar shu yerda, lekin yopiq holatda —
 * ular kerak bo'lganda ochiladi, birinchi qarashda diqqatni bo'lmaydi.
 */

import React, { useState } from 'react';
import {
    SpeakerHigh,
    SpeakerSlash,
    ArrowClockwise,
    ArrowRight,
    ArrowLeft,
    CaretDown,
} from '@phosphor-icons/react';

import VoiceOrb from './VoiceOrb';
import AnswerPlayer from './AnswerPlayer';
import ToneSelector from './ToneSelector';
import {
    StageLabel,
    StageButton,
    EmberButton,
    Rail,
    RailTop,
    RailBody,
    RailBottom,
    BandBar,
    KeepChip,
    WatchChip,
    Pip,
    formatTime,
    EMBER_LIGHT,
    SAGE,
} from './stage';

const CRITERIA = [
    { key: 'fluency', label: 'Fluency' },
    { key: 'lexical', label: 'Lexis' },
    { key: 'grammar', label: 'Grammar' },
    { key: 'pronunciation', label: 'Pronunciation' },
];

const TEXT = {
    uz: {
        captured: 'Javob qabul qilindi',
        status: 'Baholandi',
        coachSays: 'Coach aytadi',
        writing: 'Shu ohangda yozilmoqda...',
        yourAnswer: 'Sizning javobingiz',
        yourAnswerHint:
            "Feedbackni o'qib turib o'zingizni eshiting — duduqlanish va urg'uni eshitib sezasiz.",
        listen: 'Eshitish',
        stop: "To'xtatish",
        speaking: "Ovozda o'qilmoqda...",
        replay: 'Qayta eshitish',
        answerAgain: 'Tuzatish bilan qayta javob berish',
        next: 'Keyingi savol',
        finish: 'Suhbatni yakunlash',
        thisAnswer: 'Shu javob',
        fix: 'Bitta tuzatiladigan narsa',
        keep: 'Saqlab qoling',
        details: 'Batafsil',
        metrics: "O'lchangan ko'rsatkichlar",
        wpm: 'so‘z/daqiqa',
        words: 'so‘z',
        fillers: 'ortiqcha tovush',
        pauses: 'uzun pauza',
        metricsHint: 'Bular ball emas. Tabiiy nutq odatda daqiqasiga 120-160 so‘z.',
        vocabulary: 'Band 7 uchun iboralar',
        instead: 'o‘rniga',
        corrections: 'Tuzatishlar',
        transcript: 'Siz aytgan matn',
        session: 'Suhbat',
        followUp: 'Imtihonchining keyingi savoli',
        tone: 'Ohang',
    },
    en: {
        captured: 'Answer captured',
        status: 'Scored',
        coachSays: 'Coach says',
        writing: 'Writing it in this voice...',
        yourAnswer: 'Your answer',
        yourAnswerHint:
            'Listen back while you read — hesitation and stress are easier to hear than to read about.',
        listen: 'Play',
        stop: 'Stop',
        speaking: 'Playing...',
        replay: 'Play again',
        answerAgain: 'Answer again with the fix',
        next: 'Next question',
        finish: 'Finish the conversation',
        thisAnswer: 'This answer',
        fix: 'One thing to fix',
        keep: 'Worth keeping',
        details: 'Details',
        metrics: 'Measured',
        wpm: 'words/min',
        words: 'words',
        fillers: 'fillers',
        pauses: 'long pauses',
        metricsHint: 'These are observations, not scores. Natural speech runs at 120-160 wpm.',
        vocabulary: 'Phrases for band 7',
        instead: 'instead of',
        corrections: 'Corrections',
        transcript: 'What you said',
        session: 'Session',
        followUp: "Examiner's follow-up",
        tone: 'Voice',
    },
};

/** Bitta o'lchov — raqam va u nimani anglatishi. */
function Metric({ value, label, warn = false }) {
    return (
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-2.5">
            <p
                className="text-[17px] font-medium tabular-nums"
                style={{ color: warn ? '#FFC891' : '#fff' }}
            >
                {value}
            </p>
            <p className="text-[10px] leading-tight text-white/40">{label}</p>
        </div>
    );
}

/** Rail dagi yopiladigan bo'lim. */
function Fold({ label, children }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="grid gap-2.5">
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className="flex items-center justify-between gap-3 text-left"
            >
                <StageLabel>{label}</StageLabel>
                <CaretDown
                    size={13}
                    className={`text-white/35 transition-transform ${open ? 'rotate-180' : ''}`}
                />
            </button>
            {open && children}
        </div>
    );
}

/**
 * @param {object} props
 * @param {object} props.evaluation - useSpeakingSession dan
 * @param {string} props.mode
 * @param {'uz'|'en'} [props.lang]
 * @param {boolean} props.isSpeaking
 * @param {boolean} [props.isFeedbackLoading]
 * @param {string} [props.feedbackError]
 * @param {string} [props.ttsError]
 * @param {string} [props.answerAudioUrl]
 * @param {number} [props.duration] - javob uzunligi (sekund)
 * @param {number} props.index
 * @param {number} props.total
 * @param {Array<{ id: string, text: string }>} [props.upcoming] - keyingi savollar
 * @param {number|null} [props.delta] - oldingi javobga nisbatan farq
 * @param {boolean} [props.isLast]
 * @param {() => void} [props.onExit]
 * @param {(question: string) => void} [props.onFollowUp]
 * @param {(mode: string) => void} props.onModeChange
 * @param {() => void} props.onReplay
 * @param {() => void} props.onStopSpeaking
 * @param {() => void} [props.onNext]
 */
export default function StageVerdict({
    evaluation,
    mode,
    lang = 'uz',
    isSpeaking,
    isFeedbackLoading = false,
    feedbackError = '',
    ttsError,
    answerAudioUrl,
    duration,
    index = 0,
    total = 1,
    upcoming = [],
    delta = null,
    isLast = false,
    onExit,
    onFollowUp,
    onModeChange,
    onReplay,
    onStopSpeaking,
    onNext,
}) {
    const t = TEXT[lang] || TEXT.uz;
    const {
        bands,
        evidence,
        feedback,
        transcript,
        corrections,
        vocabulary,
        metrics,
        followUp,
    } = evaluation;

    // "Bitta tuzatiladigan narsa" — birinchi tuzatish, bo'lmasa eng past
    // mezonning dalili. Ro'yxatning qolgani pastda, yopiq holatda.
    const lowest = [...CRITERIA].sort((a, b) => (bands[a.key] || 0) - (bands[b.key] || 0))[0];
    const topFix = corrections?.[0] || null;

    return (
        <div className="grid lg:grid-cols-[1.34fr_.66fr] min-h-0 h-full bg-[#0B0806]">
            {/* ——— Sahna ——— */}
            <div
                className="relative flex flex-col min-h-[560px] lg:min-h-0 overflow-hidden"
                style={{
                    background:
                        'radial-gradient(115% 100% at 40% 26%,#2A1D14 0%,#140E0A 58%,#0A0705 100%)',
                }}
            >
                {/* Sahna endi sokinroq: gapirish tugadi, yorug'lik ham pasaydi. */}
                <VoiceOrb mode="ai" intensity={0.6} />
                <div
                    aria-hidden="true"
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background:
                            'linear-gradient(180deg,rgba(10,7,5,.58) 0%,transparent 26%,rgba(10,7,5,.92) 100%)',
                    }}
                />
                {/* Coachning gapi uzun bo'lishi mumkin — chap tomonda yorug'lik
                    biroz pasayadi, aks holda chiziqlar matn ustidan o'tadi. */}
                <div
                    aria-hidden="true"
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background:
                            'linear-gradient(90deg,rgba(10,7,5,.66) 0%,rgba(10,7,5,.3) 42%,transparent 70%)',
                    }}
                />

                <div className="relative flex items-center justify-between gap-3 px-5 sm:px-7 py-[22px]">
                    <div className="flex items-center gap-3 min-w-0">
                        {onExit && (
                            <button
                                type="button"
                                onClick={onExit}
                                aria-label={t.captured}
                                className="shrink-0 w-9 h-9 grid place-items-center rounded-full border border-white/[0.13] bg-white/[0.05] text-white/80 hover:bg-white/[0.14] transition-colors"
                            >
                                <ArrowLeft size={16} />
                            </button>
                        )}
                        <span className="text-[12.5px] text-white/60 truncate">
                            {t.captured}
                            {duration ? ` · ${formatTime(duration)}` : ''}
                        </span>
                    </div>
                    <div className="flex items-center gap-[9px] rounded-full border border-white/[0.11] bg-white/[0.05] px-3.5 py-[7px]">
                        <span className="w-[7px] h-[7px] rounded-full" style={{ background: SAGE }} />
                        <StageLabel tone="bright">{t.status}</StageLabel>
                    </div>
                </div>

                {/* Coachning gapi — ekrandagi eng katta narsa. Raqam emas,
                    aytilgan gap: o'quvchi avval nima qilishini biladi,
                    keyin baholarni ko'radi. */}
                <div className="relative px-5 sm:px-11 pt-8 grid gap-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <StageLabel tone="ember">{t.coachSays}</StageLabel>
                        <ToneSelector
                            variant="inline"
                            mode={mode}
                            lang={lang}
                            onChange={onModeChange}
                            disabled={isFeedbackLoading}
                            onStage
                        />
                    </div>

                    {isFeedbackLoading ? (
                        <div aria-live="polite" aria-busy="true" className="max-w-[660px]">
                            <div className="grid gap-3 animate-pulse">
                                <div className="h-5 rounded-full bg-white/[0.07]" />
                                <div className="h-5 rounded-full bg-white/[0.07] w-[85%]" />
                                <div className="h-5 rounded-full bg-white/[0.07] w-[55%]" />
                            </div>
                            <p className="mt-3.5 text-[11px] text-white/35">{t.writing}</p>
                        </div>
                    ) : (
                        <p className="font-serif-display font-normal text-[clamp(22px,2.7vw,33px)] leading-[1.36] text-white/[0.96] max-w-[660px] text-pretty">
                            {feedback[mode]}
                        </p>
                    )}

                    {feedbackError && (
                        <p className="text-[11px] text-[#FFC891]">{feedbackError}</p>
                    )}

                    <div className="flex items-center gap-2.5 flex-wrap">
                        <button
                            type="button"
                            disabled={isFeedbackLoading}
                            onClick={isSpeaking ? onStopSpeaking : onReplay}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-white/[0.13] bg-white/[0.04] text-xs text-white/70 hover:bg-white/[0.12] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {isSpeaking ? (
                                <>
                                    <SpeakerSlash size={13} weight="fill" />
                                    {t.stop}
                                </>
                            ) : (
                                <>
                                    <SpeakerHigh size={13} weight="fill" />
                                    {t.listen}
                                </>
                            )}
                        </button>
                        {isSpeaking && !ttsError && (
                            <span className="text-[11px] text-white/35">{t.speaking}</span>
                        )}
                        {ttsError && <span className="text-[11px] text-[#FFC891]">{ttsError}</span>}
                    </div>
                </div>

                {/* O'z ovozini eshitish. Feedbackni o'qish bilan o'z ovozini
                    eshitish ikki xil narsa: talaffuz va pauzalarni o'quvchi
                    boshqa hech qanday izohdan emas, aynan shundan tushunadi. */}
                {answerAudioUrl && (
                    <div className="relative mt-auto px-5 sm:px-11 pt-8 grid gap-2.5">
                        <StageLabel>{t.yourAnswer}</StageLabel>
                        <AnswerPlayer
                            src={answerAudioUrl}
                            transcript={transcript}
                            duration={duration}
                            lang={lang}
                            className="max-w-[660px]"
                        />
                        <p className="text-[11px] text-white/30 max-w-[560px]">{t.yourAnswerHint}</p>
                    </div>
                )}

                {/* Ikki yo'l. Follow-up bo'lsa — birinchisi shu, chunki real
                    imtihonda savollar ro'yxatdan emas, aytilgan gapdan o'sadi. */}
                <div className={`relative ${answerAudioUrl ? '' : 'mt-auto'} px-5 sm:px-11 pt-7 pb-8 sm:pb-9 grid gap-3.5`}>
                    {followUp && onFollowUp && (
                        <div className="grid gap-1.5 max-w-[660px]">
                            <StageLabel>{t.followUp}</StageLabel>
                            <p className="font-serif-display text-[19px] leading-snug text-white/85">
                                {followUp}
                            </p>
                        </div>
                    )}
                    <div className="flex items-center gap-3 flex-wrap">
                        {followUp && onFollowUp ? (
                            <>
                                <EmberButton onClick={() => onFollowUp(followUp)}>
                                    {t.answerAgain}
                                </EmberButton>
                                {onNext && (
                                    <StageButton onClick={onNext}>
                                        {isLast ? t.finish : t.next}
                                        <ArrowRight size={14} weight="bold" />
                                    </StageButton>
                                )}
                            </>
                        ) : (
                            onNext && (
                                <EmberButton onClick={onNext}>
                                    {isLast ? t.finish : t.next}
                                    <ArrowRight size={14} weight="bold" />
                                </EmberButton>
                            )
                        )}
                        <StageButton onClick={onReplay} disabled={isFeedbackLoading}>
                            <ArrowClockwise size={14} />
                            {t.replay}
                        </StageButton>
                    </div>
                </div>
            </div>

            {/* ——— Rail ——— */}
            <Rail>
                <RailTop className="grid gap-2">
                    <StageLabel>{t.thisAnswer}</StageLabel>
                    <div className="flex items-end gap-3">
                        <span className="font-serif-display text-[52px] leading-none text-white tabular-nums">
                            {bands.overall.toFixed(1)}
                        </span>
                        {typeof delta === 'number' && delta !== 0 && (
                            <span
                                className="mb-1.5 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11.5px]"
                                style={
                                    delta > 0
                                        ? {
                                            borderColor: 'rgba(78,141,91,.35)',
                                            background: 'rgba(78,141,91,.12)',
                                            color: SAGE,
                                        }
                                        : {
                                            borderColor: 'rgba(255,190,120,.28)',
                                            background: 'rgba(255,190,120,.12)',
                                            color: '#FFC891',
                                        }
                                }
                            >
                                {delta > 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}
                            </span>
                        )}
                    </div>
                </RailTop>

                <RailBody>
                    <div className="grid gap-2.5">
                        {CRITERIA.map(({ key, label }) => (
                            <BandBar key={key} label={label} band={bands[key]} />
                        ))}
                    </div>

                    {/* Bitta tuzatish — ro'yxat emas. Bitta narsani tuzatgan
                        o'quvchi o'ntasini o'qigandan ko'ra ko'proq o'zgaradi. */}
                    {(topFix || evidence?.[lowest.key]) && (
                        <div className="grid gap-2.5">
                            <StageLabel>{t.fix}</StageLabel>
                            <div className="rounded-2xl border border-[#F0894A]/28 bg-[#F0894A]/10 p-3.5 text-[13.5px] leading-[1.6] text-white/82">
                                {topFix ? (
                                    <>
                                        <span className="line-through text-white/40">
                                            {topFix.said}
                                        </span>{' '}
                                        <span style={{ color: EMBER_LIGHT }}>{topFix.better}</span>
                                        {topFix.why && (
                                            <span className="mt-1.5 block text-[12px] text-white/50">
                                                {topFix.why}
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    evidence[lowest.key]
                                )}
                            </div>
                        </div>
                    )}

                    {(vocabulary?.length > 0 || metrics?.fillerCount >= 6) && (
                        <div className="grid gap-2.5">
                            <StageLabel>{t.keep}</StageLabel>
                            <div className="flex flex-wrap gap-[7px]">
                                {vocabulary?.slice(0, 4).map((item, i) => (
                                    <KeepChip key={i}>{item.use}</KeepChip>
                                ))}
                                {/* Ortiqcha tovushlar ko'p bo'lsa — shu yerda,
                                    ijobiylar yonida. Bu ayblov emas, kuzatuv. */}
                                {metrics?.fillerCount >= 6 && (
                                    <WatchChip>
                                        {t.fillers}: {metrics.fillerCount}
                                    </WatchChip>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Batafsili — yopiq. Kerak bo'lganda ochiladi, birinchi
                        qarashda diqqatni bo'lmaydi. */}
                    {metrics && metrics.wordCount > 0 && (
                        <Fold label={t.metrics}>
                            <div className="grid grid-cols-2 gap-2">
                                <Metric
                                    value={metrics.speakingRateWpm}
                                    label={t.wpm}
                                    warn={
                                        metrics.speakingRateWpm < 90 ||
                                        metrics.speakingRateWpm > 190
                                    }
                                />
                                <Metric value={metrics.wordCount} label={t.words} />
                                <Metric
                                    value={metrics.fillerCount}
                                    label={t.fillers}
                                    warn={metrics.fillerCount >= 6}
                                />
                                <Metric
                                    value={metrics.longPauses}
                                    label={t.pauses}
                                    warn={metrics.longPauses >= 3}
                                />
                            </div>
                            <p className="text-[11px] leading-relaxed text-white/35">
                                {t.metricsHint}
                            </p>
                        </Fold>
                    )}

                    {vocabulary?.length > 0 && (
                        <Fold label={t.vocabulary}>
                            <div className="grid gap-3">
                                {vocabulary.map((item, i) => (
                                    <div key={i}>
                                        <div className="flex items-center gap-2 flex-wrap text-[13px]">
                                            <span className="text-white/40">
                                                {t.instead} “{item.instead}”
                                            </span>
                                            <ArrowRight size={12} className="shrink-0 text-white/25" />
                                            <span style={{ color: EMBER_LIGHT }}>{item.use}</span>
                                        </div>
                                        {item.example && (
                                            <p className="mt-1 text-[12px] italic text-white/35">
                                                “{item.example}”
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </Fold>
                    )}

                    {corrections?.length > 0 && (
                        <Fold label={t.corrections}>
                            <div className="grid gap-3">
                                {corrections.map((item, i) => (
                                    <div key={i}>
                                        <div className="flex items-center gap-2 flex-wrap text-[13px]">
                                            <span className="line-through text-white/35">
                                                {item.said}
                                            </span>
                                            <ArrowRight size={12} className="shrink-0 text-white/25" />
                                            <span style={{ color: EMBER_LIGHT }}>{item.better}</span>
                                        </div>
                                        <p className="mt-1 text-[12px] text-white/40">{item.why}</p>
                                    </div>
                                ))}
                            </div>
                        </Fold>
                    )}

                    {/* Matn odatda pleyer yonida ochiladi — ovoz va matn bir
                        joyda turgani ma'noliroq. Yozuv yo'q bo'lsagina (masalan
                        muddati o'tib o'chirilgan) matn shu yerga qaytadi. */}
                    {transcript && !answerAudioUrl && (
                        <Fold label={t.transcript}>
                            <p className="text-[13.5px] leading-[1.68] text-white/72">{transcript}</p>
                        </Fold>
                    )}
                </RailBody>

                {/* Suhbat qayerga ketyapti — keyingi savollar shu yerda
                    turadi, o'quvchi "yana nechta qoldi" deb o'ylamaydi. */}
                <RailBottom>
                    <StageLabel>{t.session}</StageLabel>
                    {upcoming.length > 0 ? (
                        upcoming.slice(0, 2).map((item, i) => (
                            <div
                                key={item.id}
                                className={`flex items-center gap-2.5 text-[13px] ${i === 0 ? 'text-white/60' : 'text-white/30'
                                    }`}
                            >
                                <Pip tone={i === 0 ? 'ember' : 'muted'} className="w-5 h-5">
                                    {index + 2 + i}
                                </Pip>
                                <span className="truncate">{item.text}</span>
                            </div>
                        ))
                    ) : (
                        <p className="text-[12.5px] text-white/35">
                            {index + 1} / {total}
                        </p>
                    )}
                </RailBottom>
            </Rail>
        </div>
    );
}
