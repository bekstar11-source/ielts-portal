import { useEffect, useState, useMemo } from "react";
import { db } from "../firebase/firebase";
import { collection, query, where, getDocs, orderBy, limit, startAfter, endBefore, limitToLast } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { 
  BookOpen, Headphones, PenTool, Mic, Clock, 
  ChevronLeft, ChevronRight, ArrowRight, Award,
  CheckCircle2, XCircle, FileText, Search, Download, Filter,
  Calendar, User, Plus, Bookmark, LayoutGrid, List
} from "lucide-react";
import { getSynonymPairCounts } from "../utils/wordbankUtils";
import { calculateBandScore, calculateOverallBand } from "../utils/ieltsScoring";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import SiteFooter from "../components/common/SiteFooter";

const getTestTheme = (type) => {
  switch (type) {
    case 'listening':
      return { 
        icon: <Headphones size={20} />, 
        bg: "bg-purple-50", 
        text: "text-purple-600", 
        border: "border-purple-500",
        label: "Listening",
        chipBg: "bg-purple-50",
        chipText: "text-purple-600"
      };
    case 'reading':
      return { 
        icon: <BookOpen size={20} />, 
        bg: "bg-blue-50", 
        text: "text-blue-600", 
        border: "border-blue-500",
        label: "Reading",
        chipBg: "bg-blue-50",
        chipText: "text-blue-600"
      };
    case 'writing':
      return { 
        icon: <PenTool size={20} />, 
        bg: "bg-orange-50", 
        text: "text-orange-600", 
        border: "border-orange-500",
        label: "Writing",
        chipBg: "bg-orange-50",
        chipText: "text-orange-600"
      };
    case 'speaking':
      return { 
        icon: <Mic size={20} />, 
        bg: "bg-emerald-50", 
        text: "text-emerald-600", 
        border: "border-emerald-500",
        label: "Speaking",
        chipBg: "bg-emerald-50",
        chipText: "text-emerald-600"
      };
    case 'mock_full':
      return { 
        icon: <Award size={20} />, 
        bg: "bg-indigo-50", 
        text: "text-indigo-600", 
        border: "border-indigo-600",
        label: "Full Mock",
        chipBg: "bg-indigo-50",
        chipText: "text-indigo-600"
      };
    default:
      return { 
        icon: <FileText size={20} />, 
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
                <div className="flex items-center justify-start overflow-x-auto hide-scrollbar gap-2 mb-8 bg-gray-200/40 p-1.5 rounded-2xl w-fit max-w-full">
                    {filters.map((f) => (
                        <button
                            key={f.id}
                            onClick={() => setFilterType(f.id)}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-300 whitespace-nowrap ${
                                filterType === f.id 
                                ? 'bg-white text-blue-600 shadow-md shadow-gray-200/50 scale-[1.02]' 
                                : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                            }`}
                        >
                            {f.icon}
                            {f.label}
                        </button>
                    ))}
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

              const totalQ = res.totalQuestions || 40;
              const correct = res.score || 0;
              const incorrect = totalQ - correct;

              return (
                <div
                  key={res.id}
                  onClick={() => navigate(`/review/${res.id}`)}
                  className="group relative flex flex-col md:flex-row items-stretch bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer"
                >
                  <div className={`w-1.5 ${theme.border} ${theme.bg.replace('bg-', 'bg-')}`}></div>

                  <div className="flex flex-1 flex-col md:flex-row md:items-center p-5 gap-4">
                    <div className="hidden sm:flex items-center justify-center">
                        <div className={`w-14 h-14 rounded-full ${theme.bg} flex items-center justify-center ${theme.text} shadow-inner`}>
                            {theme.icon}
                        </div>
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-[18px] font-bold text-[#1d1d1f] truncate group-hover:text-blue-600 transition-colors max-w-[280px] md:max-w-[400px]">
                                {res.testTitle || (res.type === 'mock_full' ? "IELTS Mock Exam" : "Practice Test")}
                            </h3>
                            <div className={`sm:hidden w-8 h-8 rounded-full ${theme.bg} flex items-center justify-center ${theme.text}`}>
                                {theme.icon}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[#86868b] text-[13px] font-medium">
                           <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                               <Calendar size={13} className="text-gray-400" />
                               <span>{formatDate(res.date)}</span>
                           </div>
                           <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                               <Clock size={13} className="text-gray-400" />
                               <span>{res.timeTaken ? `${Math.floor(res.timeTaken / 60)}m ${res.timeTaken % 60}s` : "20 minutes"}</span>
                           </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-4">
                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${theme.chipBg} ${theme.chipText} text-[11px] font-bold border border-current border-opacity-20`}>
                                {theme.label}
                            </div>
                            
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[11px] font-bold border border-emerald-200">
                                <CheckCircle2 size={12} />
                                {correct} to'g'ri
                            </div>
                            
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-600 text-[11px] font-bold border border-rose-200">
                                <XCircle size={12} />
                                {incorrect} xato
                            </div>
                        </div>
                    </div>

                    <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center px-6 md:px-10 md:border-l border-gray-100 min-w-[140px] gap-2">
                        {isGraded ? (
                            <>
                                <div className={`text-2xl font-black ${theme.text} tracking-tight`}>
                                    {res.type === 'mock_full' 
                                        ? (res.scores?.overallBand || res.overallBand || "-") 
                                        : (bandScore || "0.0")}
                                    <span className="text-[14px] font-bold ml-1">Band</span>
                                </div>
                                <div className="text-[12px] font-bold text-[#86868b] uppercase tracking-wider">
                                    Natija
                                </div>
                            </>
                        ) : (
                            <div className="text-[11px] font-black text-orange-500 bg-orange-50 px-3 py-1 rounded-lg uppercase tracking-wider border border-orange-200 animate-pulse">
                                Kutilmoqda
                            </div>
                        )}
                    </div>

                    <div className="hidden lg:flex items-center justify-center pl-4">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 flex items-center justify-center shadow-sm">
                            <ArrowRight size={20} />
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
    </div>
  );
}