// src/pages/AdminTests.jsx
import { useState, useEffect, useMemo } from "react";
import { db } from "../firebase/firebase";
import { collection, getDocs, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

// Icons
const Icons = {
  Edit: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
  Eye: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
  Trash: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
  ArrowLeft: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>,
  Plus: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
  Filter: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>,
  ChevronDown: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>,
  ChevronLeft: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>,
  ChevronRight: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>,
  Search: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
};

export default function AdminTests() {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State: Filter & Pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const q = query(collection(db, "tests"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        setTests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTests();
  }, []);

  const handleDelete = async (id, title) => {
    if(!window.confirm(`DIQQAT! "${title}" testini o'chirmoqchimisiz?`)) return;
    try {
        await deleteDoc(doc(db, "tests", id));
        setTests(tests.filter(t => t.id !== id));
    } catch(err) { alert("Xato: " + err.message); }
  };

  // 1. FILTERING LOGIC
  const filteredTests = useMemo(() => {
    return tests.filter(test => {
      const matchesSearch = test.title?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || test.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [tests, searchTerm, filterType]);

  // 2. PAGINATION LOGIC
  const totalPages = Math.ceil(filteredTests.length / itemsPerPage);
  const currentData = filteredTests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 3. STATISTICS
  const stats = useMemo(() => ({
    total: tests.length,
    reading: tests.filter(t => t.type === 'reading').length,
    listening: tests.filter(t => t.type === 'listening').length,
    writing: tests.filter(t => t.type === 'writing').length,
  }), [tests]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans text-gray-800">
      
      {/* --- HEADER --- */}
      <div className="bg-white border-b sticky top-0 z-20 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
             <div className="flex items-center gap-4">
                <button onClick={() => navigate('/admin')} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition">
                    <Icons.ArrowLeft className="w-5 h-5"/>
                </button>
                <h1 className="text-xl font-semibold text-gray-800">Testlar Boshqaruvi</h1>
             </div>
             <button 
                onClick={() => navigate('/admin/create-test')}
                className="bg-[#1A73E8] hover:bg-[#1557B0] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm flex items-center gap-2 transition"
             >
                <Icons.Plus className="w-4 h-4"/>
                <span className="hidden sm:inline">Yangi Test</span>
             </button>
          </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* --- STATS CARDS --- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           {[
             { label: "Jami Testlar", val: stats.total, color: "text-gray-700", bg: "bg-white" },
             { label: "Reading", val: stats.reading, color: "text-blue-600", bg: "bg-blue-50" },
             { label: "Listening", val: stats.listening, color: "text-purple-600", bg: "bg-purple-50" },
             { label: "Writing", val: stats.writing, color: "text-yellow-600", bg: "bg-yellow-50" },
           ].map((stat, idx) => (
             <div key={idx} className={`${stat.bg} p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center`}>
                <span className={`text-2xl font-bold ${stat.color}`}>{stat.val}</span>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mt-1">{stat.label}</span>
             </div>
           ))}
        </div>

        {/* --- FILTER & SEARCH BAR (YANGILANGAN) --- */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
            
            {/* 1. Qidiruv Inputi */}
            <div className="relative w-full md:w-96 group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Icons.Search className="h-5 w-5 text-gray-400 group-focus-within:text-[#1A73E8] transition-colors" />
                </div>
                <input
                    type="text"
                    placeholder="Test nomini qidiring..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#1A73E8] focus:border-[#1A73E8] outline-none text-sm transition bg-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* 2. Filter Tugmalari (Segmented Control) */}
            <div className="flex bg-gray-100 p-1 rounded-lg w-full md:w-auto overflow-x-auto no-scrollbar">
                {['all', 'reading', 'listening', 'writing'].map(type => (
                    <button
                        key={type}
                        onClick={() => { setFilterType(type); setCurrentPage(1); }}
                        className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-medium transition capitalize whitespace-nowrap ${
                            filterType === type 
                            ? 'bg-white text-[#1A73E8] shadow-sm ring-1 ring-black/5' 
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        {type}
                    </button>
                ))}
            </div>
        </div>

        {/* --- TABLE --- */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Test Nomi</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Turi</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Qiyinligi</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sana</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Amallar</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                             <tr><td colSpan="5" className="p-8 text-center text-gray-500">Yuklanmoqda...</td></tr>
                        ) : currentData.length === 0 ? (
                             <tr><td colSpan="5" className="p-8 text-center text-gray-400">Hech qanday test topilmadi.</td></tr>
                        ) : (
                            currentData.map((test) => (
                                <tr key={test.id} className="hover:bg-gray-50 transition group">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900 text-sm">{test.title}</div>
                                        <div className="text-xs text-gray-400 mt-0.5">{test.questions?.length || 0} ta savol</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                            ${test.type === 'reading' ? 'bg-blue-100 text-blue-800' : 
                                              test.type === 'listening' ? 'bg-purple-100 text-purple-800' : 
                                              'bg-yellow-100 text-yellow-800'}`}>
                                            {test.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-xs font-medium capitalize
                                            ${test.difficulty === 'hard' ? 'text-red-600' : 
                                              test.difficulty === 'easy' ? 'text-green-600' : 
                                              'text-orange-600'}`}>
                                            {test.difficulty || "Medium"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {test.createdAt?.seconds ? new Date(test.createdAt.seconds * 1000).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => window.open(`/test/${test.id}`, '_blank')} className="p-1.5 text-gray-400 hover:text-[#1A73E8] hover:bg-blue-50 rounded transition" title="Ko'rish">
                                                <Icons.Eye className="w-4 h-4"/>
                                            </button>
                                            <button onClick={() => navigate(`/admin/edit-test/${test.id}`)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition" title="Tahrirlash">
                                                <Icons.Edit className="w-4 h-4"/>
                                            </button>
                                            <button onClick={() => handleDelete(test.id, test.title)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="O'chirish">
                                                <Icons.Trash className="w-4 h-4"/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* --- PAGINATION FOOTER --- */}
            {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-white">
                    <span className="text-xs text-gray-500">
                        Ko'rsatilmoqda: <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredTests.length)}</span> / {filteredTests.length}
                    </span>
                    <div className="flex items-center gap-1">
                        <button 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition text-gray-600"
                        >
                            <Icons.ChevronLeft className="w-5 h-5"/>
                        </button>
                        {Array.from({length: totalPages}, (_, i) => i + 1).map(page => (
                            <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`w-8 h-8 rounded-md text-sm font-medium transition ${
                                    currentPage === page 
                                    ? 'bg-[#1A73E8] text-white shadow-sm' 
                                    : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                {page}
                            </button>
                        ))}
                        <button 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition text-gray-600"
                        >
                            <Icons.ChevronRight className="w-5 h-5"/>
                        </button>
                    </div>
                </div>
            )}
        </div>

      </div>
    </div>
  );
}