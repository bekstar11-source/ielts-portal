// src/components/TestSolving/TestHeader.jsx
import React from 'react';
import { formatTime } from '../../utils/ieltsScoring';

const TestHeader = ({
    test,
    timeLeft,
    saving,
    testMode,
    onFinish,
    textSize,
    setTextSize,
    showResult,
    showModeSelection,
    activePart,
    setAudioTime
}) => {
    const isListening = test?.type?.toLowerCase() === 'listening';

    return (
        <header className="h-16 bg-white/95 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-50 transition-all relative">
            <div className="flex items-center gap-4 flex-1">
                <div className="font-bold text-xl tracking-tight text-gray-900 cursor-default shrink-0">
                    CLC <span className="text-gray-400 font-medium">Portal</span>
                </div>
                <div className="h-5 w-px bg-gray-300 hidden sm:block shrink-0"></div>
                <div className="hidden sm:block">
                    <h1 className="text-sm font-medium text-gray-700 leading-tight line-clamp-2 max-w-[250px]">{test.title}</h1>
                </div>
            </div>

            {/* PLAYER MARKAZI */}
            {isListening && !showModeSelection && !showResult && (
                <div className={`absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md flex justify-center z-[100] ${testMode === 'exam' ? 'pointer-events-none select-none' : 'pointer-events-auto'}`}>
                    {test?.passages?.map((passage, index) => {
                        const src = passage.audio || test?.audio || test?.audio_url || test?.audioUrl || test?.file;
                        if (!src) return null;
                        const isVisible = index === activePart;

                        return (
                            <audio
                                key={index}
                                controls
                                controlsList="nodownload"
                                src={src}
                                style={{ display: isVisible ? 'block' : 'none' }}
                                onTimeUpdate={(e) => isVisible && setAudioTime(e.target.currentTime)}
                                onPause={(e) => { if (testMode === 'exam' && !e.target.ended) e.target.play() }}
                                className="h-10 w-full shadow-md rounded-full bg-gray-50 border border-gray-200"
                            />
                        );
                    })}
                </div>
            )}

            <div className="flex items-center gap-6 justify-end flex-1 z-20">
                {testMode && !showResult && (
                    <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded border hidden md:inline-block ${testMode === 'exam' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200'}`}>{testMode}</span>
                )}
                <div className="hidden md:flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                    <button onClick={() => setTextSize('text-sm')} className={`px-2 py-1 text-xs font-bold rounded-md transition-all ${textSize === 'text-sm' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>A</button>
                    <button onClick={() => setTextSize('text-base')} className={`px-2 py-1 text-sm font-bold rounded-md transition-all ${textSize === 'text-base' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>A</button>
                    <button onClick={() => setTextSize('text-xl')} className={`px-2 py-1 text-base font-bold rounded-md transition-all ${textSize === 'text-xl' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>A</button>
                </div>

                {/* TIMER DISPLAY */}
                {!showResult && !showModeSelection && (
                    <div className={`font-mono text-xl font-bold tabular-nums tracking-tight ${testMode === 'exam' && timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-gray-900'}`}>
                        {testMode === 'practice' ? '⏱️ ' : ''}{formatTime(timeLeft)}
                    </div>
                )}

                {!showResult && !showModeSelection && (
                    <button onClick={onFinish} disabled={saving} className="bg-gray-900 hover:bg-black text-white font-medium text-sm px-5 py-2 rounded-full shadow-sm transition-all transform active:scale-95 disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap">
                        {saving ? "Saving..." : "Finish"}
                    </button>
                )}
                {showResult && (
                    <button onClick={onFinish} className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-full shadow-sm transition-all">Exit</button>
                )}
            </div>
        </header>
    );
};

export default TestHeader;