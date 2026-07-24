import React, { useState, useEffect } from 'react';
import { X, Search, Trash2, AlertTriangle, CheckCircle, RefreshCw, FileText } from 'lucide-react';
import { db } from '../../../firebase/firebase';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { useTheme } from '../../../context/ThemeContext';
import toast from 'react-hot-toast';

const extractWords = (text) => {
    if (!text) return new Set();
    const normalized = String(text).toLowerCase().replace(/[^\w\sа-яёўқғҳ]/gi, ' ');
    const words = normalized.split(/\s+/).filter(w => w.length > 3);
    return new Set(words);
};

const calculateSimilarity = (setA, setB) => {
    if (setA.size === 0 && setB.size === 0) return 0;
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return intersection.size / union.size;
};

const FindDuplicatesModal = ({ isOpen, onClose, onDeleteTest }) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    
    const [loading, setLoading] = useState(false);
    const [duplicates, setDuplicates] = useState([]);
    const [similarTests, setSimilarTests] = useState([]);
    const [progress, setProgress] = useState(0);
    const [filterType, setFilterType] = useState('all');
    const [similarityThreshold, setSimilarityThreshold] = useState(85);

    const findDuplicates = async () => {
        setLoading(true);
        setDuplicates([]);
        setSimilarTests([]);
        setProgress(0);
        
        try {
            // limit to 1500 to prevent memory issues
            const snapAll = await getDocs(query(collection(db, "tests_metadata"), limit(1500)));
            const tests = snapAll.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            const baseTests = tests.filter(t => !t.isMerged && !(t.title && t.title.toLowerCase().startsWith("merged:")));
            
            const exactDups = [];
            const simTests = [];
            
            const processedTests = baseTests.map(t => ({
                ...t,
                wordSet: extractWords(t.combinedContent || t.title || "")
            }));
            
            const totalComparisons = (processedTests.length * (processedTests.length - 1)) / 2;
            let currentComp = 0;
            
            for (let i = 0; i < processedTests.length; i++) {
                for (let j = i + 1; j < processedTests.length; j++) {
                    const testA = processedTests[i];
                    const testB = processedTests[j];
                    
                    if (testA.type !== testB.type) {
                        currentComp++;
                        continue;
                    }
                    
                    const isExactTitle = testA.title && testB.title && testA.title.trim().toLowerCase() === testB.title.trim().toLowerCase();
                    const contentA = (testA.combinedContent || "").trim();
                    const contentB = (testB.combinedContent || "").trim();
                    
                    const isExactContent = contentA && contentB && contentA === contentB;
                    
                    if (isExactContent || (isExactTitle && contentA.length < 50 && contentB.length < 50)) {
                        exactDups.push({ testA, testB, reason: isExactContent ? "Bir xil kontent" : "Bir xil sarlavha" });
                    } else if (contentA.length > 50 && contentB.length > 50) {
                        const similarity = calculateSimilarity(testA.wordSet, testB.wordSet);
                        if (similarity >= (similarityThreshold / 100)) { 
                            simTests.push({ testA, testB, score: Math.round(similarity * 100) });
                        }
                    }
                    
                    currentComp++;
                    if (currentComp % 500 === 0) {
                        setProgress(Math.round((currentComp / totalComparisons) * 100));
                        await new Promise(r => setTimeout(r, 0)); // yield
                    }
                }
            }
            
            setDuplicates(exactDups);
            setSimilarTests(simTests.sort((a, b) => b.score - a.score));
            setProgress(100);
            
        } catch (error) {
            console.error("Xatolik:", error);
            toast.error("Testlarni tahlil qilishda xatolik yuz berdi");
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        if (isOpen) {
            findDuplicates();
        }
    }, [isOpen, similarityThreshold]);

    const handleDelete = (id, title) => {
        if (onDeleteTest) {
            onDeleteTest(id, title);
            // After successful delete, we remove it from lists
            setDuplicates(prev => prev.filter(pair => pair.testA.id !== id && pair.testB.id !== id));
            setSimilarTests(prev => prev.filter(pair => pair.testA.id !== id && pair.testB.id !== id));
        }
    };
    
    const filteredDuplicates = duplicates.filter(pair => filterType === 'all' || pair.testA.type === filterType);
    const filteredSimilar = similarTests.filter(pair => filterType === 'all' || pair.testA.type === filterType);
    
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div 
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
                onClick={onClose}
            />
            
            <div className={`relative w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
                isDark ? 'bg-[#181818] border border-white/10' : 'bg-white border border-zinc-200'
            }`}>
                {/* Header */}
                <div className={`px-6 py-4 flex items-center justify-between border-b ${
                    isDark ? 'border-white/10 bg-white/5' : 'border-zinc-200 bg-zinc-50'
                }`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600'}`}>
                            <AlertTriangle size={20} />
                        </div>
                        <div>
                            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                                Duplikat Testlarni Izlash
                            </h2>
                            <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                Baza bo'yicha bir xil va juda o'xshash testlarni topish
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button
                            onClick={findDuplicates}
                            disabled={loading}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                                isDark 
                                    ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' 
                                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                            }`}
                        >
                            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                            Qayta tekshirish
                        </button>
                        <button
                            onClick={onClose}
                            className={`p-2 rounded-lg transition-colors ${
                                isDark ? 'hover:bg-white/10 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
                            }`}
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {/* Filters & Controls */}
                    <div className={`flex flex-wrap items-center justify-between gap-4 pb-4 border-b ${isDark ? 'border-white/10' : 'border-zinc-200'}`}>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { id: 'all', label: 'Barchasi' },
                                { id: 'reading', label: 'Reading' },
                                { id: 'listening', label: 'Listening' },
                                { id: 'writing', label: 'Writing' }
                            ].map(ft => (
                                <button
                                    key={ft.id}
                                    onClick={() => setFilterType(ft.id)}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                                        filterType === ft.id
                                            ? (isDark ? 'bg-blue-500 text-white' : 'bg-blue-600 text-white')
                                            : (isDark ? 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900')
                                    }`}
                                >
                                    {ft.label}
                                </button>
                            ))}
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <label className={`text-sm font-bold ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                O'xshashlik darajasi:
                            </label>
                            <select
                                value={similarityThreshold}
                                onChange={(e) => setSimilarityThreshold(Number(e.target.value))}
                                disabled={loading}
                                className={`px-3 py-2 rounded-lg text-sm font-bold border outline-none transition-colors ${
                                    isDark 
                                        ? 'bg-[#222] border-white/10 text-white focus:border-blue-500' 
                                        : 'bg-white border-zinc-200 text-zinc-900 focus:border-blue-500'
                                }`}
                            >
                                <option value={20}>20% (Qisman o'xshash)</option>
                                <option value={50}>50% (Yarmi o'xshash)</option>
                                <option value={75}>75% (Katta qismi o'xshash)</option>
                                <option value={85}>85% (Juda o'xshash)</option>
                                <option value={95}>95% (Deyarli bir xil)</option>
                            </select>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-16 h-16 relative">
                                <div className="absolute inset-0 rounded-full border-4 border-blue-500/20"></div>
                                <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
                            </div>
                            <p className={`mt-4 font-bold ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                                Testlar taqqoslanmoqda... ({progress}%)
                            </p>
                        </div>
                    ) : (
                        <>
                            {filteredDuplicates.length === 0 && filteredSimilar.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className={`p-4 rounded-full mb-4 ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
                                        <CheckCircle size={32} />
                                    </div>
                                    <h3 className={`text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                                        Duplikatlar topilmadi
                                    </h3>
                                    <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                        {filterType === 'all' 
                                            ? "Bazada barcha testlar o'ziga xos va noyob." 
                                            : "Ushbu bo'limda o'xshash testlar topilmadi."}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    {/* Exact Duplicates */}
                                    {filteredDuplicates.length > 0 && (
                                        <section>
                                            <h3 className={`text-sm font-black uppercase tracking-wider mb-4 flex items-center gap-2 ${
                                                isDark ? 'text-rose-400' : 'text-rose-600'
                                            }`}>
                                                <AlertTriangle size={16} /> 
                                                Aniq Duplikatlar ({filteredDuplicates.length})
                                            </h3>
                                            <div className="space-y-4">
                                                {filteredDuplicates.map((pair, idx) => (
                                                    <DuplicatePairCard 
                                                        key={`dup-${idx}`} 
                                                        pair={pair} 
                                                        onDelete={handleDelete}
                                                        isDark={isDark}
                                                        isExact={true}
                                                    />
                                                ))}
                                            </div>
                                        </section>
                                    )}

                                    {/* Similar Tests */}
                                    {filteredSimilar.length > 0 && (
                                        <section>
                                            <h3 className={`text-sm font-black uppercase tracking-wider mb-4 flex items-center gap-2 ${
                                                isDark ? 'text-amber-400' : 'text-amber-600'
                                            }`}>
                                                <Search size={16} /> 
                                                Juda O'xshash Testlar ({filteredSimilar.length})
                                            </h3>
                                            <div className="space-y-4">
                                                {filteredSimilar.map((pair, idx) => (
                                                    <DuplicatePairCard 
                                                        key={`sim-${idx}`} 
                                                        pair={pair} 
                                                        onDelete={handleDelete}
                                                        isDark={isDark}
                                                        isExact={false}
                                                    />
                                                ))}
                                            </div>
                                        </section>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const DuplicatePairCard = ({ pair, onDelete, isDark, isExact }) => {
    return (
        <div className={`p-4 rounded-xl border flex flex-col gap-4 ${
            isDark ? 'bg-white/5 border-white/10' : 'bg-white border-zinc-200'
        }`}>
            <div className="flex items-center justify-between">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded ${
                    isExact 
                        ? (isDark ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-600')
                        : (isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600')
                }`}>
                    {isExact ? `Sabab: ${pair.reason}` : `O'xshashlik: ${pair.score}%`}
                </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TestInfoCard test={pair.testA} onDelete={onDelete} isDark={isDark} label="Test 1" />
                <TestInfoCard test={pair.testB} onDelete={onDelete} isDark={isDark} label="Test 2" />
            </div>
        </div>
    );
};

const TestInfoCard = ({ test, onDelete, isDark, label }) => {
    return (
        <div className={`p-3 rounded-lg border flex flex-col gap-3 ${
            isDark ? 'border-white/5 bg-black/20' : 'border-zinc-100 bg-zinc-50/50'
        }`}>
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        {label} - {test.type}
                    </p>
                    <h4 className={`font-bold text-sm truncate ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                        {test.title || "Untitled Test"}
                    </h4>
                    <p className={`text-[10px] mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        ID: {test.id}
                    </p>
                </div>
                <button
                    onClick={() => onDelete(test.id, test.title)}
                    className={`p-2 rounded-lg shrink-0 transition-all ${
                        isDark 
                            ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20' 
                            : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                    }`}
                    title="O'chirish"
                >
                    <Trash2 size={14} />
                </button>
            </div>
            <div className={`text-xs p-2 rounded max-h-24 overflow-y-auto custom-scrollbar ${
                isDark ? 'bg-white/5 text-zinc-300' : 'bg-white border text-zinc-600'
            }`}>
                {test.combinedContent ? (
                    <span className="line-clamp-3 leading-relaxed">
                        {test.combinedContent}
                    </span>
                ) : (
                    <span className="italic opacity-50">Kontent mavjud emas</span>
                )}
            </div>
        </div>
    );
};

export default FindDuplicatesModal;
