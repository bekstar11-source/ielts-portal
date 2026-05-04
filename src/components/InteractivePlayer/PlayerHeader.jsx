import React from "react";
import { Headphones, Sun, Moon, Maximize, Minimize, ChevronDown, TextCursorInput, List, Target, ArrowLeft } from "lucide-react";

export default function PlayerHeader({ 
    isDark, 
    toggleTheme, 
    isFullscreen, 
    toggleFullscreen, 
    onClose, 
    currentStep, 
    setCurrentStep
}) {
    return (
        <header className={`h-16 shrink-0 px-4 md:px-8 flex items-center justify-between border-b ${isDark ? 'border-neutral-800' : 'border-zinc-100'}`}>
            <div className="flex items-center gap-2 md:gap-3 w-[20%] md:w-1/4">
                <button 
                    onClick={onClose}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95 ${isDark ? 'bg-neutral-800 text-emerald-500 hover:bg-neutral-700' : 'bg-zinc-100 text-emerald-600 hover:bg-zinc-200'}`}
                    title="Back to Dashboard"
                >
                    <ArrowLeft size={18} strokeWidth={2.5} />
                </button>
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] hidden xl:block ${isDark ? 'text-neutral-500' : 'text-zinc-400'}`}>Interactive Player</span>
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-2">
                {/* Step Toggle */}
                <div className={`flex items-center p-1 rounded-lg border ${isDark ? 'bg-[#121214] border-neutral-800' : 'bg-zinc-100 border-zinc-200'}`}>
                    {[
                        { id: 1, label: 'Gap', icon: <TextCursorInput size={14} /> },
                        { id: 2, label: 'MCQ', icon: <List size={14} /> },
                        { id: 3, label: 'Task', icon: <Target size={14} /> }
                    ].map((step) => (
                        <button
                            key={step.id}
                            onClick={() => {
                                setCurrentStep(step.id);
                            }}
                            className={`flex items-center gap-2 px-2 md:px-4 py-1 md:py-1.5 rounded-md text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${
                                currentStep === step.id 
                                    ? 'bg-emerald-600 text-white shadow-lg' 
                                    : (isDark ? 'text-neutral-500 hover:text-white' : 'text-zinc-400 hover:text-zinc-900')
                            }`}
                        >
                            {step.icon}
                            <span className="hidden sm:inline">{step.label}</span>
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="flex items-center justify-end gap-1 md:gap-2 w-[20%] md:w-1/4">
                <button 
                    onClick={toggleTheme}
                    className={`p-2 rounded-full transition-colors hidden sm:flex ${isDark ? 'hover:bg-white/5 text-zinc-400 hover:text-white' : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900'}`}
                >
                    {isDark ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <button 
                    onClick={toggleFullscreen}
                    className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/5 text-zinc-400 hover:text-white' : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900'}`}
                >
                    {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                </button>
                <button onClick={onClose} className={`hidden md:flex p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/5 text-zinc-400 hover:text-white' : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900'}`}>
                    <ChevronDown size={24} />
                </button>
            </div>
        </header>
    );
}
