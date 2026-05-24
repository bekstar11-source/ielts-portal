import React from 'react';

/**
 * Full-screen overlay shown while test answers are submitted and band scores are calculated.
 */
export default function ResultsCalculatingScreen({ accent = '#0066cc' }) {
    return (
        <div className="fixed inset-0 z-[10000] flex flex-col h-screen items-center justify-center bg-[#f1f2f4] font-['Plus_Jakarta_Sans'] select-none">
            <div className="flex flex-col items-center max-w-md px-8 text-center animate-in fade-in duration-500">
                <p className="text-[10px] font-bold tracking-[0.35em] text-zinc-400 uppercase mb-10">
                    IELTS
                </p>

                <div className="relative w-20 h-20 mb-10">
                    <div
                        className="absolute inset-0 rounded-full border-[3px] border-zinc-200/80"
                        aria-hidden
                    />
                    <div
                        className="absolute inset-0 rounded-full border-[3px] border-t-transparent border-r-transparent animate-spin"
                        style={{ borderBottomColor: accent, borderLeftColor: accent }}
                        aria-hidden
                    />
                    <div className="absolute inset-3 rounded-full bg-white shadow-sm flex items-center justify-center">
                        <span
                            className="text-[11px] font-black tracking-tight"
                            style={{ color: accent }}
                        >
                            9.0
                        </span>
                    </div>
                </div>

                <h2 className="text-xl font-bold text-zinc-900 tracking-tight mb-2">
                    Please wait a moment
                </h2>
                <p className="text-sm text-zinc-500 leading-relaxed max-w-xs">
                    Your results are being calculated.
                </p>

                <div className="flex gap-1.5 mt-8 justify-center">
                    {[0, 150, 300].map((delay) => (
                        <span
                            key={delay}
                            className="w-1.5 h-1.5 rounded-full animate-bounce"
                            style={{ backgroundColor: accent, opacity: 0.35 + delay / 600, animationDelay: `${delay}ms` }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
