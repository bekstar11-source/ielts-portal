import { useEffect, useState, useMemo } from "react";
import { db } from "../../firebase/firebase";
import { collection, query, where, getDocs, orderBy, limit, startAfter, endBefore, limitToLast } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { 
  BookOpen, Headphones, PenTool, Mic, Clock, 
  ChevronLeft, ChevronRight, ArrowRight, Award,
  CheckCircle2, XCircle, FileText, Search, Download, Filter,
  Calendar, User, Plus, Bookmark, LayoutGrid, List, MessageSquare, Star, X
} from "lucide-react";
import { getSynonymPairCounts } from "../../utils/wordbankUtils";
import { calculateBandScore, calculateOverallBand } from "../../utils/ieltsScoring";
import DashboardHeader from "../../components/dashboard/DashboardHeader";
import DashboardModals from "../../components/dashboard/DashboardModals";
import PricingModal from "../../components/dashboard/PricingModal";
import SiteFooter from "../../components/common/SiteFooter";
import TestCommentSection from "../../components/TestReview/TestCommentSection";
import { motion, AnimatePresence } from "framer-motion";
import { hapticFeedback } from "../../utils/haptic";
import BottomNav from "../../components/dashboard/BottomNav";
import { useTranslation } from "../../context/LanguageContext";

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
  const { t, currentLanguage } = useTranslation();
  const dateLocale = currentLanguage === 'uz' ? 'uz-UZ' : 'en-US';
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('results');
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState('all');
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [userRatings, setUserRatings] = useState({});
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);

  const isPremium = userData?.isPremium || 
                    userData?.isPro || 
                    ['premium', 'pro', 'standard'].includes(userData?.accountType) || 
                    ['admin', 'teacher'].includes(userData?.role);

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
    { id: 'all', label: 'All', icon: 'apps' },
    { id: 'reading', label: 'Reading', icon: 'menu_book' },
    { id: 'listening', label: 'Listening', icon: 'headphones' },
    { id: 'writing', label: 'Writing', icon: 'edit' },
    { id: 'speaking', label: 'Speaking', icon: 'mic' },
    { id: 'mock_full', label: 'Mock Tests', icon: 'grade' },
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

  return (
    <div className={`min-h-screen bg-warm-canvas dark:bg-warm-dark text-warm-ink dark:text-warm-on-dark selection:bg-warm-primary selection:text-white transition-colors duration-250 ${isComponent ? 'min-h-0 bg-transparent' : ''}`}>
      {!isComponent && (
        <div className="sticky top-0 z-[100] w-full">
          <DashboardHeader
              user={user}
              userData={userData}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onLogoutClick={() => setShowLogoutConfirm(true)}
          />
            <nav className="w-full h-[52px] bg-warm-canvas/80 dark:bg-warm-dark/80 backdrop-blur-xl flex items-center border-b border-warm-hairline-soft dark:border-white/10">
              <div className="w-full px-8 h-full flex items-center justify-between">
                <div className="flex items-center gap-x-8">
                  <span className="text-lg font-semibold text-warm-ink dark:text-warm-on-dark">{t('myResults.title')}</span>
                  <div className="hidden md:flex items-center gap-x-6 h-[52px]">
                    {filters.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setFilterType(f.id)}
                        className={`font-inter text-[15px] font-medium transition-colors h-full flex items-center border-b-2 ${
                          filterType === f.id
                          ? 'text-warm-primary dark:text-warm-primary border-warm-primary dark:border-warm-primary'
                          : 'text-warm-muted dark:text-warm-on-dark-soft hover:text-warm-ink dark:hover:text-warm-on-dark border-transparent'
                        }`}
                      >
                        {t(`myResults.categories.${f.id}`)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
          </nav>
        </div>
      )}

      {!isComponent && (
        <div className="md:hidden sticky top-0 z-[100] w-full bg-warm-canvas dark:bg-warm-dark border-b border-warm-hairline-soft dark:border-white/10 flex items-center justify-between px-6 h-14">
          <span className="text-lg font-bold text-warm-ink dark:text-warm-on-dark">{t('myResults.title')}</span>
          <div className="flex items-center gap-4">
             <Search size={20} className="text-warm-muted dark:text-warm-on-dark-soft" />
             <div className="w-8 h-8 rounded-full bg-warm-primary flex items-center justify-center text-white text-xs font-bold uppercase">
                {userData?.fullName?.charAt(0) || user?.email?.charAt(0)}
             </div>
          </div>
        </div>
      )}

      <main className={`max-w-6xl mx-auto ${isComponent ? 'px-0 pt-0 pb-0' : 'pt-6 md:pt-12 pb-32 md:pb-section px-4 md:px-8'}`}>
        {!isComponent && (
          <header className="mb-8 md:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="hidden md:block">
              <h1 className="font-display-md text-display-md text-warm-ink dark:text-warm-on-dark">{t('myResults.title')}</h1>
              <p className="font-body text-body text-warm-muted dark:text-warm-on-dark-soft mt-2">{t('myResults.subtitle')}</p>
            </div>

            {/* Mobile Filters */}
            <div className="flex md:hidden overflow-x-auto no-scrollbar gap-2 pb-2">
              {filters.map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    hapticFeedback('light');
                    setFilterType(f.id);
                  }}
                  className={`px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                    filterType === f.id
                    ? 'bg-warm-primary dark:bg-warm-primary text-white border-warm-primary dark:border-warm-primary shadow-md'
                    : 'bg-white dark:bg-warm-dark-elevated text-warm-muted dark:text-warm-on-dark-soft border-warm-hairline dark:border-white/10'
                  }`}
                >
                  {t(`myResults.categories.${f.id}`)}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-muted" size={18} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white dark:bg-warm-dark-elevated border border-warm-hairline dark:border-white/10 rounded-full py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-warm-primary transition-all text-warm-ink dark:text-warm-on-dark placeholder:text-warm-muted-soft dark:placeholder:text-warm-on-dark-soft"
                  placeholder={t('myResults.searchPlaceholder')}
                />
              </div>
              <button className="flex items-center gap-2 bg-white dark:bg-warm-dark-elevated border border-warm-hairline dark:border-white/10 px-4 py-2.5 rounded-full text-sm font-medium hover:bg-warm-card dark:hover:bg-white/5 text-warm-ink dark:text-warm-on-dark transition-colors active:scale-95">
                <Download size={18} />
                <span className="hidden sm:inline">{t('myResults.export')}</span>
              </button>
            </div>
          </header>
        )}

        <div className="flex flex-col gap-4 max-w-[1200px]">
          {loading && results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 bg-white dark:bg-warm-dark-elevated rounded-xl border border-warm-hairline dark:border-white/10 text-center px-6">
              <div className="w-8 h-8 border-2 border-warm-hairline dark:border-white/10 border-t-warm-primary rounded-full animate-spin mb-4"></div>
              <p className="text-warm-muted dark:text-warm-on-dark-soft text-sm">{t('myResults.loading')}</p>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 bg-white dark:bg-warm-dark-elevated rounded-xl border border-warm-hairline dark:border-white/10 text-center px-6">
              <span className="material-symbols-outlined text-[48px] text-warm-muted dark:text-warm-on-dark-soft mb-4">search_off</span>
              <h3 className="text-xl font-bold text-warm-ink dark:text-warm-on-dark mb-2">{t('myResults.noResults')}</h3>
              <p className="text-warm-muted dark:text-warm-on-dark-soft mb-8 text-sm">{t('myResults.noResultsDesc')}</p>
              <button
                onClick={() => {setFilterType('all'); setSearchTerm('');}}
                className="text-warm-primary font-bold text-sm hover:underline"
              >
                {t('myResults.clearFilters')}
              </button>
            </div>
          ) : (
            filteredResults.map((res) => {
              const theme = getTestTheme(res.type);

              // OXIRGI urinish — kartadagi ball "Review" tugmasi ochadigan urinish bilan
              // bir xil bo'lishi uchun. Ilgari bu yerda eng yaxshi urinish ko'rsatilardi
              // va o'quvchi kartada 6.5, review'da esa 5.5 ko'rib chalkashardi.
              // Reading/listening har bir urinishda avtomatik baholanadi, shuning uchun
              // band urinishning o'zidan olinadi; writing/speaking va mock esa hujjat
              // darajasida (o'qituvchi/AI baholaganda) yangilanadi.
              const latestAttempt = Array.isArray(res.attempts) && res.attempts.length > 0
                ? res.attempts[res.attempts.length - 1]
                : null;
              const latestScore = latestAttempt?.score ?? res.latestScore ?? res.bestScore ?? res.score;

              const bandScore = (res.type === 'reading' || res.type === 'listening')
                ? (latestAttempt?.bandScore
                    ?? res.latestBandScore
                    ?? res.bandScore
                    ?? calculateBandScore(latestScore, res.type, res.totalQuestions))
                : (res.type === 'writing' || res.type === 'speaking')
                  ? (res.writingBand || res.speakingBand || res.bandScore)
                  : (res.type === 'mock_full'
                    ? (res.overallBand || res.bandScore || (res.scores && (res.scores.overallBand || res.scores.bandScore)) || 0)
                    : res.score);

              const isGraded = res.status === 'graded' || res.writingBand != null || res.speakingBand != null || res.bandScore != null || res.overallBand != null || (res.score !== null && res.type !== 'mock_full');
              
              const dateObj = new Date(res.lastAttemptDate || res.date);
              const day = dateObj.getDate();
              const month = dateObj.toLocaleDateString(dateLocale, { month: 'short' }).toUpperCase();
              const time = dateObj.toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' });

              return (
                <motion.div
                  key={res.id}
                  className="group bg-white dark:bg-warm-dark-elevated rounded-xl border border-warm-hairline dark:border-white/10 p-4 md:p-5 flex flex-col transition-all shadow-sm"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 md:gap-6 flex-1">
                      <div className="flex-shrink-0 w-12 h-12 md:w-16 md:h-16 bg-warm-ink dark:bg-warm-dark-soft rounded-lg flex flex-col items-center justify-center text-white">
                        <span className="text-[10px] md:text-xs font-medium opacity-80">{month}</span>
                        <span className="text-lg md:text-xl font-bold leading-none">{day}</span>
                      </div>
                      <div className="flex-grow flex flex-col justify-center">
                        <h3 className="font-bold text-sm md:text-[17px] text-warm-ink dark:text-warm-on-dark line-clamp-1">
                          {res.title || res.testTitle || (res.type === 'mock_full' ? "IELTS Mock Exam" : "Practice Test")}
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] md:text-[12px] font-black tracking-widest text-warm-primary dark:text-warm-primary uppercase">{theme.label}</span>
                          <span className="text-[10px] md:text-[12px] text-warm-muted dark:text-warm-on-dark-soft flex items-center gap-1">
                            <Clock size={12} className="text-warm-muted-soft dark:text-warm-on-dark-soft" />
                            {time}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-6 md:gap-12 mt-2 md:mt-0">
                      <div className="md:text-right">
                        <div className="font-bold text-xl md:text-[28px] text-warm-ink dark:text-warm-on-dark leading-none flex items-baseline">
                          {isGraded ? (
                            <>
                              {Number(bandScore || 0).toFixed(1)}
                              <span className="text-[10px] md:text-sm font-black text-warm-muted dark:text-warm-on-dark-soft uppercase ml-1">{t('myResults.lastBand')}</span>
                            </>
                          ) : (
                            <span className="text-[10px] md:text-sm font-medium text-warm-muted">{t('myResults.grading')}</span>
                          )}
                        </div>
                        {isGraded && (
                          <div className="text-[10px] md:text-[12px] text-warm-muted dark:text-warm-on-dark-soft mt-0.5 md:mt-1 font-bold uppercase tracking-wide">
                            {latestScore !== undefined && latestScore !== null
                              ? `${latestScore}/${res.totalQuestions || 40} ${t('myResults.lastScore')}`
                              : t('myResults.evaluated')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Attempts History */}
                  <div className="w-full mt-5 pt-4 border-t border-warm-hairline dark:border-white/10">
                    <p className="text-xs text-warm-muted dark:text-warm-on-dark-soft uppercase font-bold mb-3 tracking-wider">
                      {t('myResults.attemptsHistory')} ({res.attempts?.length || 1})
                    </p>
                    <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                      {res.attempts && res.attempts.length > 0 ? (
                        [...res.attempts].reverse().map((attempt, index) => {
                          const attemptDateObj = new Date(attempt.date);
                          const attemptDateStr = attemptDateObj.toLocaleDateString(dateLocale, { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' });
                          const minsSpent = Math.max(1, Math.floor((attempt.timeSpent || 0) / 60));
                          const scoreVal = attempt.bandScore || attempt.overallBand || attempt.score || 0;
                          const isBand = attempt.bandScore != null || attempt.overallBand != null || res.type === 'mock_full' || res.type === 'reading' || res.type === 'listening' || res.type === 'writing' || res.type === 'speaking';

                          return (
                            <div key={attempt.attemptId} className="flex justify-between items-center bg-warm-canvas dark:bg-warm-dark-soft p-3 rounded-lg border border-warm-hairline dark:border-white/10">
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-warm-muted dark:text-warm-on-dark-soft font-bold">#{res.attempts.length - index}</span>
                                <span className="text-sm text-warm-ink dark:text-warm-on-dark font-medium">{attemptDateStr}</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-xs text-warm-muted dark:text-warm-on-dark-soft hidden sm:inline">{minsSpent} {t('myResults.minUnit')}</span>
                                <span className="text-sm font-bold text-warm-primary dark:text-warm-primary">
                                  {Number(scoreVal).toFixed(1)} {isBand ? t('myResults.band') : t('myResults.ball')}
                                </span>
                                <button
                                  onClick={() => {
                                    if (isPremium) {
                                      navigate(`/review/${res.id}?attempt=${attempt.attemptId}`);
                                    } else {
                                      setShowPricingModal(true);
                                    }
                                  }}
                                  className="text-xs bg-white dark:bg-warm-dark-elevated border border-warm-hairline dark:border-white/10 hover:bg-warm-card dark:hover:bg-white/5 text-warm-ink dark:text-warm-on-dark px-3 py-1.5 rounded-full font-medium transition-colors shadow-sm"
                                >
                                  {isPremium ? "" : "🔒 "}{t('myResults.review')}
                                </button>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        // Fallback for old data without attempts array
                        <div className="flex justify-between items-center bg-warm-canvas dark:bg-warm-dark-soft p-3 rounded-lg border border-warm-hairline dark:border-white/10">
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-warm-muted dark:text-warm-on-dark-soft font-bold">#1</span>
                            <span className="text-sm text-warm-ink dark:text-warm-on-dark font-medium">
                              {new Date(res.date).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-bold text-warm-primary dark:text-warm-primary">{Number(bandScore || 0).toFixed(1)} {t('myResults.band')}</span>
                            <button
                              onClick={() => {
                                if (isPremium) {
                                  navigate(`/review/${res.id}`);
                                } else {
                                  setShowPricingModal(true);
                                }
                              }}
                              className="text-xs bg-white dark:bg-warm-dark-elevated border border-warm-hairline dark:border-white/10 hover:bg-warm-card dark:hover:bg-white/5 text-warm-ink dark:text-warm-on-dark px-3 py-1.5 rounded-full font-medium transition-colors shadow-sm"
                            >
                              {isPremium ? "" : "🔒 "}{t('myResults.review')}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {!isComponent && (
          <div className="mt-16 flex justify-center items-center gap-2">
            <button
              onClick={fetchPrev}
              disabled={pageHistory.length === 0 || loading}
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium border border-warm-hairline dark:border-white/10 bg-white dark:bg-warm-dark-elevated hover:bg-warm-card dark:hover:bg-white/5 text-warm-ink dark:text-warm-on-dark transition-colors disabled:opacity-30"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <div className="flex items-center gap-2">
               {/* Simplified pagination for demo/template feel */}
               <button className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium bg-warm-primary text-white">
                 {pageHistory.length + 1}
               </button>
            </div>
            <button
              onClick={fetchNext}
              disabled={!isNextAvailable || loading}
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium border border-warm-hairline dark:border-white/10 bg-white dark:bg-warm-dark-elevated hover:bg-warm-card dark:hover:bg-white/5 text-warm-ink dark:text-warm-on-dark transition-colors disabled:opacity-30"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        )}
      </main>

        {!isComponent && (
          <>
            <section className="w-full bg-white dark:bg-warm-dark py-section border-t border-warm-hairline dark:border-white/10">
              <div className="max-w-6xl mx-auto px-8">
                <div className="flex flex-col items-center text-center mb-16">
                  <span className="text-warm-primary font-semibold tracking-widest uppercase text-xs mb-4">{t('myResults.motivationTitle')}</span>
                  <h2 className="font-display-md text-3xl max-w-2xl text-warm-ink dark:text-warm-on-dark">{t('myResults.motivationQuote')}</h2>
                </div>
                <div className="relative rounded-xl overflow-hidden aspect-[21/9]">
                  <img
                    className="w-full h-full object-cover"
                    alt="A focused student sitting in a bright, modern library"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCHrx_83zpVcIennaqB7KnJsIF6uwiwBRG_pMKVRI5uCWzvb413B1IkIeIvbfEpCKJ1sroDSWKULg_3EakhMM0dsInf1YsCeZov9KQcLZSWYsPY0F1Jzijf6KZBNWiq95_O_4I2TBT84SjF2YQwpH4TpGeH9ZIjsxQ1aGqkpkHImFlL0Jln6KWTqiXHWZV_nZfEfTFQZ_yzTf8m3Sxt7paawURp6mimaSShtUphLh765_Y1E8e9b-sGsyT13kOXopYgJszaI_EdPnUb"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                </div>
              </div>
            </section>
            <SiteFooter />
          </>
        )}

      {/* --- SIDE PANEL: COMMENTS --- */}
      <AnimatePresence>
        {isCommentsOpen && selectedResult && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCommentsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000]"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-screen w-full max-w-[380px] bg-warm-canvas dark:bg-warm-dark-elevated z-[1001] shadow-2xl flex flex-col border-l border-warm-hairline dark:border-white/10"
            >
              <div className="h-16 bg-warm-ink text-white flex items-center justify-between px-6 shrink-0">
                <div className="flex flex-col">
                  <h2 className="text-sm font-black tracking-widest leading-none">{t('myResults.comments')}</h2>
                  <span className="text-[10px] text-warm-on-dark-soft font-medium mt-1 truncate max-w-[300px]">{selectedResult.testTitle}</span>
                </div>
                <button
                  onClick={() => setIsCommentsOpen(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                >
                  <span className="material-symbols-outlined">close</span>
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
      
      {!isComponent && (
        <BottomNav 
          activeTab="results" 
          setActiveTab={(id) => {
            hapticFeedback('light');
            if (id === 'dashboard') navigate('/dashboard');
            else if (id === 'library') navigate('/library');
            else if (id === 'podcasts') navigate('/podcasts');
            else if (id === 'results') navigate('/my-results');
            else if (id === 'settings') navigate('/settings');
          }} 
        />
      )}
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