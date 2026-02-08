import { useEffect, useState } from "react";
import { db } from "../firebase/firebase";
import { collection, query, where, getDocs, orderBy, limit, startAfter, endBefore, limitToLast } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { IoChevronBack, IoDocumentTextOutline, IoHeadsetOutline, IoMicOutline, IoCreateOutline, IoTimeOutline, IoArrowForward, IoChevronForward } from "react-icons/io5";

// --- HELPERS ---
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
        const rawData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        
        // 🔥 FILTER: Hide 'review_pending' (Writing tests under review)
        const visibleData = rawData.filter(d => d.status !== 'review_pending');

        setResults(visibleData);
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
              const rawData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
              const visibleData = rawData.filter(d => d.status !== 'review_pending');

              setResults(visibleData);
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
              const rawData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
              const visibleData = rawData.filter(d => d.status !== 'review_pending');

              setResults(visibleData);
              setFirstDoc(snapshot.docs[0]);
              setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
              setPageHistory(prev => prev.slice(0, -1));
              setIsNextAvailable(true);
          }
      } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  if (loading && results.length === 0) return <div className="flex h-screen items-center justify-center bg-[#F5F5F7]"><div className="w-8 h-8 border-4 border-gray-300 border-t-black rounded-full animate-spin"></div></div>;

  return (
    <div className="min-h-screen bg-[#F5F5F7] font-sans">
      
      <div className="bg-white border-b border-gray-200 h-16 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-4">
             <button 
                onClick={() => navigate('/')} 
                className="group flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 transition-all active:scale-95"
            >
              <IoChevronBack className="text-gray-700 w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <h1 className="text-base font-bold text-[#1d1d1f] tracking-tight">Asosiy sahifaga</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8 pb-20">
        
        <div className="mb-8 text-center md:text-left">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1d1d1f] tracking-tight mb-2">Mening Natijalarim</h2>
          <p className="text-[#86868b] text-lg font-normal">Eng so'nggi natijalar.</p>
        </div>

        {results.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[2rem] border border-gray-200/50 shadow-sm text-center px-4">
            <IoDocumentTextOutline className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-800">Natijalar yo'q</h3>
            <p className="text-gray-500 mb-6 mt-2">Hozircha test ishlamagansiz.</p>
            <button onClick={() => navigate('/')} className="bg-[#0071e3] text-white px-6 py-2.5 rounded-full font-medium shadow-lg hover:bg-[#0077ED] active:scale-95 transition-transform">Test ishlash</button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((res) => {
                const theme = getTestTheme(res.type);
                // 🔥 UPDATE: Handle 'published' status as graded
                const isGraded = res.status === 'graded' || res.status === 'published' || res.score !== null;
                const bandScore = (res.type === 'reading' || res.type === 'listening') 
                    ? (res.bandScore || calculateBandScore(res.score, res.type)) 
                    : res.bandScore; // Writing uses stored bandScore

                return (
                  <div 
                    key={res.id} 
                    className={`
                      relative group flex flex-col justify-between
                      rounded-[24px] p-6 h-full
                      border backdrop-blur-xl shadow-[0_2px_10px_rgba(0,0,0,0.02)]
                      transition-all duration-300 ease-out
                      hover:-translate-y-1 hover:shadow-lg
                      ${theme.cardStyle}
                    `}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-5">
                        <div className={`w-12 h-12 rounded-2xl ${theme.bgIcon} flex items-center justify-center`}>
                          {theme.icon}
                        </div>
                        {isGraded ? (
                            <div className="bg-white/50 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/40 shadow-sm">
                                <span className={`block text-xl font-bold leading-none ${theme.text}`}>
                                    {bandScore || "N/A"}
                                </span>
                            </div>
                        ) : (
                            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-white/60 text-gray-500 border border-white/50 animate-pulse">Tekshirilmoqda</span>
                        )}
                      </div>

                      <h3 className="text-lg font-bold text-[#1d1d1f] mb-1 line-clamp-1 group-hover:text-blue-600 transition-colors">
                        {res.testTitle}
                      </h3>
                      <div className="flex items-center text-gray-600 text-sm font-medium gap-1.5 mb-4">
                         <IoTimeOutline className="w-4 h-4 opacity-70" />
                         {formatDate(res.date)}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-black/5 flex items-center justify-between mt-auto">
                       <div>
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                              {res.type === 'writing' ? 'AI Review' : 'To\'g\'ri javoblar'}
                          </p>
                          <p className="text-sm font-bold text-gray-800">
                              {res.type === 'writing'
                                ? (isGraded ? "Completed" : "Pending")
                                : `${res.score !== null ? res.score : "?"} / ${res.totalQuestions || "?"}`
                              }
                          </p>
                       </div>

                       {isGraded && (
                          <button 
                              onClick={() => navigate(`/review/${res.id}`)}
                              className="w-10 h-10 rounded-full bg-white/60 hover:bg-[#0071e3] hover:text-white flex items-center justify-center text-gray-400 transition-all duration-300 shadow-sm border border-white/40"
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
                    className="flex items-center gap-2 px-6 py-3 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm font-bold"
                >
                  <IoChevronBack className="w-5 h-5"/> Oldingi
                </button>
                
                <button 
                    onClick={fetchNext} 
                    disabled={!isNextAvailable || loading} 
                    className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#1d1d1f] text-white hover:bg-black disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-gray-400/50 font-bold"
                >
                  Keyingi <IoChevronForward className="w-5 h-5"/>
                </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
