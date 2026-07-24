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
                <section className="space-y-1">
                    <h1 className="text-xl font-bold text-[#e31b23]">{t('mock.welcome')}, {userData?.fullName?.split(' ')[0] || t('mock.candidate')}</h1>
                    <p className="text-gray-500 text-xs font-semibold">{user?.email}</p>
                    <div className="h-[1px] bg-gray-200 w-full mt-4"></div>
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
                handleScheduleTest={handleScheduleTest} handleStartTestNow={() => navigate(`/mock/start/${currentMock.id}`)}
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
