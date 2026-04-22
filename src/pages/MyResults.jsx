import { useEffect, useState } from "react";
import { db } from "../firebase/firebase";
import { collection, query, where, getDocs, orderBy, limit, startAfter, endBefore, limitToLast } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { IoChevronBack, IoDocumentTextOutline, IoHeadsetOutline, IoMicOutline, IoCreateOutline, IoTimeOutline, IoArrowForward, IoChevronForward } from "react-icons/io5";
import { getSynonymPairCounts } from "../utils/wordbankUtils";
import { calculateBandScore, calculateOverallBand } from "../utils/ieltsScoring";
import DashboardHeader from "../components/dashboard/DashboardHeader";

const getTestTheme = (type) => {
  switch (type) {
    case 'listening':
      return { icon: <IoHeadsetOutline className="w-6 h-6 text-indigo-600" />, bgIcon: "bg-indigo-100", cardStyle: "bg-gradient-to-br from-indigo-50/90 to-white/60 border-indigo-100/50 hover:border-indigo-200", text: "text-indigo-600" };
    case 'reading':
      return { icon: <IoDocumentTextOutline className="w-6 h-6 text-blue-600" />, bgIcon: "bg-blue-100", cardStyle: "bg-gradient-to-br from-blue-50/90 to-white/60 border-blue-100/50 hover:border-blue-200", text: "text-blue-600" };
    case 'writing':
      return { icon: <IoCreateOutline className="w-6 h-6 text-orange-600" />, bgIcon: "bg-orange-100", cardStyle: "bg-gradient-to-br from-orange-50/90 to-white/60 border-orange-100/50 hover:border-orange-200", text: "text-orange-600" };
    case 'speaking':
      return { icon: <IoMicOutline className="w-6 h-6 text-rose-600" />, bgIcon: "bg-rose-100", cardStyle: "bg-gradient-to-br from-rose-50/90 to-white/60 border-rose-100/50 hover:border-rose-200", text: "text-rose-600" };
    default:
      return { icon: <IoDocumentTextOutline className="w-6 h-6 text-gray-600" />, bgIcon: "bg-gray-100", cardStyle: "bg-gradient-to-br from-gray-50/90 to-white/60 border-gray-200/50 hover:border-gray-300", text: "text-gray-600" };
  }
};

const formatDate = (dateString) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
};

export default function MyResults() {
  const { user, userData, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('results');

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [synonymCounts, setSynonymCounts] = useState({}); // { [testId]: count }

  const [lastDoc, setLastDoc] = useState(null);
  const [firstDoc, setFirstDoc] = useState(null);
  const [pageHistory, setPageHistory] = useState([]);
  const [isNextAvailable, setIsNextAvailable] = useState(true);

  const itemsPerPage = 9;

  useEffect(() => {
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

        // Reading testlar uchun sinonim sonini yuklaymiz
        if (user) {
          const readingTestIds = data
            .filter((r) => r.type === 'reading' && r.testId)
            .map((r) => r.testId);
          if (readingTestIds.length > 0) {
            getSynonymPairCounts(user.uid, readingTestIds)
              .then(setSynonymCounts)
              .catch(console.error);
          }
        }

      } catch (error) {
        console.error("Firebase Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchFirstPage();
  }, [user]);

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

        // Yangi sahifa uchun sinonim sonini ham olamiz
        const readingTestIds = data
          .filter((r) => r.type === 'reading' && r.testId)
          .map((r) => r.testId);
        if (readingTestIds.length > 0) {
          getSynonymPairCounts(user.uid, readingTestIds)
            .then(setSynonymCounts)
            .catch(console.error);
        }
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

  if (loading && results.length === 0) return <div className="flex h-screen items-center justify-center bg-[#050505]"><div className="w-8 h-8 border-4 border-[#3b82f6] border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#020b1c] to-[#06193b] font-sans relative overflow-x-hidden">

      {/* Background Elements */}
      <style>{`
          .diag-result-stars {
              position: fixed;
              top: 0; left: 0; right: 0; bottom: 0;
              background-image:
                  radial-gradient(1px 1px at 50px 50px, #ffffff, transparent),
                  radial-gradient(1.5px 1.5px at 150px 100px, rgba(255,255,255,0.8), transparent),
                  radial-gradient(1px 1px at 250px 200px, #ffffff, transparent),
                  radial-gradient(2px 2px at 350px 50px, rgba(255,255,255,0.6), transparent),
                  radial-gradient(1px 1px at 100px 300px, #ffffff, transparent),
                  radial-gradient(1px 1px at 400px 250px, rgba(255,255,255,0.9), transparent),
                  radial-gradient(1.5px 1.5px at 500px 150px, #ffffff, transparent),
                  radial-gradient(1px 1px at 50px 400px, rgba(255,255,255,0.7), transparent);
              background-size: 550px 450px;
              opacity: 0.5;
              z-index: 0;
              pointer-events: none;
          }

          .diag-result-planet {
              position: fixed;
              top: 85vh;
              left: 50%;
              transform: translateX(-50%);
              width: 200vw;
              height: 200vw;
              border-radius: 50%;
              background: radial-gradient(circle, #000000 75%, #03122b 88%, #0a3580 95%, rgba(0, 150, 255, 0.5) 100%);
              box-shadow:
                  inset 0 0 80px rgba(0, 150, 255, 0.4),
                  0 -3px 10px rgba(255, 255, 255, 0.3),
                  0 -10px 30px rgba(0, 150, 255, 0.3),
                  0 -30px 80px rgba(0, 100, 255, 0.2);
              z-index: 1;
              pointer-events: none;
          }
      `}</style>

      <div className="diag-result-stars"></div>
      <div className="diag-result-planet"></div>

      {/* NAVBAR */}
      <DashboardHeader
        user={user}
        userData={userData}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onKeyClick={() => alert("Access Key larni Practice yoki Dashboard sahifasidan kiritishingiz mumkin.")}
        onLogoutClick={() => {
            if (window.confirm("Haqiqatan ham hisobdan chiqmoqchimisiz?")) {
                logout();
            }
        }}
      />

      <main className="relative z-10 max-w-[1440px] mx-auto px-6 pt-10 pb-20">

        <div className="mb-12 text-center">
            <style>{`
                @keyframes word-appear {
                    0%   { opacity: 0; transform: translateY(20px); filter: blur(10px); }
                    100% { opacity: 1; transform: translateY(0); filter: blur(0); }
                }
                .hero-word {
                    display: inline-block;
                    opacity: 0;
                    animation: word-appear 0.8s ease-out forwards;
                }
                .hero-header {
                    color: #ffffff;
                    font-weight: 700;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    letter-spacing: -0.04em;
                    line-height: 1.1;
                }
                .hero-description {
                    color: #a1a1aa;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    font-weight: 500;
                    font-size: 0.95rem;
                    letter-spacing: -0.02em;
                    max-width: 600px;
                    margin-left: auto;
                    margin-right: auto;
                }
            `}</style>

            <h1 className="hero-header text-6xl md:text-7xl mb-4">
                <span className="hero-word" style={{ animationDelay: '0.1s' }}>Mening</span>
                {' '}
                <span className="hero-word" style={{ animationDelay: '0.2s' }}>Natijalarim</span>
            </h1>
            <p className="hero-description text-lg md:text-xl opacity-90 leading-relaxed">
                Eng so'nggi natijalar va tahlillar.
            </p>
            <div className="mt-8 w-24 h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent mx-auto opacity-30"></div>
        </div>

        {/* LATEST MOCK SUMMARY HEADER */}
        {results.filter(r => r.type === 'mock_full').length > 0 && (
          <div className="mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 md:p-10 shadow-2xl overflow-hidden relative group">
              {/* Decorative Background Elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] -mr-32 -mt-32"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] -ml-32 -mb-32"></div>
              
              <div className="relative z-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                      Full Mock Result Summary
                      <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-[10px] uppercase tracking-widest font-black border border-blue-500/30">Latest</span>
                    </h2>
                    <p className="text-[#a0b0cb] text-sm font-medium">Sizning oxirgi topshirgan to'liq mock imtihoningiz natijalari.</p>
                  </div>
                  {results.find(r => r.type === 'mock_full')?.scores?.writing && (
                     <div className="flex flex-col items-center md:items-end">
                        <span className="text-xs text-gray-500 uppercase tracking-[2px] font-bold mb-1">Overall Band</span>
                        <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 leading-none">
                          {calculateOverallBand(
                            results.find(r => r.type === 'mock_full').scores.listeningBand,
                            results.find(r => r.type === 'mock_full').scores.readingBand,
                            results.find(r => r.type === 'mock_full').scores.writing
                          ).toFixed(1)}
                        </div>
                     </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Listening */}
                  <div className="bg-[#0a1930]/60 border border-white/5 rounded-2xl p-5 flex flex-col items-center">
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3">Listening</span>
                    <span className="text-3xl font-black text-white mb-1">
                      {results.find(r => r.type === 'mock_full').scores.listeningBand?.toFixed(1) || "0.0"}
                    </span>
                    <span className="text-[10px] text-gray-500 font-bold italic">
                      {results.find(r => r.type === 'mock_full').scores.listening} correct
                    </span>
                  </div>
                  
                  {/* Reading */}
                  <div className="bg-[#101b2a]/60 border border-white/5 rounded-2xl p-5 flex flex-col items-center">
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-3">Reading</span>
                    <span className="text-3xl font-black text-white mb-1">
                      {results.find(r => r.type === 'mock_full').scores.readingBand?.toFixed(1) || "0.0"}
                    </span>
                    <span className="text-[10px] text-gray-500 font-bold italic">
                      {results.find(r => r.type === 'mock_full').scores.reading} correct
                    </span>
                  </div>

                  {/* Writing */}
                  <div className="bg-[#1a1420]/60 border border-white/5 rounded-2xl p-5 flex flex-col items-center">
                    <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-3">Writing</span>
                    {results.find(r => r.type === 'mock_full').scores.writing ? (
                      <span className="text-3xl font-black text-white">
                        {results.find(r => r.type === 'mock_full').scores.writing.toFixed(1)}
                      </span>
                    ) : (
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-bold text-gray-400 animate-pulse bg-gray-800/50 px-3 py-1 rounded-full uppercase tracking-tighter">Kutilmoqda</span>
                        <span className="text-[9px] text-gray-500 mt-2 text-center leading-tight">Admin tekshiruvi kutilmoqda</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {results.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white/5 backdrop-blur-xl rounded-[2rem] border border-white/10 shadow-[0_0_50px_rgba(0,100,255,0.05)] text-center px-4">
            <IoDocumentTextOutline className="w-16 h-16 text-blue-400/50 mb-4" />
            <h3 className="text-xl font-semibold text-white">Natijalar yo'q</h3>
            <p className="text-[#a0b0cb] mb-6 mt-2">Hozircha test ishlamagansiz.</p>
            <button onClick={() => navigate('/practice')} className="bg-transparent border border-white/30 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-white hover:text-[#06193b] active:scale-95 transition-all text-sm uppercase tracking-[1px]">Test ishlash</button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((res) => {
                const theme = getTestTheme(res.type);
                const bandScore = (res.type === 'reading' || res.type === 'listening')
                  ? (res.bandScore || calculateBandScore(res.score, res.type, res.totalQuestions))
                  : (res.type === 'writing' ? (res.writingBand || res.bandScore) : res.score);
                const isGraded = res.status === 'graded' || res.writingBand != null || res.bandScore != null || (res.score !== null && res.type !== 'mock_full');

                return (
                  <div
                    key={res.id}
                    onClick={() => navigate(`/review/${res.id}`)}
                    className="relative group flex flex-col justify-between rounded-[24px] p-6 h-full border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:bg-white/10 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-blue-500/30 cursor-pointer"
                  >
                    <div>
                      {/* HEADER: Icon & Score Badge */}
                      <div className="flex justify-between items-start mb-5">
                        <div className={`w-12 h-12 rounded-2xl bg-[#0a1930] flex items-center justify-center border border-white/5 shadow-inner ${theme.text}`}>
                          {theme.icon}
                        </div>
                        
                        {(isGraded || res.type === 'mock_full') ? (
                          <div className="bg-[#0a1930]/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                             <span className={`block text-xl font-bold leading-none ${theme.text}`}>
                               {res.type === 'mock_full' 
                                 ? (res.scores?.overallBand || res.overallBand || "...") 
                                 : (bandScore || "N/A")}
                             </span>
                             <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mt-1 block">Band</span>
                          </div>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-[#0a1930] text-blue-400 border border-blue-500/20 animate-pulse">Tekshirilmoqda</span>
                        )}
                      </div>

                      {/* TITLE & DATE */}
                      <h3 className="text-lg font-bold text-white mb-1 line-clamp-1 group-hover:text-blue-400 transition-colors">
                        {res.testTitle || (res.type === 'mock_full' ? "IELTS Mock Exam" : "Noma'lum Test")}
                      </h3>

                      <div className="flex items-center text-[#a0b0cb] text-[10px] font-bold uppercase tracking-wider gap-2 mb-6 opacity-60">
                         <IoTimeOutline className="w-3.5 h-3.5" />
                         {formatDate(res.date)}
                      </div>

                      {/* MOCK SPECIFIC: PART SCORES */}
                      {res.type === 'mock_full' && (
                        <div className="grid grid-cols-4 gap-1 mb-6">
                           {['listening','reading','writing','speaking'].map(part => {
                             const score = res.scores?.[part === 'listening' ? 'listeningBand' : part === 'reading' ? 'readingBand' : part];
                             return (
                               <div key={part} className="flex flex-col items-center p-1 rounded bg-white/5 border border-white/5">
                                 <span className="text-[8px] text-gray-500 font-bold uppercase">{part[0]}</span>
                                 <span className="text-[10px] text-white font-bold">{score != null ? score : '-'}</span>
                               </div>
                             )
                           })}
                        </div>
                      )}
                    </div>

                    {/* FOOTER: STATS & ACTION */}
                    <div className="pt-4 border-t border-white/10 flex items-center justify-between mt-auto">
                      <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                          {res.type === 'mock_full' ? "Status" : "To'g'ri"}
                        </p>
                        <p className="text-sm font-bold text-white">
                          {res.type === 'mock_full' 
                            ? (res.scores?.writing ? "Graded" : "Check Writing")
                            : (res.score !== null ? `${res.score} / ${res.totalQuestions || 40}` : "-")
                          }
                        </p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/review/${res.id}`);
                        }}
                        className="w-10 h-10 rounded-full bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white flex items-center justify-center transition-all duration-300 border border-blue-500/20 group-hover:border-blue-500/50"
                      >
                        <IoArrowForward className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CONTROLS */}
            <div className="flex justify-center items-center mt-12 gap-8 mb-10">
              <button
                onClick={fetchPrev}
                disabled={pageHistory.length === 0 || loading}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#0a1930] border border-white/10 text-[#a0b0cb] hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg font-bold"
              >
                <IoChevronBack className="w-5 h-5" /> Oldingi
              </button>

              <button
                onClick={fetchNext}
                disabled={!isNextAvailable || loading}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-500 border border-blue-400/50 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] font-bold"
              >
                Keyingi <IoChevronForward className="w-5 h-5" />
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}