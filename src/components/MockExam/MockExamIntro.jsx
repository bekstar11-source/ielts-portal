import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import IELTSVideoPlayer from './IELTSVideoPlayer';
import Logo from '../common/Logo';

const BigCheckmark = () => (
    <svg className="w-16 h-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
    </svg>
);

const ModuleCard = ({ 
    title, 
    timing, 
    isCompleted, 
    isLocked, 
    isExpanded, 
    onToggleExpand, 
    isConfirmed, 
    onConfirm, 
    onStart, 
    videoPath 
}) => {
    return (
        <article className={`border rounded-md bg-white shadow-sm transition-all ${isCompleted ? 'border-green-200' : 'border-gray-300'}`}>
            <div className="p-8">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">{title}</h2>
                        {isCompleted ? (
                            <p className="text-green-600 font-bold mb-2">Completed</p>
                        ) : (
                            <div className="flex items-center gap-3 mb-2">
                                <p className={`font-bold ${isLocked ? 'text-gray-400' : 'text-[#e31b23]'}`}>
                                    {isLocked ? 'Locked' : 'Not completed'}
                                </p>
                            </div>
                        )}
                        <p className="text-sm text-gray-600 mb-6">Timing: {timing}</p>
                    </div>
                    {isCompleted && <BigCheckmark />}
                </div>

                {!isCompleted && !isLocked && (
                    <>
                        <button
                            onClick={onToggleExpand}
                            className="w-full border border-gray-200 rounded bg-gray-50 p-4 flex items-center gap-3 hover:bg-gray-100 transition-colors text-left"
                        >
                            <svg 
                                className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                                fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"
                            >
                                <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"></path>
                            </svg>
                            <p className="text-sm text-gray-700 font-medium">
                                Test information. {isConfirmed 
                                    ? <span className="text-green-600">Confirmed.</span> 
                                    : <span className="text-[#e31b23]">Not confirmed.</span>
                                }
                            </p>
                        </button>

                        {isExpanded && (
                            <div className="mt-4 border border-gray-200 rounded-md overflow-hidden bg-gray-50">
                                <IELTSVideoPlayer storagePath={videoPath} onWatched={() => {}} />
                                <div className="p-6 border-t border-gray-200 bg-white">
                                    <h3 className="text-lg font-bold text-gray-800 mb-2">Ready?</h3>
                                    <p className="text-sm text-gray-600 mb-4">Please confirm that you have understood the instructions above.</p>
                                    <div className="flex min-h-[44px]">
                                        <AnimatePresence mode="wait">
                                            {!isConfirmed ? (
                                                <motion.button
                                                    key="confirm"
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: 10 }}
                                                    onClick={onConfirm}
                                                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-zinc-900 text-white rounded font-bold text-sm hover:bg-black transition-all active:scale-[0.98] shadow-lg shadow-zinc-900/10"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                                    I confirm
                                                </motion.button>
                                            ) : (
                                                <motion.button
                                                    key="start"
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    onClick={onStart}
                                                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#e31b23] text-white rounded font-bold text-sm hover:bg-red-700 transition-all active:scale-[0.98] shadow-lg shadow-red-500/20"
                                                >
                                                    <span>→</span>
                                                    Start {title}
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
    );
};

const MockExamIntro = ({ onStartModule, completedModules = [], onFinish, userName }) => {
    const isAllCompleted = completedModules.includes('listening') && 
                          completedModules.includes('reading') && 
                          completedModules.includes('writing');

    const [expanded, setExpanded] = useState({ listening: false, reading: false, writing: false });
    const [confirmed, setConfirmed] = useState({ listening: false, reading: false, writing: false });

    return (
        <div className="min-h-screen bg-white font-sans text-gray-800 antialiased select-none">
            <header className="w-full border-b border-gray-300 px-6 py-3 bg-white sticky top-0 z-50">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <span className="font-bold text-sm text-zinc-900">{userName}</span>
                    <Logo size="xs" tone="ink" suffix="Mock" />
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-8 py-12 pb-32">
                <section className="mb-10">
                    <h1 className="text-[28px] font-bold text-[#e31b23] mb-8 leading-tight">IELTS Familiarisation Test</h1>
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Today</span>
                        <div className="h-[2px] bg-[#e31b23] flex-grow"></div>
                    </div>
                </section>

                <div className="space-y-6">
                    {isAllCompleted && (
                        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="p-8 border border-green-200 rounded-xl bg-white text-center shadow-lg shadow-green-900/5 mb-8">
                            <h2 className="text-xl font-bold text-zinc-900 mb-2 tracking-tight">You have completed your main test.</h2>
                            <p className="text-sm text-zinc-500 mb-8 max-w-md mx-auto leading-relaxed px-4">Congratulations! You have finished all three modules. Click below to save your results.</p>
                            <button onClick={onFinish} className="px-12 py-3 bg-zinc-900 text-white rounded-lg font-bold text-base hover:bg-black transition-all active:scale-[0.98] shadow-xl shadow-zinc-900/20">Finish Exam</button>
                        </motion.div>
                    )}

                    <ModuleCard 
                        title="Listening" 
                        timing="30 minutes"
                        isCompleted={completedModules.includes('listening')}
                        isLocked={false}
                        isExpanded={expanded.listening}
                        onToggleExpand={() => setExpanded(p => ({ ...p, listening: !p.listening }))}
                        isConfirmed={confirmed.listening}
                        onConfirm={() => setConfirmed(p => ({ ...p, listening: true }))}
                        onStart={() => onStartModule('listening')}
                        videoPath="mock videos/listening.mp4"
                    />

                    <ModuleCard 
                        title="Reading" 
                        timing="60 minutes"
                        isCompleted={completedModules.includes('reading')}
                        isLocked={!completedModules.includes('listening')}
                        isExpanded={expanded.reading}
                        onToggleExpand={() => setExpanded(p => ({ ...p, reading: !p.reading }))}
                        isConfirmed={confirmed.reading}
                        onConfirm={() => setConfirmed(p => ({ ...p, reading: true }))}
                        onStart={() => onStartModule('reading')}
                        videoPath="mock videos/reading.mp4"
                    />

                    <ModuleCard 
                        title="Writing" 
                        timing="60 minutes"
                        isCompleted={completedModules.includes('writing')}
                        isLocked={!completedModules.includes('reading')}
                        isExpanded={expanded.writing}
                        onToggleExpand={() => setExpanded(p => ({ ...p, writing: !p.writing }))}
                        isConfirmed={confirmed.writing}
                        onConfirm={() => setConfirmed(p => ({ ...p, writing: true }))}
                        onStart={() => onStartModule('writing')}
                        videoPath="mock videos/writing.mp4"
                    />
                </div>
            </main>
        </div>
    );
};

export default MockExamIntro;
