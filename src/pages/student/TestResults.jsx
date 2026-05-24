import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { 
    ChevronLeft, 
    ChevronRight, 
    MapPin, 
    Monitor, 
    FileText,
    CheckCircle2,
    Calendar,
    Clock,
    ArrowLeft
} from 'lucide-react';
import SiteFooter from '../../components/common/SiteFooter';
import { useTranslation } from '../../context/LanguageContext';

export default function TestResults() {
    const { user, userData } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('upcoming'); // Default to upcoming
    const [allTests, setAllTests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchResults = async () => {
            if (!user?.uid) return;
            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    const assigned = data.assignedTests || [];
                    setAllTests(assigned);
                }
            } catch (error) {
                console.error("Error fetching results:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchResults();
    }, [user]);

    const filteredTests = allTests.filter(test => {
        if (activeTab === 'past') return test.status === 'completed';
        if (activeTab === 'upcoming') return test.status !== 'completed' && test.scheduledDate;
        return false;
    });

    return (
        <div className="min-h-screen bg-[#f5f5f5] font-sans text-[#1d1d1f] antialiased flex flex-col">
            {/* Header Area */}
            <header className="bg-white border-b border-zinc-200 h-20 flex items-center px-4 md:px-12 sticky top-0 z-50">
                <div className="flex-1 flex items-center">
                    <button 
                        onClick={() => navigate('/mock')}
                        className="flex items-center gap-2 text-zinc-500 hover:text-[#e31837] transition-colors font-bold text-sm group"
                    >
                        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="hidden md:inline">{t('testResults.back')}</span>
                    </button>
                </div>
                <div className="flex-1 flex justify-center">
                   <div className="flex items-baseline gap-1.5 cursor-pointer" onClick={() => navigate('/dashboard')}>
                       <span className="text-[#e31837] font-black text-3xl tracking-tighter">IELTS</span>
                       <span className="text-[#1d1d1f] font-medium text-xl tracking-tighter italic">mock</span>
                   </div>
                </div>
                <div className="flex-1 flex justify-end">
                    <button onClick={() => navigate('/settings')} className="w-10 h-10 rounded-full bg-zinc-800 text-white flex items-center justify-center font-bold text-sm">
                        {userData?.fullName?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
                    </button>
                </div>
            </header>

            <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-8 space-y-8">
                {/* Breadcrumb style back link */}
                <button 
                    onClick={() => navigate('/mock')}
                    className="flex items-center gap-1 text-[#0066cc] hover:underline text-sm font-medium"
                >
                    <ChevronLeft size={16} />
                    {t('testResults.backToDashboard')}
                </button>

                {/* Title Section */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">{t('testResults.title')}</h1>
                        <p className="text-zinc-500 text-[15px] font-medium">{t('testResults.subtitle')}</p>
                    </div>
                    <button 
                        onClick={() => navigate('/mock')}
                        className="bg-[#e31837] text-white px-8 py-3 rounded-full font-bold text-sm hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20"
                    >
                        {t('mock.buyMock')}
                    </button>
                </div>

                {/* Tabs */}
                <div className="border-b border-zinc-200 flex items-center gap-12">
                    <button 
                        onClick={() => setActiveTab('upcoming')}
                        className={`pb-4 text-sm font-bold transition-all relative ${
                            activeTab === 'upcoming' ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'
                        }`}
                    >
                        {t('testResults.upcomingTests')}
                        {activeTab === 'upcoming' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#e31837]" />}
                    </button>
                    <button 
                        onClick={() => setActiveTab('past')}
                        className={`pb-4 text-sm font-bold transition-all relative ${
                            activeTab === 'past' ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'
                        }`}
                    >
                        {t('testResults.pastTests')}
                        {activeTab === 'past' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#e31837]" />}
                    </button>
                </div>

                {/* Results List */}
                <div className="space-y-6 pb-12">
                    <h3 className="text-lg font-bold text-zinc-900">
                        {t('testResults.showingTestsCount')
                            .replace('{count}', filteredTests.length)
                            .replace('{status}', activeTab === 'past' ? t('testResults.past') : t('testResults.upcoming'))
                        }
                    </h3>

                    {filteredTests.length > 0 ? (
                        filteredTests.map((test, index) => (
                            <TestResultCard key={index} test={test} tab={activeTab} navigate={navigate} t={t} />
                        ))
                    ) : (
                        <div className="bg-white rounded-xl border border-zinc-200 p-12 text-center space-y-4">
                            <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto text-zinc-300">
                                <FileText size={32} />
                            </div>
                            <p className="text-zinc-500 font-medium">
                                {t('testResults.noTests').replace('{type}', activeTab === 'past' ? t('testResults.results') : t('testResults.scheduledTests'))}
                            </p>
                        </div>
                    )}
                </div>
            </main>

            <SiteFooter />
        </div>
    );
}

const TestResultCard = ({ test, tab, navigate, t }) => (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between gap-4">
                <h4 className="text-lg font-bold text-[#e31837]">IELTS On Computer Academic</h4>
                {tab === 'past' ? (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-md border border-green-100">
                        <CheckCircle2 size={14} />
                        <span className="text-[11px] font-bold uppercase tracking-wider">{t('testResults.resultsAvailable')}</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-md border border-blue-100">
                        <Calendar size={14} />
                        <span className="text-[11px] font-bold uppercase tracking-wider">{t('testResults.scheduled')}</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 bg-[#f8f8f8] rounded-lg divide-y md:divide-y-0 md:divide-x divide-zinc-200 border border-zinc-100">
                <div className="p-5 space-y-2">
                    <p className="text-[15px] font-bold text-zinc-900">Listening, Reading, Writing</p>
                    <div className="flex items-center gap-3 text-zinc-500 text-[13px] font-medium">
                        <span className="flex items-center gap-1.5"><Calendar size={14} /> 
                            {test.scheduledDate ? new Date(test.scheduledDate).toLocaleDateString('uz-UZ') : test.startDate ? new Date(test.startDate).toLocaleDateString('uz-UZ') : 'N/A'}
                        </span>
                        <span className="flex items-center gap-1.5"><Clock size={14} /> 09:30 AM</span>
                    </div>
                </div>
                <div className="p-5 space-y-2">
                    <p className="text-[15px] font-bold text-zinc-900">{t('testResults.speakingTest')}</p>
                    <div className="flex items-center gap-3 text-zinc-500 text-[13px] font-medium">
                        <span className="flex items-center gap-1.5"><Calendar size={14} /> 
                            {test.scheduledDate ? new Date(test.scheduledDate).toLocaleDateString('uz-UZ') : test.startDate ? new Date(test.startDate).toLocaleDateString('uz-UZ') : 'N/A'}
                        </span>
                        <span className="flex items-center gap-1.5"><Clock size={14} /> 03:00 PM</span>
                    </div>
                </div>
            </div>
        </div>

        <div className="px-6 py-4 border-t border-zinc-100 flex flex-col md:flex-row items-center justify-between gap-4 bg-zinc-50/30">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-zinc-500 text-[13px] font-medium">
                    <Monitor size={16} />
                    <span>{t('testResults.onComputer')}</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-500 text-[13px] font-medium">
                    <MapPin size={16} />
                    <span>1 Imam At-Termeziy Street Termez, Termez 190100</span>
                </div>
            </div>
            {tab === 'upcoming' ? (
                <button 
                    onClick={() => {
                        const isMock = test.type === 'mock_full' || test.id?.startsWith('MOCK_');
                        navigate(isMock ? '/mock-exam' : '/exam', { 
                            state: isMock ? { mockData: test } : { testData: test } 
                        });
                    }}
                    className="flex items-center gap-2 bg-[#e31837] text-white px-6 py-2 rounded-full text-[13px] font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-500/10 active:scale-95"
                >
                    {t('testResults.takeNow')}
                    <ChevronRight size={16} />
                </button>
            ) : (
                <button className="flex items-center gap-1 text-[#1d1d1f] hover:text-[#e31837] transition-colors text-[13px] font-bold group">
                    {t('testResults.viewResults')}
                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>
            )}
        </div>
    </div>
);
