/**
 * O'quvchining oldingi Speaking mashg'ulotlari.
 *
 * Ilgari sessiya tugashi bilan feedback ekrandan ketardi va qaytib
 * kelmasdi — javoblar Firestore da bo'lsa ham, ularni ochadigan joy
 * yo'q edi. Bu ro'yxat o'sha yozuvlarni qaytaradi.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
} from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { CaretDown, ChalkboardTeacher, Clock } from '@phosphor-icons/react';

import { db, storage } from '../../firebase/firebase';
import AnswerPlayer from './AnswerPlayer';
import { RoomCard, Eyebrow, inkText, bodyText, mutedText } from './ui';

const TEXT = {
    uz: {
        title: 'Oldingi mashg‘ulotlar',
        empty: 'Hozircha yakunlangan mashg‘ulot yo‘q.',
        answers: (n) => `${n} ta javob`,
        loading: 'Yuklanmoqda...',
        audioGone: 'Ovoz yozuvi muddati o‘tib o‘chirilgan.',
        reviewPaid: 'O‘qituvchi tekshirmoqda',
        reviewDone: 'O‘qituvchi tekshirdi',
        reviewAwaiting: 'To‘lov kutilmoqda',
    },
    en: {
        title: 'Previous practice',
        empty: 'No finished practice yet.',
        answers: (n) => `${n} answer${n === 1 ? '' : 's'}`,
        loading: 'Loading...',
        audioGone: 'The recording was deleted after its retention period.',
        reviewPaid: 'Teacher is reviewing',
        reviewDone: 'Reviewed by a teacher',
        reviewAwaiting: 'Waiting for payment',
    },
};

function formatDate(value) {
    const date = value?.toDate ? value.toDate() : value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Bitta javob: ball, feedback va (saqlanib qolgan bo'lsa) ovoz. */
function AnswerRow({ answer, t, lang }) {
    const [audioUrl, setAudioUrl] = useState('');
    // Yo'l umuman yo'q bo'lsa — audio allaqachon tozalangan (60 kunlik muddat).
    const [audioGone, setAudioGone] = useState(!answer.audioPath);

    useEffect(() => {
        if (!answer.audioPath) return undefined;
        let alive = true;
        getDownloadURL(ref(storage, answer.audioPath))
            .then((url) => alive && setAudioUrl(url))
            // 60 kundan keyin audio tozalanadi — bu kutilgan holat.
            .catch(() => alive && setAudioGone(true));
        return () => {
            alive = false;
        };
    }, [answer.audioPath]);

    // Feedback endi faqat o'quvchi tanlagan ohangda yoziladi, ya'ni xaritada
    // qaysi kalit borligi oldindan ma'lum emas. Qat'iy tartib bilan
    // so'raganda tarix jimgina bo'sh chiqib qolardi — borini olamiz.
    const feedback = answer.feedback
        ? (answer.feedback.coach
            || answer.feedback.friend
            || answer.feedback.examiner
            || Object.values(answer.feedback).find((text) => typeof text === 'string' && text.trim())
            || '')
        : '';

    return (
        <div className="py-3.5 border-b border-warm-hairline-soft dark:border-white/[0.05] last:border-0">
            <div className="flex items-start justify-between gap-3">
                <p className={`text-sm leading-snug ${bodyText}`}>
                    {answer.question}
                </p>
                <span className={`text-sm font-semibold tabular-nums shrink-0 ${inkText}`}>
                    {answer.bands?.overall?.toFixed(1)}
                </span>
            </div>

            {feedback && (
                <p className={`mt-1.5 text-xs leading-relaxed ${mutedText}`}>
                    {feedback}
                </p>
            )}

            {answer.teacherComment && (
                <p className="mt-2 text-xs leading-relaxed text-warm-primary">
                    <ChalkboardTeacher size={12} className="inline mr-1" />
                    {answer.teacherComment}
                </p>
            )}

            {audioUrl && (
                <AnswerPlayer
                    src={audioUrl}
                    variant="inline"
                    lang={lang}
                    className="mt-2"
                />
            )}
            {audioGone && (
                <p className={`mt-2 text-[11px] ${mutedText}`}>{t.audioGone}</p>
            )}
        </div>
    );
}

/**
 * @param {{ uid: string, lang?: 'uz'|'en', refreshKey?: any }} props
 */
export default function SpeakingHistory({ uid, lang = 'uz', refreshKey }) {
    const t = TEXT[lang] || TEXT.uz;
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openId, setOpenId] = useState(null);
    const [answers, setAnswers] = useState({});

    useEffect(() => {
        if (!uid) return undefined;
        let alive = true;

        getDocs(
            query(
                collection(db, 'speakingSessions'),
                where('uid', '==', uid),
                orderBy('createdAt', 'desc'),
                limit(10)
            )
        )
            .then((snap) => {
                if (!alive) return;
                setSessions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
            })
            .catch((error) => console.error('Speaking history error:', error))
            .finally(() => alive && setLoading(false));

        return () => {
            alive = false;
        };
    }, [uid, refreshKey]);

    // Javoblar faqat ochilganda o'qiladi — ro'yxatning o'zi uchun
    // sessiya hujjatidagi yig'ma ballar yetarli.
    const toggle = useCallback(async (sessionId) => {
        setOpenId((prev) => (prev === sessionId ? null : sessionId));
        if (answers[sessionId]) return;
        try {
            const snap = await getDocs(
                collection(db, 'speakingSessions', sessionId, 'answers')
            );
            setAnswers((prev) => ({
                ...prev,
                [sessionId]: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
            }));
        } catch (error) {
            console.error('Speaking answers error:', error);
            setAnswers((prev) => ({ ...prev, [sessionId]: [] }));
        }
    }, [answers]);

    if (!uid) return null;
    if (loading) {
        return (
            <p className={`text-xs ${mutedText}`}>{t.loading}</p>
        );
    }
    if (sessions.length === 0) return null;

    const reviewBadge = (session) => {
        const status = session.teacherReview?.status;
        if (status === 'done') return { label: t.reviewDone, tone: 'emerald', Icon: ChalkboardTeacher };
        if (status === 'paid') return { label: t.reviewPaid, tone: 'amber', Icon: Clock };
        if (status === 'awaiting_payment') return { label: t.reviewAwaiting, tone: 'gray', Icon: Clock };
        return null;
    };

    return (
        <section className="mt-10">
            <Eyebrow>{t.title}</Eyebrow>
            <div className="mt-3 space-y-2">
                {sessions.map((session) => {
                    const badge = reviewBadge(session);
                    const isOpen = openId === session.id;
                    const rows = answers[session.id];

                    return (
                        <RoomCard key={session.id} className="p-4 sm:p-5">
                            <button
                                type="button"
                                onClick={() => toggle(session.id)}
                                className="w-full flex items-center justify-between gap-3 text-left"
                            >
                                <div className="min-w-0">
                                    <p className={`text-sm font-medium truncate ${inkText}`}>
                                        {session.topicTitle || 'Speaking'}
                                    </p>
                                    <p className={`mt-0.5 text-[11px] ${mutedText}`}>
                                        {formatDate(session.createdAt)} · {t.answers(session.answeredCount || 0)}
                                    </p>
                                    {badge && (
                                        <span
                                            className={`mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium ${badge.tone === 'emerald'
                                                ? 'text-warm-success'
                                                : badge.tone === 'amber'
                                                    ? 'text-warm-warning'
                                                    : 'text-warm-muted'
                                                }`}
                                        >
                                            <badge.Icon size={11} />
                                            {badge.label}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className={`text-xl font-semibold tabular-nums ${inkText}`}>
                                        {(session.teacherReview?.bands?.overall ?? session.overallBand ?? 0).toFixed(1)}
                                    </span>
                                    <CaretDown
                                        size={14}
                                        className={`text-warm-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
                                    />
                                </div>
                            </button>

                            {isOpen && (
                                <div className="mt-3 border-t border-warm-hairline-soft dark:border-white/[0.05] pt-1">
                                    {session.teacherReview?.status === 'done' && session.teacherReview.comment && (
                                        <p className="py-3 text-xs leading-relaxed text-warm-primary">
                                            <ChalkboardTeacher size={12} className="inline mr-1" />
                                            {session.teacherReview.comment}
                                        </p>
                                    )}
                                    {rows === undefined ? (
                                        <p className={`py-3 text-xs ${mutedText}`}>
                                            {t.loading}
                                        </p>
                                    ) : (
                                        rows.map((answer) => (
                                            <AnswerRow key={answer.id} answer={answer} t={t} lang={lang} />
                                        ))
                                    )}
                                </div>
                            )}
                        </RoomCard>
                    );
                })}
            </div>
        </section>
    );
}
