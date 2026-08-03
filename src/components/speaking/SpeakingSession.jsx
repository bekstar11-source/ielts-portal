/**
 * Speaking mashg'uloti: savollar ro'yxati bo'ylab yurish, har bir javobni
 * yozib olish va AI feedbackini ovozda eshittirish.
 *
 * Butun holat `useSpeakingSession` da — bu komponent faqat qaysi savolda
 * turganini va yig'ilgan ballarni biladi.
 *
 * Ko'rinish: sahna (`StageRecorder` → `StageVerdict` → yakun). Uchalasi bir
 * xil qorong'i kadrda — o'quvchi javob berib, bahoni ko'rib, keyingi savolga
 * o'tguncha ekran almashmaydi, faqat kadr ichidagi mazmun o'zgaradi.
 */

import React, { useState, useCallback } from 'react';
import { CheckCircle, ArrowLeft } from '@phosphor-icons/react';

import { useTranslation } from '../../context/LanguageContext';
import { useSpeakingSession } from '../../hooks/useSpeakingSession';
import StageRecorder from './StageRecorder';
import StageVerdict from './StageVerdict';
import TeacherReviewCard from './TeacherReviewCard';
import VoiceOrb from './VoiceOrb';
import { StageLabel, EmberButton, BandBar, SAGE } from './stage';

const CRITERIA = [
    { key: 'fluency', label: 'Fluency & Coherence' },
    { key: 'lexical', label: 'Lexical Resource' },
    { key: 'grammar', label: 'Grammatical Range' },
    { key: 'pronunciation', label: 'Pronunciation' },
];

const TEXT = {
    uz: {
        empty: 'Savollar topilmadi.',
        done: 'Suhbat yakunlandi',
        answered: (n) => `${n} ta javob baholandi`,
        average: "O'rtacha band",
        strongest: 'Eng kuchli tomon',
        weakest: 'Ustida ishlash kerak',
        back: 'Mavzularga qaytish',
    },
    en: {
        empty: 'No questions found.',
        done: 'Conversation finished',
        answered: (n) => `${n} answer${n === 1 ? '' : 's'} scored`,
        average: 'Average band',
        strongest: 'Strongest',
        weakest: 'Needs work',
        back: 'Back to topics',
    },
};

/** Yig'ilgan javoblar bo'yicha mezonlar kesimidagi o'rtacha. */
function averageBands(results) {
    if (results.length === 0) return null;
    const out = {};
    for (const { key } of CRITERIA) {
        const sum = results.reduce((total, item) => total + (item.bands?.[key] || 0), 0);
        out[key] = Math.round((sum / results.length) * 2) / 2;
    }
    const overallSum = results.reduce((total, item) => total + (item.bands?.overall || 0), 0);
    out.overall = Math.round((overallSum / results.length) * 2) / 2;
    return out;
}

/**
 * @param {object} props
 * @param {Array<{ id: string, text: string, part?: 1|2|3, cueCard?: string }>} props.questions
 * @param {object} [props.topic] - mavzu (sessiya hujjatiga yoziladi)
 * @param {string} [props.sessionId] - berilsa, javoblar Firestore ga saqlanadi
 * @param {() => void} [props.onExit] - sahnadagi "chiqish"
 * @param {(results: Array) => void} [props.onComplete]
 */
export default function SpeakingSession({ questions = [], topic, sessionId, onExit, onComplete }) {
    const [index, setIndex] = useState(0);
    const [results, setResults] = useState([]);
    const [finished, setFinished] = useState(false);
    // AI taklif qilgan follow-up savol — javob berilsa, ro'yxatdagi savol
    // o'rniga vaqtincha shu turadi.
    const [followUp, setFollowUp] = useState(null);

    const { lang } = useTranslation();
    const t = TEXT[lang] || TEXT.uz;
    const session = useSpeakingSession({ sessionId, lang, topic });
    const question = followUp || questions[index];

    const handleNext = useCallback(() => {
        // Natijani saqlab, keyingi savolga o'tamiz.
        const collected = [...results, { questionId: question.id, ...session.evaluation }];
        setResults(collected);
        setFollowUp(null);

        if (index + 1 >= questions.length) {
            setFinished(true);
            onComplete?.(collected);
            return;
        }

        session.reset();
        setIndex(index + 1);
    }, [results, question, session, index, questions.length, onComplete]);

    /**
     * Follow-up savolga javob berish. Bu ro'yxatdagi savol EMAS — imtihonchi
     * aynan shu javobdan keyin so'ragan savol, shuning uchun alohida id bilan
     * saqlanadi va o'z bahosini oladi.
     */
    const handleFollowUp = useCallback((text) => {
        const base = questions[index];
        setFollowUp({
            id: `${base.id}_fu${Date.now().toString(36)}`,
            text,
            part: base.part,
        });
        session.reset();
    }, [questions, index, session]);

    if (questions.length === 0) {
        return (
            <div className="grid place-items-center min-h-[420px] bg-[#0B0806]">
                <p className="text-sm text-white/45">{t.empty}</p>
            </div>
        );
    }

    if (finished) {
        const bands = averageBands(results);
        const ranked = bands ? [...CRITERIA].sort((a, b) => bands[b.key] - bands[a.key]) : [];

        return (
            <div
                className="relative min-h-full overflow-hidden"
                style={{
                    background:
                        'radial-gradient(115% 100% at 50% 18%,#2A1D14 0%,#140E0A 58%,#0A0705 100%)',
                }}
            >
                <VoiceOrb mode="idle" intensity={0.7} field />
                <div
                    aria-hidden="true"
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background:
                            'linear-gradient(180deg,rgba(10,7,5,.55) 0%,transparent 30%,rgba(10,7,5,.92) 100%)',
                    }}
                />

                <div className="relative max-w-2xl mx-auto px-5 sm:px-8 py-14 sm:py-20">
                    {onExit && (
                        <button
                            type="button"
                            onClick={onExit}
                            className="mb-10 inline-flex items-center gap-2 rounded-full border border-white/[0.13] bg-white/[0.05] pl-2.5 pr-4 py-2 text-[13px] text-white/70 hover:bg-white/[0.13] hover:text-white transition-colors"
                        >
                            <ArrowLeft size={15} />
                            {t.back}
                        </button>
                    )}

                    <CheckCircle size={32} weight="fill" style={{ color: SAGE }} />
                    <h2 className="mt-4 font-serif-display font-normal text-[clamp(30px,4.5vw,42px)] leading-[1.12] text-white">
                        {t.done}
                    </h2>
                    <p className="mt-2 text-sm text-white/40">{t.answered(results.length)}</p>

                    {bands && (
                        <>
                            <div className="mt-12 flex items-end gap-4">
                                <div className="grid gap-1">
                                    <StageLabel>{t.average}</StageLabel>
                                    <span className="font-serif-display text-[72px] leading-none text-white tabular-nums">
                                        {bands.overall.toFixed(1)}
                                    </span>
                                </div>
                            </div>

                            {/* Mezonlar kesimi — bitta o'rtacha ball nima ustida
                                ishlash kerakligini aytmaydi. */}
                            <div className="mt-10 grid gap-3.5 max-w-md">
                                {CRITERIA.map(({ key, label }) => (
                                    <BandBar key={key} label={label} band={bands[key]} />
                                ))}
                            </div>

                            {ranked.length > 0 && (
                                <div className="mt-9 grid gap-1.5 text-[13px] text-white/50">
                                    <p>
                                        <span style={{ color: SAGE }}>{t.strongest}:</span>{' '}
                                        {ranked[0].label}
                                    </p>
                                    <p>
                                        <span className="text-[#FFC891]">{t.weakest}:</span>{' '}
                                        {ranked[ranked.length - 1].label}
                                    </p>
                                </div>
                            )}
                        </>
                    )}

                    {/* AI bahosi bepul; jonli o'qituvchi tekshiruvi — alohida xizmat. */}
                    {sessionId && (
                        // `dark` majburan: sahna mavzu sozlamasidan qat'i nazar
                        // qorong'i, kartochka ham shu kadrga tushishi kerak.
                        <div className="dark mt-12">
                            <TeacherReviewCard sessionId={sessionId} lang={lang} />
                        </div>
                    )}

                    {onExit && (
                        <div className="mt-10">
                            <EmberButton onClick={onExit}>{t.back}</EmberButton>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const runningBands = averageBands(results);
    const isVerdict = session.status === 'done' && Boolean(session.evaluation);

    return isVerdict ? (
        <StageVerdict
            evaluation={session.evaluation}
            mode={session.mode}
            lang={lang}
            isSpeaking={session.isSpeaking}
            isFeedbackLoading={session.isFeedbackLoading}
            feedbackError={session.feedbackError}
            ttsError={session.ttsError}
            answerAudioUrl={session.answerAudioUrl}
            duration={session.elapsed}
            index={index}
            total={questions.length}
            upcoming={questions.slice(index + 1)}
            delta={
                results.length > 0
                    ? Math.round(
                        (session.evaluation.bands.overall -
                            results[results.length - 1].bands.overall) * 2
                    ) / 2
                    : null
            }
            isLast={index + 1 >= questions.length}
            onExit={onExit}
            onFollowUp={handleFollowUp}
            onModeChange={session.changeMode}
            onReplay={session.replay}
            onStopSpeaking={session.stopSpeaking}
            onNext={handleNext}
        />
    ) : (
        <StageRecorder
            question={question}
            status={session.status}
            elapsed={session.elapsed}
            maxSeconds={session.maxSeconds}
            error={session.error}
            mode={session.mode}
            lang={lang}
            level={session.level}
            index={index}
            total={questions.length}
            runningBands={runningBands}
            answeredCount={results.length}
            quota={session.quota}
            canRetry={session.canRetry}
            isQuestionPlaying={session.isQuestionPlaying}
            onExit={onExit}
            onModeChange={session.changeMode}
            onStart={() => session.start(question)}
            onStop={session.stop}
            onRetry={session.retry}
            onPlayQuestion={() => session.speakQuestion(question)}
            onStopQuestion={session.stopQuestion}
        />
    );
}
