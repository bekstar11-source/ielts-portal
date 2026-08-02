import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Hooks & Components
import { useMockExam, getListeningDuration, TEST_ENDED_AUTO_ADVANCE_SEC } from "../../hooks/useMockExam";
import { useExamSecurity, isFullscreenActive } from "../../hooks/useExamSecurity";
import MockExamIntro from "../../components/MockExam/MockExamIntro";
import MockExamResult from "../../components/MockExam/MockExamResult";
import MockExamSectionIntro from "../../components/MockExam/MockExamSectionIntro";
import { TestSolvingView } from "../../components/MockExam/TestSolvingView";
import ResultsCalculatingScreen from "../../components/TestSolving/ResultsCalculatingScreen";
import { Maximize } from "lucide-react";
const SECURITY_ACTIVE_STAGES = ['listening', 'reading', 'writing', 'listening_volume_check', 'intro', 'test_ended'];

export default function MockExam() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, userData } = useAuth();

    // Restore mockData: prefer location.state, fallback to localStorage backup.
    // useMemo SHART: fallback yo'li har renderda YANGI obyekt qaytarardi, natijada
    // quyidagi effekt cheksiz qayta ishga tushib, imtihon tugagach tozalangan
    // 'ielts_mock_active_data' ni darhol qayta yozib qo'yardi.
    const mockData = useMemo(() => {
        if (location.state?.mockData) return location.state.mockData;
        try {
            const backup = localStorage.getItem('ielts_mock_active_data');
            return backup ? JSON.parse(backup) : null;
        } catch {
            return null;
        }
    }, [location.state]);

    // Save mockData to localStorage as backup (survives refresh even if pushState wipes state)
    useEffect(() => {
        if (mockData) {
            try { localStorage.setItem('ielts_mock_active_data', JSON.stringify(mockData)); } catch { /* kvota to'lgan bo'lishi mumkin */ }
        }
    }, [mockData]);

    // If no mockData at all, redirect to entry
    useEffect(() => {
        // '/mock-entry' degan route mavjud emas edi — catch-all orqali bosh sahifaga otardi.
        if (!mockData) navigate('/mock', { replace: true });
    }, [mockData, navigate]);

    const {
        stage, setStage, tests, answers, handleAnswer, 
        timeLeft, setTimeLeft, handleNextStage, finishExam,
        finalResults, submitError, completedModules, autoStartDeadline,
        resumeAudioTime, resumeActivePart, updateAudioProgress,
        tabSwitchCount, mockId, clearExamSession,
        updateListeningDuration
    } = useMockExam(mockData, user, userData, navigate);

    // UI States
    const [activePart, setActivePart] = useState(0);

    // resumeActivePart sessiya tiklangandan KEYIN (async) keladi, useState esa boshlang'ich
    // qiymatni bir marta o'qiydi — shuning uchun ilgari qism hech qachon tiklanmasdi.
    useEffect(() => {
        if (resumeActivePart) setActivePart(resumeActivePart);
    }, [resumeActivePart]);
    const [audioTime, setAudioTime] = useState(0);
    const [textSize, setTextSize] = useState('text-base');
    const [isFullScreen, setIsFullScreen] = useState(!!document.fullscreenElement);
    const [redirectCountdown, setRedirectCountdown] = useState(TEST_ENDED_AUTO_ADVANCE_SEC);
    const [showCheatWarning, setShowCheatWarning] = useState(false);
    const [showExitModal, setShowExitModal] = useState(false);
    const [showFullscreenOverlay, setShowFullscreenOverlay] = useState(false);

    // Security Hook Integration
    useExamSecurity({
        enabled: SECURITY_ACTIVE_STAGES.includes(stage),
        onSecurityViolation: (type) => {
            if (type === 'fullscreen_exit') {
                setShowFullscreenOverlay(true);
            }
            // Talaba to'liq ekranga qaytdi (F11 orqali ham) — overlay'ni darhol
            // yopamiz. Aks holda u yozuv maydonini bosib turar va Writing'da
            // matn terib bo'lmasdi.
            if (type === 'fullscreen_restored') {
                setShowFullscreenOverlay(false);
            }
            // Only count tab switches during actual test solving
            const solvingStages = ['listening', 'reading', 'writing'];
            if (type === 'tab_switch' && solvingStages.includes(stage)) {
                setShowCheatWarning(true);
            }
            // "Back" tugmasi / swipe-back — chiqishni tasdiqlashni so'raymiz.
            // Faqat test ishlanayotgan bosqichlarda: modal shu bosqichlarda render qilinadi,
            // boshqa ekranlar undan oldin `return` qiladi va modal ko'rinmay qolardi.
            if (type === 'back_navigation' && solvingStages.includes(stage)) {
                setShowExitModal(true);
            }
        }
    });

    // Enforcement on mount/stage change
    useEffect(() => {
        if (SECURITY_ACTIVE_STAGES.includes(stage) && !isFullscreenActive() && stage !== 'loading' && stage !== 'saving') {
            setShowFullscreenOverlay(true);
        }
    }, [stage]);

    // Xavfsizlik to'ri: overlay ochiq qolib ketmasligi uchun uni doimiy
    // tekshirib turamiz. Fullscreen hodisalari ba'zi brauzer/OS kombinatsiyalarida
    // (masalan orqada Telegram ochiq turganda) umuman kelmasligi mumkin.
    useEffect(() => {
        if (!showFullscreenOverlay) return;
        const id = setInterval(() => {
            if (isFullscreenActive()) setShowFullscreenOverlay(false);
        }, 1000);
        return () => clearInterval(id);
    }, [showFullscreenOverlay]);

    // Auto-terminate logic is now handled via a modal button to confirm result viewing

    // Report audio progress to hook for persistence
    const handleSetAudioTime = (time) => {
        setAudioTime(time);
        updateAudioProgress(time, activePart);
    };

    const enterFullScreen = async () => {
        const docEl = document.documentElement;
        try {
            if (docEl.requestFullscreen) await docEl.requestFullscreen();
            else if (docEl.webkitRequestFullscreen) await docEl.webkitRequestFullscreen();
            else if (docEl.msRequestFullscreen) await docEl.msRequestFullscreen();
        } catch (err) {
            // F11 bilan allaqachon to'liq ekranda bo'lsa yoki brauzer rad etsa —
            // talabani baribir bloklab qo'ymaymiz.
            console.warn('Fullscreen request failed:', err);
        }
        setShowFullscreenOverlay(false);
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
                setTimeLeft(tests.listening ? getListeningDuration(tests.listening) : 30 * 60);
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
                    const allDone = (!mockData?.subTests?.listening || completedModules.includes('listening')) &&
                                    (!mockData?.subTests?.reading || completedModules.includes('reading')) &&
                                    (!mockData?.subTests?.writing || completedModules.includes('writing'));
                    // Bosqich almashuvi deadline'ni useMockExam ichida avtomatik tozalaydi.
                    // Bu yerda uni QO'LDA null qilmaymiz: allDone bo'lganda stage 'test_ended'
                    // bo'lib qolgani uchun hook darhol yangi 20s deadline o'rnatib, cheksiz
                    // sikl hosil bo'lardi.
                    if (!allDone) setStage('intro');
                    // If allDone is true, we do nothing and wait for manual submit
                    // This prevents the "auto-submit" behavior the user complained about.
                }
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [stage, autoStartDeadline, completedModules, mockData, setStage]);

    // Writing'da matn terish HECH QACHON to'silmasligi kerak: talaba yozayotgan
    // paytda orqada Telegram ochiq bo'lsa ham, ogohlantirishlar butun ekranni
    // qoplamaydi — ular yuqorida, klaviaturani band qilmaydigan banner sifatida
    // chiqadi (pointer-events yo'q, faqat tugmasi bosiladi).
    const isWritingStage = stage === 'writing';

    // ─── Cheat Warning (Writing'da bloklamaydigan banner) ───
    const cheatWarningBanner = showCheatWarning && tabSwitchCount < 3 && isWritingStage && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[200] w-[min(560px,92vw)] pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-3 bg-white border border-red-200 rounded-xl shadow-xl px-4 py-3">
                <span className="text-xl shrink-0">⚠️</span>
                <div className="text-left min-w-0 flex-1">
                    <p className="text-sm font-bold text-zinc-900">Siz boshqa oynaga o'tdingiz</p>
                    <p className="text-xs text-red-600 mt-0.5">
                        Ogohlantirish {tabSwitchCount} / 3 — 3-marta takrorlansa test avtomatik yakunlanadi.
                    </p>
                </div>
                <button
                    onClick={() => setShowCheatWarning(false)}
                    className="shrink-0 px-3 py-1.5 bg-zinc-900 text-white rounded-lg font-bold text-xs hover:bg-black transition-all active:scale-[0.98]"
                >
                    OK
                </button>
            </div>
        </div>
    );

    // ─── Cheat Warning Overlay (Writing'dan tashqari bosqichlar) ───
    const cheatWarningOverlay = showCheatWarning && tabSwitchCount < 3 && !isWritingStage && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-8 max-w-md w-full text-center shadow-2xl">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
                    <span className="text-3xl">⚠️</span>
                </div>
                <h2 className="text-xl font-bold text-zinc-900 mb-2">Ogohlantirish!</h2>
                <p className="text-sm text-zinc-600 mb-4 leading-relaxed">
                    Siz test vaqtida boshqa oynaga o'tdingiz. Bu qoidabuzarlik hisoblanadi.
                </p>
                <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-6">
                    <p className="text-sm font-bold text-red-700">
                        Ogohlantirish: <span className="text-red-600 text-lg">{tabSwitchCount}</span> / 3
                    </p>
                    <p className="text-xs text-red-500 mt-1">3-marta takrorlansa test avtomatik yakunlanadi</p>
                </div>
                <button 
                    onClick={() => setShowCheatWarning(false)}
                    className="w-full py-3 bg-zinc-900 text-white rounded-lg font-bold text-sm hover:bg-black transition-all active:scale-[0.98]"
                >
                    Davom etish
                </button>
            </div>
        </div>
    );
    
    // ─── Cheat Termination Overlay (3 strikes) ───
    const cheatTerminationOverlay = tabSwitchCount >= 3 && (
        <div className="fixed inset-0 z-[300] bg-zinc-950/90 backdrop-blur-md flex items-center justify-center p-6 text-center font-sans">
            <div className="bg-white rounded-xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in duration-300">
                <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
                    <span className="text-2xl">🚫</span>
                </div>
                <h2 className="text-xl font-black text-zinc-900 mb-2 tracking-tight">Test Yakunlandi</h2>
                <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
                    Siz 3 marta qoida buzganingiz (sahifani tark etganingiz) uchun test tizim tomonidan avtomatik ravishda to'xtatildi.
                </p>
                <button 
                    onClick={() => finishExam()}
                    className="w-full py-3 bg-[#e31b23] text-white rounded-lg font-bold text-sm hover:bg-red-700 transition-all active:scale-[0.98] shadow-lg shadow-red-900/20"
                >
                    OK (Natijalarni ko'rish)
                </button>
            </div>
        </div>
    );

    // ─── Exit Confirmation Modal ───
    const exitConfirmationModal = showExitModal && (
        <div className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-10 max-w-md w-full text-center shadow-2xl overflow-hidden relative border border-white/20 animate-in fade-in zoom-in duration-300">
                {/* Decorative background element */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-red-600" />
                
                <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8">
                    <span className="text-5xl">🚪</span>
                </div>
                
                <h2 className="text-3xl font-extrabold text-zinc-900 mb-4 tracking-tight">Chiqib ketasizmi?</h2>
                <p className="text-zinc-600 mb-10 leading-relaxed text-lg">
                    Ogohlantirish! Agar hozir chiqib ketsangiz imtihon yakunlanadi va urinishingiz (key) <span className="text-red-600 font-bold underline">kuyadi</span>.
                </p>
                
                <div className="flex flex-col gap-4">
                    <button 
                        onClick={async () => {
                            setShowExitModal(false);
                            try {
                                await finishExam();
                            } finally {
                                // Sessiyani tozalaymiz — aks holda qaytib kirganda
                                // tiklangan 'result' bosqichi bo'sh natija ko'rsatardi.
                                await clearExamSession();
                                // Hard redirect to break all history traps
                                window.location.href = '/mock';
                            }
                        }}
                        className="w-full py-5 bg-red-600 text-white rounded-2xl font-bold text-base hover:bg-red-700 transition-all shadow-xl shadow-red-900/20 active:scale-[0.98]"
                    >
                        Ha, imtihonni yakunlash
                    </button>
                    <button 
                        onClick={() => setShowExitModal(false)}
                        className="w-full py-5 bg-zinc-100 text-zinc-900 rounded-2xl font-bold text-base hover:bg-zinc-200 transition-all active:scale-[0.98]"
                    >
                        Yo'q, testda qolish
                    </button>
                </div>
            </div>
        </div>
    );

    // ─── Fullscreen eslatmasi: Writing'da bloklamaydigan banner ───
    const fullscreenBanner = showFullscreenOverlay && isWritingStage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[9999] w-[min(520px,92vw)] pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-3 bg-white border border-zinc-200 rounded-xl shadow-xl px-4 py-3">
                <div className="w-9 h-9 bg-[#e31b23] rounded-lg flex items-center justify-center shrink-0">
                    <Maximize size={18} className="text-white" />
                </div>
                <p className="text-xs text-zinc-700 font-medium leading-snug flex-1 text-left">
                    Imtihon qoidasiga ko'ra to'liq ekranda ishlash talab qilinadi. Yozishni davom ettirishingiz mumkin.
                </p>
                <button
                    onClick={enterFullScreen}
                    className="shrink-0 px-3 py-1.5 bg-zinc-900 text-white rounded-lg font-bold text-xs hover:bg-black transition-all active:scale-[0.98]"
                >
                    Full Screen
                </button>
            </div>
        </div>
    );

    // ─── Fullscreen Enforcement Overlay (Writing'dan tashqari bosqichlar) ───
    const fullscreenOverlay = showFullscreenOverlay && !isWritingStage && (
        <div className="fixed inset-0 z-[9999] bg-white/60 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300 font-sans">
            <div className="w-16 h-16 bg-[#e31b23] rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-red-500/20">
                <Maximize size={32} className="text-white" />
            </div>
            <h2 className="text-2xl font-black text-zinc-900 mb-2 tracking-tight uppercase">Full Screen Required</h2>
            <p className="text-zinc-600 max-w-[280px] text-sm font-medium leading-relaxed mb-8">
                To maintain the integrity of the exam, please return to full-screen mode to continue.
            </p>
            <button 
                onClick={enterFullScreen}
                className="px-8 py-3.5 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-all active:scale-[0.98] shadow-2xl shadow-zinc-900/30"
            >
                Return to Full Screen
            </button>
        </div>
    );



    if (stage === 'result') {
        return <MockExamResult 
            results={finalResults} 
            onDashboard={() => { clearExamSession(); navigate('/mock'); }} 
            onResults={() => { clearExamSession(); navigate('/my-results'); }} 
        />;
    }

    if (stage === 'loading') {
        return <div className="h-screen flex items-center justify-center text-xl font-bold bg-white text-zinc-900 font-sans">Yuklanmoqda...</div>;
    }

    if (stage === 'saving') {
        return <ResultsCalculatingScreen accent="#e31b23" />;
    }

    if (stage === 'test_ended') {
        const allModulesDone = (!mockData?.subTests?.listening || completedModules.includes('listening')) && 
                               (!mockData?.subTests?.reading || completedModules.includes('reading')) && 
                               (!mockData?.subTests?.writing || completedModules.includes('writing'));

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
                        
                        {submitError && (
                            <div className="border border-red-200 bg-red-50 rounded-lg p-4 text-left">
                                <p className="text-sm font-bold text-red-700 mb-1">Natijani yuborib bo'lmadi</p>
                                <p className="text-xs text-red-600 leading-relaxed">{submitError}</p>
                                <p className="text-xs text-red-500 mt-2">Javoblaringiz saqlangan. Quyidagi tugma orqali qayta urinib ko'ring.</p>
                            </div>
                        )}

                        <div className="flex justify-center pt-6">
                            {allModulesDone ? (
                                <button
                                    onClick={() => finishExam()}
                                    disabled={stage === 'saving'}
                                    className="px-12 py-3 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-all active:scale-[0.98] shadow-lg shadow-zinc-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {stage === 'saving' ? 'Submitting...' : (submitError ? 'Qayta yuborish' : 'Submit Test')}
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

                        {!allModulesDone && (
                            <div className="pt-4 border-t border-gray-50 text-center">
                                <p className="text-xs text-zinc-400 italic">
                                    Automatically redirecting in {redirectCountdown} seconds...
                                </p>
                            </div>
                        )}
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
        {cheatWarningOverlay}
        {cheatWarningBanner}
        {cheatTerminationOverlay}
        {exitConfirmationModal}
        {fullscreenOverlay}
        {fullscreenBanner}
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
            isFullScreen={isFullScreen}
            audioTime={audioTime}
            userName={userData?.fullName || user?.email || 'Candidate'}
            resumeAudioTime={resumeAudioTime}
            onTotalDurationCalculated={updateListeningDuration}
            onAudioEnded={handleNextStage}
            mockId={mockId}
        />
        </>
    );
}