import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import IELTSVideoPlayer from './IELTSVideoPlayer';

const BigCheckmark = () => (
    <svg className="w-16 h-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
    </svg>
);

const MockExamIntro = ({ onStartModule, completedModules = [], onFinish, userName, autoStartDeadline, setAutoStartDeadline }) => {
    const isAllCompleted = completedModules.length >= 3;
    const isAnyCompleted = completedModules.length > 0;

    // Sequential lock: Reading requires Listening, Writing requires Reading
    const isReadingLocked = !completedModules.includes('listening');
    const isWritingLocked = !completedModules.includes('reading');

    const [listeningExpanded, setListeningExpanded] = useState(false);
    const [listeningConfirmed, setListeningConfirmed] = useState(false);
    const [listeningWatched, setListeningWatched] = useState(false);
    const [readingExpanded, setReadingExpanded] = useState(false);
    const [readingConfirmed, setReadingConfirmed] = useState(false);
    const [readingWatched, setReadingWatched] = useState(false);
    const [writingExpanded, setWritingExpanded] = useState(false);
    const [writingConfirmed, setWritingConfirmed] = useState(false);
    const [writingWatched, setWritingWatched] = useState(false);

    // ─── Auto-Start Logic ───────────────────────────────────────────────────
    const activeModule = !completedModules.includes('listening') ? 'listening' :
                        (!completedModules.includes('reading') ? 'reading' :
                        (!completedModules.includes('writing') ? 'writing' : null));
    
    const [autoStartTimer, setAutoStartTimer] = useState(180);
    const prevWatchedRef = useRef(false);

    // Determine if the currently active module's video has been watched
    const isCurrentWatched = (activeModule === 'listening' && listeningWatched) ||
                             (activeModule === 'reading' && readingWatched) ||
                             (activeModule === 'writing' && writingWatched);

    // 1. Manage the Deadline (Persistence)
    useEffect(() => {
        if (!activeModule && !isAllCompleted) return;

        // If no deadline exists, create one (3 minutes from now)
        if (!autoStartDeadline) {
            const newDeadline = Date.now() + 180 * 1000;
            setAutoStartDeadline(newDeadline);
        }
    }, [activeModule, isAllCompleted, autoStartDeadline, setAutoStartDeadline]);

    // 2. Handle Video Watch (Reset deadline to 3 mins from NOW)
    useEffect(() => {
        if (isCurrentWatched && !prevWatchedRef.current) {
            const newDeadline = Date.now() + 180 * 1000;
            setAutoStartDeadline(newDeadline);
        }
        prevWatchedRef.current = isCurrentWatched;
    }, [isCurrentWatched, setAutoStartDeadline]);

    // 3. The countdown effect based on the Deadline
    useEffect(() => {
        if (!autoStartDeadline) return;

        const interval = setInterval(() => {
            const remaining = Math.max(0, Math.round((autoStartDeadline - Date.now()) / 1000));
            setAutoStartTimer(remaining);

            if (remaining <= 0) {
                clearInterval(interval);
                // Clear deadline before moving on
                setAutoStartDeadline(null);
                
                if (isAllCompleted) onFinish();
                else if (activeModule) onStartModule(activeModule);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [autoStartDeadline, activeModule, isAllCompleted, onStartModule, onFinish, setAutoStartDeadline]);

    return (
        <div className="min-h-screen bg-white font-sans text-gray-800 antialiased select-none">
            {/* Header: Official style */}
            <header className="w-full border-b border-gray-300 px-6 py-3 bg-white sticky top-0 z-50">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <span className="font-bold text-sm text-zinc-900">{userName}</span>
                    <span className="font-bold tracking-[0.2em] text-xs text-gray-400 uppercase">ENGLEV MOCK</span>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-8 py-12 pb-32">
                {/* Page Title Section */}
                <section className="mb-10">
                    <h1 className="text-[28px] font-bold text-[#e31b23] mb-8 leading-tight">
                        IELTS Familiarisation Test
                    </h1>
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Today</span>
                        <div className="h-[2px] bg-[#e31b23] flex-grow"></div>
                    </div>
                </section>

                {/* Test Sections List */}
                <div className="space-y-6">

                    {/* ═══════════════ FINAL COMPLETION FOOTER (TOP) ═══════════════ */}
                    {completedModules.includes('listening') && 
                     completedModules.includes('reading') && 
                     completedModules.includes('writing') && (
                        <motion.div 
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-8 border border-green-200 rounded-xl bg-white text-center shadow-lg shadow-green-900/5 mb-8"
                        >
                            <h2 className="text-xl font-bold text-zinc-900 mb-2 tracking-tight">You have completed your main test.</h2>
                            <p className="text-sm text-zinc-500 mb-8 max-w-md mx-auto leading-relaxed px-4">
                                Congratulations! You have finished all three modules. 
                                Click below to save your results.
                                <br />
                                <span className="text-[10px] text-zinc-400 uppercase tracking-widest mt-2 block animate-pulse">
                                    Auto-finalizing in {autoStartTimer}s
                                </span>
                            </p>
                            <button 
                                onClick={onFinish}
                                className="px-12 py-3 bg-zinc-900 text-white rounded-lg font-bold text-base hover:bg-black transition-all active:scale-[0.98] shadow-xl shadow-zinc-900/20"
                            >
                                Finish Exam
                            </button>
                        </motion.div>
                    )}

                    {/* ═══════════════ LISTENING ═══════════════ */}
                    <article className={`border rounded-md bg-white shadow-sm transition-all ${completedModules.includes('listening') ? 'border-green-200' : 'border-gray-300'}`}>
                        <div className="p-8">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Listening</h2>
                                    {completedModules.includes('listening') ? (
                                        <p className="text-green-600 font-bold mb-2">Completed</p>
                                    ) : (
                                        <div className="flex items-center gap-3 mb-2">
                                            <p className="text-[#e31b23] font-bold">Not completed</p>
                                            {activeModule === 'listening' && (
                                                <span className="text-[10px] bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">
                                                    Auto-start in {autoStartTimer}s
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    <p className="text-sm text-gray-600 mb-6">Timing: 30 minutes</p>
                                </div>
                                {completedModules.includes('listening') && <BigCheckmark />}
                            </div>

                            {/* Accordion: Test Information */}
                            {!completedModules.includes('listening') && (
                                <>
                                    <button
                                        onClick={() => setListeningExpanded(prev => !prev)}
                                        className="w-full border border-gray-200 rounded bg-gray-50 p-4 flex items-center gap-3 hover:bg-gray-100 transition-colors text-left"
                                    >
                                        <svg 
                                            className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${listeningExpanded ? 'rotate-180' : ''}`} 
                                            fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"
                                        >
                                            <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"></path>
                                        </svg>
                                        <p className="text-sm text-gray-700 font-medium">
                                            Test information. {listeningConfirmed 
                                                ? <span className="text-green-600">Confirmed.</span> 
                                                : <span className="text-[#e31b23]">Not confirmed.</span>
                                            }
                                        </p>
                                    </button>

                                    {listeningExpanded && (
                                        <div className="mt-4 border border-gray-200 rounded-md overflow-hidden bg-gray-50">
                                            <IELTSVideoPlayer storagePath="mock videos/listening.mp4" onWatched={() => setListeningWatched(true)} />
                                            <div className="p-6 border-t border-gray-200 bg-white">
                                                <h3 className="text-lg font-bold text-gray-800 mb-2">Ready?</h3>
                                                <p className="text-sm text-gray-600 mb-4">Please confirm that you have understood the instructions above.</p>
                                                <div className="flex min-h-[44px]">
                                                    <AnimatePresence mode="wait">
                                                        {!listeningConfirmed ? (
                                                            <motion.button
                                                                key="confirm"
                                                                initial={{ opacity: 0, x: -10 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                exit={{ opacity: 0, x: 10 }}
                                                                onClick={() => setListeningConfirmed(true)}
                                                                disabled={!listeningWatched}
                                                                className={`inline-flex items-center gap-2 px-6 py-2.5 rounded font-bold text-sm transition-all active:scale-95 ${listeningWatched ? 'bg-zinc-900 text-white hover:bg-black' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                                                {listeningWatched ? 'I confirm' : 'Watch video first'}
                                                            </motion.button>
                                                        ) : (
                                                            <motion.button
                                                                key="start"
                                                                initial={{ opacity: 0, x: -10 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                onClick={() => onStartModule('listening')}
                                                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#e31b23] text-white rounded font-bold text-sm hover:bg-red-700 transition-all active:scale-95 shadow-lg shadow-red-500/20"
                                                            >
                                                                <span>→</span>
                                                                Start Listening
                                                            </motion.button>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </article>

                    {/* ═══════════════ READING ═══════════════ */}
                    <article className={`border rounded-md bg-white shadow-sm transition-all ${completedModules.includes('reading') ? 'border-green-200' : 'border-gray-300'}`}>
                        <div className="p-8">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Reading</h2>
                                    {completedModules.includes('reading') ? (
                                        <p className="text-green-600 font-bold mb-2">Completed</p>
                                    ) : (
                                        <div className="flex items-center gap-3 mb-2">
                                            <p className="text-[#e31b23] font-bold">Not completed</p>
                                            {activeModule === 'reading' && !isReadingLocked && (
                                                <span className="text-[10px] bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">
                                                    Auto-start in {autoStartTimer}s
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    <p className="text-sm text-gray-600 mb-6">Timing: 60 minutes</p>
                                </div>
                                {completedModules.includes('reading') && <BigCheckmark />}
                            </div>

                            {/* Accordion: Test Information */}
                            {!completedModules.includes('reading') && !isReadingLocked && (
                                <>
                                    <button
                                        onClick={() => setReadingExpanded(prev => !prev)}
                                        className="w-full border border-gray-200 rounded bg-gray-50 p-4 flex items-center gap-3 hover:bg-gray-100 transition-colors text-left"
                                    >
                                        <svg 
                                            className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${readingExpanded ? 'rotate-180' : ''}`} 
                                            fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"
                                        >
                                            <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"></path>
                                        </svg>
                                        <p className="text-sm text-gray-700 font-medium">
                                            Test information. {readingConfirmed 
                                                ? <span className="text-green-600">Confirmed.</span> 
                                                : <span className="text-[#e31b23]">Not confirmed.</span>
                                            }
                                        </p>
                                    </button>

                                    {readingExpanded && (
                                        <div className="mt-4 border border-gray-200 rounded-md overflow-hidden bg-gray-50">
                                            <IELTSVideoPlayer storagePath="mock videos/reading.mp4" onWatched={() => setReadingWatched(true)} />
                                            <div className="p-6 border-t border-gray-200 bg-white">
                                                <h3 className="text-lg font-bold text-gray-800 mb-2">Ready?</h3>
                                                <p className="text-sm text-gray-600 mb-4">Please confirm that you have understood the instructions above.</p>
                                                <div className="flex min-h-[44px]">
                                                    <AnimatePresence mode="wait">
                                                        {!readingConfirmed ? (
                                                            <motion.button
                                                                key="confirm"
                                                                initial={{ opacity: 0, x: -10 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                exit={{ opacity: 0, x: 10 }}
                                                                onClick={() => setReadingConfirmed(true)}
                                                                disabled={!readingWatched}
                                                                className={`inline-flex items-center gap-2 px-6 py-2.5 rounded font-bold text-sm transition-all active:scale-95 ${readingWatched ? 'bg-zinc-900 text-white hover:bg-black' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                                                {readingWatched ? 'I confirm' : 'Watch video first'}
                                                            </motion.button>
                                                        ) : (
                                                            <motion.button
                                                                key="start"
                                                                initial={{ opacity: 0, x: -10 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                onClick={() => onStartModule('reading')}
                                                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#e31b23] text-white rounded font-bold text-sm hover:bg-red-700 transition-all active:scale-95 shadow-lg shadow-red-500/20"
                                                            >
                                                                <span>→</span>
                                                                Start Reading
                                                            </motion.button>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </article>

                    {/* ═══════════════ WRITING ═══════════════ */}
                    <article className={`border rounded-md bg-white shadow-sm transition-all ${completedModules.includes('writing') ? 'border-green-200' : 'border-gray-300'}`}>
                        <div className="p-8">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Writing</h2>
                                    {completedModules.includes('writing') ? (
                                        <p className="text-green-600 font-bold mb-2">Completed</p>
                                    ) : (
                                        <div className="flex items-center gap-3 mb-2">
                                            <p className="text-[#e31b23] font-bold">Not completed</p>
                                            {activeModule === 'writing' && !isWritingLocked && (
                                                <span className="text-[10px] bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">
                                                    Auto-start in {autoStartTimer}s
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    <p className="text-sm text-gray-600 mb-6">Timing: 60 minutes</p>
                                </div>
                                {completedModules.includes('writing') && <BigCheckmark />}
                            </div>

                            {/* Accordion: Test Information */}
                            {!completedModules.includes('writing') && !isWritingLocked && (
                                <>
                                    <button
                                        onClick={() => setWritingExpanded(prev => !prev)}
                                        className="w-full border border-gray-200 rounded bg-gray-50 p-4 flex items-center gap-3 hover:bg-gray-100 transition-colors text-left"
                                    >
                                        <svg 
                                            className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${writingExpanded ? 'rotate-180' : ''}`} 
                                            fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"
                                        >
                                            <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"></path>
                                        </svg>
                                        <p className="text-sm text-gray-700 font-medium">
                                            Test information. {writingConfirmed 
                                                ? <span className="text-green-600">Confirmed.</span> 
                                                : <span className="text-[#e31b23]">Not confirmed.</span>
                                            }
                                        </p>
                                    </button>

                                    {writingExpanded && (
                                        <div className="mt-4 border border-gray-200 rounded-md overflow-hidden bg-gray-50">
                                            <IELTSVideoPlayer storagePath="mock videos/writing.mp4" onWatched={() => setWritingWatched(true)} />
                                            <div className="p-6 border-t border-gray-200 bg-white">
                                                <h3 className="text-lg font-bold text-gray-800 mb-2">Ready?</h3>
                                                <p className="text-sm text-gray-600 mb-4">Please confirm that you have understood the instructions above.</p>
                                                <div className="flex min-h-[44px]">
                                                    <AnimatePresence mode="wait">
                                                        {!writingConfirmed ? (
                                                            <motion.button
                                                                key="confirm"
                                                                initial={{ opacity: 0, x: -10 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                exit={{ opacity: 0, x: 10 }}
                                                                onClick={() => setWritingConfirmed(true)}
                                                                disabled={!writingWatched}
                                                                className={`inline-flex items-center gap-2 px-6 py-2.5 rounded font-bold text-sm transition-all active:scale-95 ${writingWatched ? 'bg-zinc-900 text-white hover:bg-black' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                                                {writingWatched ? 'I confirm' : 'Watch video first'}
                                                            </motion.button>
                                                        ) : (
                                                            <motion.button
                                                                key="start"
                                                                initial={{ opacity: 0, x: -10 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                onClick={() => onStartModule('writing')}
                                                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#e31b23] text-white rounded font-bold text-sm hover:bg-red-700 transition-all active:scale-95 shadow-lg shadow-red-500/20"
                                                                >
                                                                <span>→</span>
                                                                Start Writing
                                                            </motion.button>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </article>

                </div>
            </main>
        </div>
    );
};

export default MockExamIntro;
