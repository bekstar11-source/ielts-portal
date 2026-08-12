import React from 'react';

const TEMPLATES = [
    {
        id: 'reading',
        label: 'Reading',
        sub: '3 ta passage • 40 ta savol',
        color: 'emerald',
        icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
        ),
        data: {
            title: "",
            type: "reading",
            difficulty: "medium",
            collectionId: "None",
            tags: [],
            passages: [
                { id: 1, title: "Passage 1", content: "" },
                { id: 2, title: "Passage 2", content: "" },
                { id: 3, title: "Passage 3", content: "" }
            ],
            questions: []
        }
    },
    {
        id: 'listening',
        label: 'Listening',
        sub: '4 ta part • audio fayl',
        color: 'amber',
        icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
        ),
        data: {
            title: "",
            type: "listening",
            difficulty: "full",
            collectionId: "None",
            tags: [],
            audio_url: "",
            introDuration: 0,
            passages: [
                { id: 101, title: "Part 1", content: "", audio: "", extraSilentTime: 0 },
                { id: 102, title: "Part 2", content: "", audio: "", extraSilentTime: 0 },
                { id: 103, title: "Part 3", content: "", audio: "", extraSilentTime: 0 },
                { id: 104, title: "Part 4", content: "", audio: "", extraSilentTime: 0 }
            ],
            questions: []
        }
    },
    {
        id: 'writing',
        label: 'Writing',
        sub: 'Task 1 + Task 2',
        color: 'violet',
        icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
        ),
        data: {
            title: "",
            type: "writing",
            difficulty: "medium",
            collectionId: "None",
            tags: [],
            writingTasks: [
                { task: 1, type: "academic", prompt: "", image: "" },
                { task: 2, type: "essay", prompt: "" }
            ],
            passages: [],
            questions: []
        }
    }
];

const COLOR = {
    emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/70',
    amber:   'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30 hover:border-amber-500/70',
    violet:  'text-violet-600 dark:text-violet-400 bg-violet-500/10 border-violet-500/30 hover:border-violet-500/70',
};

export default function TemplateModal({ show, onSelect, onBlank, isDark }) {
    if (!show) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className={`w-full max-w-lg max-h-[90dvh] rounded-2xl shadow-2xl border overflow-hidden ${isDark ? 'bg-[#1E1E1E] border-white/10' : 'bg-white border-gray-200'}`}>
                <div className="p-4 sm:p-6">
                    <div className="mb-6">
                        <h3 className="text-base font-black tracking-tight">Shablon tanlang</h3>
                        <p className={`text-xs mt-1 ${isDark ? 'opacity-50' : 'text-gray-500'}`}>
                            Tez boshlash uchun tayyor tuzilma tanlang yoki bo'sh varaqdan boshlang
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                        {TEMPLATES.map(tpl => (
                            <button
                                key={tpl.id}
                                onClick={() => onSelect(tpl.data)}
                                className={`p-4 rounded-xl border-2 text-left transition-all duration-200 active:scale-95 ${COLOR[tpl.color]}`}
                            >
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-current/10">
                                    <span className={COLOR[tpl.color].split(' ')[0]}>
                                        {tpl.icon}
                                    </span>
                                </div>
                                <div className={`text-sm font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{tpl.label}</div>
                                <div className={`text-[10px] font-medium mt-0.5 ${isDark ? 'opacity-40' : 'text-gray-500'}`}>{tpl.sub}</div>
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={onBlank}
                        className={`w-full h-10 rounded-xl text-sm font-bold border transition active:scale-95 ${isDark ? 'border-white/10 hover:bg-white/5 text-white' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}
                    >
                        Bo'sh varaqdan boshlash
                    </button>
                </div>
            </div>
        </div>
    );
}
