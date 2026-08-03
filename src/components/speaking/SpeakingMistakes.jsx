/**
 * Speaking bo'yicha takrorlanayotgan xatolar.
 *
 * Manba — `users/{uid}/mistakeSessions` (reading/listening xatolari bilan
 * bitta ombor, `skill: "speaking"` bilan belgilangan). Bitta javobdagi
 * tuzatish o'sha javob bilan birga unutilib ketardi; takrorlanayotgani esa
 * aynan shu yerda ko'rinadi.
 */

import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { ArrowRight, Repeat } from '@phosphor-icons/react';

import { db } from '../../firebase/firebase';
import { RoomCard, Eyebrow, mutedText } from './ui';

const TEXT = {
    uz: {
        title: 'Takrorlanayotgan xatolar',
        hint: 'Oxirgi mashg‘ulotlarda AI shu joylarni bir necha marta tuzatgan.',
        times: (n) => `${n} marta`,
    },
    en: {
        title: 'Repeating mistakes',
        hint: 'The AI corrected these more than once in your recent practice.',
        times: (n) => `${n} times`,
    },
};

/** Bir xil xatolarni birlashtiradi va takrorlanish soni bo'yicha saralaydi. */
function aggregate(sessions) {
    const map = new Map();

    for (const session of sessions) {
        for (const mistake of session.mistakes || []) {
            const key = String(mistake.userAnswer || '').trim().toLowerCase();
            if (!key) continue;
            const existing = map.get(key);
            if (existing) {
                existing.count += 1;
            } else {
                map.set(key, {
                    said: mistake.userAnswer,
                    better: mistake.correctAnswer,
                    why: mistake.explanation,
                    count: 1,
                });
            }
        }
    }

    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 6);
}

/**
 * @param {{ uid: string, lang?: 'uz'|'en', refreshKey?: any }} props
 */
export default function SpeakingMistakes({ uid, lang = 'uz', refreshKey }) {
    const t = TEXT[lang] || TEXT.uz;
    const [rows, setRows] = useState([]);

    useEffect(() => {
        if (!uid) return undefined;
        let alive = true;

        getDocs(
            query(
                collection(db, 'users', uid, 'mistakeSessions'),
                where('skill', '==', 'speaking'),
                orderBy('date', 'desc'),
                limit(20)
            )
        )
            .then((snap) => {
                if (!alive) return;
                setRows(aggregate(snap.docs.map((d) => d.data())));
            })
            .catch((error) => console.error('Speaking mistakes error:', error));

        return () => {
            alive = false;
        };
    }, [uid, refreshKey]);

    if (rows.length === 0) return null;

    return (
        <section className="mt-10">
            <Eyebrow>{t.title}</Eyebrow>
            <p className={`mt-1.5 text-xs ${mutedText}`}>{t.hint}</p>

            <RoomCard className="mt-3 p-5">
                <div className="space-y-3.5">
                    {rows.map((row, index) => (
                        <div key={index}>
                            <div className="flex items-center gap-2 flex-wrap text-sm">
                                <span className={`line-through ${mutedText}`}>
                                    {row.said}
                                </span>
                                <ArrowRight size={13} className="text-warm-muted/60 shrink-0" />
                                <span className="font-medium text-warm-primary">
                                    {row.better}
                                </span>
                                {row.count > 1 && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-warm-warning">
                                        <Repeat size={11} />
                                        {t.times(row.count)}
                                    </span>
                                )}
                            </div>
                            {row.why && (
                                <p className={`mt-1 text-xs leading-relaxed ${mutedText}`}>
                                    {row.why}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            </RoomCard>
        </section>
    );
}
