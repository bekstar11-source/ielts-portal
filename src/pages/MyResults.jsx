import { useEffect, useState } from "react";
import { db } from "../firebase/firebase";
import { collection, query, where, getDocs, orderBy, limit, startAfter, endBefore, limitToLast } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { IoChevronBack, IoDocumentTextOutline, IoHeadsetOutline, IoMicOutline, IoCreateOutline, IoTimeOutline, IoArrowForward, IoChevronForward } from "react-icons/io5";

// --- HELPERS (O'ZGARMADI) ---
const calculateBandScore = (score, type) => {
  if (type === 'listening' || type === 'reading') {
    if (score >= 39) return 9.0;
    if (score >= 37) return 8.5;
    if (score >= 35) return 8.0;
    if (score >= 32) return 7.5;
    if (score >= 30) return 7.0;
    if (score >= 26) return 6.5;
    if (score >= 23) return 6.0;
    if (score >= 18) return 5.5;
    if (score >= 16) return 5.0;
    if (score >= 13) return 4.5;
    if (score >= 10) return 4.0;
    return 3.5;
  }
  return null;
};

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
  const { user } = useAuth();
  const navigate = useNavigate();

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  const [lastDoc, setLastDoc] = useState(null);
  const [firstDoc, setFirstDoc] = useState(null);
  const [pageHistory, setPageHistory] = useState([]);
  const [isNextAvailable, setIsNextAvailable] = useState(true);

  const itemsPerPage = 6;

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
      <div className="relative z-10 bg-white/5 backdrop-blur-md border-b border-white/10 h-16 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="group flex items-center justify-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-all active:scale-95 border border-white/5"
            >
              <IoChevronBack className="text-blue-400 w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <h1 className="text-base font-bold text-white tracking-tight">Asosiy sahifaga</h1>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 mt-8 pb-20">

        <div className="mb-8 text-center md:text-left">
          <h2 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-[#8ca1c4] tracking-tight mb-2 filter drop-shadow-sm">Mening Natijalarim</h2>
          <p className="text-[#a0b0cb] text-lg font-normal">Eng so'nggi natijalar.</p>
        </div>

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
                  ? (res.bandScore || calculateBandScore(res.score, res.type))
                  : res.score;
                const isGraded = res.status === 'graded' || res.score !== null;

                return (
                  <div
                    key={res.id}
                    className="relative group flex flex-col justify-between rounded-[24px] p-6 h-full border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:bg-white/10 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-blue-500/30"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-5">
                        <div className={`w-12 h-12 rounded-2xl bg-[#0a1930] flex items-center justify-center border border-white/5 shadow-inner`}>
                          {theme.icon}
                        </div>
                        {isGraded ? (
                          <div className="bg-[#0a1930]/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                            <span className={`block text-xl font-bold leading-none ${theme.text}`}>
                              {bandScore || "N/A"}
                            </span>
                          </div>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-[#0a1930] text-blue-400 border border-blue-500/20 animate-pulse">Tekshirilmoqda</span>
                        )}
                      </div>

                      <h3 className="text-lg font-bold text-white mb-1 line-clamp-1 group-hover:text-blue-400 transition-colors">
                        {res.testTitle}
                      </h3>
                      <div className="flex items-center text-[#a0b0cb] text-sm font-medium gap-1.5 mb-4">
                        <IoTimeOutline className="w-4 h-4 opacity-70" />
                        {formatDate(res.date)}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/10 flex items-center justify-between mt-auto">
                      <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">To'g'ri javoblar</p>
                        <p className="text-sm font-bold text-white">
                          {res.score !== null ? res.score : "?"} <span className="text-[#a0b0cb] font-normal">/ {res.totalQuestions || "?"}</span>
                        </p>
                      </div>

                      {((res.type === 'reading' || res.type === 'listening') || (isGraded)) && (
                        <button
                          onClick={() => navigate(`/review/${res.id}`)}
                          className="w-10 h-10 rounded-full bg-[#0a1930] hover:bg-blue-500 text-blue-400 hover:text-white flex items-center justify-center transition-all duration-300 shadow-[0_0_15px_rgba(59,130,246,0.2)] border border-blue-500/20 group-hover:border-blue-500/50"
                          title="Tahlilni ko'rish"
                        >
                          <IoArrowForward className="w-5 h-5" />
                        </button>
                      )}
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
      </div>
    </div>
  );
}