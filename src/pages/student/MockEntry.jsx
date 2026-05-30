import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db, functions } from '../../firebase/firebase';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ChevronRight, 
    ArrowLeft,
    Loader2, 
    Sparkles, 
    Clock,
    Calendar,
    AlertCircle,
    Monitor,
    MapPin,
    FileText,
    CheckCircle2,
    User,
    Fingerprint,
    Building2,
    Download,
    KeyRound,
    ShoppingBag,
    BookOpen,
    Headphones,
    PenTool,
    Mic,
    Timer,
    CheckSquare,
    Volume2,
    Play,
    Pause,
    HelpCircle
} from 'lucide-react';
import SiteFooter from '../../components/common/SiteFooter';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import DashboardModals from '../../components/dashboard/DashboardModals';
import PricingModal from '../../components/dashboard/PricingModal';
import { useTranslation } from '../../context/LanguageContext';

export default function MockEntry() {
    const { user, userData, logout } = useAuth();
    const { t, lang } = useTranslation();
    const navigate = useNavigate();
    
    const [mockKey, setMockKey] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [currentMock, setCurrentMock] = useState(null);
    const [showCalendar, setShowCalendar] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [viewDate, setViewDate] = useState(new Date());
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [showPricingModal, setShowPricingModal] = useState(false);
    
    const [activeTab, setActiveTab] = useState('upcoming');
    const [mockTests, setMockTests] = useState([]);
    const [fetchingMocks, setFetchingMocks] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        const handleOpenPricing = () => setShowPricingModal(true);
        window.addEventListener('open-pricing', handleOpenPricing);
        return () => window.removeEventListener('open-pricing', handleOpenPricing);
    }, []);

    useEffect(() => {
        const fetchMocks = async () => {
            if (!user?.uid) return;
            try {
                // 1. Fetch user's mock assignments
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (!userDoc.exists()) return;
                const userData = userDoc.data();
                const mocks = userData.mockTests || [];

                // 2. Fetch user's actual results to get scores
                const q = query(
                    collection(db, "results"),
                    where("userId", "==", user.uid),
                    where("type", "==", "mock_full")
                );
                const resultsSnap = await getDocs(q);
                const results = resultsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                // 3. Merge scores into mock assignments
                const merged = mocks.map(m => {
                    // Try to find result by mockKey (primary for mocks) or by saved resultId
                    const result = results.find(r => 
                        (m.mockKey && r.mockKey === m.mockKey) || 
                        (m.resultId && r.id === m.resultId)
                    );

                    if (!result) return m;

                    return { 
                        ...m, 
                        ...result, // Bring in all result fields (bandScore, scores, writingBand, etc.)
                        id: m.id,  // Preserve the mock assignment ID for UI stability
                        resultId: result.id,
                        status: 'completed',
                        resultStatus: result.status || 'pending_review'
                    };
                });

                setMockTests(merged.sort((a, b) => new Date(b.startDate) - new Date(a.startDate)));
            } catch (error) {
                console.error("Error fetching mocks:", error);
            } finally {
                setFetchingMocks(false);
            }
        };
        fetchMocks();
    }, [user, refreshTrigger]);

    const handleVerifyKey = async (e) => {
        if (e) e.preventDefault();
        if (!mockKey.trim() || loading) return;

        setLoading(true);
        setError("");
        
        try {
            const verifyAccessKeyFn = httpsCallable(functions, 'verifyAccessKey');
            const res = await verifyAccessKeyFn({ key: mockKey });

            if (res.data && res.data.success) {
                setSuccess(true);
                setCurrentMock(res.data.assignment);
                setRefreshTrigger(prev => prev + 1);
            } else {
                throw new Error(t('mock.unexpectedError'));
            }
        } catch (err) {
            setError(err.message || t('mock.invalidKey'));
        } finally {
            setLoading(false);
        }
    };

    const handleScheduleTest = async () => {
        if (!currentMock) return;
        setLoading(true);
        try {
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const mocks = userSnap.data().mockTests || [];
                const updated = mocks.map(test => {
                    if (test.id === currentMock.id) {
                        return { ...test, scheduledDate: selectedDate.toISOString() };
                    }
                    return test;
                });
                await updateDoc(userRef, { mockTests: updated });
            }
            setShowCalendar(false);
            setSuccess(false);
            setMockKey("");
            setActiveTab('upcoming');
            setRefreshTrigger(prev => prev + 1);
        } catch (err) {
            console.error("Scheduling error:", err);
        } finally {
            setLoading(false);
        }
    };

    const filteredMocks = mockTests.filter(test => {
        if (activeTab === 'past') return test.status === 'completed';
        if (activeTab === 'upcoming') return test.status !== 'completed';
        return false;
    });

    return (
        <div className="min-h-screen bg-white font-['Plus_Jakarta_Sans'] text-gray-800 antialiased flex flex-col select-none">
            <DashboardHeader
                user={user}
                userData={userData}
                activeTab="mock"
                onLogoutClick={() => setShowLogoutConfirm(true)}
            />

            {/* Official Header */}
            <header className="w-full border-b border-gray-300 px-6 py-3 bg-white sticky top-0 z-50 md:hidden">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-gray-50 rounded-full transition-colors text-gray-400 hover:text-gray-900">
                            <ArrowLeft size={20} />
                        </button>
                        <span className="font-bold text-sm text-gray-900">{t('roadmap.backToDashboard')}</span>
                    </div>
                    <div className="flex items-baseline">
                        <span className="text-[#e31b23] font-black text-[32px] tracking-normal" style={{ textShadow: '0.5px 0 0 #e31b23, -0.5px 0 0 #e31b23' }}>IELTS</span>
                        <span className="text-gray-900 font-bold text-[16px] ml-1">Mock</span>
                    </div>
                </div>
            </header>

            <main className="flex-1 w-full max-w-6xl mx-auto px-8 py-12 space-y-12 pb-24">
                {/* Hero Section */}
                <section>
                    <h1 className="text-3xl font-bold text-[#e31b23] mb-2">{t('mock.welcome')}, {userData?.fullName?.split(' ')[0] || t('mock.candidate')}</h1>
                    <p className="text-gray-500 font-medium">{user?.email}</p>
                    <div className="h-[1px] bg-gray-200 w-full mt-8"></div>
                </section>

                {/* Dual Banners Grid */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Banner: Key Verification */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-[#1f0b0d] text-white p-8 border border-[#2a0f11] shadow-md flex flex-col justify-between min-h-[280px]">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
                        <div className="space-y-3 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                                    <KeyRound size={20} />
                                </div>
                                <h3 className="text-xl font-bold tracking-tight">
                                    {lang === 'uz' ? "Mock Key orqali kirish" : "Enter Mock Exam Key"}
                                </h3>
                            </div>
                            <p className="text-zinc-400 text-xs leading-relaxed font-semibold">
                                {lang === 'uz' 
                                    ? "Sizda faollashtirish kaliti bormi? Uni quyida kiriting va IELTS on Computer mock imtihonini boshlang."
                                    : "Do you have an activation key? Enter it below to unlock and start your IELTS on Computer mock exam."
                                }
                            </p>
                        </div>

                        <form onSubmit={handleVerifyKey} className="space-y-3 mt-6 relative z-10">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={mockKey}
                                    onChange={(e) => setMockKey(e.target.value)}
                                    placeholder="XXXX-XXXX-XXXX"
                                    className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl py-3 px-4 text-sm font-black uppercase tracking-[0.2em] text-white outline-none focus:border-red-500/60 focus:ring-1 focus:ring-red-500/40 transition-all placeholder:tracking-normal placeholder:font-semibold placeholder:text-zinc-500"
                                />
                                {error && (
                                    <p className="text-red-400 text-[11px] font-bold mt-2 flex items-center gap-1.5 animate-pulse">
                                        <AlertCircle size={14} /> {error}
                                    </p>
                                )}
                            </div>
                            <button
                                type="submit"
                                disabled={loading || !mockKey.trim() || success}
                                className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2 ${
                                    success ? 'bg-green-600 text-white' : 'bg-[#e31b23] hover:bg-[#c4151c] text-white shadow-red-950/20'
                                }`}
                            >
                                {loading ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : success ? (
                                    <>
                                        <Sparkles size={18} />
                                        {lang === 'uz' ? "Muvaffaqiyatli faollashtirildi!" : "Successfully Activated!"}
                                    </>
                                ) : (
                                    lang === 'uz' ? "Imtihonni faollashtirish" : "Activate & Unlock Exam"
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Right Banner: Mock Purchase Catalog */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-[#1f160d] text-white p-8 border border-[#2d1f11] shadow-md flex flex-col justify-between min-h-[280px]">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                        <div className="space-y-3 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                                    <ShoppingBag size={20} />
                                </div>
                                <h3 className="text-xl font-bold tracking-tight">
                                    {lang === 'uz' ? "Mock Testlar Katalogi" : "Mock Exams Store"}
                                </h3>
                            </div>
                            <p className="text-zinc-400 text-xs leading-relaxed font-semibold">
                                {lang === 'uz'
                                    ? "Reading, Listening, Writing va Speaking bo'limlarini o'z ichiga olgan rasmiy formatdagi to'liq imtihon simulyatsiyalarini sotib oling."
                                    : "Purchase complete full-length exam simulations containing authentic Reading, Listening, Writing and Speaking modules."
                                }
                            </p>
                            <div className="flex flex-wrap gap-2 pt-1">
                                {['Reading', 'Listening', 'Writing'].map((skill) => (
                                    <span key={skill} className="px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-zinc-300 shadow-sm">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="mt-8 flex flex-col gap-3 relative z-10">
                            <div className="flex items-baseline justify-between">
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                    {lang === 'uz' ? "Jami narxi:" : "Total Price:"}
                                </span>
                                <span className="text-lg font-black text-amber-400">
                                    20 000 UZS
                                </span>
                            </div>
                            <button
                                onClick={() => navigate('/mock-buy')}
                                className="w-full py-3.5 rounded-xl font-bold text-sm bg-[#e31b23] hover:bg-[#c4151c] text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-950/20 active:scale-[0.98] group"
                            >
                                {lang === 'uz' ? "Katalogga o'tish" : "Go to Store"}
                                <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                            </button>
                        </div>
                    </div>
                </section>

                {/* Animated Presentation section */}
                <MockInterfacePresentation lang={lang} />

                {/* Mock History Tabs */}
                <section className="space-y-8">
                    <div className="flex items-center gap-12 border-b border-gray-200">
                        <button 
                            onClick={() => setActiveTab('upcoming')}
                            className={`pb-4 text-[17px] font-bold transition-all relative ${activeTab === 'upcoming' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            {t('mock.upcomingTests')}
                            {activeTab === 'upcoming' && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#e31b23]" />}
                        </button>
                        <button 
                            onClick={() => setActiveTab('past')}
                            className={`pb-4 text-[17px] font-bold transition-all relative ${activeTab === 'past' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            {t('mock.pastTests')}
                            {activeTab === 'past' && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#e31b23]" />}
                        </button>
                    </div>
                    
                    {activeTab === 'past' && filteredMocks.length > 0 && (
                        <p className="text-sm font-bold text-gray-900 mb-6 mt-8">
                            {lang === 'uz' ? (
                                <>
                                    Sizda <span className="text-[#e31b23]">{filteredMocks.length}</span> ta o'tgan test mavjud
                                </>
                            ) : (
                                <>
                                    Showing <span className="text-[#e31b23]">{filteredMocks.length}</span> past test{filteredMocks.length > 1 ? 's' : ''}
                                </>
                            )}
                        </p>
                    )}

                    <div className="space-y-6">
                        {fetchingMocks ? (
                            <div className="py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">
                                <Loader2 className="animate-spin mx-auto mb-4 opacity-30" size={32} /> 
                                {t('mock.authenticating')}
                            </div>
                        ) : filteredMocks.length > 0 ? (
                            filteredMocks.map((test, index) => (
                                <MockTestCard key={index} test={test} tab={activeTab} navigate={navigate} userData={userData} />
                            ))
                        ) : (
                            <div className="border border-dashed border-gray-300 rounded-md py-20 text-center bg-gray-50/50">
                                <FileText size={40} className="mx-auto mb-4 text-gray-200" />
                                <p className="text-gray-400 text-sm font-medium italic">
                                    {activeTab === 'upcoming' ? t('mock.noUpcoming') : t('mock.noPast')}
                                </p>
                            </div>
                        )}
                    </div>
                </section>
            </main>

            <SiteFooter />

            <AnimatePresence>
                {success && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] bg-white/95 flex items-center justify-center p-6 backdrop-blur-sm">
                        {!showCalendar ? (
                            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-md bg-white border border-gray-300 rounded-md p-10 shadow-2xl">
                                <div className="text-center space-y-6">
                                    <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto">
                                        <Sparkles size={32} />
                                    </div>
                                    <div className="space-y-2">
                                        <h2 className="text-2xl font-bold text-gray-900">{t('mock.keyVerified')}</h2>
                                        <p className="text-gray-500 text-sm leading-relaxed">{t('mock.verifiedPrompt')}</p>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3 pt-4">
                                        <button onClick={() => {
                                            try { 
                                                const key = currentMock?.mockKey || currentMock?.id || 'default';
                                                localStorage.removeItem(`ielts_mock_session_${key}`); 
                                                localStorage.removeItem('ielts_mock_active_data');
                                            } catch(e) {}
                                            navigate('/mock-exam', { state: { mockData: currentMock } });
                                        }} className="w-full bg-[#e31b23] text-white py-4 rounded-xl font-bold text-sm hover:bg-[#c4151c] transition-all shadow-lg shadow-red-900/10">{t('mock.startNow')}</button>
                                        <button onClick={() => setShowCalendar(true)} className="w-full bg-gray-50 text-gray-600 py-4 rounded-xl font-bold text-sm hover:bg-gray-100 transition-all border border-gray-200">{t('mock.scheduleLater')}</button>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg">
                                {/* Calendar logic remains the same but with simplified Official IELTS styling */}
                                <div className="bg-white border border-gray-300 rounded-md p-10 shadow-2xl space-y-8">
                                    <div className="text-center">
                                        <h2 className="text-xl font-bold text-gray-900 tracking-tight">{t('mock.scheduleTitle')}</h2>
                                    </div>
                                    
                                    <div className="border border-gray-200 rounded-md p-6">
                                        <div className="flex items-center justify-between mb-8">
                                            <h3 className="font-bold text-[#e31b23]">
                                                {lang === 'uz' ? (
                                                    `${viewDate.getFullYear()}-yil ${['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'][viewDate.getMonth()]}`
                                                ) : (
                                                    `${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][viewDate.getMonth()]} ${viewDate.getFullYear()}`
                                                )}
                                            </h3>
                                            <div className="flex gap-2">
                                                <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="p-2 hover:bg-gray-50 rounded border border-gray-100"><ChevronRight className="rotate-180" size={16} /></button>
                                                <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="p-2 hover:bg-gray-50 rounded border border-gray-100"><ChevronRight size={16} /></button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-7 gap-1">
                                            {lang === 'uz' ? (
                                                ['Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan', 'Yak'].map(day => (
                                                    <div key={day} className="text-[10px] font-black text-gray-300 uppercase text-center py-2">{day}</div>
                                                ))
                                            ) : (
                                                ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                                    <div key={day} className="text-[10px] font-black text-gray-300 uppercase text-center py-2">{day}</div>
                                                ))
                                            )}

                                            {(() => {
                                                const days = [];
                                                const year = viewDate.getFullYear();
                                                const month = viewDate.getMonth();
                                                const firstDay = new Date(year, month, 1).getDay();
                                                const daysInMonth = new Date(year, month + 1, 0).getDate();
                                                const offset = firstDay === 0 ? 6 : firstDay - 1;
                                                for (let i = 0; i < offset; i++) days.push(<div key={`empty-${i}`} />);
                                                for (let d = 1; d <= daysInMonth; d++) {
                                                    const isSelected = selectedDate.getDate() === d && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;
                                                    days.push(
                                                        <button
                                                            key={`day-${d}`}
                                                            onClick={() => setSelectedDate(new Date(year, month, d))}
                                                            className={`aspect-square rounded flex items-center justify-center text-xs font-bold transition-all ${isSelected ? 'bg-[#e31b23] text-white' : 'text-gray-700 hover:bg-gray-50'}`}
                                                        >
                                                            {d}
                                                        </button>
                                                    );
                                                }
                                                return days;
                                            })()}
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <button onClick={() => setShowCalendar(false)} className="flex-1 py-4 border border-gray-200 rounded-xl font-bold text-sm text-gray-400 hover:bg-gray-50">{t('common.back')}</button>
                                        <button onClick={handleScheduleTest} disabled={loading} className="flex-[2] bg-[#e31b23] text-white py-4 rounded-xl font-bold text-sm hover:bg-[#c4151c] flex items-center justify-center gap-2">
                                            {loading ? <Loader2 className="animate-spin" size={16} /> : t('mock.confirmSchedule')}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
            <DashboardModals
                showLogoutConfirm={showLogoutConfirm}
                setShowLogoutConfirm={setShowLogoutConfirm}
                confirmLogout={logout}
            />
            <PricingModal 
                isOpen={showPricingModal} 
                onClose={() => setShowPricingModal(false)} 
                userName={userData?.fullName?.split(' ')[0]} 
            />
        </div>
    );
}

const MockTestCard = ({ test, tab, navigate, userData }) => {
    const { t, lang } = useTranslation();
    const isPremium = userData?.isPremium || 
                      userData?.isPro || 
                      ['premium', 'pro', 'standard'].includes(userData?.accountType) || 
                      ['admin', 'teacher'].includes(userData?.role);

    const handleReviewClick = () => {
        if (isPremium) {
            navigate(`/review/${test.resultId || test.id}`);
        } else {
            window.dispatchEvent(new CustomEvent('open-pricing'));
        }
    };

    if (tab === 'past') {
        const isGraded = test.resultStatus === 'graded';
        const s = test.scores || {};
        
        // Helper to format score
        const fmt = (v) => {
            if (v === undefined || v === null || v === "") return "---";
            return Number(v).toFixed(1);
        };

        const testDate = test.startDate 
            ? new Date(test.startDate).toLocaleDateString(lang === 'uz' ? 'uz-UZ' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) 
            : '---';
        const trfNumber = `26UZ${Math.random().toString(36).substring(2, 8).toUpperCase()}${userData?.fullName?.slice(0, 3).toUpperCase() || 'CAN'}004A`; // Random TRF

        return (
            <article className="bg-gray-100/50 rounded-xl overflow-hidden border border-gray-200 shadow-sm mb-12">
                {/* Official Header Style */}
                <div className="bg-[#343a40] text-white px-6 py-3 flex justify-between items-center">
                    <h4 className="font-bold text-sm tracking-tight">IELTS on Computer Academic</h4>
                </div>

                {/* Candidate Info Bar */}
                <div className="bg-white border-b border-gray-200 px-6 py-6 grid grid-cols-2 md:grid-cols-5 gap-8">
                    <div className="space-y-3">
                        <User size={22} className="text-[#e31b23]" />
                        <div className="space-y-1">
                            <p className="text-[15px] font-black text-gray-900 leading-tight">{t('mock.testTakerName')}</p>
                            <p className="text-[13px] font-medium text-gray-600 truncate">{userData?.fullName || t('mock.candidate')}</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <Fingerprint size={22} className="text-gray-400" />
                        <div className="space-y-1">
                            <p className="text-[15px] font-black text-gray-900 leading-tight">{t('mock.testTakerId')}</p>
                            <p className="text-[13px] font-medium text-gray-600">501235</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <Building2 size={22} className="text-gray-400" />
                        <div className="space-y-1">
                            <p className="text-[15px] font-black text-gray-900 leading-tight">{t('mock.centreName')}</p>
                            <p className="text-[13px] font-medium text-gray-600">Englev</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <Calendar size={22} className="text-gray-400" />
                        <div className="space-y-1">
                            <p className="text-[15px] font-black text-gray-900 leading-tight">{t('mock.testDate')}</p>
                            <p className="text-[13px] font-medium text-gray-600">{testDate}</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <FileText size={22} className="text-gray-400" />
                        <div className="space-y-1">
                            <p className="text-[15px] font-black text-gray-900 leading-tight">{t('mock.trfNumber')}</p>
                            <p className="text-[13px] font-medium text-gray-600 truncate">{trfNumber}</p>
                        </div>
                    </div>
                </div>

                {/* Results Section */}
                <div className="p-8 space-y-8 bg-gray-50/30">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-[#e31b23] rounded-none"></div>
                            <h2 className="text-2xl font-bold text-gray-900">{t('mock.yourResult')}</h2>
                        </div>
                        <button 
                            onClick={() => navigate('/mock-exam')}
                            className="flex items-center gap-2 text-sm font-bold text-[#e31b23] hover:underline"
                        >
                            <span>{t('mock.buyMockTest')}</span>
                        </button>
                    </div>

                    {!isGraded ? (
                        <div className="bg-orange-50 border border-orange-100 rounded-xl p-8 text-center space-y-3">
                            <Clock className="mx-auto text-orange-400 animate-pulse" size={32} />
                            <h3 className="font-bold text-orange-800 text-lg">{t('mock.processingResults')}</h3>
                            <p className="text-orange-600 text-sm max-w-md mx-auto">{t('mock.processingDesc')}</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Overall Band */}
                            <button 
                                onClick={handleReviewClick}
                                className="w-full bg-white hover:bg-gray-50 transition-all rounded-xl p-5 flex justify-between items-center group shadow-sm border border-gray-200"
                            >
                                <div className="text-left space-y-1">
                                    <span className="text-[18px] font-black text-gray-900">{t('mock.overall')}</span>
                                    <p className="text-[38px] font-black text-[#e31b23] leading-none tracking-tighter">{fmt(test.bandScore)}</p>
                                </div>
                                <ChevronRight size={24} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
                            </button>

                            {/* Skills Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { label: t('myResults.categories.listening'), key: 'listeningBand' },
                                    { label: t('myResults.categories.reading'), key: 'readingBand' },
                                    { label: t('myResults.categories.writing'), key: 'writingBand' },
                                    { label: t('myResults.categories.speaking'), key: 'speakingBand' }
                                ].map((skill) => {
                                    const baseKey = skill.key.replace('Band', '');
                                    const val = s[skill.key] ?? s[baseKey] ?? test[skill.key] ?? test[baseKey];
                                    
                                    return (
                                        <button 
                                            key={skill.label}
                                            onClick={handleReviewClick}
                                            className="bg-white hover:border-[#e31b23]/30 transition-all border border-gray-200 rounded-xl p-4 text-left space-y-3 group shadow-sm"
                                        >
                                            <div className="flex justify-between items-center">
                                                <span className="text-[16px] font-black text-gray-900">{skill.label}</span>
                                                <ChevronRight size={16} className="text-gray-300 group-hover:translate-x-0.5 transition-all" />
                                            </div>
                                            <p className="text-[28px] font-black text-[#e31b23] leading-none tracking-tighter">{fmt(val)}</p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="bg-white border-t border-gray-100 px-8 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4 text-gray-400">
                        <div className="flex items-center gap-2">
                            <Monitor size={14} />
                            <span className="text-[11px] font-bold uppercase tracking-wider">{t('mock.computer')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <MapPin size={14} />
                            <span className="text-[11px] font-bold uppercase tracking-wider">{t('mock.officialCenter')}</span>
                        </div>
                    </div>
                    <button 
                        onClick={handleReviewClick}
                        className="text-[#e31b23] text-sm font-bold hover:underline flex items-center gap-1 group"
                    >
                        {t('mock.viewFullReport')}
                        <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                    </button>
                </div>
            </article>
        );
    }

    return (
        <article className="border border-gray-300 rounded-md p-8 bg-white shadow-sm hover:border-[#e31b23]/30 transition-all group">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="space-y-4 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h4 className="text-xl font-bold text-gray-800">{test.title || "IELTS CD Academic Full Mock"}</h4>
                        <span className="text-[11px] font-bold text-[#e31b23] bg-red-50 px-2.5 py-1 rounded-full border border-red-100">{t('mock.unlocked')}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="flex items-center gap-3 text-gray-400">
                            <Calendar size={16} className="shrink-0" />
                            <div className="flex flex-col">
                                <span className="text-[11px] font-medium text-gray-400">{t('mock.scheduledDate')}</span>
                                <span className="text-sm font-semibold text-gray-700">{test.scheduledDate ? new Date(test.scheduledDate).toLocaleDateString(lang === 'uz' ? 'uz-UZ' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : t('mock.flexible')}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-gray-400">
                            <Monitor size={16} className="shrink-0" />
                            <div className="flex flex-col">
                                <span className="text-[11px] font-medium text-gray-400">{t('mock.testFormat')}</span>
                                <span className="text-sm font-semibold text-gray-700">{t('mock.officialComputer')}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-gray-400">
                            <MapPin size={16} className="shrink-0" />
                            <div className="flex flex-col">
                                <span className="text-[11px] font-medium text-gray-400">{t('mock.location')}</span>
                                <span className="text-sm font-semibold text-gray-700">{t('mock.onlineExamCenter')}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <button 
                    onClick={() => {
                        try { 
                            // Deep clear all potentially stale sessions
                            Object.keys(localStorage).forEach(key => {
                                if (key.startsWith('ielts_mock_session_') || 
                                    key.startsWith('ielts_writing_session_') || 
                                    key.startsWith('ielts_reading_session_') || 
                                    key === 'ielts_mock_active_data') {
                                    localStorage.removeItem(key);
                                }
                            });
                        } catch(e) {}
                        navigate('/mock-exam', { state: { mockData: test } });
                    }}
                    className="w-full md:w-auto px-10 py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 active:scale-95 bg-[#e31b23] text-white hover:bg-[#c4151c] shadow-lg shadow-red-900/20"
                >
                    {t('mock.startExam')}
                    <ChevronRight size={16} />
                </button>
            </div>
        </article>
    );
};

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
