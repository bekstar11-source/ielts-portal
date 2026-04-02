// src/pages/AdminTests.jsx
import { useState, useEffect, useMemo } from "react";
import { db } from "../firebase/firebase";
import { collection, getDocs, deleteDoc, doc, query, orderBy, onSnapshot, updateDoc, addDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import TagSelector from "../components/ui/TagSelector";
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
    Tag: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>,
    X: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
};



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
    const [editingTagsFor, setEditingTagsFor] = useState(null); // testId
    const [filterTag, setFilterTag] = useState("all");
    const [filterDifficulty, setFilterDifficulty] = useState("all");
    const [tagLabels, setTagLabels] = useState({});
    const itemsPerPage = 10;



    useEffect(() => {
        const fetchTests = async () => {
            try {
                const q = query(collection(db, "tests"), orderBy("createdAt", "desc"));
                const snapshot = await getDocs(q);
                setTests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(t => t.id !== "tag_metadata" && t.id !== "_tag_settings"));
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

    const handleUpdateTags = async (testId, newTags) => {
        try {
            await updateDoc(doc(db, "tests", testId), { tags: newTags });
            setTests(prev => prev.map(t => t.id === testId ? { ...t, tags: newTags } : t));
        } catch (err) {
            alert("Taglarni yangilashda xatolik: " + err.message);
        }
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
            let questionIdCounter = 1;

            sortedSelected.forEach((test, testIdx) => {
                const passages = test.passages || [];
                const questions = test.questions || [];
                const keywords = test.keywordTable || [];

                // 1. Passage ID Mapping
                const passageIdMap = {};
                const mappedPassages = passages.map((p, pIdx) => {
                    const newId = passageIdOffset + pIdx + 1;
                    passageIdMap[String(p.id)] = String(newId);
                    return { 
                        ...p, 
                        id: String(newId), 
                        originalId: p.id,
                        partNumber: passageIdOffset + pIdx + 1 
                    };
                });

                // 2. Questions Processing
                const STRUCTURAL_KEYS = new Set([
                    'options', 'rows', 'cells', 'parts',
                    'headers', 'image', 'answer', 'locationId',
                    'content', 'introDuration', 'originalId'
                ]);

                // Helper to update text strings containing range labels
                const updateRangeText = (text, min, max) => {
                    if (!text || typeof text !== 'string') return text;
                    const rangeRegex = /(Questions?\s+)\d+(?:[\-–]\d+)?/gi;
                    return text.replace(rangeRegex, (match, prefix) => {
                        return `${prefix}${min}${max > min ? '–' + max : ''}`;
                    });
                };

                const mappedQuestions = questions.map(group => {
                    let groupMinId = Infinity;
                    let groupMaxId = -Infinity;

                    const updateIdCounter = (obj, field = 'id') => {
                        const idStr = String(obj[field]);
                        let count = 1;
                        if (idStr.includes('-') || idStr.includes('–')) {
                            const parts = idStr.split(/[\-–]/);
                            if (parts.length === 2) {
                                const start = parseInt(parts[0]);
                                const end = parseInt(parts[1]);
                                if (!isNaN(start) && !isNaN(end)) count = Math.abs(end - start) + 1;
                            }
                        } else if (idStr.includes(',')) {
                            count = idStr.split(',').filter(Boolean).length;
                        }

                        if (count > 1) {
                            const newIds = [];
                            for (let i = 0; i < count; i++) {
                                const nextId = questionIdCounter++;
                                newIds.push(String(nextId));
                                if (nextId < groupMinId) groupMinId = nextId;
                                if (nextId > groupMaxId) groupMaxId = nextId;
                            }
                            obj[field] = newIds.join(', ');
                        } else {
                            const nextId = questionIdCounter++;
                            obj[field] = String(nextId);
                            if (nextId < groupMinId) groupMinId = nextId;
                            if (nextId > groupMaxId) groupMaxId = nextId;
                        }
                    };

                    const processItem = (item) => {
                        if (!item || typeof item !== 'object') return item;
                        if (Array.isArray(item)) return item.map(processItem);

                        let updated = { ...item };
                        
                        // ID update: update if it looks like a question/item ID
                        if (updated.id && !STRUCTURAL_KEYS.has('id')) {
                            updateIdCounter(updated);
                        }

                        // passageId update
                        if (updated.passageId && passageIdMap[String(updated.passageId)]) {
                            updated.passageId = passageIdMap[String(updated.passageId)];
                        } else if (passageIdMap[String(group.passageId)]) {
                            updated.passageId = passageIdMap[String(group.passageId)];
                        }

                        // Recursive call for nested objects (except structural ones)
                        for (const key in updated) {
                            if (updated[key] && typeof updated[key] === 'object' && !STRUCTURAL_KEYS.has(key)) {
                                updated[key] = processItem(updated[key]);
                            }
                        }
                        return updated;
                    };

                    // Process the group and its contents
                    const newGroup = {
                        ...group,
                        passageId: passageIdMap[String(group.passageId)] || group.passageId
                    };

                    if (group.items) newGroup.items = group.items.map(processItem);
                    if (group.questions) newGroup.questions = group.questions.map(processItem);
                    if (group.groups) {
                        newGroup.groups = group.groups.map(sub => {
                            const newSub = { ...sub };
                            if (sub.items) newSub.items = sub.items.map(processItem);
                            if (sub.questions) newSub.questions = sub.questions.map(processItem);
                            return newSub;
                        });
                    }

                    // Handle standalone group ID
                    if (newGroup.id && !group.items?.length && !group.questions?.length && !group.groups?.length) {
                        updateIdCounter(newGroup);
                    }

                    // Update instruction and text labels with correct question range
                    if (groupMinId !== Infinity) {
                        if (newGroup.instruction) newGroup.instruction = updateRangeText(newGroup.instruction, groupMinId, groupMaxId);
                        if (newGroup.text) newGroup.text = updateRangeText(newGroup.text, groupMinId, groupMaxId);
                        if (newGroup.header) newGroup.header = updateRangeText(newGroup.header, groupMinId, groupMaxId);
                    }

                    return newGroup;
                });

                // 3. Keywords Processing
                const mappedKeywords = keywords.map(kw => ({
                    ...kw,
                    passageId: passageIdMap[String(kw.passageId)] || kw.passageId
                }));

                combinedPassages = [...combinedPassages, ...mappedPassages];
                combinedQuestions = [...combinedQuestions, ...mappedQuestions];
                combinedKeywords = [...combinedKeywords, ...mappedKeywords];
                
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

            // Utility to recursively remove undefined fields for Firestore
            const cleanObject = (obj) => {
                if (obj === null || typeof obj !== 'object') return obj;
                if (Array.isArray(obj)) return obj.map(cleanObject).filter(v => v !== undefined);
                return Object.fromEntries(
                    Object.entries(obj)
                        .filter(([_, v]) => v !== undefined)
                        .map(([k, v]) => [k, cleanObject(v)])
                );
            };

            const docRef = await addDoc(collection(db, "tests"), cleanObject(newTestData));
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
            const matchesTag = filterTag === 'all' || (test.tags && test.tags.includes(filterTag));
            const matchesDifficulty = filterDifficulty === 'all' || test.difficulty === filterDifficulty;
            return matchesSearch && matchesType && matchesTag && matchesDifficulty;
        });
    }, [tests, searchTerm, filterType, filterTag, filterDifficulty]);

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

                {/* --- FILTER & SEARCH BAR (REDESIGNED) --- */}
                <div className="space-y-4 mb-8">
                    {/* Row 1: Primary Inputs */}
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* 1. Search */}
                        <div className="relative flex-1 group">
                            <Icons.Search className={`absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${isDark ? 'text-white/20 group-focus-within:text-blue-400' : 'text-gray-400 group-focus-within:text-[#1A73E8]'}`} />
                            <input
                                type="text"
                                placeholder="Test nomini qidiring..."
                                className={`w-full pl-11 pr-4 py-3 rounded-2xl border outline-none text-[13px] font-medium transition ${isDark ? 'bg-[#1E1E1E] border-white/5 text-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500' : 'bg-white border-gray-200 focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500'}`}
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            />
                        </div>

                        {/* 2. Hashtag Filter */}
                        <div className={`relative w-full md:w-72 flex items-center gap-3 px-4 rounded-2xl border transition-all h-[47px] ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-white border-gray-200 focus-within:border-blue-500/50'}`}>
                            <Icons.Tag className={`w-4 h-4 ${filterTag !== 'all' ? 'text-blue-500' : 'text-gray-400'}`} />
                            <input 
                                type="text"
                                placeholder="Hashtag bilan..."
                                className="bg-transparent border-none outline-none text-sm font-bold w-full placeholder:text-gray-500"
                                value={filterTag === 'all' ? '' : filterTag}
                                onChange={(e) => {
                                    const val = e.target.value.trim().replace(/^#/, "");
                                    setFilterTag(val || 'all');
                                    setCurrentPage(1);
                                }}
                            />
                            {filterTag !== 'all' && (
                                <button onClick={() => setFilterTag('all')} className="text-gray-500 hover:text-red-500 transition-colors">
                                    <Icons.X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Row 2: Segmented Controls */}
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                        {/* 3. Type Filter */}
                        <div className={`flex p-1 rounded-xl w-full lg:w-auto overflow-x-auto no-scrollbar border ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-gray-100 border-gray-200'}`}>
                            {['all', 'reading', 'listening', 'writing', 'speaking'].map(type => (
                                <button
                                    key={type}
                                    onClick={() => { setFilterType(type); setCurrentPage(1); }}
                                    className={`flex-1 lg:flex-none px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition whitespace-nowrap ${filterType === type
                                        ? (isDark ? 'bg-[#2C2C2C] text-blue-400 shadow-sm' : 'bg-white text-[#1A73E8] shadow-sm')
                                        : (isDark ? 'text-gray-500 hover:text-white' : 'text-gray-500 hover:text-gray-700')
                                        }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>

                        {/* 4. Passage Filter */}
                        <div className={`flex p-1 rounded-xl w-full lg:w-auto overflow-x-auto no-scrollbar border ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-gray-100 border-gray-200'}`}>
                            {[{v:'all', l:'Hammasi'}, {v:'easy', l:'Passage 1'}, {v:'medium', l:'Passage 2'}, {v:'hard', l:'Passage 3'}].map(diff => (
                                <button
                                    key={diff.v}
                                    onClick={() => { setFilterDifficulty(diff.v); setCurrentPage(1); }}
                                    className={`flex-1 lg:flex-none px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition whitespace-nowrap ${filterDifficulty === diff.v
                                        ? (isDark ? 'bg-[#2C2C2C] text-blue-400 shadow-sm' : 'bg-white text-[#1A73E8] shadow-sm')
                                        : (isDark ? 'text-gray-500 hover:text-white' : 'text-gray-500 hover:text-gray-700')
                                        }`}
                                >
                                    {diff.l}
                                </button>
                            ))}
                        </div>
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
                                    <th className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Taglar</th>
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
                                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                    {test.tags?.map((tag, idx) => (
                                                        <span key={idx} className={`px-2 py-0.5 rounded text-[10px] font-black transition-all ${isDark ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                                                            #{tag}
                                                        </span>
                                                    ))}
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingTagsFor(editingTagsFor === test.id ? null : test.id);
                                                        }}
                                                        className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10 text-gray-500 hover:text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-600'}`}
                                                    >
                                                        <Icons.Plus className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                                {editingTagsFor === test.id && (
                                                    <div className={`absolute mt-2 z-50 p-4 rounded-2xl shadow-2xl border animate-in fade-in zoom-in-95 duration-200 w-72 ${isDark ? 'bg-[#2C2C2C] border-white/10' : 'bg-white border-gray-200'}`}>
                                                        <div className="flex justify-between items-center mb-3">
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-[#3772FF]">Hashtaglar (Admin)</span>
                                                            <button onClick={() => setEditingTagsFor(null)}><Icons.X className="w-4 h-4 text-gray-500" /></button>
                                                        </div>
                                                        <TagSelector 
                                                            selectedTags={test.tags || []} 
                                                            onChange={(newTags) => handleUpdateTags(test.id, newTags)}
                                                            isDark={isDark}
                                                        />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-xs font-medium capitalize
                                            ${test.difficulty === 'hard' ? 'text-red-500' :
                                                        test.difficulty === 'easy' ? 'text-green-500' :
                                                            'text-orange-500'}`}>
                                                    {test.difficulty === 'hard' ? 'Passage 3' : 
                                                     test.difficulty === 'medium' ? 'Passage 2' : 
                                                     test.difficulty === 'easy' ? 'Passage 1' : 
                                                     (test.difficulty || "Passage 2")}
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