import { useEffect, useState } from "react";
import { db } from "../firebase/firebase";
import { collection, getDocs, orderBy, query, deleteDoc, doc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

// --- ICONS (SVG) ---
const Icons = {
  Search: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>,
  ArrowLeft: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>,
  Eye: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  ChevronLeft: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>,
  ChevronRight: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>,
  Trash: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>,
  Alert: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>,
  // YANGI IKONKALAR
  Type: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>, // Turlar uchun (List)
  Status: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.892 2.693.48a47.097 47.097 0 001.186-2.83M5 5h.008v.008H5V5z" /></svg>, // Status uchun (Tag)
  ChevronDown: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
};

export default function AdminResults() {
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // FILTERS STATES
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Natijalarni olish
        const q = query(collection(db, "results"), orderBy("date", "desc"));
        const querySnapshot = await getDocs(q);

        // 2. Mavjud testlarni olish (Tekshirish uchun)
        // Kichik va o'rta loyihalar uchun barcha test IDlarini olish normal holat.
        const testsSnapshot = await getDocs(collection(db, "tests"));
        const validTestIds = new Set(testsSnapshot.docs.map(doc => doc.id));
        
        const data = querySnapshot.docs.map((doc) => {
          const d = doc.data();
          
          // DURATION HISOBLASH LOGIKASI
          let durationStr = "-";
          if (d.duration) {
              // Agar tayyor duration raqami bo'lsa (daqiqada)
              durationStr = `${d.duration} daq`;
          } else if (d.startedAt && d.date) {
              // Agar boshlanish va tugash vaqti bo'lsa (Timestamp)
              const start = d.startedAt.toDate ? d.startedAt.toDate() : new Date(d.startedAt);
              const end = d.date.toDate ? d.date.toDate() : new Date(d.date);
              const diffMs = end - start;
              const diffMins = Math.floor(diffMs / 60000);
              durationStr = `${diffMins} daq`;
          }

          return {
            id: doc.id,
            ...d,
            userName: d.userName || "Noma'lum",
            testTitle: d.testTitle || "Nomsiz Test",
            type: d.type || "other",
            score: d.score !== undefined ? d.score : "-",
            status: d.status || "pending",
            date: d.date ? (d.date.toDate ? d.date.toDate() : new Date(d.date)) : null,
            // ORPHAN TEKSHIRUVI: Agar test ID bazada yo'q bo'lsa
            isOrphan: d.testId && !validTestIds.has(d.testId),
            durationDisplay: durationStr // <--- Yangi maydon
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

  // DELETE FUNCTION
  const handleDelete = async (resultId, e) => {
    e.stopPropagation();
    
    // Tasdiqlash
    if (!window.confirm("Rostdan ham bu natijani o'chirmoqchimisiz?")) return;

    try {
        // 1. Bazadan o'chirish
        await deleteDoc(doc(db, "results", resultId));
        
        // 2. Ekranda darhol o'chirish (sahifa yangilanmasligi uchun)
        setResults(prev => prev.filter(r => r.id !== resultId));
        setFilteredResults(prev => prev.filter(r => r.id !== resultId));
        
    } catch (error) {
        console.error("O'chirishda xatolik:", error);
        // Xatoni ekranga chiqarish
        alert("O'chira olmadim. Sababi: " + error.message);
    }
  };

  // FILTER LOGIC
  useEffect(() => {
    let temp = [...results];

    if (searchTerm.trim()) {
      const lowerTerm = searchTerm.toLowerCase();
      temp = temp.filter((item) => {
        const name = (item.userName || "").toString().toLowerCase();
        const title = (item.testTitle || "").toString().toLowerCase();
        return name.includes(lowerTerm) || title.includes(lowerTerm);
      });
    }

    if (typeFilter !== "all") {
      temp = temp.filter((item) => item.type === typeFilter);
    }

    if (statusFilter !== "all") {
        if (statusFilter === 'graded') {
            temp = temp.filter((item) => item.status === 'graded' || item.status === 'published');
        } else if (statusFilter === 'orphan') {
            temp = temp.filter(item => item.isOrphan);
        } else {
            temp = temp.filter((item) => item.status !== 'graded' && item.status !== 'published');
        }
    }

    setFilteredResults(temp);
    setCurrentPage(1); 
  }, [searchTerm, typeFilter, statusFilter, results]);

  // Helper: Sana va vaqtni ajratib olish (Faqat raqamlar)
  const formatDateTime = (dateObj) => {
    if (!dateObj) return { date: "-", time: "" };
    const d = new Date(dateObj);
    // Sana: 12.02.2024
    const date = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d).replace(/\//g, '.');
    // Vaqt: 14:30
    const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(d);
    return { date, time };
  };

  // PAGINATION LOGIC
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredResults.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredResults.length / itemsPerPage);

  // Pagination raqamlarini generatsiya qilish
  const renderPaginationButtons = () => {
    const pages = [];
    const maxVisiblePages = 5; // Nechta raqam ko'rinib turishi kerak
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => setCurrentPage(i)}
          className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
            currentPage === i
              ? "bg-blue-600 text-white shadow-md shadow-blue-200"
              : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
          }`}
        >
          {i}
        </button>
      );
    }
    return pages;
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-6 font-sans text-slate-800">
      
      <div className="max-w-7xl mx-auto">
        {/* NAVIGATSIYA: Orqaga qaytish */}
        <div className="mb-4">
            <button 
                onClick={() => navigate('/admin')}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors font-medium text-sm group"
            >
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center border border-gray-200 shadow-sm group-hover:border-gray-300 transition-all">
                    <Icons.ArrowLeft className="w-4 h-4" />
                </div>
                Bosh sahifa
            </button>
        </div>

        {/* HEADER SECTION: Filtrlar chapda, Sarlavha o'ngda */}
        <div className="flex flex-col-reverse md:flex-row justify-between items-center gap-4 mb-6">
            
            {/* CHAP TARAF: FILTRLAR VA QIDIRUV */}
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center">
                
                {/* 1. Qidiruv */}
                <div className="relative w-full md:w-64 group">
                    <Icons.Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Qidirish..." 
                        className="w-full bg-white border border-gray-200 pl-9 pr-4 py-2 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all shadow-sm placeholder:text-gray-400"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* 2. Turlar Filtri */}
                <div className="relative w-full sm:w-40">
                    <div className="absolute left-3 top-2.5 pointer-events-none">
                        <Icons.Type className="w-4 h-4 text-gray-400" />
                    </div>
                    <select 
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="w-full bg-white border border-gray-200 pl-9 pr-8 py-2 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all shadow-sm appearance-none cursor-pointer text-gray-600 font-medium"
                    >
                        <option value="all">Barcha Turlar</option>
                        <option value="reading">Reading</option>
                        <option value="listening">Listening</option>
                        <option value="writing">Writing</option>
                        <option value="speaking">Speaking</option>
                    </select>
                    <Icons.ChevronDown className="absolute right-3 top-3 w-3 h-3 text-gray-400 pointer-events-none" />
                </div>

                {/* 3. Status Filtri */}
                <div className="relative w-full sm:w-44">
                    <div className="absolute left-3 top-2.5 pointer-events-none">
                        <Icons.Status className="w-4 h-4 text-gray-400" />
                    </div>
                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full bg-white border border-gray-200 pl-9 pr-8 py-2 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all shadow-sm appearance-none cursor-pointer text-gray-600 font-medium"
                    >
                        <option value="all">Barcha Statuslar</option>
                        <option value="pending">Kutilmoqda</option>
                        <option value="graded">Baholangan</option>
                        <option value="orphan">Arxiv (O'chirilgan)</option>
                    </select>
                    <Icons.ChevronDown className="absolute right-3 top-3 w-3 h-3 text-gray-400 pointer-events-none" />
                </div>

                {/* Tozalash tugmasi */}
                {(typeFilter !== 'all' || statusFilter !== 'all' || searchTerm) && (
                    <button 
                        onClick={() => {
                            setTypeFilter('all');
                            setStatusFilter('all');
                            setSearchTerm('');
                        }}
                        className="text-xs text-red-500 hover:text-red-700 font-medium px-2 underline decoration-red-200 underline-offset-2"
                    >
                        Tozalash
                    </button>
                )}
            </div>

            {/* O'NG TARAF: SARLAVHA */}
            <div className="flex flex-col items-end">
                <h1 className="text-xl font-bold text-gray-900 tracking-tight font-sans">Natijalar</h1>
                <p className="text-xs text-gray-500 font-medium mt-0.5">Jami {filteredResults.length} ta yechim</p>
            </div>
        </div>

        {/* TABLE */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="py-3 px-4 text-[13px] font-semibold text-gray-600 tracking-wide w-32">Sana</th>
                  <th className="py-3 px-4 text-[13px] font-semibold text-gray-600 tracking-wide">O'quvchi</th>
                  <th className="py-3 px-4 text-[13px] font-semibold text-gray-600 tracking-wide">Test Nomi</th>
                  <th className="py-3 px-4 text-[13px] font-semibold text-gray-600 tracking-wide text-center">Vaqt</th>
                  <th className="py-3 px-4 text-[13px] font-semibold text-gray-600 tracking-wide text-center">Baho</th>
                  <th className="py-3 px-4 text-[13px] font-semibold text-gray-600 tracking-wide text-center">Status</th>
                  {/* AMAL: O'ng burchakka tiralib qolmasligi uchun text-center qilindi */}
                  <th className="py-3 px-4 text-[13px] font-semibold text-gray-600 tracking-wide text-center">Amal</th>
                </tr>
              </thead>
              
              <tbody className="divide-y divide-gray-100">
                {currentItems.length === 0 ? (
                    <tr><td colSpan="7" className="p-10 text-center text-sm text-gray-500">Ma'lumot topilmadi</td></tr>
                ) : (
                    currentItems.map((res) => {
                      const { date, time } = formatDateTime(res.date);
                      
                      return (
                        <tr 
                            key={res.id} 
                            className={`group transition-colors duration-150 hover:bg-gray-50 ${
                                res.isOrphan ? 'bg-red-50/40' : ''
                            }`}
                        >
                            {/* SANA: Ixcham va raqamli */}
                            <td className="py-3 px-4 whitespace-nowrap align-middle">
                                <div className="flex flex-col leading-tight">
                                    <span className="text-[13px] font-medium text-gray-700">{date}</span>
                                    <span className="text-[11px] text-gray-400 mt-0.5">{time}</span>
                                </div>
                            </td>

                            {/* O'QUVCHI: Avatarsiz, toza matn */}
                            <td className="py-3 px-4 align-middle">
                                <div className="flex flex-col leading-tight">
                                    <span className="text-[14px] font-medium text-gray-900">{res.userName}</span>
                                    <span className="text-[11px] text-gray-400 font-mono mt-0.5">ID: {res.id.slice(0,6)}</span>
                                </div>
                            </td>

                            {/* TEST NOMI & TURI */}
                            <td className="py-3 px-4 align-middle">
                                <div className="flex flex-col gap-1">
                                    <span className={`text-[13px] font-medium truncate max-w-[220px] ${res.isOrphan ? 'text-red-600 line-through decoration-red-400' : 'text-gray-700'}`}>
                                        {res.testTitle}
                                    </span>
                                    <span className={`w-fit px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider border ${
                                        res.type === 'listening' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                                        res.type === 'reading' ? 'bg-sky-50 text-sky-700 border-sky-100' :
                                        res.type === 'writing' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                        'bg-rose-50 text-rose-700 border-rose-100'
                                    }`}>
                                        {res.type}
                                    </span>
                                </div>
                            </td>

                            {/* DURATION */}
                            <td className="py-3 px-4 align-middle text-center">
                                <span className="text-[12px] font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                    {res.durationDisplay}
                                </span>
                            </td>

                            {/* BAHO */}
                            <td className="py-3 px-4 align-middle text-center">
                                <span className={`text-[14px] font-bold font-mono ${
                                    res.bandScore || (res.score && res.score !== '-') 
                                    ? 'text-gray-800' 
                                    : 'text-gray-300'
                                }`}>
                                    {res.bandScore ? res.bandScore : res.score}
                                </span>
                            </td>

                            {/* STATUS */}
                            <td className="py-3 px-4 align-middle text-center">
                                {res.isOrphan ? (
                                    <span className="inline-flex px-2 py-1 rounded-[4px] text-[11px] font-semibold bg-red-100 text-red-700 border border-red-200">
                                        Arxiv
                                    </span>
                                ) : (
                                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-[4px] text-[11px] font-semibold border ${
                                        res.status === 'graded' || res.status === 'published' 
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                        : 'bg-orange-50 text-orange-700 border-orange-200'
                                    }`}>
                                        {res.status === 'graded' || res.status === 'published' ? 'Baholangan' : 'Kutilmoqda'}
                                    </span>
                                )}
                            </td>

                            {/* AMALLAR */}
                            <td className="py-3 px-4 align-middle">
                                {/* justify-end o'rniga justify-center qilindi */}
                                <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <button 
                                        onClick={(e) => handleDelete(res.id, e)}
                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                        title="O'chirish"
                                    >
                                        <Icons.Trash className="w-4 h-4" />
                                    </button>
                                    
                                    <button 
                                        onClick={() => navigate(`/review/${res.id}`)}
                                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-[6px] text-[11px] font-bold uppercase tracking-wide transition-all ${
                                            !res.isOrphan && res.status !== 'graded' && res.status !== 'published' && (res.type === 'writing' || res.type === 'speaking')
                                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow' 
                                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                                        }`}
                                    >
                                        <Icons.Eye className="w-3.5 h-3.5" />
                                        {(!res.isOrphan && res.status === 'pending' && (res.type === 'writing' || res.type === 'speaking')) ? 'Baholash' : 'Ko\'rish'}
                                    </button>
                                </div>
                            </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION: "Jami" yozuvi o'ng tomonda */}
          <div className="bg-white border-t border-gray-200 p-3 flex flex-col sm:flex-row justify-between items-center gap-4">
            {/* Chap tomon: Pagination tugmalari */}
            <div className="flex items-center gap-1">
                <button 
                    disabled={currentPage === 1} 
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-gray-600 transition-all"
                >
                    <Icons.ChevronLeft className="w-4 h-4" />
                </button>
                
                <div className="flex gap-1">
                    {renderPaginationButtons()}
                </div>

                <button 
                    disabled={currentPage === totalPages || totalPages === 0} 
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-gray-600 transition-all"
                >
                    <Icons.ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* O'ng tomon: Statistika */}
            <span className="text-[13px] font-medium text-gray-500">
                Jami <span className="text-gray-900 font-bold">{filteredResults.length}</span> tadan <span className="text-gray-900">{indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredResults.length)}</span> ko'rsatilmoqda
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}