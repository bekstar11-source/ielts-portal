// src/components/TestSolving/TestModals.jsx
import React, { useState, useEffect, useRef } from 'react';
import { calculateBandScore, formatTime } from '../../utils/ieltsScoring';

// ──────────────────────────────────────────────
// AUDIO PRELOADER HOOK
// Berilgan URL-lar ro'yxatini fetch() + blob URL orqali keshga oladi
// ──────────────────────────────────────────────
function useAudioPreloader(audioUrls) {
    const [progress, setProgress] = useState(0);   // 0..100
    const [done, setDone] = useState(false);
    const [error, setError] = useState(null);
    const blobUrls = useRef({});

    useEffect(() => {
        if (!audioUrls || audioUrls.length === 0) {
            setProgress(100);
            setDone(true);
            return;
        }

        let cancelled = false;
        let loaded = 0;

        const load = async (url) => {
            try {
                const res = await fetch(url, { cache: 'force-cache' });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const blob = await res.blob();
                const blobUrl = URL.createObjectURL(blob);
                blobUrls.current[url] = blobUrl;
            } catch (e) {
                console.warn('Audio preload failed for:', url, e.message);
                // Xato bo'lsa ham davom etamiz — original URL ishlatiladi
                blobUrls.current[url] = url;
            }

            if (!cancelled) {
                loaded++;
                setProgress(Math.round((loaded / audioUrls.length) * 100));
                if (loaded === audioUrls.length) setDone(true);
            }
        };

        Promise.all(audioUrls.map(url => load(url))).catch(e => {
            if (!cancelled) setError(e.message);
        });

        return () => { cancelled = true; };
    }, [audioUrls.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

    return { progress, done, error, blobUrls: blobUrls.current };
}

// ──────────────────────────────────────────────
// MODE SELECTION MODAL
// ──────────────────────────────────────────────
export const ModeSelectionModal = ({ show, setTestMode, setTimeLeft, setShowModeSelection, test }) => {
    const [phase, setPhase] = useState('select'); // 'select' | 'preloading'

    // Barcha audio URL-larini testdan to'playmiz
    const allAudioUrls = React.useMemo(() => {
        if (!test?.passages) return [];
        return test.passages
            .map(p => p.audio || test?.audio || test?.audio_url || test?.audioUrl || test?.file)
            .filter(Boolean);
    }, [test]);

    const { progress, done } = useAudioPreloader(phase === 'preloading' ? allAudioUrls : []);

    // Preloading tugaganida testni boshla
    useEffect(() => {
        if (phase === 'preloading' && done) {
            // Kichik pauza (smooth transition uchun)
            setTimeout(() => {
                setTestMode('exam');
                setShowModeSelection(false);
            }, 600);
        }
    }, [done, phase]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!show) return null;

    // ── SELECT phase ──
    if (phase === 'select') {
        return (
            <div className="absolute inset-0 bg-white/90 z-[999] flex items-center justify-center backdrop-blur-md">
                <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 max-w-lg w-full text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Test Mode</h2>
                    <p className="text-gray-500 mb-8 text-sm">Choose how you want to take this test</p>
                    <div className="grid grid-cols-2 gap-4">
                        {/* EXAM MODE — avval audio preload qiladi */}
                        <button
                            onClick={() => setPhase('preloading')}
                            className="bg-white hover:bg-red-50 border border-gray-200 hover:border-red-200 p-6 rounded-xl group transition-all shadow-sm hover:shadow-md"
                        >
                            <div className="text-3xl mb-3">🎓</div>
                            <h3 className="font-bold text-gray-900 group-hover:text-red-600">Exam Mode</h3>
                            <p className="text-gray-400 text-xs mt-2">No pause. Real exam conditions.</p>
                        </button>

                        {/* PRACTICE MODE — to'g'ridan-to'g'ri boshlanadi */}
                        <button
                            onClick={() => {
                                setTestMode('practice');
                                setTimeLeft(0);
                                setShowModeSelection(false);
                            }}
                            className="bg-white hover:bg-green-50 border border-gray-200 hover:border-green-200 p-6 rounded-xl group transition-all shadow-sm hover:shadow-md"
                        >
                            <div className="text-3xl mb-3">🎧</div>
                            <h3 className="font-bold text-gray-900 group-hover:text-green-600">Practice Mode</h3>
                            <p className="text-gray-400 text-xs mt-2">Pause allowed. Self-paced.</p>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── PRELOADING phase ──
    return (
        <div className="absolute inset-0 bg-white/95 z-[999] flex items-center justify-center backdrop-blur-md">
            <div className="bg-white p-10 rounded-2xl shadow-xl border border-gray-100 max-w-sm w-full text-center">
                {/* Animatsiyali ikon */}
                <div className="relative w-20 h-20 mx-auto mb-6">
                    <div className="absolute inset-0 rounded-full bg-blue-100 animate-ping opacity-40"></div>
                    <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200">
                        <span className="text-3xl">{done ? '✅' : '📡'}</span>
                    </div>
                </div>

                <h2 className="text-xl font-bold text-gray-900 mb-1">
                    {done ? 'Ready to Start!' : 'Preparing Audio...'}
                </h2>
                <p className="text-gray-400 text-sm mb-6">
                    {done
                        ? 'All audio files are cached. Starting exam...'
                        : 'Downloading audio files for uninterrupted playback.'}
                </p>

                {/* Progress bar */}
                <div className="w-full bg-gray-100 rounded-full h-2.5 mb-3 overflow-hidden">
                    <div
                        className="h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
                <p className="text-xs text-gray-400 font-mono font-bold">{progress}%</p>

                {/* Part list */}
                {allAudioUrls.length > 0 && (
                    <div className="mt-4 flex gap-2 justify-center">
                        {allAudioUrls.map((url, i) => (
                            <div
                                key={i}
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${progress >= Math.round(((i + 1) / allAudioUrls.length) * 100)
                                        ? 'border-blue-500 bg-blue-500 text-white'
                                        : 'border-gray-200 bg-white text-gray-400'
                                    }`}
                            >
                                {i + 1}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// ──────────────────────────────────────────────
// RESULT MODAL
// ──────────────────────────────────────────────
export const ResultModal = ({ show, test, testMode, score, timeLeft, isReviewing, setIsReviewing, onExit }) => {
    if (!show || isReviewing) return null;

    const totalQuestions = test?.questions?.reduce((acc, q) => acc + (q.items ? q.items.length : 1), 0) || 0;
    const bandScore = calculateBandScore(score, test.type, totalQuestions);

    return (
        <div className="absolute inset-0 bg-white/90 z-50 flex items-center justify-center backdrop-blur-md animate-in fade-in">
            <div className="bg-white p-10 rounded-3xl shadow-2xl border border-gray-100 max-w-md w-full text-center">
                <h3 className="font-bold text-3xl text-gray-900 mb-2">Test Completed 🎉</h3>

                {testMode === 'practice' && (
                    <p className="text-gray-500 mb-4">Time Spent: <span className="font-bold text-gray-800">{formatTime(timeLeft)}</span></p>
                )}

                {test.type !== 'speaking' && test.type !== 'writing' ? (
                    <div className="my-8">
                        <div className="text-7xl font-black text-gray-900 tracking-tighter mb-2">{score}</div>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Correct Answers</p>
                        <div className="mt-8 p-4 bg-blue-50 rounded-2xl">
                            <p className="text-xs font-bold text-blue-500 uppercase mb-1">Your Band Score</p>
                            <p className="text-5xl font-bold text-blue-600">{bandScore}</p>
                        </div>
                    </div>
                ) : (
                    <p className="text-gray-500 my-8">Your answer has been submitted for grading.</p>
                )}
                <div className="flex flex-col gap-3">
                    <button onClick={() => setIsReviewing(true)} className="bg-gray-900 hover:bg-black text-white font-bold py-3.5 rounded-xl w-full transition shadow-lg shadow-gray-200">Review Mistakes</button>
                    <button onClick={onExit} className="text-gray-500 hover:text-gray-900 font-bold py-3 rounded-xl w-full transition">Exit</button>
                </div>
            </div>
        </div>
    );
};