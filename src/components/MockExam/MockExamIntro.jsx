import React from 'react';
import { Particles } from '../ui/particles';

const MockExamIntro = ({ onStart }) => {
    return (
        <div className="relative min-h-screen bg-gray-50 flex items-center justify-center p-4 overflow-hidden font-sans select-none">
            <Particles className="absolute inset-0 z-0 pointer-events-none" quantity={120} ease={80} color="#64748b" refresh />
            
            <div className="relative z-10 w-full max-w-4xl bg-white/80 backdrop-blur-xl border border-gray-200 p-10 md:p-14 rounded-[32px] text-center shadow-2xl animate-in fade-in zoom-in duration-700">
                <div className="inline-flex items-center justify-center p-4 bg-gray-100 rounded-full mb-8 shadow-sm border border-gray-200">
                    <svg className="w-10 h-10 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21l9-5-9-5-9 5 9 5z" />
                    </svg>
                </div>

                <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tight text-gray-900 uppercase" style={{ letterSpacing: "-0.03em" }}>
                    IELTS Mock Exam
                </h1>
                <p className="text-gray-500 text-lg md:text-xl mb-12 font-medium">Please read the instructions carefully before starting the test.</p>

                <div className="grid md:grid-cols-3 gap-6 mb-12 text-left">
                    <InstructionCard title="Listening" duration="30 minutes" parts="4 parts" color="blue" />
                    <InstructionCard title="Reading" duration="60 minutes" parts="3 passages" color="emerald" />
                    <InstructionCard title="Writing" duration="60 minutes" parts="2 tasks" color="purple" />
                </div>

                <div className="max-w-3xl mx-auto mb-12 bg-red-50 border border-red-200 rounded-2xl p-5 text-left flex items-start gap-4">
                    <svg className="w-7 h-7 text-red-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <p className="text-gray-700 text-[15px] leading-relaxed">
                        <strong className="text-red-900 block mb-1">Strict Proctoring Rules:</strong> This test requires Full-Screen mode. Violating the rules 3 times will result in an automatic termination.
                    </p>
                </div>

                <button onClick={onStart} className="w-full md:w-auto px-16 py-5 bg-gray-900 text-white rounded-full font-black tracking-widest text-lg hover:bg-black transition-all shadow-xl active:scale-95">
                    START EXAMINATION
                </button>
            </div>
        </div>
    );
};

const InstructionCard = ({ title, duration, parts, color }) => (
    <div className="bg-white border border-gray-200 p-6 rounded-2xl flex flex-col gap-3 shadow-sm hover:shadow-md transition-all">
        <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full bg-${color}-50 flex items-center justify-center`}>
                <div className={`w-4 h-4 text-${color}-600`} />
            </div>
            <span className={`text-${color}-600 font-bold uppercase tracking-wider text-xs`}>{title}</span>
        </div>
        <span className="text-gray-900 text-2xl font-black mt-1">{title}</span>
        <span className="text-gray-500 text-sm font-medium">{duration} • {parts}</span>
    </div>
);

export default MockExamIntro;
