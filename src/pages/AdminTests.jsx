// src/pages/AdminTests.jsx
import { useState, useEffect, useMemo } from "react";
import { db } from "../firebase/firebase";
import { collection, getDocs, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";


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
    Layers: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>,
};

import { addDoc } from "firebase/firestore";

import { logAction } from "../utils/logger";
import { useAuth } from "../context/AuthContext";

export default function AdminTests() {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const { user } = useAuth(); // Get admin user
    const [tests, setTests] = useState([]);

    const [loading, setLoading] = useState(true);

    // State: Filter & Pagination
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedTests, setSelectedTests] = useState([]);
    const [isMerging, setIsMerging] = useState(false);
    const [showMergeModal, setShowMergeModal] = useState(false);
    const [mergeTitle, setMergeTitle] = useState("");
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
        if (!window.confirm(`DIQQAT! "${title}" testini o'chirmoqchimisiz?`)) return;
        try {
            await deleteDoc(doc(db, "tests", id));
            logAction(user.uid, 'DELETE_TEST', { testId: id, title });
            setTests(tests.filter(t => t.id !== id));
            setSelectedTests(prev => prev.filter(testId => testId !== id));
        } catch (err) { alert("Xato: " + err.message); }
    };

    const handleSelectTest = (id) => {
        setSelectedTests(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleMergeTests = async () => {
        if (selectedTests.length < 2) return alert("Kamida 2 ta testni tanlang!");
        
        const testObjects = tests.filter(t => selectedTests.includes(t.id));
        const firstType = testObjects[0].type;
        
        if (!testObjects.every(t => t.type === firstType)) {
            return alert("Faqat bir xil turdagi testlarni birlashtirish mumkin (masalan, faqat Reading yoki faqat Listening).");
        }

        if (firstType === 'writing' || firstType === 'speaking') {
            return alert("Hozircha faqat Reading va Listening testlarini birlashtirish mumkin.");
        }

        setShowMergeModal(true);
        setMergeTitle(`${firstType.toUpperCase()} Full Test (${testObjects.length} parts)`);
    };

    const finalizeMerge = async () => {
        if (!mergeTitle.trim()) return alert("Test nomini kiriting!");
        setIsMerging(true);
        try {
            const testObjects = tests.filter(t => selectedTests.includes(t.id));
            // Sort by selection order or keep original order in array
            const sortedSelected = selectedTests.map(id => testObjects.find(t => t.id === id));
            
            let combinedPassages = [];
            let combinedQuestions = [];
            let combinedKeywords = [];
            let passageIdOffset = 0;

            sortedSelected.forEach((test, testIdx) => {
                const passages = test.passages || [];
                const questions = test.questions || [];
                const keywords = test.keywordTable || [];

                // 1. Matnlarni qo'shish (ID larni yangilash)
                const mappedPassages = passages.map((p, pIdx) => {
                    const newId = passageIdOffset + pIdx + 1;
                    return { ...p, id: String(newId), originalId: p.id };
                });

                // 2. Savollarni qo'shish (passageId larni yangilash)
                const mappedQuestions = questions.map(q => {
                    if (q.passageId) {
                        const originalPassageIdx = passages.findIndex(p => String(p.id) === String(q.passageId));
                        if (originalPassageIdx !== -1) {
                            return { ...q, passageId: String(passageIdOffset + originalPassageIdx + 1) };
                        }
                    }
                    return q;
                });

                combinedPassages = [...combinedPassages, ...mappedPassages];
                combinedQuestions = [...combinedQuestions, ...mappedQuestions];
                combinedKeywords = [...combinedKeywords, ...keywords];
                
                passageIdOffset += passages.length;
            });

            const newTestData = {
                title: mergeTitle,
                type: sortedSelected[0].type,
                difficulty: "medium",
                passages: combinedPassages,
                questions: combinedQuestions,
                keywordTable: combinedKeywords,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isExclusive: false
            };

            const docRef = await addDoc(collection(db, "tests"), newTestData);
            logAction(user.uid, 'MERGE_TESTS', { newTestId: docRef.id, mergedFrom: selectedTests });
            
            alert("Testlar muvaffaqiyatli birlashtirildi!");
            window.location.reload(); // Refresh to show new test

        } catch (err) {
            console.error(err);
            alert("Xatolik yuz berdi: " + err.message);
        } finally {
            setIsMerging(false);
            setShowMergeModal(false);
        }
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
        <div className={`min-h-screen font-sans transition-colors duration-200 ${isDark ? 'bg-[#121212] text-white' : 'bg-[#F8F9FA] text-gray-800'}`}>

            {/* --- HEADER --- */}
            <div className={`border-b sticky top-0 z-20 shadow-sm transition-colors ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-white border-gray-200'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/admin')} className={`p-2 rounded-full transition ${isDark ? 'hover:bg-white/5 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                            <Icons.ArrowLeft className="w-5 h-5" />
                        </button>
                        <h1 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>Testlar Boshqaruvi</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        {selectedTests.length >= 2 && (
                            <button
                                onClick={handleMergeTests}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm flex items-center gap-2 transition animate-in fade-in slide-in-from-right-4"
                            >
                                <Icons.Layers className="w-4 h-4" />
                                <span>Birlashtirish ({selectedTests.length})</span>
                            </button>
                        )}
                        <button
                            onClick={() => navigate('/admin/create-test')}
                            className="bg-[#1A73E8] hover:bg-[#1557B0] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm flex items-center gap-2 transition"
                        >
                            <Icons.Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">Yangi Test</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

                {/* --- STATS CARDS --- */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: "Jami Testlar", val: stats.total, color: isDark ? "text-white" : "text-gray-700", bg: isDark ? "bg-[#1E1E1E] border-white/5" : "bg-white border-gray-100" },
                        { label: "Reading", val: stats.reading, color: isDark ? "text-blue-400" : "text-blue-600", bg: isDark ? "bg-blue-500/5 border-blue-500/10" : "bg-blue-50 border-blue-100" },
                        { label: "Listening", val: stats.listening, color: isDark ? "text-purple-400" : "text-purple-600", bg: isDark ? "bg-purple-500/5 border-purple-500/10" : "bg-purple-50 border-purple-100" },
                        { label: "Writing", val: stats.writing, color: isDark ? "text-yellow-400" : "text-yellow-600", bg: isDark ? "bg-yellow-500/5 border-yellow-500/10" : "bg-yellow-50 border-yellow-100" },
                    ].map((stat, idx) => (
                        <div key={idx} className={`${stat.bg} p-4 rounded-xl border shadow-sm flex flex-col items-center justify-center transition-colors`}>
                            <span className={`text-2xl font-bold ${stat.color}`}>{stat.val}</span>
                            <span className={`text-xs font-medium uppercase tracking-wide mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{stat.label}</span>
                        </div>
                    ))}
                </div>

                {/* --- FILTER & SEARCH BAR (YANGILANGAN) --- */}
                <div className={`p-4 rounded-xl border shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center transition-colors ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-white border-gray-200'}`}>

                    {/* 1. Qidiruv Inputi */}
                    <div className="relative w-full md:w-96 group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Icons.Search className={`h-5 w-5 transition-colors ${isDark ? 'text-white/20 group-focus-within:text-blue-400' : 'text-gray-400 group-focus-within:text-[#1A73E8]'}`} />
                        </div>
                        <input
                            type="text"
                            placeholder="Test nomini qidiring..."
                            className={`w-full pl-10 pr-4 py-2.5 rounded-lg border outline-none text-sm transition ${isDark ? 'bg-[#2C2C2C] border-white/10 text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500' : 'bg-white border-gray-300 focus:ring-2 focus:ring-[#1A73E8] focus:border-[#1A73E8]'}`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* 2. Filter Tugmalari (Segmented Control) */}
                    <div className={`flex p-1 rounded-lg w-full md:w-auto overflow-x-auto no-scrollbar ${isDark ? 'bg-[#2C2C2C]' : 'bg-gray-100'}`}>
                        {['all', 'reading', 'listening', 'writing'].map(type => (
                            <button
                                key={type}
                                onClick={() => { setFilterType(type); setCurrentPage(1); }}
                                className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-medium transition capitalize whitespace-nowrap ${filterType === type
                                    ? (isDark ? 'bg-[#3C3C3C] text-blue-400 shadow-sm ring-1 ring-white/10' : 'bg-white text-[#1A73E8] shadow-sm ring-1 ring-black/5')
                                    : (isDark ? 'text-gray-400 hover:text-white hover:bg-[#3C3C3C]/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200')
                                    }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                {/* --- TABLE --- */}
                <div className={`rounded-xl border shadow-sm overflow-hidden transition-colors ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-white border-gray-200'}`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className={`border-b transition-colors ${isDark ? 'bg-[#262626] border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                                <tr>
                                    <th className="px-6 py-3 w-4">
                                        <input 
                                            type="checkbox" 
                                            className={`rounded border-gray-300 text-[#1A73E8] focus:ring-[#1A73E8] ${isDark ? 'bg-[#2C2C2C] border-white/10' : ''}`}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedTests(currentData.map(t => t.id));
                                                else setSelectedTests([]);
                                            }}
                                            checked={currentData.length > 0 && currentData.every(t => selectedTests.includes(t.id))}
                                        />
                                    </th>
                                    <th className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Test Nomi</th>
                                    <th className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Turi</th>
                                    <th className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Qiyinligi</th>
                                    <th className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Sana</th>
                                    <th className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-right ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Amallar</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y transition-colors ${isDark ? 'divide-white/5' : 'divide-gray-100'}`}>
                                {loading ? (
                                    <tr><td colSpan="6" className="p-8 text-center text-gray-500">Yuklanmoqda...</td></tr>
                                ) : currentData.length === 0 ? (
                                    <tr><td colSpan="6" className="p-8 text-center text-gray-400">Hech qanday test topilmadi.</td></tr>
                                ) : (
                                    currentData.map((test) => (
                                        <tr key={test.id} className={`transition group ${selectedTests.includes(test.id) ? (isDark ? 'bg-blue-500/10' : 'bg-blue-50/50') : (isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50')}`}>
                                            <td className="px-6 py-4">
                                                <input 
                                                    type="checkbox" 
                                                    className={`rounded border-gray-300 text-[#1A73E8] focus:ring-[#1A73E8] ${isDark ? 'bg-[#2C2C2C] border-white/10' : ''}`}
                                                    checked={selectedTests.includes(test.id)}
                                                    onChange={() => handleSelectTest(test.id)}
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{test.title}</div>
                                                <div className="text-xs text-gray-400 mt-0.5">{test.questions?.length || 0} ta savol</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                            ${test.type === 'reading' ? (isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-800') :
                                                        test.type === 'listening' ? (isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-800') :
                                                            (isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-800')}`}>
                                                    {test.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-xs font-medium capitalize
                                            ${test.difficulty === 'hard' ? 'text-red-500' :
                                                        test.difficulty === 'easy' ? 'text-green-500' :
                                                            'text-orange-500'}`}>
                                                    {test.difficulty || "Medium"}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                {test.createdAt?.seconds ? new Date(test.createdAt.seconds * 1000).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className={`flex items-center justify-end gap-2 transition-opacity ${isDark ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                    <button onClick={() => window.open(`/test/${test.id}`, '_blank')} className={`p-1.5 rounded transition ${isDark ? 'text-gray-400 hover:text-blue-400 hover:bg-white/5' : 'text-gray-400 hover:text-[#1A73E8] hover:bg-blue-50'}`} title="Ko'rish">
                                                        <Icons.Eye className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => navigate(`/admin/edit-test/${test.id}`)} className={`p-1.5 rounded transition ${isDark ? 'text-gray-400 hover:text-green-400 hover:bg-white/5' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`} title="Tahrirlash">
                                                        <Icons.Edit className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDelete(test.id, test.title)} className={`p-1.5 rounded transition ${isDark ? 'text-gray-400 hover:text-red-400 hover:bg-white/5' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`} title="O'chirish">
                                                        <Icons.Trash className="w-4 h-4" />
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
                        <div className={`px-6 py-4 border-t flex items-center justify-between transition-colors ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-white border-gray-200'}`}>
                            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                                Ko'rsatilmoqda: <span className={`font-medium ${isDark ? 'text-gray-300' : ''}`}>{(currentPage - 1) * itemsPerPage + 1}</span> - <span className={`font-medium ${isDark ? 'text-gray-300' : ''}`}>{Math.min(currentPage * itemsPerPage, filteredTests.length)}</span> / {filteredTests.length}
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className={`p-1.5 rounded-md disabled:opacity-30 disabled:hover:bg-transparent transition ${isDark ? 'text-gray-400 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-100'}`}
                                >
                                    <Icons.ChevronLeft className="w-5 h-5" />
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`w-8 h-8 rounded-md text-sm font-medium transition ${currentPage === page
                                            ? (isDark ? 'bg-blue-600 text-white shadow-sm' : 'bg-[#1A73E8] text-white shadow-sm')
                                            : (isDark ? 'text-gray-400 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-100')
                                            }`}
                                    >
                                        {page}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className={`p-1.5 rounded-md disabled:opacity-30 disabled:hover:bg-transparent transition ${isDark ? 'text-gray-400 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-100'}`}
                                >
                                    <Icons.ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

            </div>

            {/* --- MERGE MODAL --- */}
            {showMergeModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className={`shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200 rounded-[24px] border ${isDark ? 'bg-[#1E1E1E] border-white/10' : 'bg-white border-gray-100'}`}>
                        <div className="p-6">
                            <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Testlarni Birlashtirish</h3>
                            <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                Tanlangan {selectedTests.length} ta test bitta umumiy testga birlashtiriladi. 
                                Yangi test uchun nom kiriting:
                            </p>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className={`block text-xs font-bold uppercase mb-1 ml-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Test Nomi</label>
                                    <input 
                                        type="text" 
                                        autoFocus
                                        className={`w-full border rounded-xl p-3 text-sm outline-none transition ${isDark ? 'bg-[#2C2C2C] border-white/10 text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10' : 'bg-gray-50 border-gray-200 focus:border-[#1A73E8] focus:ring-4 focus:ring-[#1A73E8]/10'}`}
                                        placeholder="Masalan: Full Reading Mock #1"
                                        value={mergeTitle}
                                        onChange={(e) => setMergeTitle(e.target.value)}
                                    />
                                </div>
                                
                                <div className={`p-4 rounded-xl border ${isDark ? 'bg-blue-500/5 border-blue-500/10' : 'bg-blue-50 border-blue-100'}`}>
                                    <p className={`text-xs font-medium leading-relaxed ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                                        💡 <b>Ma'lumot:</b> Birlashtirilgan testda matnlar (passages) va savollar siz tanlagan tartibda joylashadi. 
                                        Asl testlar o'chib ketmaydi.
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        <div className={`p-4 flex gap-3 justify-end ${isDark ? 'bg-white/5 border-t border-white/5' : 'bg-gray-50 border-t border-gray-100'}`}>
                            <button 
                                onClick={() => setShowMergeModal(false)}
                                className={`px-4 py-2 text-sm font-medium transition ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-800'}`}
                            >
                                Bekor qilish
                            </button>
                            <button 
                                onClick={finalizeMerge}
                                disabled={isMerging || !mergeTitle.trim()}
                                className="bg-[#1A73E8] hover:bg-[#1557B0] disabled:bg-gray-400 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-md transition flex items-center gap-2"
                            >
                                {isMerging ? (
                                    <>
                                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                        <span>Birlashtirilmoqda...</span>
                                    </>
                                ) : (
                                    <>
                                        <Icons.Layers className="w-4 h-4" />
                                        <span>Birlashtirish</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>

    );
}