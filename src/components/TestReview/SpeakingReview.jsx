import React from 'react';
import { Volume2 } from 'lucide-react';

const SpeakingReview = ({ testData, currentAnswers, resultData, isPremium }) => {
    // CurrentAnswers for speaking is usually the audio URL
    const audioUrl = typeof currentAnswers === 'string' ? currentAnswers : currentAnswers?.audio || currentAnswers?.url;

    return (
        <div className="w-full h-full flex flex-col bg-[#F5F5F7] p-8">
            <div className="max-w-2xl mx-auto w-full space-y-8">
                <div className="text-center space-y-4">
                    <div className="inline-flex p-4 rounded-3xl bg-indigo-500/10 text-indigo-600">
                        <Volume2 size={32} />
                    </div>
                    <h2 className="text-3xl font-black tracking-tight text-gray-900">Speaking Test Review</h2>
                    <p className="text-sm text-gray-500 font-medium uppercase tracking-widest">Student Recording</p>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 flex flex-col items-center gap-6">
                    {audioUrl ? (
                        <div className="w-full space-y-4">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 text-center">Playback Control</p>
                            <audio controls src={audioUrl} className="w-full" />
                        </div>
                    ) : (
                        <div className="py-12 text-center opacity-30 italic">No recording found</div>
                    )}
                </div>

                {resultData.feedback && (
                    <div className="bg-indigo-600 text-white p-8 rounded-[2.5rem] shadow-xl shadow-indigo-200">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-4 opacity-70">Teacher Feedback</h3>
                        <p className="text-lg font-medium leading-relaxed">{resultData.feedback}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SpeakingReview;
