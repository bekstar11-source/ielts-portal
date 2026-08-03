/**
 * Speaking — jonli o'qituvchi tekshiruvi navbati.
 *
 * Bu yerga faqat TO'LANGAN sessiyalar tushadi (o'quvchi 15 000 so'mlik
 * xizmatni buyurtma qilgan va admin to'lovni tasdiqlagan). O'qituvchi
 * javoblarni eshitadi, AI qo'ygan ballarni tasdiqlaydi yoki tuzatadi va
 * o'quvchiga izoh yozadi.
 */

import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { ChalkboardTeacher, ArrowClockwise, SpinnerGap } from '@phosphor-icons/react';

import { db } from '../../firebase/firebase';
import { useAuth } from '../../context/AuthContext';
import { useSpeakingReviewQueue } from '../../hooks/useSpeakingReviewQueue';
import SpeakingTopicForm from '../../components/speaking/SpeakingTopicForm';
import { Card, SectionTitle } from '../../components/teacher/groupStats/primitives';

const CRITERIA = [
    { key: 'fluency', label: 'Fluency & Coherence' },
    { key: 'lexical', label: 'Lexical Resource' },
    { key: 'grammar', label: 'Grammatical Range' },
    { key: 'pronunciation', label: 'Pronunciation' },
];

const BAND_OPTIONS = Array.from({ length: 17 }, (_, i) => (i + 2) / 2); // 1.0 ... 9.0

function formatDate(value) {
    const date = value?.toDate ? value.toDate() : value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short' });
}

/** Bitta javob: audio, transkript, AI bahosi va o'qituvchi tuzatishi. */
function AnswerBlock({ answer, draft, onChange }) {
    return (
        <div className="py-4 border-b border-gray-100 dark:border-white/[0.06] last:border-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug">
                {answer.question}
            </p>

            {answer.audioUrl ? (
                <audio src={answer.audioUrl} controls preload="none" className="mt-2 w-full" />
            ) : (
                <p className="mt-2 text-[11px] text-gray-400 dark:text-gray-500">
                    Ovoz yozuvi mavjud emas (muddati o‘tgan).
                </p>
            )}

            {answer.transcript && (
                <p className="mt-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                    {answer.transcript}
                </p>
            )}

            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CRITERIA.map(({ key, label }) => (
                    <label key={key} className="block">
                        <span className="block text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
                            {label}
                        </span>
                        <select
                            value={draft?.bands?.[key] ?? answer.bands?.[key] ?? ''}
                            onChange={(e) => onChange(answer.id, 'bands', {
                                ...(draft?.bands || answer.bands || {}),
                                [key]: Number(e.target.value),
                            })}
                            className="mt-1 w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] px-2 py-1.5 text-sm tabular-nums text-gray-900 dark:text-white outline-none"
                        >
                            {BAND_OPTIONS.map((band) => (
                                <option key={band} value={band}>
                                    {band.toFixed(1)}
                                </option>
                            ))}
                        </select>
                    </label>
                ))}
            </div>

            <textarea
                value={draft?.comment ?? ''}
                onChange={(e) => onChange(answer.id, 'comment', e.target.value)}
                rows={2}
                placeholder="Shu javob bo‘yicha izoh (ixtiyoriy)"
                className="mt-3 w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] p-2.5 text-sm text-gray-900 dark:text-white outline-none resize-none"
            />
        </div>
    );
}

export default function TeacherSpeakingReview() {
    const { user, userData } = useAuth();
    const {
        sessions, answers, loading, saving, error, reload, loadAnswers, submit,
    } = useSpeakingReviewQueue({ teacherId: user?.uid });

    const [tab, setTab] = useState('queue'); // queue | questions
    const [groups, setGroups] = useState([]);
    const [openId, setOpenId] = useState(null);
    const [drafts, setDrafts] = useState({}); // { [sessionId]: { comment, answers: {} } }

    // Savol qo'shishda guruh tanlash uchun — mavzuni butun platformaga emas,
    // o'z guruhiga yo'naltirish ko'p hollarda to'g'riroq.
    useEffect(() => {
        if (!user?.uid) return undefined;
        let alive = true;
        getDocs(query(collection(db, 'groups'), where('teacherId', '==', user.uid)))
            .then((snap) => {
                if (!alive) return;
                setGroups(snap.docs.map((d) => ({ id: d.id, name: d.data().name || d.id })));
            })
            .catch((e) => console.error('Teacher groups load error:', e));
        return () => {
            alive = false;
        };
    }, [user?.uid]);

    const open = useCallback((sessionId) => {
        setOpenId((prev) => (prev === sessionId ? null : sessionId));
        loadAnswers(sessionId);
    }, [loadAnswers]);

    const setAnswerField = useCallback((sessionId, answerId, field, value) => {
        setDrafts((prev) => ({
            ...prev,
            [sessionId]: {
                ...prev[sessionId],
                answers: {
                    ...prev[sessionId]?.answers,
                    [answerId]: { ...prev[sessionId]?.answers?.[answerId], [field]: value },
                },
            },
        }));
    }, []);

    const handleSubmit = useCallback(async (session) => {
        const draft = drafts[session.id] || {};
        const comment = (draft.comment || '').trim();
        if (comment.length < 10) {
            toast.error("Umumiy izoh yozing — o'quvchi buning uchun to'lagan.");
            return;
        }

        const rows = answers[session.id] || [];
        const payload = {
            sessionId: session.id,
            comment,
            answers: rows.map((row) => {
                const answerDraft = draft.answers?.[row.id] || {};
                return {
                    questionId: row.id,
                    bands: { ...(row.bands || {}), ...(answerDraft.bands || {}) },
                    comment: answerDraft.comment || '',
                };
            }),
        };

        // Sessiya bahosi — javoblar bo'yicha o'rtacha (o'qituvchi tuzatgani bilan).
        if (payload.answers.length > 0) {
            const bands = {};
            for (const { key } of CRITERIA) {
                const sum = payload.answers.reduce((total, a) => total + (a.bands?.[key] || 0), 0);
                bands[key] = sum / payload.answers.length;
            }
            payload.bands = bands;
        }

        const ok = await submit(payload);
        if (ok) {
            toast.success('Tekshiruv yuborildi.');
            setOpenId(null);
        } else {
            toast.error(error || "Saqlab bo'lmadi.");
        }
    }, [drafts, answers, submit, error]);

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <ChalkboardTeacher size={20} className="text-warm-primary" />
                    <h1 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
                        Speaking tekshirish
                    </h1>
                </div>
                {tab === 'queue' && (
                    <button
                        type="button"
                        onClick={reload}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.06] transition-colors"
                    >
                        <ArrowClockwise size={13} />
                        Yangilash
                    </button>
                )}
            </div>

            <div className="mt-4 flex gap-2">
                {[
                    { id: 'queue', label: 'Tekshiruv navbati' },
                    { id: 'questions', label: 'Savollarim' },
                ].map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => setTab(item.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === item.id
                            ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                            : 'border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.06]'
                            }`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {tab === 'questions' && (
                <div className="mt-5">
                    <SpeakingTopicForm
                        author={{ uid: user?.uid, name: userData?.name || userData?.displayName }}
                        groups={groups}
                    />
                </div>
            )}

            {tab === 'queue' && (
            <>
            <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                To‘lovi tasdiqlangan sessiyalar. AI ballari tayyor — siz eshitib tasdiqlaysiz yoki tuzatasiz.
            </p>

            {loading && (
                <p className="mt-8 text-sm text-gray-500 dark:text-gray-400">Yuklanmoqda...</p>
            )}

            {!loading && sessions.length === 0 && (
                <Card className="mt-6 p-8 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Hozircha tekshiruv navbati bo‘sh.
                    </p>
                </Card>
            )}

            <div className="mt-5 space-y-3">
                {sessions.map((session) => {
                    const isOpen = openId === session.id;
                    const rows = answers[session.id];
                    const draft = drafts[session.id] || {};

                    return (
                        <Card key={session.id} className="p-5">
                            <button
                                type="button"
                                onClick={() => open(session.id)}
                                className="w-full flex items-center justify-between gap-3 text-left"
                            >
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {session.studentName || session.uid}
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                                        {session.topicTitle || 'Speaking'} · {session.answeredCount || 0} javob ·{' '}
                                        {formatDate(session.updatedAt)}
                                    </p>
                                </div>
                                <span className="text-xl font-semibold tabular-nums text-gray-900 dark:text-white shrink-0">
                                    {(session.overallBand ?? 0).toFixed(1)}
                                </span>
                            </button>

                            {isOpen && (
                                <div className="mt-4 border-t border-gray-100 dark:border-white/[0.06] pt-2">
                                    {rows === undefined ? (
                                        <p className="py-4 text-sm text-gray-500 dark:text-gray-400">
                                            Javoblar yuklanmoqda...
                                        </p>
                                    ) : (
                                        <>
                                            {rows.map((row) => (
                                                <AnswerBlock
                                                    key={row.id}
                                                    answer={row}
                                                    draft={draft.answers?.[row.id]}
                                                    onChange={(answerId, field, value) =>
                                                        setAnswerField(session.id, answerId, field, value)
                                                    }
                                                />
                                            ))}

                                            <div className="pt-4">
                                                <SectionTitle>Umumiy xulosa</SectionTitle>
                                                <textarea
                                                    value={draft.comment || ''}
                                                    onChange={(e) =>
                                                        setDrafts((prev) => ({
                                                            ...prev,
                                                            [session.id]: {
                                                                ...prev[session.id],
                                                                comment: e.target.value,
                                                            },
                                                        }))
                                                    }
                                                    rows={4}
                                                    placeholder="O'quvchiga yozilgan xulosa — nima yaxshi, nima ustida ishlash kerak, keyingi qadam."
                                                    className="mt-2 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] p-3 text-sm leading-relaxed text-gray-900 dark:text-white outline-none resize-none"
                                                />

                                                <button
                                                    type="button"
                                                    onClick={() => handleSubmit(session)}
                                                    disabled={saving}
                                                    className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
                                                >
                                                    {saving && <SpinnerGap size={15} className="animate-spin" />}
                                                    Tekshiruvni yuborish
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </Card>
                    );
                })}
            </div>

            {error && (
                <p className="mt-4 text-xs text-rose-600 dark:text-rose-400">{error}</p>
            )}
            </>
            )}
        </div>
    );
}
