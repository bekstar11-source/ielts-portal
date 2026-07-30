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
        <div className="min-h-screen bg-warm-canvas dark:bg-warm-dark font-sans text-warm-ink dark:text-warm-on-dark antialiased flex flex-col">
            {/* Header Area */}
            <header className="bg-white dark:bg-warm-dark-elevated border-b border-warm-hairline dark:border-white/10 h-20 flex items-center px-4 md:px-12 sticky top-0 z-50">
                <div className="flex-1 flex items-center">
                    <button
                        onClick={() => navigate('/mock')}
                        className="flex items-center gap-2 text-warm-muted hover:text-warm-primary dark:text-warm-on-dark-soft dark:hover:text-warm-primary transition-colors font-bold text-sm group"
                    >
                        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="hidden md:inline">{t('testResults.back')}</span>
                    </button>
                </div>
                <div className="flex-1 flex justify-center">
                   <div className="flex items-baseline gap-1.5 cursor-pointer" onClick={() => navigate('/dashboard')}>
                       <span className="text-warm-primary font-black text-3xl tracking-tighter">IELTS</span>
                       <span className="text-warm-ink dark:text-warm-on-dark font-medium text-xl tracking-tighter italic">mock</span>
                   </div>
                </div>
                <div className="flex-1 flex justify-end">
                    <button onClick={() => navigate('/settings')} className="w-10 h-10 rounded-full bg-warm-ink dark:bg-warm-dark-soft text-white flex items-center justify-center font-bold text-sm">
                        {userData?.fullName?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
                    </button>
                </div>
            </header>

            <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-8 space-y-8">
                {/* Breadcrumb style back link */}
                <button
                    onClick={() => navigate('/mock')}
                    className="flex items-center gap-1 text-warm-primary hover:underline text-sm font-medium"
                >
                    <ChevronLeft size={16} />
                    {t('testResults.backToDashboard')}
                </button>

                {/* Title Section */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold text-warm-ink dark:text-warm-on-dark tracking-tight">{t('testResults.title')}</h1>
                        <p className="text-warm-muted dark:text-warm-on-dark-soft text-[15px] font-medium">{t('testResults.subtitle')}</p>
                    </div>
                    <button
                        onClick={() => navigate('/mock')}
                        className="bg-warm-primary text-white px-8 py-3 rounded-full font-bold text-sm hover:bg-warm-primary-active transition-colors shadow-lg shadow-warm-primary/20"
                    >
                        {t('mock.buyMock')}
                    </button>
                </div>

                {/* Tabs */}
                <div className="border-b border-warm-hairline dark:border-white/10 flex items-center gap-12">
                    <button
                        onClick={() => setActiveTab('upcoming')}
                        className={`pb-4 text-sm font-bold transition-all relative ${
                            activeTab === 'upcoming' ? 'text-warm-ink dark:text-warm-on-dark' : 'text-warm-muted-soft hover:text-warm-muted dark:text-warm-on-dark-soft dark:hover:text-warm-on-dark'
                        }`}
                    >
                        {t('testResults.upcomingTests')}
                        {activeTab === 'upcoming' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-warm-primary" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('past')}
                        className={`pb-4 text-sm font-bold transition-all relative ${
                            activeTab === 'past' ? 'text-warm-ink dark:text-warm-on-dark' : 'text-warm-muted-soft hover:text-warm-muted dark:text-warm-on-dark-soft dark:hover:text-warm-on-dark'
                        }`}
                    >
                        {t('testResults.pastTests')}
                        {activeTab === 'past' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-warm-primary" />}
                    </button>
                </div>

                {/* Results List */}
                <div className="space-y-6 pb-12">
                    <h3 className="text-lg font-bold text-warm-ink dark:text-warm-on-dark">
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
                        <div className="bg-white dark:bg-warm-dark-elevated rounded-xl border border-warm-hairline dark:border-white/10 p-12 text-center space-y-4">
                            <div className="w-16 h-16 bg-warm-card dark:bg-white/5 rounded-full flex items-center justify-center mx-auto text-warm-muted-soft">
                                <FileText size={32} />
                            </div>
                            <p className="text-warm-muted dark:text-warm-on-dark-soft font-medium">
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
    <div className="bg-white dark:bg-warm-dark-elevated rounded-xl border border-warm-hairline dark:border-white/10 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between gap-4">
                <h4 className="text-lg font-bold text-warm-primary">IELTS On Computer Academic</h4>
                {tab === 'past' ? (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-warm-success/10 text-warm-success rounded-md border border-warm-success/20">
                        <CheckCircle2 size={14} />
                        <span className="text-[11px] font-bold uppercase tracking-wider">{t('testResults.resultsAvailable')}</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-warm-accent-teal/10 text-warm-accent-teal rounded-md border border-warm-accent-teal/20">
                        <Calendar size={14} />
                        <span className="text-[11px] font-bold uppercase tracking-wider">{t('testResults.scheduled')}</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 bg-warm-canvas dark:bg-warm-dark-soft rounded-lg divide-y md:divide-y-0 md:divide-x divide-warm-hairline dark:divide-white/10 border border-warm-hairline-soft dark:border-white/5">
                <div className="p-5 space-y-2">
                    <p className="text-[15px] font-bold text-warm-ink dark:text-warm-on-dark">Listening, Reading, Writing</p>
                    <div className="flex items-center gap-3 text-warm-muted dark:text-warm-on-dark-soft text-[13px] font-medium">
                        <span className="flex items-center gap-1.5"><Calendar size={14} />
                            {test.scheduledDate ? new Date(test.scheduledDate).toLocaleDateString('uz-UZ') : test.startDate ? new Date(test.startDate).toLocaleDateString('uz-UZ') : 'N/A'}
                        </span>
                        <span className="flex items-center gap-1.5"><Clock size={14} /> 09:30 AM</span>
                    </div>
                </div>
                <div className="p-5 space-y-2">
                    <p className="text-[15px] font-bold text-warm-ink dark:text-warm-on-dark">{t('testResults.speakingTest')}</p>
                    <div className="flex items-center gap-3 text-warm-muted dark:text-warm-on-dark-soft text-[13px] font-medium">
                        <span className="flex items-center gap-1.5"><Calendar size={14} />
                            {test.scheduledDate ? new Date(test.scheduledDate).toLocaleDateString('uz-UZ') : test.startDate ? new Date(test.startDate).toLocaleDateString('uz-UZ') : 'N/A'}
                        </span>
                        <span className="flex items-center gap-1.5"><Clock size={14} /> 03:00 PM</span>
                    </div>
                </div>
            </div>
        </div>

        <div className="px-6 py-4 border-t border-warm-hairline-soft dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 bg-warm-canvas/30 dark:bg-white/[0.02]">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-warm-muted dark:text-warm-on-dark-soft text-[13px] font-medium">
                    <Monitor size={16} />
                    <span>{t('testResults.onComputer')}</span>
                </div>
                <div className="flex items-center gap-2 text-warm-muted dark:text-warm-on-dark-soft text-[13px] font-medium">
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
                    className="flex items-center gap-2 bg-warm-primary text-white px-6 py-2 rounded-full text-[13px] font-bold hover:bg-warm-primary-active transition-all shadow-lg shadow-warm-primary/10 active:scale-95"
                >
                    {t('testResults.takeNow')}
                    <ChevronRight size={16} />
                </button>
            ) : (
                <button className="flex items-center gap-1 text-warm-ink dark:text-warm-on-dark hover:text-warm-primary transition-colors text-[13px] font-bold group">
                    {t('testResults.viewResults')}
                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>
            )}
        </div>
    </div>
);
