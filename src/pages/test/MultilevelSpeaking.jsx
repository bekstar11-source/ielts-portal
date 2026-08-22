/**
 * Multilevel Speaking: test tanlash va imtihonni o'tash.
 *
 * Bitta sahifa ikkala holatni ham qoplaydi — `:testId` bo'lmasa ro'yxat,
 * bo'lsa imtihon. Ular orasida boshqa hech qanday holat yo'q, shuning uchun
 * ikkita sahifa va ikkita route ortiqcha bo'lardi.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { ArrowLeft } from '@phosphor-icons/react';

import { db, auth } from '../../firebase/firebase';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import MultilevelSession from '../../components/speaking/MultilevelSession';
import { RoomCard, Eyebrow, inkText, bodyText, mutedText, QuietButton } from '../../components/speaking/ui';
import { MULTILEVEL_TESTS, buildMultilevelQuestions } from '../../utils/multilevelTest';

export default function MultilevelSpeaking() {
    const { testId } = useParams();
    const navigate = useNavigate();
    const [tests, setTests] = useState(null);
    const [test, setTest] = useState(null);
    const [error, setError] = useState('');

    // Sessiya identifikatori test yuklangach BIR MARTA yasaladi va imtihon
    // davomida o'zgarmaydi — server javoblarni shu hujjatga yig'adi.
    // `Date.now()` render paytida chaqirilmaydi: render toza qolishi kerak.
    const [sessionId, setSessionId] = useState(null);

    useEffect(() => {
        let alive = true;

        async function load() {
            try {
                if (testId) {
                    const snap = await getDoc(doc(db, MULTILEVEL_TESTS, testId));
                    if (!alive) return;
                    if (!snap.exists()) {
                        setError('Test topilmadi.');
                        return;
                    }
                    setError('');
                    setTest({ id: snap.id, ...snap.data() });
                    setSessionId(`ml_${auth.currentUser?.uid || 'anon'}_${testId}_${Date.now()}`);
                    return;
                }
                setError('');
                const snap = await getDocs(
                    query(collection(db, MULTILEVEL_TESTS), where('published', '==', true))
                );
                if (!alive) return;
                setTests(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
            } catch (e) {
                console.error('Multilevel test load error:', e);
                if (alive) setError('Testni yuklashda xato yuz berdi.');
            }
        }

        load();
        return () => {
            alive = false;
        };
    }, [testId]);

    const questions = useMemo(() => buildMultilevelQuestions(test), [test]);

    return (
        <div className="min-h-screen bg-warm-canvas dark:bg-warm-dark">
            <DashboardHeader />
            <main className="mx-auto max-w-4xl px-4 py-8">
                {error && <p className="text-[14px] text-warm-warning">{error}</p>}

                {!testId && (
                    <>
                        <Eyebrow>Multilevel Speaking</Eyebrow>
                        <h1 className={`mt-2 text-[24px] font-semibold ${inkText}`}>
                            Mavjud testlar
                        </h1>
                        {tests === null && !error && (
                            <p className={`mt-6 text-[14px] ${mutedText}`}>Yuklanmoqda...</p>
                        )}
                        {tests?.length === 0 && (
                            <p className={`mt-6 text-[14px] ${mutedText}`}>
                                Hozircha ochiq test yo'q.
                            </p>
                        )}
                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            {(tests || []).map((item) => (
                                <RoomCard
                                    key={item.id}
                                    className="cursor-pointer p-5 transition-shadow hover:shadow-md"
                                    onClick={() => navigate(`/multilevel-speaking/${item.id}`)}
                                >
                                    <p className={`text-[16px] font-semibold ${inkText}`}>
                                        {item.title || 'Nomsiz test'}
                                    </p>
                                    {item.description && (
                                        <p className={`mt-1 text-[13.5px] ${bodyText}`}>
                                            {item.description}
                                        </p>
                                    )}
                                </RoomCard>
                            ))}
                        </div>
                    </>
                )}

                {testId && test && sessionId && (
                    <>
                        <QuietButton className="mb-5" onClick={() => navigate('/multilevel-speaking')}>
                            <ArrowLeft size={16} /> Testlar
                        </QuietButton>
                        <MultilevelSession
                            questions={questions}
                            sessionId={sessionId}
                            topic={{ id: test.id, title: test.title }}
                            onExit={() => navigate('/multilevel-speaking')}
                        />
                    </>
                )}
            </main>
        </div>
    );
}
