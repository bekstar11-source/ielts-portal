/**
 * Multilevel Speaking imtihoni: uch qism, sakkiz javob.
 *
 * IELTS mashg'ulotidan (`SpeakingSession`) ATAYLAB alohida komponent.
 * Ikkalasi ham `useSpeakingSession` ni ishlatadi, lekin ekranda ko'rinadigan
 * narsa deyarli umumiy emas: bu yerda rasmlar, tayyorgarlik hisobi, pros/cons
 * jadvali va daraja bor, band yo'q. Bittasini ikkinchisiga "rejim" qilib
 * tiqish har ikkala ekranni ham chalkashtirardi.
 *
 * Oqim imtihondagidek avtomatik: savol chiqadi → tayyorgarlik hisobi →
 * signal → yozuv o'zi boshlanadi va vaqt tugaganda o'zi to'xtaydi. O'quvchi
 * faqat "keyingisiga" o'tadi.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getDownloadURL, ref } from 'firebase/storage';
import { ArrowLeft, Check, Microphone } from '@phosphor-icons/react';

import { storage } from '../../firebase/firebase';
import { useTranslation } from '../../context/LanguageContext';
import { useSpeakingSession } from '../../hooks/useSpeakingSession';
import {
    ML_CRITERION_LABEL,
    ML_CRITERIA,
    ML_LEVEL_LABEL,
    aggregateMlSpeaking,
} from '../../utils/multilevelSpeaking';
import { RoomCard, Eyebrow, inkText, bodyText, mutedText, PrimaryButton, QuietButton } from './ui';
import { formatTime } from './stage';

const TEXT = {
    uz: {
        empty: 'Bu testda savollar yo\'q.',
        part: (n) => `${n}-qism`,
        prep: 'Tayyorgarlik',
        ready: 'Tayyorlaning',
        prepHint: "O'ylab oling. Signal chalinganda yozuv o'zi boshlanadi.",
        skip: 'Tayyorman, boshlash',
        begin: 'Boshlash',
        speaking: 'Gapiring',
        stop: 'Tugatdim',
        processing: 'Baholanmoqda...',
        next: 'Keyingisiga',
        finish: 'Yakunlash',
        retry: 'Qayta yuborish',
        done: 'Imtihon yakunlandi',
        level: 'Daraja',
        weakest: 'Eng zaif tomon',
        answers: (n) => `${n} ta javob baholandi`,
        back: 'Chiqish',
        bullets: 'Uchala savolga ham javob bering:',
        pros: 'Pros',
        cons: 'Cons',
        pickHint: (n) => `Har ro'yxatdan ${n} tadan tanlang va ikkala tomonni ham yoriting.`,
        approx: 'AI bahosi — taxminiy daraja, rasmiy natija emas.',
    },
    en: {
        empty: 'This test has no questions.',
        part: (n) => `Part ${n}`,
        prep: 'Preparation',
        ready: 'Get ready',
        prepHint: 'Think it through. Recording starts on the tone.',
        skip: "I'm ready, start",
        begin: 'Start',
        speaking: 'Speak',
        stop: 'Done',
        processing: 'Scoring...',
        next: 'Next',
        finish: 'Finish',
        retry: 'Send again',
        done: 'Exam finished',
        level: 'Level',
        weakest: 'Weakest area',
        answers: (n) => `${n} answer${n === 1 ? '' : 's'} scored`,
        back: 'Exit',
        bullets: 'Answer all three questions:',
        pros: 'Pros',
        cons: 'Cons',
        pickHint: (n) => `Choose ${n} from each list and cover both sides.`,
        approx: 'AI estimate — not an official score.',
    },
};

/** Uchta doira — imtihondagi holat ko'rsatkichi. */
function PartRail({ current, completed }) {
    return (
        <div className="flex items-center gap-2">
            {[1, 2, 3].map((part, i) => {
                const isDone = completed.has(part);
                const isCurrent = part === current;
                return (
                    <React.Fragment key={part}>
                        {i > 0 && (
                            <span
                                className={`h-1 w-10 rounded-full transition-colors ${
                                    isDone || completed.has(part - 1)
                                        ? 'bg-warm-success'
                                        : 'bg-warm-hairline dark:bg-white/10'
                                }`}
                            />
                        )}
                        <span
                            className={`grid h-8 w-8 place-items-center rounded-full text-[13px] font-semibold transition-colors ${
                                isDone
                                    ? 'bg-warm-success text-white'
                                    : isCurrent
                                      ? 'bg-warm-primary text-white'
                                      : 'bg-warm-hairline text-warm-muted dark:bg-white/10 dark:text-warm-on-dark-soft'
                            }`}
                        >
                            {isDone ? <Check size={16} weight="bold" /> : part}
                        </span>
                    </React.Fragment>
                );
            })}
        </div>
    );
}

/**
 * Storage yo'llarini ko'rsatiladigan havolaga aylantiradi.
 *
 * Yo'llar test hujjatida turadi, `<img>` ga esa URL kerak. Natija keshlanadi:
 * o'quvchi 1-qismdagi uch savolda AYNAN bir xil ikkita rasmni ko'radi, har
 * savolda qaytadan so'rash bekorga uch marta aylanish bo'lardi.
 */
function usePhotoUrls(paths) {
    const [urls, setUrls] = useState({});
    const key = (paths || []).join('|');

    useEffect(() => {
        let alive = true;
        const missing = (paths || []).filter((path) => !urls[path]);
        if (missing.length === 0) return undefined;

        Promise.all(
            missing.map(async (path) => {
                try {
                    return [path, await getDownloadURL(ref(storage, path))];
                } catch (error) {
                    console.error('Multilevel photo url error:', path, error.message);
                    return [path, ''];
                }
            })
        ).then((pairs) => {
            if (!alive) return;
            setUrls((prev) => ({ ...prev, ...Object.fromEntries(pairs) }));
        });

        return () => {
            alive = false;
        };
        // `key` — yo'llar ro'yxatining barqaror shakli; `urls` ni bog'lash
        // cheksiz aylanish yasardi.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    return urls;
}

/** Savol matni + unga tegishli material (rasm, savollar, jadval). */
function QuestionCard({ question, t }) {
    const urls = usePhotoUrls(question.photoPaths);
    const photos = (question.photoPaths || []).map((path) => urls[path]).filter(Boolean);

    return (
        <div className="space-y-4">
            <h2 className={`text-[19px] font-semibold leading-snug ${inkText}`}>{question.text}</h2>

            {photos.length > 0 && (
                <div className={`grid gap-3 ${photos.length > 1 ? 'sm:grid-cols-2' : ''}`}>
                    {photos.map((url) => (
                        <img
                            key={url}
                            src={url}
                            alt=""
                            className="w-full rounded-xl border border-warm-hairline object-cover dark:border-white/10"
                        />
                    ))}
                </div>
            )}

            {question.bullets?.length > 0 && (
                <div>
                    <Eyebrow className="mb-2">{t.bullets}</Eyebrow>
                    <ul className={`space-y-1.5 text-[15px] ${bodyText}`}>
                        {question.bullets.map((item, i) => (
                            <li key={item} className="flex gap-2">
                                <span className={mutedText}>{i + 1}.</span>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {question.prosCons && (
                <div className="space-y-2">
                    <div className="grid gap-3 sm:grid-cols-2">
                        {['pros', 'cons'].map((side) => (
                            <div
                                key={side}
                                className="rounded-xl border border-warm-hairline p-3 dark:border-white/10"
                            >
                                <Eyebrow className="mb-2">{t[side]}</Eyebrow>
                                <ul className={`space-y-1.5 text-[14px] ${bodyText}`}>
                                    {question.prosCons[side].map((item) => (
                                        <li key={item} className="flex gap-2">
                                            <span className={mutedText}>•</span>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                    <p className={`text-[13px] ${mutedText}`}>{t.pickHint(2)}</p>
                </div>
            )}
        </div>
    );
}

/** Bitta javobning natijasi — daraja, mezonlar, tuzatishlar. */
function AnswerVerdict({ evaluation }) {
    return (
        <div className="space-y-4">
            <div className="flex items-baseline gap-3">
                <span className="text-[32px] font-semibold leading-none text-warm-primary">
                    {ML_LEVEL_LABEL[evaluation.level] || evaluation.level}
                </span>
                <span className={`text-[13px] ${mutedText}`}>{evaluation.score} / 100</span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
                {ML_CRITERIA.map((key) => {
                    const item = evaluation.criteria?.[key];
                    if (!item) return null;
                    return (
                        <div
                            key={key}
                            className="rounded-lg border border-warm-hairline p-2.5 dark:border-white/10"
                        >
                            <div className="flex items-center justify-between">
                                <span className={`text-[13px] font-medium ${inkText}`}>
                                    {ML_CRITERION_LABEL[key]}
                                </span>
                                <span className="text-[13px] font-semibold text-warm-primary">
                                    {ML_LEVEL_LABEL[item.level] || item.level}
                                </span>
                            </div>
                            {item.evidence && (
                                <p className={`mt-1 text-[12.5px] leading-snug ${mutedText}`}>
                                    {item.evidence}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>

            {evaluation.corrections?.length > 0 && (
                <ul className="space-y-2">
                    {evaluation.corrections.map((item) => (
                        <li
                            key={item.said}
                            className="rounded-lg border border-warm-hairline p-2.5 text-[13.5px] dark:border-white/10"
                        >
                            <span className="text-warm-warning line-through">{item.said}</span>
                            <span className={mutedText}> → </span>
                            <span className="text-warm-success">{item.better}</span>
                            {item.why && <p className={`mt-1 ${mutedText}`}>{item.why}</p>}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

/**
 * @param {object} props
 * @param {Array} props.questions - `buildMultilevelQuestions` natijasi
 * @param {string} [props.sessionId]
 * @param {object} [props.topic]
 * @param {() => void} [props.onExit]
 * @param {(results: Array) => void} [props.onComplete]
 */
export default function MultilevelSession({ questions = [], sessionId, topic, onExit, onComplete }) {
    const [index, setIndex] = useState(0);
    const [results, setResults] = useState([]);
    const [finished, setFinished] = useState(false);

    const { lang } = useTranslation();
    const t = TEXT[lang] || TEXT.uz;
    const session = useSpeakingSession({ sessionId, lang, topic, examType: 'multilevel' });
    const question = questions[index];

    // Tugagan qismlar — rail uchun. Joriy savoldan oldingi hamma qism tugagan.
    const completedParts = useMemo(() => {
        const done = new Set();
        results.forEach((item) => {
            const part = item.part;
            // Qism tugadi deb hisoblanadi, agar shu qismdagi oxirgi savol
            // javoblangan bo'lsa.
            const last = [...questions].reverse().find((q) => q.part === part);
            if (last && results.some((r) => r.questionId === last.id)) done.add(part);
        });
        return done;
    }, [results, questions]);

    const summary = useMemo(() => {
        if (results.length === 0) return null;
        // Sessiya darajasi ham eng zaif mezon bo'yicha — serverdagi qoida
        // bilan bir xil, chunki o'sha faylning o'zi ishlatiladi.
        const averages = {};
        for (const key of ML_CRITERIA) {
            const sum = results.reduce(
                (total, item) => total + (item.criteria?.[key]?.score || 0),
                0
            );
            averages[key] = { score: Math.round(sum / results.length) };
        }
        return aggregateMlSpeaking(averages);
    }, [results]);

    const handleNext = useCallback(() => {
        const collected = [
            ...results,
            { questionId: question.id, part: question.part, ...session.evaluation },
        ];
        setResults(collected);
        session.reset();

        if (index + 1 >= questions.length) {
            setFinished(true);
            onComplete?.(collected);
            return;
        }
        setIndex(index + 1);
    }, [results, question, session, index, questions.length, onComplete]);

    if (questions.length === 0) {
        return <p className={`p-8 text-center ${mutedText}`}>{t.empty}</p>;
    }

    if (finished) {
        return (
            <RoomCard className="mx-auto max-w-xl p-8 text-center">
                <Eyebrow>{t.done}</Eyebrow>
                <p className="mt-4 text-[44px] font-semibold leading-none text-warm-primary">
                    {ML_LEVEL_LABEL[summary?.level] || '—'}
                </p>
                <p className={`mt-2 text-[14px] ${mutedText}`}>
                    {summary?.score} / 100 · {t.answers(results.length)}
                </p>
                {summary?.weakest && (
                    <p className={`mt-4 text-[14px] ${bodyText}`}>
                        {t.weakest}: <strong>{ML_CRITERION_LABEL[summary.weakest]}</strong>
                    </p>
                )}
                <p className={`mt-6 text-[12.5px] ${mutedText}`}>{t.approx}</p>
                {onExit && (
                    <QuietButton className="mt-6" onClick={onExit}>
                        <ArrowLeft size={16} /> {t.back}
                    </QuietButton>
                )}
            </RoomCard>
        );
    }

    return (
        <div className="mx-auto max-w-2xl space-y-4">
            <div className="flex items-center justify-between">
                <PartRail current={question.part} completed={completedParts} />
                <span className={`text-[12px] ${mutedText}`}>
                    {t.part(question.part)} · {index + 1}/{questions.length}
                </span>
            </div>

            <RoomCard className="p-6">
                <QuestionCard question={question} t={t} />

                <div className="mt-6 border-t border-warm-hairline pt-5 dark:border-white/10">
                    {session.status === 'idle' && (
                        <PrimaryButton onClick={() => session.start(question)}>
                            <Microphone size={17} weight="fill" /> {t.begin}
                        </PrimaryButton>
                    )}

                    {session.isPreparing && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <span className="text-[34px] font-semibold leading-none tabular-nums text-warm-primary">
                                    {session.prepRemaining}
                                </span>
                                <div>
                                    <Eyebrow>
                                        {session.prepKind === 'prep' ? t.prep : t.ready}
                                    </Eyebrow>
                                    <p className={`text-[13px] ${mutedText}`}>{t.prepHint}</p>
                                </div>
                            </div>
                            <QuietButton onClick={session.skipPrep}>{t.skip}</QuietButton>
                        </div>
                    )}

                    {session.isRecording && (
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <span
                                    className="h-3 w-3 animate-pulse rounded-full bg-warm-warning"
                                    style={{ opacity: 0.4 + session.level }}
                                />
                                <span className={`text-[15px] font-medium ${inkText}`}>
                                    {t.speaking}
                                </span>
                            </div>
                            <span className={`text-[15px] tabular-nums ${mutedText}`}>
                                {formatTime(Math.max(0, session.maxSeconds - session.elapsed))}
                            </span>
                            <QuietButton onClick={session.stop}>{t.stop}</QuietButton>
                        </div>
                    )}

                    {session.isBusy && <p className={`text-[14px] ${mutedText}`}>{t.processing}</p>}

                    {session.status === 'error' && (
                        <div className="space-y-3">
                            <p className="text-[14px] text-warm-warning">{session.error}</p>
                            {session.canRetry ? (
                                <PrimaryButton onClick={session.retry}>{t.retry}</PrimaryButton>
                            ) : (
                                <QuietButton onClick={() => session.start(question)}>
                                    {t.begin}
                                </QuietButton>
                            )}
                        </div>
                    )}

                    {session.status === 'done' && session.evaluation && (
                        <div className="space-y-5">
                            <AnswerVerdict evaluation={session.evaluation} />
                            <PrimaryButton onClick={handleNext}>
                                {index + 1 >= questions.length ? t.finish : t.next}
                            </PrimaryButton>
                        </div>
                    )}
                </div>
            </RoomCard>
        </div>
    );
}
