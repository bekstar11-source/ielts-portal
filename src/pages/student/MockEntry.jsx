import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db, functions } from '../../firebase/firebase';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import MockBanners from '../../components/student/mock/MockBanners';
import MockTestList from '../../components/student/mock/MockTestList';
import MockSuccessModal from '../../components/student/mock/MockSuccessModal';

import MockTestCard from '../../components/student/mock/MockTestCard';
import MockInterfacePresentation from '../../components/student/mock/MockInterfacePresentation';

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
        <div className="min-h-screen bg-warm-canvas dark:bg-warm-dark font-['Plus_Jakarta_Sans'] text-warm-ink dark:text-warm-on-dark antialiased flex flex-col select-none">
            <DashboardHeader
                user={user}
                userData={userData}
                activeTab="mock"
                onLogoutClick={() => setShowLogoutConfirm(true)}
            />

            {/* Official Header */}
            <header className="w-full border-b border-warm-hairline dark:border-white/10 px-6 py-3 bg-warm-canvas dark:bg-warm-dark sticky top-0 z-50 md:hidden">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-warm-card dark:hover:bg-warm-dark-elevated rounded-full transition-colors text-warm-muted hover:text-warm-ink dark:text-warm-on-dark-soft dark:hover:text-warm-on-dark">
                            <ArrowLeft size={20} />
                        </button>
                        <span className="font-bold text-sm text-warm-ink dark:text-warm-on-dark">{t('roadmap.backToDashboard')}</span>
                    </div>
                    <div className="flex items-baseline">
                        <span className="text-warm-primary font-black text-[32px] tracking-normal" style={{ textShadow: '0.5px 0 0 #cc785c, -0.5px 0 0 #cc785c' }}>IELTS</span>
                        <span className="text-warm-ink dark:text-warm-on-dark font-bold text-[16px] ml-1">Mock</span>
                    </div>
                </div>
            </header>

            <main className="flex-1 w-full max-w-6xl mx-auto px-8 py-12 space-y-12 pb-24">
                {/* Hero Section */}
                <section className="space-y-1">
                    <h1 className="text-xl font-bold text-warm-primary">{t('mock.welcome')}, {userData?.fullName?.split(' ')[0] || t('mock.candidate')}</h1>
                    <p className="text-warm-muted dark:text-warm-on-dark-soft text-xs font-semibold">{user?.email}</p>
                    <div className="h-[1px] bg-warm-hairline dark:bg-white/10 w-full mt-4"></div>
                </section>

                <MockBanners 
                    lang={lang} handleVerifyKey={handleVerifyKey} mockKey={mockKey} 
                    setMockKey={setMockKey} loading={loading} success={success} 
                    error={error} navigate={navigate} 
                />
                <MockTestList 
                    t={t} activeTab={activeTab} setActiveTab={setActiveTab} 
                    filteredMocks={filteredMocks} navigate={navigate} userData={userData} 
                    fetchingMocks={fetchingMocks} lang={lang}
                />
                <MockInterfacePresentation lang={lang} />
            </main>

            <SiteFooter />

            <MockSuccessModal
                t={t} lang={lang} success={success} showCalendar={showCalendar}
                setShowCalendar={setShowCalendar} currentMock={currentMock}
                viewDate={viewDate} setViewDate={setViewDate}
                selectedDate={selectedDate} setSelectedDate={setSelectedDate}
                handleScheduleTest={handleScheduleTest}
                // '/mock/start/:id' route'i yo'q edi — tugma bosh sahifaga otardi.
                // Imtihon MockTestCard bilan bir xil yo'l orqali ochiladi.
                handleStartTestNow={() => navigate('/mock-exam', { state: { mockData: currentMock } })}
                loading={loading}
            />
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
