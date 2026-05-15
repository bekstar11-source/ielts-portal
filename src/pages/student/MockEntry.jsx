import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/firebase';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
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
    Download
} from 'lucide-react';
import SiteFooter from '../../components/common/SiteFooter';

export default function MockEntry() {
    const { user, userData } = useAuth();
    const navigate = useNavigate();
    
    const [mockKey, setMockKey] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [currentMock, setCurrentMock] = useState(null);
    const [showCalendar, setShowCalendar] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [viewDate, setViewDate] = useState(new Date());
    
    const [activeTab, setActiveTab] = useState('upcoming');
    const [mockTests, setMockTests] = useState([]);
    const [fetchingMocks, setFetchingMocks] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

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
            const q = query(
                collection(db, "accessKeys"), 
                where("key", "==", mockKey.trim().toUpperCase())
            );
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                throw new Error("Kalit xato yoki topilmadi.");
            }

            const keyDoc = querySnapshot.docs[0];
            const keyData = keyDoc.data();

            if (keyData.isUsed) {
                throw new Error("Ushbu kalit allaqachon ishlatilgan.");
            }

            const mockAssignment = {
                id: 'MOCK_' + keyData.key,
                type: 'mock_full',
                title: 'Full Mock Exam (L+R+W)',
                startDate: new Date().toISOString(),
                status: 'unlocked_mock',
                mockKey: keyData.key,
                subTests: {
                    reading: keyData.assignedTests.readingId,
                    listening: keyData.assignedTests.listeningId,
                    writing: keyData.assignedTests.writingId
                }
            };

            await Promise.all([
                updateDoc(doc(db, "users", user.uid), {
                    mockTests: arrayUnion(mockAssignment)
                }),
                updateDoc(doc(db, "accessKeys", keyDoc.id), {
                    isUsed: true,
                    usedBy: user.uid,
                    usedByName: userData?.fullName || user.email,
                    usedAt: new Date().toISOString()
                })
            ]);

            setSuccess(true);
            setCurrentMock(mockAssignment);
            setRefreshTrigger(prev => prev + 1);
        } catch (err) {
            setError(err.message);
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
            {/* Official Header */}
            <header className="w-full border-b border-gray-300 px-6 py-3 bg-white sticky top-0 z-50">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-gray-50 rounded-full transition-colors text-gray-400 hover:text-gray-900">
                            <ArrowLeft size={20} />
                        </button>
                        <span className="font-bold text-sm text-gray-900">Go to Dashboard</span>
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
                    <h1 className="text-3xl font-bold text-[#e31b23] mb-2">Welcome, {userData?.fullName?.split(' ')[0] || "Candidate"}</h1>
                    <p className="text-gray-500 font-medium">{user?.email}</p>
                    <div className="h-[1px] bg-gray-200 w-full mt-8"></div>
                </section>

                {/* Key Verification Section */}
                <section className="bg-gray-50 border border-gray-200 rounded-md p-10 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-[#e31b23]"></div>
                    <div className="space-y-6">
                        <div className="space-y-1">
                            <h2 className="text-xl font-bold text-gray-800">Mock Examination Access</h2>
                            <p className="text-gray-500 text-sm">Please enter your unique access key to unlock your mock exam.</p>
                        </div>

                        <form onSubmit={handleVerifyKey} className="flex flex-col md:flex-row gap-3">
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={mockKey}
                                    onChange={(e) => setMockKey(e.target.value)}
                                    placeholder="XXXX-XXXX-XXXX"
                                    className="w-full bg-white border border-gray-300 rounded py-3 px-4 text-sm font-black uppercase tracking-[0.2em] text-gray-900 outline-none focus:border-[#e31b23] transition-all placeholder:tracking-normal placeholder:font-medium placeholder:text-gray-400"
                                />
                                {error && (
                                    <p className="text-[#e31b23] text-[11px] font-bold mt-2 flex items-center gap-1.5">
                                        <AlertCircle size={14} /> {error}
                                    </p>
                                )}
                            </div>
                            <button
                                type="submit"
                                disabled={loading || !mockKey.trim() || success}
                                className={`px-10 py-3.5 rounded-xl font-bold text-sm transition-all shadow-md active:scale-95 ${
                                    success ? 'bg-green-600 text-white' : 'bg-[#e31b23] text-white hover:bg-[#c4151c]'
                                }`}
                            >
                                {loading ? <Loader2 size={18} className="animate-spin" /> : success ? <Sparkles size={18} /> : "Unlock exam"}
                            </button>
                        </form>
                    </div>
                </section>

                {/* Mock History Tabs */}
                <section className="space-y-8">
                    <div className="flex items-center gap-12 border-b border-gray-200">
                        <button 
                            onClick={() => setActiveTab('upcoming')}
                            className={`pb-4 text-[17px] font-bold transition-all relative ${activeTab === 'upcoming' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Upcoming tests
                            {activeTab === 'upcoming' && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#e31b23]" />}
                        </button>
                        <button 
                            onClick={() => setActiveTab('past')}
                            className={`pb-4 text-[17px] font-bold transition-all relative ${activeTab === 'past' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Past tests
                            {activeTab === 'past' && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#e31b23]" />}
                        </button>
                    </div>
                    
                    {activeTab === 'past' && filteredMocks.length > 0 && (
                        <p className="text-sm font-bold text-gray-900 mb-6 mt-8">
                            Showing <span className="text-[#e31b23]">{filteredMocks.length}</span> past test
                        </p>
                    )}

                    <div className="space-y-6">
                        {fetchingMocks ? (
                            <div className="py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">
                                <Loader2 className="animate-spin mx-auto mb-4 opacity-30" size={32} /> 
                                Authenticating data...
                            </div>
                        ) : filteredMocks.length > 0 ? (
                            filteredMocks.map((test, index) => (
                                <MockTestCard key={index} test={test} tab={activeTab} navigate={navigate} userData={userData} />
                            ))
                        ) : (
                            <div className="border border-dashed border-gray-300 rounded-md py-20 text-center bg-gray-50/50">
                                <FileText size={40} className="mx-auto mb-4 text-gray-200" />
                                <p className="text-gray-400 text-sm font-medium italic">No {activeTab === 'upcoming' ? 'scheduled' : 'completed'} mock exams found.</p>
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
                                        <h2 className="text-2xl font-bold text-gray-900">Access Key Verified</h2>
                                        <p className="text-gray-500 text-sm leading-relaxed">Your mock exam has been successfully activated. <br/>When would you like to begin?</p>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3 pt-4">
                                        <button onClick={() => navigate('/mock-exam', { state: { mockData: currentMock } })} className="w-full bg-[#e31b23] text-white py-4 rounded-xl font-bold text-sm hover:bg-[#c4151c] transition-all shadow-lg shadow-red-900/10">Start exam now</button>
                                        <button onClick={() => setShowCalendar(true)} className="w-full bg-gray-50 text-gray-600 py-4 rounded-xl font-bold text-sm hover:bg-gray-100 transition-all border border-gray-200">Schedule for later</button>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg">
                                {/* Calendar logic remains the same but with simplified Official IELTS styling */}
                                <div className="bg-white border border-gray-300 rounded-md p-10 shadow-2xl space-y-8">
                                    <div className="text-center">
                                        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Schedule your exam</h2>
                                    </div>
                                    
                                    <div className="border border-gray-200 rounded-md p-6">
                                        <div className="flex items-center justify-between mb-8">
                                            <h3 className="font-bold text-[#e31b23]">
                                                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][viewDate.getMonth()]} {viewDate.getFullYear()}
                                            </h3>
                                            <div className="flex gap-2">
                                                <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="p-2 hover:bg-gray-50 rounded border border-gray-100"><ChevronRight className="rotate-180" size={16} /></button>
                                                <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="p-2 hover:bg-gray-50 rounded border border-gray-100"><ChevronRight size={16} /></button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-7 gap-1">
                                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                                <div key={day} className="text-[10px] font-black text-gray-300 uppercase text-center py-2">{day}</div>
                                            ))}

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
                                        <button onClick={() => setShowCalendar(false)} className="flex-1 py-4 border border-gray-200 rounded-xl font-bold text-sm text-gray-400 hover:bg-gray-50">Back</button>
                                        <button onClick={handleScheduleTest} disabled={loading} className="flex-[2] bg-[#e31b23] text-white py-4 rounded-xl font-bold text-sm hover:bg-[#c4151c] flex items-center justify-center gap-2">
                                            {loading ? <Loader2 className="animate-spin" size={16} /> : "Confirm schedule"}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

const MockTestCard = ({ test, tab, navigate, userData }) => {
    if (tab === 'past') {
        const isGraded = test.resultStatus === 'graded';
        const s = test.scores || {};
        
        // Helper to format score
        const fmt = (v) => {
            if (v === undefined || v === null || v === "") return "---";
            return Number(v).toFixed(1);
        };

        const testDate = test.startDate ? new Date(test.startDate).toLocaleDateString('en-GB') : '---';
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
                            <p className="text-[15px] font-black text-gray-900 leading-tight">Test taker name</p>
                            <p className="text-[13px] font-medium text-gray-600 truncate">{userData?.fullName || "Candidate"}</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <Fingerprint size={22} className="text-gray-400" />
                        <div className="space-y-1">
                            <p className="text-[15px] font-black text-gray-900 leading-tight">Test taker ID</p>
                            <p className="text-[13px] font-medium text-gray-600">501235</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <Building2 size={22} className="text-gray-400" />
                        <div className="space-y-1">
                            <p className="text-[15px] font-black text-gray-900 leading-tight">Centre name</p>
                            <p className="text-[13px] font-medium text-gray-600">Englev</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <Calendar size={22} className="text-gray-400" />
                        <div className="space-y-1">
                            <p className="text-[15px] font-black text-gray-900 leading-tight">Test date</p>
                            <p className="text-[13px] font-medium text-gray-600">{testDate}</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <FileText size={22} className="text-gray-400" />
                        <div className="space-y-1">
                            <p className="text-[15px] font-black text-gray-900 leading-tight">TRF number</p>
                            <p className="text-[13px] font-medium text-gray-600 truncate">{trfNumber}</p>
                        </div>
                    </div>
                </div>

                {/* Results Section */}
                <div className="p-8 space-y-8 bg-gray-50/30">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-[#e31b23] rounded-none"></div>
                            <h2 className="text-2xl font-bold text-gray-900">Your test result</h2>
                        </div>
                        <button 
                            onClick={() => navigate('/mock-exam')}
                            className="flex items-center gap-2 text-sm font-bold text-[#e31b23] hover:underline"
                        >
                            <span>Buy Mock Test</span>
                        </button>
                    </div>

                    {!isGraded ? (
                        <div className="bg-orange-50 border border-orange-100 rounded-xl p-8 text-center space-y-3">
                            <Clock className="mx-auto text-orange-400 animate-pulse" size={32} />
                            <h3 className="font-bold text-orange-800 text-lg">Results are being processed</h3>
                            <p className="text-orange-600 text-sm max-w-md mx-auto">Your Writing and Speaking sections are currently being reviewed by our examiners. Usually this takes 1-3 days.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Overall Band */}
                            <button 
                                onClick={() => navigate(`/review/${test.resultId || test.id}`)}
                                className="w-full bg-white hover:bg-gray-50 transition-all rounded-xl p-5 flex justify-between items-center group shadow-sm border border-gray-200"
                            >
                                <div className="text-left space-y-1">
                                    <span className="text-[18px] font-black text-gray-900">Overall</span>
                                    <p className="text-[38px] font-black text-[#e31b23] leading-none tracking-tighter">{fmt(test.bandScore)}</p>
                                </div>
                                <ChevronRight size={24} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
                            </button>

                            {/* Skills Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { label: 'Listening', key: 'listeningBand' },
                                    { label: 'Reading', key: 'readingBand' },
                                    { label: 'Writing', key: 'writingBand' },
                                    { label: 'Speaking', key: 'speakingBand' }
                                ].map((skill) => {
                                    const baseKey = skill.key.replace('Band', '');
                                    const val = s[skill.key] ?? s[baseKey] ?? test[skill.key] ?? test[baseKey];
                                    
                                    return (
                                        <button 
                                            key={skill.label}
                                            onClick={() => navigate(`/review/${test.resultId || test.id}`)}
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
                            <span className="text-[11px] font-bold uppercase tracking-wider">Computer</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <MapPin size={14} />
                            <span className="text-[11px] font-bold uppercase tracking-wider">Official Center</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => navigate(`/review/${test.resultId || test.id}`)}
                        className="text-[#e31b23] text-sm font-bold hover:underline flex items-center gap-1 group"
                    >
                        View full report
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
                        <h4 className="text-xl font-bold text-gray-800">IELTS CD Academic Full Mock</h4>
                        <span className="text-[11px] font-bold text-[#e31b23] bg-red-50 px-2.5 py-1 rounded-full border border-red-100">Unlocked</span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="flex items-center gap-3 text-gray-400">
                            <Calendar size={16} className="shrink-0" />
                            <div className="flex flex-col">
                                <span className="text-[11px] font-medium text-gray-400">Scheduled date</span>
                                <span className="text-sm font-semibold text-gray-700">{test.scheduledDate ? new Date(test.scheduledDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Flexible'}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-gray-400">
                            <Monitor size={16} className="shrink-0" />
                            <div className="flex flex-col">
                                <span className="text-[11px] font-medium text-gray-400">Test format</span>
                                <span className="text-sm font-semibold text-gray-700">Official computer-delivered</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-gray-400">
                            <MapPin size={16} className="shrink-0" />
                            <div className="flex flex-col">
                                <span className="text-[11px] font-medium text-gray-400">Location</span>
                                <span className="text-sm font-semibold text-gray-700">Online exam center</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <button 
                    onClick={() => navigate('/mock-exam', { state: { mockData: test } })}
                    className="w-full md:w-auto px-10 py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 active:scale-95 bg-[#e31b23] text-white hover:bg-[#c4151c] shadow-lg shadow-red-900/20"
                >
                    Start exam
                    <ChevronRight size={16} />
                </button>
            </div>
        </article>
    );
};
