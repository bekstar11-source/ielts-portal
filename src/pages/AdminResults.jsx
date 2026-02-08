import { useEffect, useState } from "react";
import { db } from "../firebase/firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

// --- ICONS (SVG) ---
const Icons = {
  Search: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>,
  ArrowLeft: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>,
  Eye: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  ChevronLeft: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>,
  ChevronRight: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
};

export default function AdminResults() {
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const q = query(collection(db, "results"), orderBy("date", "desc"));
        const querySnapshot = await getDocs(q);
        
        const data = querySnapshot.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            ...d,
            userName: d.userName || "Noma'lum",
            testTitle: d.testTitle || "Nomsiz Test",
            type: d.type || "other",
            score: d.score !== undefined ? d.score : "-",
            status: d.status || "pending"
          };
        });

        setResults(data);
        setFilteredResults(data);
      } catch (error) {
        console.error("Error fetching results:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // SEARCH LOGIC
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredResults(results);
      return;
    }
    const lowerTerm = searchTerm.toLowerCase();
    const filtered = results.filter((item) => {
      const name = (item.userName || "").toString().toLowerCase();
      const title = (item.testTitle || "").toString().toLowerCase();
      return name.includes(lowerTerm) || title.includes(lowerTerm);
    });
    setFilteredResults(filtered);
    setCurrentPage(1);
  }, [searchTerm, results]);

  // PAGINATION LOGIC
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredResults.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredResults.length / itemsPerPage);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-6 font-sans text-slate-800">
      
      <div className="max-w-7xl mx-auto">
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <button 
              onClick={() => navigate('/admin')}
              className="group flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-600 hover:border-gray-300 hover:text-black transition-all shadow-sm active:scale-95"
            >
              <Icons.ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Bosh sahifa
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Natijalar</h1>
              <p className="text-gray-500 text-xs mt-0.5">Jami {filteredResults.length} ta natija topildi</p>
            </div>
          </div>
          
          {/* Search Input - Apple Style */}
          <div className="relative w-full md:w-80 group">
            <Icons.Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
                type="text" 
                placeholder="Qidirish..." 
                className="w-full bg-white border border-gray-200 pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm placeholder:text-gray-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* TABLE CARD */}
        <div className="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="p-5 text-xs font-semibold tracking-wide text-gray-500 uppercase w-1/4">O'quvchi</th>
                  <th className="p-5 text-xs font-semibold tracking-wide text-gray-500 uppercase w-1/4">Test Nomi</th>
                  <th className="p-5 text-xs font-semibold tracking-wide text-gray-500 uppercase text-center">Turi</th>
                  <th className="p-5 text-xs font-semibold tracking-wide text-gray-500 uppercase text-center">Baho</th>
                  <th className="p-5 text-xs font-semibold tracking-wide text-gray-500 uppercase text-center">Status</th>
                  <th className="p-5 text-xs font-semibold tracking-wide text-gray-500 uppercase text-right pr-8">Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {currentItems.length === 0 ? (
                    <tr><td colSpan="6" className="p-12 text-center text-gray-400">Ma'lumot topilmadi</td></tr>
                ) : (
                    currentItems.map((res) => (
                    <tr key={res.id} className="hover:bg-blue-50/30 transition-colors duration-200 group">
                        <td className="p-5">
                            <p className="font-semibold text-gray-900 text-sm">{res.userName}</p>
                            <p className="text-xs text-gray-400 mt-0.5 font-mono">{res.id.substring(0, 6)}...</p>
                        </td>
                        <td className="p-5">
                            <p className="text-sm text-gray-600 font-medium truncate max-w-[200px]">{res.testTitle}</p>
                        </td>
                        <td className="p-5 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                                res.type === 'listening' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                res.type === 'reading' ? 'bg-sky-50 text-sky-600 border-sky-100' :
                                res.type === 'writing' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                'bg-rose-50 text-rose-600 border-rose-100'
                            }`}>
                                {res.type}
                            </span>
                        </td>
                        <td className="p-5 text-center">
                            <span className="font-mono font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded-md text-sm">
                                {res.bandScore ? res.bandScore : res.score}
                            </span>
                        </td>
                        <td className="p-5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${res.status === 'graded' ? 'bg-emerald-500' : 'bg-orange-400'}`}></span>
                                <span className={`text-xs font-medium ${res.status === 'graded' ? 'text-emerald-700' : 'text-orange-600'}`}>
                                    {res.status === 'graded' ? 'Baholangan' : 'Kutilmoqda'}
                                </span>
                            </div>
                        </td>
                        <td className="p-5 text-right pr-8">
                            <button 
                                onClick={() => navigate(`/review/${res.id}`)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:text-black transition-all shadow-sm active:scale-95 ml-auto"
                            >
                                <Icons.Eye className="w-3.5 h-3.5" />
                                Ko'rish
                            </button>
                        </td>
                    </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION CONTROLS */}
          <div className="p-4 border-t border-gray-100 bg-gray-50/30 flex justify-between items-center">
            <span className="text-xs font-medium text-gray-500 pl-2">
                Sahifa <span className="text-gray-900">{currentPage}</span> / {totalPages || 1}
            </span>
            <div className="flex gap-2">
                <button 
                    disabled={currentPage === 1} 
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    className="p-2 border border-gray-200 rounded-lg bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-300 transition-all text-gray-600 shadow-sm"
                >
                    <Icons.ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                    disabled={currentPage === totalPages || totalPages === 0} 
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    className="p-2 border border-gray-200 rounded-lg bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-300 transition-all text-gray-600 shadow-sm"
                >
                    <Icons.ChevronRight className="w-4 h-4" />
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}