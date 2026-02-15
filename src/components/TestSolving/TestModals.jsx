// src/components/TestSolving/TestModals.jsx
import React from 'react';
import { calculateBandScore, formatTime } from '../../utils/ieltsScoring';

export const ModeSelectionModal = ({ show, setTestMode, setTimeLeft, setShowModeSelection }) => {
    if (!show) return null;
    return (
        <div className="absolute inset-0 bg-white/90 z-[999] flex items-center justify-center backdrop-blur-md">
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 max-w-lg w-full text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Test Mode</h2>
                <p className="text-gray-500 mb-8 text-sm">Choose how you want to take this test</p>
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => { setTestMode('exam'); setShowModeSelection(false); }} className="bg-white hover:bg-red-50 border border-gray-200 hover:border-red-200 p-6 rounded-xl group transition-all shadow-sm hover:shadow-md">
                        <div className="text-3xl mb-3">🎓</div>
                        <h3 className="font-bold text-gray-900 group-hover:text-red-600">Exam Mode</h3>
                        <p className="text-gray-400 text-xs mt-2">No pause. Real exam conditions.</p>
                    </button>
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
};

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