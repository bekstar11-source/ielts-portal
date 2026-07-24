import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    BookOpen, Headphones, PenTool, Mic, Timer, Sparkles, HelpCircle, Pause, Play, Volume2, CheckSquare, User
} from 'lucide-react';

const MockInterfacePresentation = ({ lang }) => {
    const [activeTab, setActiveTab] = useState('reading');
    const [autoPlay, setAutoPlay] = useState(true);
    const [animationStep, setAnimationStep] = useState(0);

    const tabs = [
        {
            id: 'reading',
            title: lang === 'uz' ? 'Reading Interfeysi' : 'Reading Interface',
            icon: BookOpen,
            desc: lang === 'uz' ? 'Matn chap tomonda, savollar o\'ng tomonda joylashgan. Kalit so\'zlarni belgilash (highlight) va qulay navigatsiya.' : 'Passage on the left, questions on the right. Highlight key phrases and navigate through questions easily.',
            features: lang === 'uz' 
                ? ["Ikki ekranli panel (split-screen)", "Matnni belgilab highlight qilish", "Bir nechta tanlovli va yozma savollar"]
                : ["Split-screen layout", "Text highlighting tool", "Multiple choice & fill questions"]
        },
        {
            id: 'listening',
            title: lang === 'uz' ? 'Listening Bo\'limi' : 'Listening Module',
            icon: Headphones,
            desc: lang === 'uz' ? 'Yuqori sifatli audio va mustaqil ovoz nazorati. Bo\'shliqlarni to\'ldirish va moslashtirish savollari.' : 'High-quality audio streams with volume adjustment. Gap filling and drag-and-drop question styles.',
            features: lang === 'uz'
                ? ["Ovozni moslashtirish tugmalari", "Avtomatik saqlanuvchi inputlar", "Klaviatura orqali tezkor o'tish"]
                : ["Volume customization controls", "Auto-saving input fields", "Keyboard-friendly navigation"]
        },
        {
            id: 'writing',
            title: lang === 'uz' ? 'Writing Ishchi Muhiti' : 'Writing Workspace',
            icon: PenTool,
            desc: lang === 'uz' ? 'Mavzu va insho yozish maydoni parallel joylashgan. So\'zlar sonini hisoblovchi avtomatik hisoblagich.' : 'Prompt text and writing area presented side-by-side. Dynamic character/word counter with auto-saving.',
            features: lang === 'uz'
                ? ["Mavzuni doimiy ko'rib turish", "Real vaqtdagi Word Counter", "Yozilgan matnning xavfsiz saqlanishi"]
                : ["Sticky writing prompt", "Real-time word counter", "Secure background auto-saves"]
        },
        {
            id: 'speaking',
            title: lang === 'uz' ? 'AI Speaking Imtihoni' : 'AI Speaking Simulation',
            icon: Mic,
            desc: lang === 'uz' ? 'AI yordamida IELTS Speaking imtihoni simulyatsiyasi. Haqiqiy imtihon muhiti va tezkor feedback.' : 'AI-driven speaking test simulating official scenarios. Real-time microphone capture and instant evaluation.',
            features: lang === 'uz'
                ? ["Interaktiv AI imtihon oluvchi", "Ovoz to'lqinlari vizualizatsiyasi", "Talaffuz va ravonlik tahlili"]
                : ["Interactive AI Examiner", "Audio wave visualizer", "Pronunciation & fluency feedback"]
        },
        {
            id: 'tools',
            title: lang === 'uz' ? 'Imtihon Boshqaruv Asboblari' : 'Exam Control Center',
            icon: Timer,
            desc: lang === 'uz' ? 'Rasmiy IELTS imtihonidagi kabi tepada taymer va pastda barcha savollar ro\'yxati.' : 'Authentic IELTS console styling with ticking countdown and colored question grid indices.',
            features: lang === 'uz'
                ? ["Tepadagi rasmiy IELTS taymeri", "Qayta tekshirish uchun belgilash (Review)", "Barcha 40 ta savol ro'yxati va holati"]
                : ["Official countdown timer", "Review flag toggle", "40-question interactive grid"]
        }
    ];

    // Auto-rotation tabs
    useEffect(() => {
        if (!autoPlay) return;
        const interval = setInterval(() => {
            setActiveTab((current) => {
                const index = tabs.findIndex(t => t.id === current);
                const nextIndex = (index + 1) % tabs.length;
                return tabs[nextIndex].id;
            });
        }, 8000);
        return () => clearInterval(interval);
    }, [autoPlay]);

    // Mini animation engine inside active tab
    useEffect(() => {
        setAnimationStep(0);
        let interval;
        if (activeTab === 'reading') {
            interval = setInterval(() => {
                setAnimationStep(prev => (prev + 1) % 6);
            }, 1800);
        } else if (activeTab === 'listening') {
            interval = setInterval(() => {
                setAnimationStep(prev => (prev + 1) % 5);
            }, 1800);
        } else if (activeTab === 'writing') {
            interval = setInterval(() => {
                setAnimationStep(prev => (prev + 1) % 8);
            }, 1200);
        } else if (activeTab === 'speaking') {
            interval = setInterval(() => {
                setAnimationStep(prev => (prev + 1) % 6);
            }, 1400);
        } else if (activeTab === 'tools') {
            interval = setInterval(() => {
                setAnimationStep(prev => (prev + 1) % 6);
            }, 1800);
        }
        return () => clearInterval(interval);
    }, [activeTab]);

    return (
        <section className="bg-gray-50 border border-gray-200 rounded-3xl p-6 md:p-10 shadow-sm space-y-8 relative overflow-hidden">
            <style>{`
                @keyframes cursor-blink {
                    0%, 100% { opacity: 0; }
                    50% { opacity: 1; }
                }
                .animate-cursor {
                    animation: cursor-blink 0.8s infinite;
                }
                @keyframes waveform-bounce {
                    0%, 100% { transform: scaleY(0.35); }
                    50% { transform: scaleY(1); }
                }
                .animate-wave-1 { animation: waveform-bounce 0.6s ease-in-out infinite alternate; }
                .animate-wave-2 { animation: waveform-bounce 0.8s ease-in-out infinite alternate 0.15s; }
                .animate-wave-3 { animation: waveform-bounce 0.5s ease-in-out infinite alternate 0.3s; }
                .animate-wave-4 { animation: waveform-bounce 0.7s ease-in-out infinite alternate 0.2s; }
                .animate-wave-5 { animation: waveform-bounce 0.9s ease-in-out infinite alternate 0.08s; }
            `}</style>

            <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-2 text-center md:text-left max-w-2xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-100 text-xs font-bold text-[#e31b23]">
                    <Sparkles size={12} className="animate-pulse" />
                    {lang === 'uz' ? "Zamonaviy Platforma" : "Modern Platform"}
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-gray-955 tracking-tight">
                    {lang === 'uz' ? "Bizning Mock Imtihon Interfeysimiz" : "Our Mock Exam Interface"}
                </h2>
                <p className="text-gray-500 font-medium text-sm md:text-base leading-relaxed">
                    {lang === 'uz'
                        ? "Haqiqiy IELTS on Computer imtihon formatiga to'liq mos keladigan, premium va qulay ishchi muhit bilan tanishing."
                        : "Discover a premium, user-friendly workspace designed to match the official IELTS on Computer exam format."
                    }
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-4">
                {/* Vertical Tabs List */}
                <div className="col-span-12 lg:col-span-5 space-y-3">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id);
                                    setAutoPlay(false);
                                }}
                                className={`w-full flex items-start gap-4 p-4 rounded-2xl text-left border transition-all duration-300 ${
                                    isActive
                                        ? 'bg-white border-red-500/25 shadow-md shadow-red-900/5 scale-[1.01]'
                                        : 'bg-transparent border-transparent hover:bg-gray-150/45 hover:scale-[1.005]'
                                }`}
                            >
                                <div className={`p-3 rounded-xl shrink-0 transition-all duration-300 ${
                                    isActive ? 'bg-[#e31b23] text-white shadow-lg shadow-red-500/10' : 'bg-gray-200/80 text-gray-650'
                                }`}>
                                    <Icon size={18} />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-bold text-sm text-gray-900">{tab.title}</h4>
                                    <p className="text-xs text-gray-500 leading-relaxed font-semibold">
                                        {tab.desc}
                                    </p>
                                    {isActive && (
                                        <div className="flex flex-wrap gap-1.5 pt-2">
                                            {tab.features.map((feat, i) => (
                                                <span key={i} className="text-[10px] bg-red-50 text-[#e31b23] font-bold px-2 py-0.5 rounded-md border border-red-100/50">
                                                    ✓ {feat}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Simulated Screen */}
                <div className="col-span-12 lg:col-span-7 flex flex-col items-center">
                    <div className="w-full max-w-[540px] bg-[#f8f9fa] border border-gray-305 rounded-2xl overflow-hidden shadow-xl flex flex-col h-[350px] relative">
                        {/* Browser window controls header */}
                        <div className="bg-[#343a40] text-white px-4 py-3 flex items-center justify-between text-xs font-bold border-b border-gray-700">
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-full bg-red-500/90 inline-block"></span>
                                <span className="w-3 h-3 rounded-full bg-yellow-500/90 inline-block"></span>
                                <span className="w-3 h-3 rounded-full bg-green-500/90 inline-block"></span>
                            </div>
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest font-mono">
                                {activeTab === 'reading' && 'IELTS READING MODULE SIMULATOR'}
                                {activeTab === 'listening' && 'IELTS LISTENING MODULE SIMULATOR'}
                                {activeTab === 'writing' && 'IELTS WRITING MODULE SIMULATOR'}
                                {activeTab === 'speaking' && 'IELTS AI SPEAKING MODULE SIMULATOR'}
                                {activeTab === 'tools' && 'IELTS CONSOLE CONTROL TOOLBAR'}
                            </span>
                            <span className="bg-[#e31b23] text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">
                                Live Preview
                            </span>
                        </div>

                        {/* Interactive Content Simulator Area */}
                        <div className="flex-1 relative overflow-hidden bg-white">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.35 }}
                                    className="w-full h-full absolute top-0 left-0"
                                >
                                    {activeTab === 'reading' && (
                                        <div className="flex h-full text-[10px] text-gray-700 select-none">
                                            {/* Left Passage Panel */}
                                            <div className="w-1/2 border-r border-gray-200 p-4 overflow-y-auto bg-gray-50 flex flex-col gap-2">
                                                <h4 className="font-extrabold text-gray-905 text-[11px]">The History of Writing Materials</h4>
                                                <p className="leading-relaxed text-gray-600 font-semibold">
                                                    Writing has its origins in the early days of human civilization. Papyrus, made from the pith of the Cyperus papyrus plant, was widely used in ancient Egypt... 
                                                    <span className={`px-1 py-0.5 rounded transition-all duration-500 ${animationStep >= 2 ? 'bg-yellow-250 text-gray-900 font-bold shadow-sm' : ''}`} style={{ backgroundColor: animationStep >= 2 ? '#fef08a' : 'transparent' }}>
                                                        The ancient Egyptians developed papyrus
                                                    </span>
                                                     from the Cyperus plant. This material was crucial for recording documents.
                                                </p>
                                            </div>
                                            {/* Right Questions Panel */}
                                            <div className="w-1/2 p-4 flex flex-col gap-3 bg-white justify-between">
                                                <div>
                                                    <h4 className="font-extrabold text-gray-900 text-[11px] mb-2">Questions 1 - 3</h4>
                                                    <div className="space-y-2">
                                                        <p className="font-bold text-gray-800 leading-snug">1. What writing material did the ancient Egyptians develop?</p>
                                                        <div className="space-y-1.5 pl-1 font-semibold text-gray-655">
                                                            {['A) Animal hides', 'B) Cyperus papyrus', 'C) Clay tablets'].map((opt, i) => {
                                                                const isB = i === 1;
                                                                return (
                                                                    <div key={i} className="flex items-center gap-2">
                                                                        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all duration-300 ${
                                                                            isB && animationStep >= 4 
                                                                                ? 'border-[#e31b23] bg-red-50/50' 
                                                                                : 'border-gray-300 bg-white'
                                                                        }`}>
                                                                            {isB && animationStep >= 4 && (
                                                                                <div className="w-1.5 h-1.5 rounded-full bg-[#e31b23]" />
                                                                            )}
                                                                        </div>
                                                                        <span className={isB && animationStep >= 4 ? 'font-bold text-gray-900' : ''}>{opt}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-[9px] text-gray-400 border-t border-gray-100 pt-2 flex items-center gap-1">
                                                    <HelpCircle size={10} className="text-[#e31b23]" />
                                                    <span>Highlight and double-click to verify.</span>
                                                </div>
                                            </div>

                                            {/* Cursor element */}
                                            <motion.div 
                                                animate={
                                                    animationStep === 0 ? { x: 440, y: 220 } :
                                                    animationStep === 1 ? { x: 75, y: 135 } :
                                                    animationStep === 2 ? { x: 75, y: 135 } :
                                                    animationStep === 3 ? { x: 300, y: 138 } :
                                                    animationStep === 4 ? { x: 300, y: 138 } :
                                                    { x: 440, y: 220 }
                                                }
                                                transition={{ duration: 0.8, ease: "easeInOut" }}
                                                className="absolute w-4 h-4 pointer-events-none z-10"
                                                style={{ left: 0, top: 0 }}
                                            >
                                                <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#e31b23] fill-[#e31b23] drop-shadow-md">
                                                    <path d="M4.5 3v15.25l3.83-3.83 2.92 7.08 3.17-1.33-2.92-7.08h5.5l-12.5-10.14z"/>
                                                </svg>
                                            </motion.div>
                                        </div>
                                    )}

                                    {activeTab === 'listening' && (
                                        <div className="flex flex-col h-full bg-white p-6 justify-between select-none text-[10px] text-gray-700">
                                            {/* Audio Console Mock */}
                                            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <button className="w-9 h-9 rounded-full bg-[#e31b23] text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md shadow-red-500/10">
                                                        {animationStep >= 1 ? <Pause size={14} className="fill-white" /> : <Play size={14} className="fill-white ml-0.5" />}
                                                    </button>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-gray-900 text-xs">Section 1 Audio</span>
                                                        <span className="text-[9px] text-gray-505 font-mono">
                                                            {animationStep >= 1 ? '00:12 / 30:00' : '00:00 / 30:00'}
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                {/* Progress bar */}
                                                <div className="flex-1 max-w-[150px] h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-[#e31b23] transition-all duration-1000" 
                                                        style={{ width: animationStep >= 1 ? '40%' : '0%' }}
                                                    />
                                                </div>
                                                
                                                <Volume2 size={16} className="text-gray-400" />
                                            </div>

                                            {/* Form Fill questions */}
                                            <div className="bg-gray-50 border border-gray-150 rounded-2xl p-4 space-y-3">
                                                <h4 className="font-bold text-gray-900 text-xs">Answer Sheet:</h4>
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-gray-500">Customer Name:</span>
                                                        <span className="text-gray-855 border-b border-gray-300 pb-0.5 font-bold">Jane Doe</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-gray-505">Delivery Address:</span>
                                                        <div className="relative">
                                                            <span className="font-bold text-[#e31b23] border-b border-gray-300 pb-0.5 min-w-[120px] inline-block">
                                                                {animationStep === 0 ? '' :
                                                                 animationStep === 1 ? '' :
                                                                 animationStep === 2 ? 'P' :
                                                                 animationStep === 3 ? 'Park' :
                                                                 'Park Road'}
                                                                <span className="animate-cursor bg-[#e31b23] w-0.5 h-3 inline-block ml-0.5"></span>
                                                            </span>
                                                            {animationStep >= 4 && (
                                                                <CheckSquare size={12} className="text-green-600 absolute right-[-18px] top-1" />
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Cursor element */}
                                            <motion.div 
                                                animate={
                                                    animationStep === 0 ? { x: 440, y: 220 } :
                                                    animationStep === 1 ? { x: 50, y: 50 } : 
                                                    animationStep === 2 ? { x: 200, y: 175 } : 
                                                    animationStep === 3 ? { x: 200, y: 175 } : 
                                                    { x: 440, y: 220 }
                                                }
                                                transition={{ duration: 0.8, ease: "easeInOut" }}
                                                className="absolute w-4 h-4 pointer-events-none z-10"
                                                style={{ left: 0, top: 0 }}
                                            >
                                                <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#e31b23] fill-[#e31b23] drop-shadow-md">
                                                    <path d="M4.5 3v15.25l3.83-3.83 2.92 7.08 3.17-1.33-2.92-7.08h5.5l-12.5-10.14z"/>
                                                </svg>
                                            </motion.div>
                                        </div>
                                    )}

                                    {activeTab === 'writing' && (
                                        <div className="flex h-full text-[9px] text-gray-700 select-none bg-white">
                                            {/* Left Prompt Column */}
                                            <div className="w-2/5 border-r border-gray-200 p-4 bg-gray-50 flex flex-col gap-2 overflow-y-auto">
                                                <span className="text-[8px] font-black uppercase text-[#e31b23] tracking-wider">Writing Task 2</span>
                                                <h4 className="font-bold text-gray-900 text-xs">Prompt:</h4>
                                                <p className="leading-relaxed font-semibold italic text-gray-500">
                                                    Some people believe that universities should focus strictly on providing graduates with career skills. Others argue that academic study is more important...
                                                </p>
                                            </div>
                                            
                                            {/* Right Editor Column */}
                                            <div className="w-3/5 p-4 flex flex-col justify-between bg-white">
                                                <div className="space-y-2 flex-1 flex flex-col">
                                                    <div className="flex items-center justify-between border-b border-gray-150 pb-1.5">
                                                        <span className="font-bold text-gray-900">Candidate Response:</span>
                                                        <span className="text-[8px] bg-green-50 border border-green-100 text-green-605 px-2 py-0.5 rounded font-mono uppercase tracking-wider font-bold">Auto-Saved</span>
                                                    </div>
                                                    
                                                    {/* Textarea simulation */}
                                                    <div className="flex-1 p-2.5 border border-gray-200 rounded-xl text-gray-800 bg-gray-50/50 leading-relaxed font-mono relative overflow-hidden min-h-[140px] text-[9px]">
                                                        {animationStep === 0 && ""}
                                                        {animationStep === 1 && "In my opinion,"}
                                                        {animationStep === 2 && "In my opinion, universities play a"}
                                                        {animationStep === 3 && "In my opinion, universities play a pivotal role in"}
                                                        {animationStep === 4 && "In my opinion, universities play a pivotal role in preparing graduates for"}
                                                        {animationStep === 5 && "In my opinion, universities play a pivotal role in preparing graduates for professional success."}
                                                        {animationStep === 6 && "In my opinion, universities play a pivotal role in preparing graduates for professional success. Higher education should provide practical skills."}
                                                        {animationStep >= 7 && "In my opinion, universities play a pivotal role in preparing graduates for professional success. Higher education should provide practical skills. This ensures job readiness."}
                                                        <span className="animate-cursor bg-[#e31b23] w-0.5 h-3 inline-block ml-0.5"></span>
                                                    </div>
                                                </div>
                                                
                                                {/* Word count footer */}
                                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                                                    <span className={`font-bold transition-all duration-300 text-xs ${animationStep >= 7 ? 'text-green-600 scale-105' : 'text-gray-505'}`}>
                                                        Word Count: {
                                                            animationStep === 0 ? 0 :
                                                            animationStep === 1 ? 3 :
                                                            animationStep === 2 ? 7 :
                                                            animationStep === 3 ? 11 :
                                                            animationStep === 4 ? 15 :
                                                            animationStep === 5 ? 20 :
                                                            animationStep === 6 ? 26 :
                                                            30
                                                        }
                                                    </span>
                                                    <span className="text-[8px] text-gray-400 font-bold">Target: 250+</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'speaking' && (
                                        <div className="flex flex-col h-full bg-slate-950 p-6 justify-between select-none text-white text-[10px] relative">
                                            {/* Examiner card */}
                                            <div className="flex items-center gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
                                                {/* Examiner Avatar */}
                                                <div className="relative">
                                                    <div className={`w-12 h-12 rounded-full bg-gradient-to-tr from-[#e31b23] to-amber-500 flex items-center justify-center shadow-lg transition-all duration-700 ${
                                                        animationStep === 0 ? 'scale-105 ring-4 ring-red-500/20' : 'scale-100'
                                                    }`}>
                                                        <User size={20} className="text-white" />
                                                    </div>
                                                    {animationStep === 0 && (
                                                        <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-extrabold text-xs text-white">AI Speaking Examiner</h4>
                                                    <p className="text-[9px] text-slate-350 leading-relaxed font-semibold italic mt-0.5">
                                                        {animationStep === 0 
                                                            ? '"Describe an interesting place in your country..."' 
                                                            : '"Let\'s evaluate your pronunciation..."'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Waveform / Speak indicator */}
                                            <div className="flex flex-col items-center justify-center gap-3 py-2">
                                                {animationStep >= 2 && animationStep <= 4 ? (
                                                    <div className="flex items-end gap-1.5 h-12">
                                                        <div className="w-1.5 h-8 bg-[#e31b23] rounded-full animate-wave-1"></div>
                                                        <div className="w-1.5 h-12 bg-red-400 rounded-full animate-wave-2"></div>
                                                        <div className="w-1.5 h-7 bg-amber-500 rounded-full animate-wave-3"></div>
                                                        <div className="w-1.5 h-10 bg-[#e31b23] rounded-full animate-wave-4"></div>
                                                        <div className="w-1.5 h-6 bg-amber-405 rounded-full animate-wave-5"></div>
                                                    </div>
                                                ) : (
                                                    <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest animate-pulse">
                                                        {animationStep === 0 ? "Examiner is speaking" : "AI Analysing Audio..."}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Mic control action */}
                                            <div className="flex items-center justify-between border-t border-slate-900 pt-3">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2.5 h-2.5 rounded-full ${animationStep >= 2 && animationStep <= 4 ? 'bg-red-500 animate-pulse' : 'bg-slate-700'}`} />
                                                    <span className="font-mono text-[9px] text-slate-300 font-bold uppercase">
                                                        {animationStep >= 2 && animationStep <= 4 ? 'RECORDING 00:04' : 'STANDBY'}
                                                    </span>
                                                </div>
                                                
                                                {animationStep >= 5 && (
                                                    <div className="bg-green-500/10 border border-green-500/20 text-green-400 rounded px-2 py-0.5 text-[8px] font-black uppercase tracking-wider">
                                                        AI Grade: Band 7.5
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'tools' && (
                                        <div className="flex flex-col h-full bg-white select-none text-[9px] text-gray-700">
                                            {/* Exam Header */}
                                            <div className="bg-[#f8f9fa] border-b border-gray-200 px-4 py-2.5 flex items-center justify-between font-semibold shadow-sm text-gray-800">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-xs text-[#e31b23] tracking-tight">IELTS</span>
                                                    <span className="text-[8px] font-bold text-gray-400 uppercase border-l border-gray-300 pl-2">Reading Module</span>
                                                </div>
                                                
                                                {/* Ticking Timer */}
                                                <div className="flex items-center gap-2 bg-[#ffeef0] border border-red-200 px-3 py-1 rounded-xl text-[#e31b23] font-bold font-mono text-[9px]">
                                                    <Timer size={10} />
                                                    <span>Time Left: 39:{animationStep === 0 ? '59' : animationStep === 1 ? '58' : animationStep === 2 ? '57' : animationStep === 3 ? '56' : animationStep === 4 ? '55' : '54'}</span>
                                                </div>
                                                
                                                <div className="flex items-center gap-2">
                                                    <div className={`flex items-center gap-1 border px-2 py-0.5 rounded text-[8px] transition-all font-bold ${
                                                        animationStep >= 4 ? 'bg-amber-50 border-amber-300 text-amber-600' : 'bg-white border-gray-300 text-gray-500'
                                                    }`}>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={animationStep >= 4} 
                                                            readOnly
                                                            className="accent-amber-500" 
                                                        />
                                                        <span>Review</span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Exam Center Body */}
                                            <div className="flex-1 p-4 bg-gray-50/20 flex flex-col justify-between">
                                                <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-1">
                                                    <h5 className="font-bold text-gray-900 text-[10px]">Question 5:</h5>
                                                    <p className="text-gray-500 leading-relaxed font-semibold">The scientific findings were ________ consistent with the historical data.</p>
                                                </div>
                                                
                                                {/* Navigation Grid Footer */}
                                                <div className="border-t border-gray-200 pt-3">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Question Navigation:</span>
                                                        <span className="text-[8px] text-[#e31b23] font-bold">1 of 10</span>
                                                    </div>
                                                    
                                                    {/* Number grid */}
                                                    <div className="grid grid-cols-10 gap-1.5 bg-white p-1.5 rounded-xl border border-gray-150 shadow-sm">
                                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                                                            const isActive = num === (animationStep >= 2 && animationStep <= 4 ? 5 : 1);
                                                            const isAnswered = num === 1 && animationStep >= 3;
                                                            const isReview = num === 5 && animationStep >= 4;
                                                            
                                                            return (
                                                                <div 
                                                                    key={num} 
                                                                    className={`aspect-square rounded-md flex items-center justify-center font-extrabold text-[9px] transition-all border ${
                                                                        isActive ? 'bg-[#e31b23] border-[#e31b23] text-white shadow-sm shadow-red-500/10' :
                                                                        isReview ? 'bg-amber-400 border-amber-400 text-white' :
                                                                        isAnswered ? 'bg-gray-700 border-gray-700 text-white' :
                                                                        'bg-gray-50 border-gray-200 text-gray-555'
                                                                    }`}
                                                                >
                                                                    {num}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Cursor element */}
                                            <motion.div 
                                                animate={
                                                    animationStep === 0 ? { x: 440, y: 220 } :
                                                    animationStep === 1 ? { x: 440, y: 220 } :
                                                    animationStep === 2 ? { x: 212, y: 236 } : 
                                                    animationStep === 3 ? { x: 480, y: 40 } : 
                                                    animationStep === 4 ? { x: 480, y: 40 } : 
                                                    { x: 440, y: 220 }
                                                }
                                                transition={{ duration: 0.8, ease: "easeInOut" }}
                                                className="absolute w-4 h-4 pointer-events-none z-10"
                                                style={{ left: 0, top: 0 }}
                                            >
                                                <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#e31b23] fill-[#e31b23] drop-shadow-md">
                                                    <path d="M4.5 3v15.25l3.83-3.83 2.92 7.08 3.17-1.33-2.92-7.08h5.5l-12.5-10.14z"/>
                                                </svg>
                                            </motion.div>
                                        </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default MockInterfacePresentation;
