import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2 } from 'lucide-react';
import CompactAudioPreloader from './CompactAudioPreloader';

/**
 * Volume check screen for IELTS Listening.
 * Plays a test tone and allows user to adjust volume before starting.
 */
export default function VolumeCheckScreen({ test, onStart }) {
    const [audioReady, setAudioReady] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [hasPlayed, setHasPlayed] = useState(false);
    const [hasConfirmed, setHasConfirmed] = useState(false);
    const [volume, setVolume] = useState(0.5); 
    
    const masterGainRef = useRef(null);
    const audioCtxRef = useRef(null);

    // Update volume in real-time
    useEffect(() => {
        if (masterGainRef.current) {
            masterGainRef.current.gain.setTargetAtTime(volume * 0.7, 0, 0.05);
        }
    }, [volume]);

    const playTestTone = () => {
        if (isPlaying) return;
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            audioCtxRef.current = ctx;
            
            const masterGain = ctx.createGain();
            masterGain.gain.setValueAtTime(volume * 0.7, ctx.currentTime);
            masterGain.connect(ctx.destination);
            masterGainRef.current = masterGain;

            setIsPlaying(true);
            setHasConfirmed(false);

            const sequence = [
                { freq: 392.00, start: 0.0,  dur: 0.7 },
                { freq: 440.00, start: 0.6,  dur: 0.7 },
                { freq: 523.25, start: 1.2,  dur: 0.7 },
                { freq: 587.33, start: 1.8,  dur: 0.7 },
                { freq: 659.25, start: 2.4,  dur: 0.9 },
                { freq: 587.33, start: 3.2,  dur: 0.6 },
                { freq: 523.25, start: 3.7,  dur: 0.6 },
                { freq: 440.00, start: 4.2,  dur: 1.2 },
            ];

            sequence.forEach(({ freq, start, dur }) => {
                const osc = ctx.createOscillator();
                const noteGain = ctx.createGain(); // For individual note envelope
                osc.connect(noteGain);
                noteGain.connect(masterGain);
                
                osc.type = 'sine';
                osc.frequency.value = freq;
                const t = ctx.currentTime + start;
                
                osc.start(t);
                noteGain.gain.setValueAtTime(0, t);
                noteGain.gain.linearRampToValueAtTime(1, t + 0.08); 
                noteGain.gain.setValueAtTime(1, t + dur - 0.15);
                noteGain.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.05);
                osc.stop(t + dur + 0.1);
            });

            setTimeout(() => {
                setIsPlaying(false);
                setHasPlayed(true);
                if (audioCtxRef.current) {
                    audioCtxRef.current.close();
                    audioCtxRef.current = null;
                    masterGainRef.current = null;
                }
            }, 5600);
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
            setIsPlaying(false);
            setHasPlayed(true);
        }
    };

    // ⚠️ TEXNIK QARZ: bu funksiya `test` PROP OBYEKTINI joyida o'zgartiradi (mutatsiya).
    // React buni "o'zgarish" deb ko'rmaydi — blob URL'lar faqat TestHeader audio manzilini
    // KEYIN o'qigan taqdirdagina qo'llanadi. To'g'ri yechim: blob xaritasini yuqoriga
    // (TestSolvingView state'iga) ko'tarib, TestHeader'ga yangi test obyektini uzatish.
    // Hozircha tegilmadi, chunki audio ijrosini avtomatik tekshirib bo'lmaydi va
    // noto'g'ri o'zgartirish imtihon ovozini butunlay o'chirib qo'yishi mumkin.
    // Eng yomon holatda audio tarmoq URL'idan ijro etiladi — imtihon baribir ishlaydi.
    const handleBlobsReady = (newUrls) => {
        if (!test) return;

        // Replace audio URLs in the test object with blob URLs
        if (test.passages) {
            test.passages.forEach(passage => {
                const src = passage.audio || test.audio || test.audio_url || test.audioUrl || test.file;
                if (src && newUrls[src]) {
                    // Update only the passage's audio if it has one, 
                    // otherwise it relies on the root audio URL which we'll update below
                    if (passage.audio) {
                        passage.audio = newUrls[passage.audio] || passage.audio;
                    }
                }
            });
        }

        if (test.audio && newUrls[test.audio]) test.audio = newUrls[test.audio];
        if (test.audio_url && newUrls[test.audio_url]) test.audio_url = newUrls[test.audio_url];
        if (test.audioUrl && newUrls[test.audioUrl]) test.audioUrl = newUrls[test.audioUrl];
        if (test.file && newUrls[test.file]) test.file = newUrls[test.file];
    };

    const canStart = audioReady;

    return (
        <div className="absolute inset-0 z-[50] flex items-center justify-center">
            {/* Semi-transparent backdrop — lets the blurred test show through */}
            <div className="absolute inset-0 bg-white/30" />

            {/* Card */}
            <motion.div 
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="relative w-full max-w-[380px] bg-white rounded border border-gray-200 shadow-lg overflow-hidden mx-4"
            >
                {/* Top section */}
                <div className="px-8 pt-8 pb-6 text-center">
                    {/* Play button */}
                    <button
                        onClick={playTestTone}
                        disabled={isPlaying}
                        className={`
                            w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5 transition-all border-2
                            ${isPlaying 
                                ? 'bg-zinc-900 border-zinc-900 text-white' 
                                : hasPlayed
                                    ? 'bg-white border-green-500 text-green-500'
                                    : 'bg-white border-gray-300 text-gray-500 hover:border-zinc-900 hover:text-zinc-900'
                            }
                        `}
                    >
                        {isPlaying ? (
                            <div className="flex gap-0.5 items-end h-5">
                                <motion.span animate={{ height: [8, 18, 8] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-1 bg-white rounded-full" />
                                <motion.span animate={{ height: [12, 20, 12] }} transition={{ repeat: Infinity, duration: 0.5, delay: 0.1 }} className="w-1 bg-white rounded-full" />
                                <motion.span animate={{ height: [10, 16, 10] }} transition={{ repeat: Infinity, duration: 0.5, delay: 0.2 }} className="w-1 bg-white rounded-full" />
                            </div>
                        ) : (
                            <Volume2 className="w-6 h-6" />
                        )}
                    </button>

                    <h2 className="text-lg font-bold text-gray-900 mb-1 tracking-tight">Listening volume</h2>
                    <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
                        Play the test sound to check your speakers or headphones. 
                        Adjust the slider if necessary.
                    </p>

                    {/* Volume Slider */}
                    <div className="flex items-center gap-4 mb-8">
                        <div className="flex-1 h-1 bg-gray-100 rounded-full relative group">
                            <input 
                                type="range" 
                                min="0" max="1" step="0.01" 
                                value={volume}
                                onChange={(e) => setVolume(parseFloat(e.target.value))}
                                className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="absolute top-0 left-0 h-full bg-zinc-900 rounded-full transition-all" style={{ width: `${volume * 100}%` }} />
                            <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border border-gray-200 shadow rounded-full group-hover:scale-110 transition-transform" style={{ left: `${volume * 100}%`, marginLeft: '-7px' }} />
                        </div>
                        <span className="text-[11px] font-bold text-gray-400 w-8 tabular-nums">{Math.round(volume * 100)}%</span>
                    </div>

                    {/* Confirm checkbox */}
                    <label className="flex items-center justify-center gap-3 cursor-pointer group mb-4">
                        <input 
                            type="checkbox" 
                            className="hidden" 
                            checked={hasConfirmed}
                            onChange={(e) => setHasConfirmed(e.target.checked)}
                        />
                        <div className={`
                            w-5 h-5 rounded border flex items-center justify-center transition-all
                            ${hasConfirmed ? 'bg-zinc-900 border-zinc-900' : 'bg-gray-50 border-gray-300 group-hover:border-gray-400'}
                        `}>
                            {hasConfirmed && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                        </div>
                        <span className="text-xs font-medium text-gray-600 group-hover:text-gray-900 transition-colors">The volume is correct</span>
                    </label>
                </div>

                {/* Footer button */}
                <div className="p-3 bg-gray-50 border-t border-gray-100 flex flex-col gap-2">
                    <CompactAudioPreloader test={test} onReady={() => setAudioReady(true)} onBlobsReady={handleBlobsReady} />
                    <button 
                        onClick={onStart}
                        disabled={!canStart || !hasConfirmed}
                        className={`
                            w-full py-2.5 rounded font-bold text-sm transition-all
                            ${canStart && hasConfirmed
                                ? 'bg-[#e31b23] text-white shadow-lg shadow-red-500/20 active:scale-[0.98]' 
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }
                        `}
                    >
                        Continue
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
