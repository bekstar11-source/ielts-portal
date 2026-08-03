/**
 * Jonli o'qituvchi tekshiruvi — sessiya yakunidagi taklif va holat.
 *
 * AI bahosi bepul va darhol keladi; bu karta undan keyin turadi va
 * "xohlasangiz, javoblaringizni jonli o'qituvchi eshitadi" degan alohida
 * pullik xizmatni taklif qiladi. Narx va holat serverdan keladi —
 * bu yerda hech narsa hisoblanmaydi.
 */

import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { ChalkboardTeacher, Clock, CheckCircle, SpinnerGap } from '@phosphor-icons/react';

import { db, functions } from '../../firebase/firebase';
import { RoomCard, Eyebrow, inkText, bodyText, mutedText } from './ui';

const TEXT = {
    uz: {
        title: "O'qituvchi tekshiruvi",
        pitch: "AI bahosi tayyor. Xohlasangiz, javoblaringizni jonli o'qituvchi eshitib, ballarni tasdiqlaydi va shaxsiy izoh yozadi.",
        cta: (price) => `O'qituvchi tekshirsin — ${price} so'm`,
        awaiting: "To'lov kutilmoqda",
        awaitingHint: "Telegram botda to'lovni yakunlang va chek skrinshotini yuboring. Admin tasdiqlagach javoblaringiz o'qituvchiga boradi.",
        payAgain: "To'lovni ochish",
        paid: "O'qituvchi tekshirmoqda",
        paidHint: 'Odatda bir necha soat ichida tayyor bo\'ladi.',
        done: "O'qituvchi xulosasi",
        teacherBand: "O'qituvchi qo'ygan band",
        error: 'Xatolik yuz berdi. Qaytadan urinib ko\'ring.',
    },
    en: {
        title: 'Teacher review',
        pitch: 'Your AI score is ready. If you want, a real teacher will listen to your answers, confirm the bands and write personal feedback.',
        cta: (price) => `Ask a teacher — ${price} UZS`,
        awaiting: 'Waiting for payment',
        awaitingHint: 'Finish the payment in the Telegram bot and send the receipt. Once the admin confirms it, your answers go to a teacher.',
        payAgain: 'Open payment',
        paid: 'A teacher is reviewing',
        paidHint: 'Usually ready within a few hours.',
        done: 'Teacher feedback',
        teacherBand: 'Band given by the teacher',
        error: 'Something went wrong. Please try again.',
    },
};

const formatPrice = (value) => new Intl.NumberFormat('uz-UZ').format(value || 0);

/**
 * @param {{ sessionId: string, lang?: 'uz'|'en' }} props
 */
export default function TeacherReviewCard({ sessionId, lang = 'uz' }) {
    const t = TEXT[lang] || TEXT.uz;
    const [review, setReview] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    // Holat serverda o'zgaradi (admin to'lovni tasdiqlaydi, o'qituvchi
    // tekshiradi) — shuning uchun kuzatib turamiz, so'ramaymiz.
    useEffect(() => {
        if (!sessionId) return undefined;
        return onSnapshot(
            doc(db, 'speakingSessions', sessionId),
            (snap) => setReview(snap.data()?.teacherReview || null),
            (err) => console.error('Teacher review snapshot:', err)
        );
    }, [sessionId]);

    const status = review?.status || 'none';

    const requestReview = async () => {
        setBusy(true);
        setError('');
        try {
            const fn = httpsCallable(functions, 'requestSpeakingReview');
            const { data } = await fn({ sessionId });
            if (data?.payUrl) window.open(data.payUrl, '_blank', 'noopener');
        } catch (e) {
            console.error('requestSpeakingReview error:', e);
            setError(e.message || t.error);
        } finally {
            setBusy(false);
        }
    };

    if (status === 'done') {
        const bands = review.bands;
        return (
            <RoomCard className="p-5 sm:p-6">
                <div className="flex items-center gap-2">
                    <CheckCircle size={16} weight="fill" className="text-warm-success" />
                    <Eyebrow>{t.done}</Eyebrow>
                </div>
                {bands && (
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className={`text-[11px] ${mutedText}`}>{t.teacherBand}</span>
                        <span className={`text-2xl font-semibold tabular-nums ${inkText}`}>
                            {bands.overall?.toFixed(1)}
                        </span>
                    </div>
                )}
                <p className={`mt-3 text-[15px] leading-relaxed whitespace-pre-line ${bodyText}`}>
                    {review.comment}
                </p>
                {review.teacherName && (
                    <p className={`mt-3 text-xs ${mutedText}`}>
                        — {review.teacherName}
                    </p>
                )}
            </RoomCard>
        );
    }

    if (status === 'paid') {
        return (
            <RoomCard className="p-5 sm:p-6 flex items-start gap-3">
                <Clock size={18} className="text-warm-primary shrink-0 mt-0.5" />
                <div>
                    <p className={`text-sm font-medium ${inkText}`}>{t.paid}</p>
                    <p className={`mt-1 text-xs ${mutedText}`}>{t.paidHint}</p>
                </div>
            </RoomCard>
        );
    }

    if (status === 'awaiting_payment') {
        return (
            <RoomCard className="p-5 sm:p-6">
                <div className="flex items-start gap-3">
                    <Clock size={18} className="text-warm-primary shrink-0 mt-0.5" />
                    <div>
                        <p className={`text-sm font-medium ${inkText}`}>
                            {t.awaiting}
                        </p>
                        <p className={`mt-1 text-xs leading-relaxed ${mutedText}`}>
                            {t.awaitingHint}
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={requestReview}
                    disabled={busy}
                    className="mt-4 w-full py-2.5 rounded-xl border border-warm-hairline dark:border-white/10 text-sm font-semibold text-warm-body dark:text-warm-on-dark hover:bg-warm-canvas dark:hover:bg-white/[0.05] transition-colors disabled:opacity-60"
                >
                    {t.payAgain}
                </button>
            </RoomCard>
        );
    }

    return (
        <RoomCard className="p-5 sm:p-6">
            <div className="flex items-center gap-2">
                <ChalkboardTeacher size={16} className="text-warm-primary" />
                <Eyebrow>{t.title}</Eyebrow>
            </div>
            <p className={`mt-2 text-sm leading-relaxed ${bodyText}`}>
                {t.pitch}
            </p>
            <button
                type="button"
                onClick={requestReview}
                disabled={busy}
                className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-warm-primary hover:bg-warm-primary-active text-warm-on-primary text-sm font-semibold transition-colors disabled:opacity-60"
            >
                {busy && <SpinnerGap size={15} className="animate-spin" />}
                {t.cta(formatPrice(review?.price || 15000))}
            </button>
            {error && (
                <p className="mt-2 text-xs text-warm-error">{error}</p>
            )}
        </RoomCard>
    );
}
