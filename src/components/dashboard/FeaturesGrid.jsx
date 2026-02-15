import React from 'react';
import { Mic, PenTool, Headphones, BookOpen } from 'lucide-react';

const FeaturesGrid = () => {
    return (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in-up mb-12" style={{ animationDelay: '0.6s' }}>
            <style>{`
                .glass-card {
                    background: rgba(15, 15, 15, 0.6);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    box-shadow: 0 0 0 1px rgba(0,0,0,0.2);
                }
                .glass-card:hover {
                    border-color: rgba(255, 85, 32, 0.5);
                    box-shadow: 0 0 30px rgba(255, 85, 32, 0.15);
                    transform: translateY(-2px);
                    background: rgba(20, 20, 20, 0.8);
                }
            `}</style>

            {/* Speaking */}
            <div className="glass-card p-6 rounded-2xl cursor-pointer group hover:bg-white/5 transition-all duration-300">
                <div className="flex items-center gap-4 mb-3">
                    <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all">
                        <Mic className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-white text-lg">Speaking</h4>
                </div>
                <p className="text-sm text-vetra-textMuted">AI examiner bilan mashq qiling</p>
            </div>

            {/* Writing */}
            <div className="glass-card p-6 rounded-2xl cursor-pointer group hover:bg-white/5 transition-all duration-300">
                <div className="flex items-center gap-4 mb-3">
                    <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-all">
                        <PenTool className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-white text-lg">Writing</h4>
                </div>
                <p className="text-sm text-vetra-textMuted">Task 1 va Task 2 tahlili</p>
            </div>

            {/* Listening */}
            <div className="glass-card p-6 rounded-2xl cursor-pointer group hover:bg-white/5 transition-all duration-300">
                <div className="flex items-center gap-4 mb-3">
                    <div className="p-2.5 rounded-xl bg-yellow-500/10 text-yellow-400 group-hover:bg-yellow-500 group-hover:text-white transition-all">
                        <Headphones className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-white text-lg">Listening</h4>
                </div>
                <p className="text-sm text-vetra-textMuted">Haqiqiy imtihon formatida</p>
            </div>

            {/* Reading */}
            <div className="glass-card p-6 rounded-2xl cursor-pointer group hover:bg-white/5 transition-all duration-300">
                <div className="flex items-center gap-4 mb-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                        <BookOpen className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-white text-lg">Reading</h4>
                </div>
                <p className="text-sm text-vetra-textMuted">Akademik matnlar bilan ishlash</p>
            </div>
        </section>
    );
};

export default FeaturesGrid;
