import { useEffect, useState, useMemo } from "react";
import { db } from "../firebase/firebase";
import { collection, query, where, getDocs, orderBy, limit, startAfter, endBefore, limitToLast } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { 
  BookOpen, Headphones, PenTool, Mic, Clock, 
  ChevronLeft, ChevronRight, ArrowRight, Award,
  CheckCircle2, XCircle, FileText, Search, Download, Filter,
  Calendar, User, Plus, Bookmark, LayoutGrid, List, MessageSquare, Star, X
} from "lucide-react";
import { getSynonymPairCounts } from "../utils/wordbankUtils";
import { calculateBandScore, calculateOverallBand } from "../utils/ieltsScoring";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import SiteFooter from "../components/common/SiteFooter";
import TestCommentSection from "../components/TestReview/TestCommentSection";
import { motion, AnimatePresence } from "framer-motion";

const getTestTheme = (type) => {
  switch (type) {
    case 'listening':
      return { 
        icon: Headphones, 
        bg: "bg-purple-50", 
        text: "text-purple-600", 
        border: "border-purple-500",
        label: "Listening",
        chipBg: "bg-purple-50",
        chipText: "text-purple-600"
      };
    case 'reading':
      return { 
        icon: BookOpen, 
        bg: "bg-blue-50", 
        text: "text-blue-600", 
        border: "border-blue-500",
        label: "Reading",
        chipBg: "bg-blue-50",
        chipText: "text-blue-600"
      };
    case 'writing':
      return { 
        icon: PenTool, 
        bg: "bg-orange-50", 
        text: "text-orange-600", 
        border: "border-orange-500",
        label: "Writing",
        chipBg: "bg-orange-50",
        chipText: "text-orange-600"
      };
    case 'speaking':
      return { 
        icon: Mic, 
        bg: "bg-emerald-50", 
        text: "text-emerald-600", 
        border: "border-emerald-500",
        label: "Speaking",
        chipBg: "bg-emerald-50",
        chipText: "text-emerald-600"
      };
    case 'mock_full':
      return { 
        icon: Award, 
        bg: "bg-indigo-50", 
        text: "text-indigo-600", 
        border: "border-indigo-600",
        label: "Full Mock",
        chipBg: "bg-indigo-50",
        chipText: "text-indigo-600"
      };
    default:
      return { 
        icon: FileText, 
        bg: "bg-gray-50", 
        text: "text-gray-600", 
        border: "border-gray-400",
        label: "Test",
        chipBg: "bg-gray-50",
        chipText: "text-gray-600"
      };
  }
};

const formatDate = (dateString) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('uz-UZ', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
};

export default function MyResults({ tests: propTests, loading: propLoading }) {
  const { user, userData, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('results');
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState('all');
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [userRatings, setUserRatings] = useState({});

  useEffect(() => {
    const fetchUserRatings = async () => {
      if (!user) return;
      try {
        const q = query(
          collection(db, "testComments"),
          where("userId", "==", user.uid),
          where("rating", ">", 0)
        );
        const snapshot = await getDocs(q);
        const ratingsMap = {};
        snapshot.forEach(doc => {
          const data = doc.data();
          // Store the latest rating for each test
          ratingsMap[data.testId] = data.rating;
        });
        setUserRatings(ratingsMap);
      } catch (error) {
        console.error("Error fetching ratings:", error);
      }
    };

    fetchUserRatings();
  }, [user]);

  const handleQuickRate = async (res, ratingValue) => {
    if (!user) return;
    try {
      const testId = res.testId || res.id;
      const { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp } = await import("firebase/firestore");
      
      // 1. Check for existing rating from this user for this test
      const q = query(
        collection(db, "testComments"),
        where("testId", "==", testId),
        where("userId", "==", user.uid)
      );
      
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        // 2. Update existing comment
        const existingDocId = snapshot.docs[0].id;
        await updateDoc(doc(db, "testComments", existingDocId), {
          rating: ratingValue,
          text: `Rated this test ${ratingValue}/5 stars`,
          updatedAt: serverTimestamp()
        });
      } else {
        // 3. Create new rating comment
        await addDoc(collection(db, "testComments"), {
          testId,
          userId: user.uid,
          userName: userData?.fullName || user.displayName || "Student",
          userRole: userData?.role || 'student',
          text: `Rated this test ${ratingValue}/5 stars`,
          rating: ratingValue,
          isReport: false,
          status: 'normal',
          createdAt: serverTimestamp()
        });
      }
      
      // Update local state immediately
      setUserRatings(prev => ({ ...prev, [testId]: ratingValue }));
    } catch (error) {
      console.error("Quick rate error:", error);
    }
  };

  const [hoveredRating, setHoveredRating] = useState({ id: null, value: 0 });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [synonymCounts, setSynonymCounts] = useState({});

  const [lastDoc, setLastDoc] = useState(null);
  const [firstDoc, setFirstDoc] = useState(null);
  const [pageHistory, setPageHistory] = useState([]);
  const [isNextAvailable, setIsNextAvailable] = useState(true);

  const isComponent = !!propTests;
  const itemsPerPage = isComponent ? 6 : 10;

  const filters = [
    { id: 'all', label: 'Barchasi', icon: <LayoutGrid size={16} /> },
    { id: 'reading', label: 'Reading', icon: <BookOpen size={16} /> },
    { id: 'listening', label: 'Listening', icon: <Headphones size={16} /> },
    { id: 'writing', label: 'Writing', icon: <PenTool size={16} /> },
    { id: 'speaking', label: 'Speaking', icon: <Mic size={16} /> },
    { id: 'mock_full', label: 'Mock Tests', icon: <Award size={16} /> },
  ];

  useEffect(() => {
    if (isComponent) {
        const mappedResults = propTests
            .filter(t => t.result)
            .map(t => ({ ...t.result, testTitle: t.title, type: t.type }))
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        
        setResults(mappedResults);
        setLoading(propLoading);
        return;
    }

    if (!user) return;
    const fetchFirstPage = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "results"),
          where("userId", "==", user.uid),
          orderBy("date", "desc"),
          limit(itemsPerPage)
        );

        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        setResults(data);
        if (snapshot.docs.length > 0) {
          setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
          setFirstDoc(snapshot.docs[0]);
        }
        setPageHistory([]);
        setIsNextAvailable(snapshot.docs.length === itemsPerPage);
      } catch (error) {
        console.error("Firebase Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchFirstPage();
  }, [user, propTests, propLoading, isComponent]);

  const fetchNext = async () => {
    if (!lastDoc) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "results"),
        where("userId", "==", user.uid),
        orderBy("date", "desc"),
        startAfter(lastDoc),
        limit(itemsPerPage)
      );

      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setResults(data);
        setPageHistory(prev => [...prev, firstDoc]);
        setFirstDoc(snapshot.docs[0]);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        setIsNextAvailable(snapshot.docs.length === itemsPerPage);
      } else {
        setIsNextAvailable(false);
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const fetchPrev = async () => {
    if (pageHistory.length === 0) return;
    setLoading(true);
    try {
      const qRewind = query(
        collection(db, "results"),
        where("userId", "==", user.uid),
        orderBy("date", "desc"),
        endBefore(firstDoc),
        limitToLast(itemsPerPage)
      );

      const snapshot = await getDocs(qRewind);
      if (!snapshot.empty) {
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setResults(data);
        setFirstDoc(snapshot.docs[0]);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        setPageHistory(prev => prev.slice(0, -1));
        setIsNextAvailable(true);
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const filteredResults = useMemo(() => {
    let base = results;
    if (searchTerm) {
        base = base.filter(r => (r.testTitle || "").toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (filterType !== 'all') {
        base = base.filter(r => r.type === filterType);
    }
    return base;
  }, [results, searchTerm, filterType]);

  if (loading && results.length === 0) {
    return (
      <div className={`flex items-center justify-center ${isComponent ? 'py-20' : 'h-screen bg-[#f8f9fb]'}`}>
        <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans text-[#1d1d1f] antialiased ${isComponent ? 'min-h-0 bg-transparent' : 'bg-[#f8f9fb]'}`}>
      {!isComponent && (
        <DashboardHeader
            user={user}
            userData={userData}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onLogoutClick={() => {
                if (window.confirm("Haqiqatan ham hisobdan chiqmoqchimisiz?")) {
                    logout();
                }
            }}
        />
      )}

      <main className={`mx-auto ${isComponent ? 'px-0 pt-0 pb-0' : 'max-w-[1200px] px-6 pt-10 pb-24'}`}>
        
        {!isComponent && (
            <>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div>
                        <h1 className="text-[32px] font-bold text-[#1d1d1f] mb-1">Natijalarim</h1>
                        <p className="text-[#86868b] text-sm font-medium">Barcha topshirilgan testlar tarixi</p>
                    </div>

                    <div className="flex flex-1 max-w-md items-center bg-white border border-gray-200 rounded-full px-4 py-2 mx-0 md:mx-8 shadow-sm">
                        <Search size={18} className="text-gray-400 mr-2" />
                        <input 
                            type="text" 
                            placeholder="Test nomini qidiring..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-transparent border-none outline-none text-sm w-full"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-full text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors shadow-sm">
                            <Download size={16} />
                            Export
                        </button>
                    </div>
                </div>

                {/* APPLE STYLE SEGMENTED CONTROL FILTER */}
                <div className="flex items-center justify-start overflow-x-auto hide-scrollbar mb-10 bg-zinc-100 p-1 rounded-xl w-fit max-w-full">
                    {filters.map((f) => {
                        const isActive = filterType === f.id;
                        return (
                            <button
                                key={f.id}
                                onClick={() => setFilterType(f.id)}
                                className={`relative flex items-center gap-2 px-5 py-2.5 rounded-lg text-[12px] font-bold transition-colors duration-200 whitespace-nowrap z-10 ${
                                    isActive ? 'text-blue-600' : 'text-zinc-500 hover:text-zinc-800'
                                }`}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="activeFilter"
                                        className="absolute inset-0 bg-white rounded-lg shadow-sm z-[-1]"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                <span className={isActive ? 'text-blue-600' : 'text-zinc-400'}>
                                    {f.icon}
                                </span>
                                {f.label}
                            </button>
                        );
                    })}
                </div>
            </>
        )}

        {filteredResults.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-32 bg-white rounded-xl border border-gray-100 text-center px-6 shadow-sm">
            <div className="w-16 h-16 bg-[#f8f9fb] rounded-full flex items-center justify-center mb-6">
              <FileText size={32} className="text-[#86868b]" />
            </div>
            <h3 className="text-xl font-bold mb-2">Natijalar topilmadi</h3>
            <p className="text-[#86868b] mb-8 text-sm">Tanlangan filtr bo'yicha hech qanday natija mavjud emas.</p>
            <button 
                onClick={() => {setFilterType('all'); setSearchTerm('');}} 
                className="text-blue-600 font-bold text-sm hover:underline"
            >
                Filtrlarni tozalash
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredResults.map((res) => {
              const theme = getTestTheme(res.type);
              const bandScore = (res.type === 'reading' || res.type === 'listening')
                ? (res.bandScore || calculateBandScore(res.score, res.type, res.totalQuestions))
                : (res.type === 'writing' ? (res.writingBand || res.bandScore) : res.score);
              const isGraded = res.status === 'graded' || res.writingBand != null || res.bandScore != null || (res.score !== null && res.type !== 'mock_full');

              const totalQ = res.totalQuestions || (res.answers ? Object.keys(res.answers).length : 40);
              const correct = res.score || 0;
              const incorrect = totalQ - correct;

              return (
                <div
                  key={res.id}
                  onClick={() => navigate(`/review/${res.id}`)}
                  className="group relative flex flex-col md:flex-row items-stretch bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer"
                >
                  {/* Date Badge Section - IDP Style */}
                  <div className="w-[80px] shrink-0 bg-[#3a3a44] flex flex-col items-center justify-center py-4 text-white">
                    <span className="text-[14px] font-bold tracking-tight opacity-90 uppercase">
                      {new Date(res.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                    <div className="w-6 h-px bg-white/20 my-1" />
                    <span className="text-[28px] font-black leading-none my-1">
                      {new Date(res.date).getDate()}
                    </span>
                    <span className="text-[14px] font-bold tracking-tight opacity-90 uppercase">
                      {new Date(res.date).toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col md:flex-row md:items-center p-6 gap-6">

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col mb-4">
                        <h3 className="text-[15px] font-bold text-[#1d1d1f] tracking-tight line-clamp-1 leading-snug">
                          {res.title || res.testTitle || (res.type === 'mock_full' ? "IELTS Mock Exam" : "Practice Test")}
                        </h3>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`text-[9px] font-black uppercase tracking-[0.15em] ${theme.text}`}>{theme.label}</span>
                          <div className="w-1 h-1 rounded-full bg-zinc-200" />
                          <div className="flex items-center gap-3 text-[10px] font-medium text-zinc-400">
                            <div className="flex items-center gap-1">
                              <Calendar size={11} strokeWidth={2} />
                              {formatDate(res.date)}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock size={11} strokeWidth={2} />
                              {res.timeTaken ? `${Math.floor(res.timeTaken / 60)}m ${res.timeTaken % 60}s` : "20m"}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Rating Component - Subtle */}
                        <div className="flex items-center gap-0.5 bg-zinc-50 px-1.5 py-1 rounded-lg border border-zinc-100">
                          {[1, 2, 3, 4, 5].map((s) => {
                            const testId = res.testId || res.id;
                            const currentRating = userRatings[testId] || 0;
                            const isLit = (hoveredRating.id === res.id && hoveredRating.value >= s) || (currentRating >= s);
                            return (
                              <button
                                key={s}
                                onMouseEnter={() => setHoveredRating({ id: res.id, value: s })}
                                onMouseLeave={() => setHoveredRating({ id: null, value: 0 })}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickRate(res, s);
                                }}
                                className="p-0.5 transition-transform active:scale-90"
                              >
                                <Star 
                                  size={11} 
                                  className={`transition-colors ${
                                    isLit 
                                    ? 'fill-amber-400 text-amber-400' 
                                    : 'text-zinc-200'
                                  }`} 
                                />
                              </button>
                            );
                          })}
                        </div>

                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedResult(res);
                            setIsCommentsOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-zinc-50 text-zinc-400 hover:text-zinc-900 transition-colors border border-zinc-100"
                        >
                          <MessageSquare size={12} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>

                    {/* Stats & Band Section */}
                    <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center px-6 md:px-10 md:border-l border-zinc-100 min-w-[150px] gap-3 bg-zinc-50/50 md:bg-transparent py-4 md:py-0">
                      {isGraded ? (
                        <>
                          <div className="flex flex-col items-center md:items-end">
                            <div className="flex items-baseline gap-1">
                              <span className="text-[28px] font-black text-zinc-900 tracking-tighter leading-none">
                                {res.type === 'mock_full' 
                                  ? Number(res.scores?.overallBand || res.overallBand || 0).toFixed(1)
                                  : Number(bandScore || 0).toFixed(1)}
                              </span>
                              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Band</span>
                            </div>
                          </div>

                          <div className="flex flex-col items-center md:items-end">
                            <div className="flex items-center gap-2">
                              <div className="flex items-baseline gap-0.5">
                                <span className="text-[13px] font-bold text-zinc-900">{correct}</span>
                                <span className="text-[10px] font-medium text-zinc-400">/{totalQ}</span>
                              </div>
                              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 bg-opacity-40" />
                            </div>
                            <div className="text-[8px] font-black text-zinc-300 uppercase tracking-[0.2em] mt-0.5">SCORE</div>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center md:items-end gap-1.5">
                          <div className="w-6 h-6 rounded-full border-2 border-zinc-200 border-t-zinc-900 animate-spin" />
                          <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Grading</span>
                        </div>
                      )}
                    </div>

                    <div className="hidden lg:flex items-center justify-center pl-2">
                      <div className="w-8 h-8 rounded-full bg-zinc-50 text-zinc-300 group-hover:text-zinc-900 transition-colors flex items-center justify-center">
                        <ArrowRight size={16} strokeWidth={2.5} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!isComponent && (
            <div className="flex justify-center items-center mt-12 gap-4">
              <button
                onClick={fetchPrev}
                disabled={pageHistory.length === 0 || loading}
                className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
              >
                <ChevronLeft size={20} />
              </button>

              <div className="text-[14px] font-bold text-gray-600 bg-white border border-gray-200 px-5 py-2 rounded-full shadow-sm">
                {pageHistory.length + 1}
              </div>

              <button
                onClick={fetchNext}
                disabled={!isNextAvailable || loading}
                className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
              >
                <ChevronRight size={20} />
              </button>
            </div>
        )}

        {isComponent && filteredResults.length > itemsPerPage && (
            <div className="mt-8 text-center">
                <button 
                    onClick={() => navigate('/my-results')}
                    className="text-[14px] font-bold text-blue-600 hover:bg-blue-50 px-6 py-2 rounded-full transition-all flex items-center justify-center gap-2 mx-auto border border-blue-100"
                >
                    Barcha natijalarni ko'rish <ArrowRight size={16} />
                </button>
            </div>
        )}
      </main>
      
      {!isComponent && <SiteFooter />}
      {/* --- SIDE PANEL: COMMENTS --- */}
      <AnimatePresence>
        {isCommentsOpen && selectedResult && (
          <>
            {/* Overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCommentsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000]"
            />
            {/* Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-screen w-full max-w-[380px] bg-[#f8f9fb] z-[1001] shadow-2xl flex flex-col border-l border-white/10"
            >
              <div className="h-16 bg-zinc-950 text-white flex items-center justify-between px-6 shrink-0">
                <div className="flex flex-col">
                  <h2 className="text-sm font-black tracking-widest leading-none">Comments</h2>
                  <span className="text-[10px] text-gray-400 font-medium mt-1 truncate max-w-[300px]">{selectedResult.testTitle}</span>
                </div>
                <button 
                  onClick={() => setIsCommentsOpen(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto px-4 py-6 no-scrollbar">
                <TestCommentSection 
                  testId={selectedResult.testId || selectedResult.id} 
                  user={user} 
                  userData={userData} 
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}