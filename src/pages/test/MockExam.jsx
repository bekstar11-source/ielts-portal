import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { AlertTriangle, LogOut, X } from "lucide-react";

// Hooks & Components
import { useMockExam } from "../../hooks/useMockExam";
import MockExamIntro from "../../components/MockExam/MockExamIntro";
import MockExamResult from "../../components/MockExam/MockExamResult";
import MockExamSectionIntro from "../../components/MockExam/MockExamSectionIntro";
import { TestSolvingView } from "../../components/MockExam/TestSolvingView";

export default function MockExam() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, userData } = useAuth();
    const mockData = location.state?.mockData;

    const {
        stage, setStage, tests, answers, handleAnswer, 
        timeLeft, setTimeLeft, handleNextStage, finishExam,
        finalResults, completedModules, autoStartDeadline, setAutoStartDeadline,
        resumeAudioTime, resumeActivePart, updateAudioProgress
    } = useMockExam(mockData, user, userData, navigate);

    // UI States
    const [isAudioReady, setIsAudioReady] = useState(false);
    const [activePart, setActivePart] = useState(resumeActivePart || 0);
    const [audioTime, setAudioTime] = useState(0);
    const [textSize, setTextSize] = useState('text-base');
    const [isFullScreen, setIsFullScreen] = useState(!!document.fullscreenElement);
    const [redirectCountdown, setRedirectCountdown] = useState(15);
    const [showBlockModal, setShowBlockModal] = useState(false);

    // Navigation Blocking Logic (Manual popstate handler for BrowserRouter)
    const isTestActive = ['listening', 'reading', 'writing', 'listening_volume_check', 'intro', 'reading_intro', 'writing_intro'].includes(stage);

    useEffect(() => {
        if (!isTestActive) return;

        // Push multiple states to create a deeper "buffer"
        const pushStates = () => {
            window.history.pushState(null, "", window.location.href);
            window.history.pushState(null, "", window.location.href);
        };

        pushStates();

        const handlePopState = (e) => {
            if (isTestActive) {
                // Force stay
                window.history.pushState(null, "", window.location.href);
                // Show strict warning
                setShowBlockModal(true);
            }
        };

        window.addEventListener("popstate", handlePopState);
        
        // Also block the "BeforeUnload" specifically for these stages
        const handleBeforeUnload = (e) => {
            if (isTestActive) {
                const msg = "DIQQAT! Imtihondan chiqsangiz natijangiz saqlanadi va urinish kodingiz kuydi deb hisoblanadi.";
                e.preventDefault();
                e.returnValue = msg;
                return msg;
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener("popstate", handlePopState);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isTestActive, stage]);

    const handleConfirmExit = () => {
        setShowBlockModal(false);
        if (window.confirm("Haqiqatan ham chiqib ketmoqchimisiz? Natijangiz saqlanadi va test yakunlanadi.")) {
            finishExam();
            navigate('/dashboard');
        }
    };

    // Report audio progress to hook for persistence
    const handleSetAudioTime = (time) => {
        setAudioTime(time);
        updateAudioProgress(time, activePart);
    };

    const startModule = async (moduleType) => {
        try {
            // Attempt fullscreen
            try {
                if (document.documentElement.requestFullscreen) {
                    await document.documentElement.requestFullscreen();
                }
            } catch (fsErr) {
                console.warn("Fullscreen request failed:", fsErr);
            }

            if (moduleType === 'listening') {
                const waitTime = Number(tests.listening?.introDuration || 0);
                setStage(waitTime > 0 ? 'listening_volume_check' : 'listening');
                setTimeLeft(30 * 60);
            } else if (moduleType === 'reading') {
                setStage('reading');
                setTimeLeft(3600);
            } else if (moduleType === 'writing') {
                setStage('writing');
                setTimeLeft(3600);
            }
        } catch (err) { 
            console.error("Critical startModule error:", err); 
        }
    };

    // Auto-redirect for test_ended stage
    useEffect(() => {
        if (stage === 'test_ended' && autoStartDeadline) {
            const interval = setInterval(() => {
                const remaining = Math.max(0, Math.round((autoStartDeadline - Date.now()) / 1000));
                setRedirectCountdown(remaining);
                
                if (remaining <= 0) {
                    clearInterval(interval);
                    setAutoStartDeadline(null);
                    const allDone = completedModules.includes('listening') && 
                                    completedModules.includes('reading') && 
                                    completedModules.includes('writing');
                    if (allDone) navigate('/');
                    else setStage('intro');
                }
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [stage, autoStartDeadline, completedModules, navigate, setStage, setAutoStartDeadline]);

    if (stage === 'loading' || stage === 'saving') {
        return <div className="h-screen flex items-center justify-center text-xl font-bold bg-white text-zinc-900 font-sans">Yuklanmoqda...</div>;
    }

    if (stage === 'test_ended') {
        const allModulesDone = completedModules.includes('listening') && 
                               completedModules.includes('reading') && 
                               completedModules.includes('writing');

        return (
            <div className="h-screen flex items-center justify-center bg-[#f1f2f4] font-['Plus_Jakarta_Sans'] p-4">
                <div className="w-full max-w-[600px] bg-white rounded border border-gray-300 shadow-sm overflow-hidden animate-in fade-in zoom-in duration-300">
                    <div className="px-8 py-5 border-b border-gray-100">
                        <h2 className="text-xl font-bold text-zinc-800">
                            {allModulesDone ? 'Exam Completed' : 'Module Ended'}
                        </h2>
                    </div>
                    <div className="p-10 space-y-6">
                        <div className="space-y-4">
                            {allModulesDone ? (
                                <>
                                    <p className="text-zinc-900 font-bold text-xl tracking-tight">You have completed your main test.</p>
                                    <p className="text-zinc-600 leading-relaxed">Congratulations! You have successfully finished all parts of the IELTS Mock Exam. Your answers have been safely stored for review.</p>
                                </>
                            ) : (
                                <>
                                    <p className="text-zinc-700 font-medium">Your module has finished.</p>
                                    <p className="text-zinc-700 font-medium">All of your answers have been stored.</p>
                                    <p className="text-zinc-700 font-medium pt-2">Please wait for further instructions.</p>
                                </>
                            )}
                        </div>
                        
                        <div className="flex justify-center pt-6">
                            {allModulesDone ? (
                                <button 
                                    onClick={() => navigate('/')}
                                    className="px-12 py-3 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-all active:scale-[0.98] shadow-lg shadow-zinc-900/20"
                                >
                                    Go to Dashboard
                                </button>
                            ) : (
                                <button 
                                    onClick={() => setStage('intro')}
                                    className="px-12 py-3 bg-black text-white rounded font-bold text-sm hover:bg-zinc-800 transition-all active:scale-[0.98]"
                                >
                                    Continue
                                </button>
                            )}
                        </div>

                        <div className="pt-4 border-t border-gray-50 text-center">
                            <p className="text-xs text-zinc-400 italic">
                                Automatically redirecting in {redirectCountdown} seconds...
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (stage === 'intro') {
        return <MockExamIntro 
            onStartModule={startModule} 
            completedModules={completedModules}
            onFinish={finishExam}
            userName={userData?.fullName || user?.email || 'Candidate'}
            autoStartDeadline={autoStartDeadline}
            setAutoStartDeadline={setAutoStartDeadline}
        />;
    }
    
    if (stage === 'result') {
        return <MockExamResult 
            results={finalResults} 
            onDashboard={() => navigate('/')} 
            onResults={() => navigate('/my-results')} 
        />;
    }
    
    if (stage === 'reading_intro') {
        return <MockExamSectionIntro title="Reading" duration="60 min" format="3 passages" questions="40" onStart={handleNextStage} />;
    }
    
    if (stage === 'writing_intro') {
        return <MockExamSectionIntro title="Writing" duration="60 min" format="2 tasks" onStart={handleNextStage} color="purple" />;
    }

    return (
        <>
            <TestSolvingView 
                stage={stage}
                tests={tests}
                answers={answers}
                handleAnswer={handleAnswer}
                timeLeft={timeLeft}
                handleNextStage={handleNextStage}
                textSize={textSize}
                setTextSize={setTextSize}
                activePart={activePart}
                setActivePart={(part) => { setActivePart(part); updateAudioProgress(audioTime, part); }}
                setAudioTime={handleSetAudioTime}
                setIsAudioReady={setIsAudioReady}
                isFullScreen={isFullScreen}
                audioTime={audioTime}
                userName={userData?.fullName || user?.email || 'Candidate'}
                resumeAudioTime={resumeAudioTime}
            />

            {/* Strict Navigation Block Modal */}
            {showBlockModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[440px] overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="bg-[#e31b23] p-6 flex flex-col items-center text-center text-white">
                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 scale-110">
                                <AlertTriangle size={32} />
                            </div>
                            <h3 className="text-2xl font-black tracking-tight leading-tight uppercase">DIQQAT! IMTIHON TO'XTATILADI</h3>
                        </div>
                        
                        <div className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div className="flex gap-4 items-start">
                                    <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0 mt-1">
                                        <X className="text-[#e31b23]" size={18} />
                                    </div>
                                    <p className="text-[15px] font-bold text-gray-900 leading-snug">
                                        Sahifani tark etsangiz, imtihon avtomatik yakunlanadi va urinish kodingiz (key) kuyadi.
                                    </p>
                                </div>
                                <div className="flex gap-4 items-start">
                                    <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0 mt-1">
                                        <LogOut className="text-[#e31b23]" size={18} />
                                    </div>
                                    <p className="text-[15px] font-medium text-gray-600 leading-snug">
                                        Hozircha saqlangan javoblaringiz bazaga yuboriladi va siz testni qayta davom ettira olmaysiz.
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 pt-4">
                                <button 
                                    onClick={() => setShowBlockModal(false)}
                                    className="w-full py-4 bg-zinc-900 text-white rounded-xl font-black text-sm uppercase tracking-wider hover:bg-black transition-all active:scale-[0.98] shadow-lg shadow-zinc-900/20"
                                >
                                    Imtihonda qolish
                                </button>
                                <button 
                                    onClick={handleConfirmExit}
                                    className="w-full py-3 text-red-600 font-bold text-xs uppercase tracking-widest hover:bg-red-50 rounded-xl transition-all"
                                >
                                    Ha, chiqish va testni yakunlash
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}