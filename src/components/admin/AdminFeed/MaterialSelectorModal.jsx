import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { FaTimes, FaCheck } from 'react-icons/fa';
import { useTheme } from '../../../context/ThemeContext';
import { toast } from 'react-hot-toast';

export default function MaterialSelectorModal({
    isOpen,
    onClose,
    target, // 'post' | 'story'
    initialSelectedTests = [],
    onSelect, // for single select: (item, type) => void
    onConfirmTests // for multi-select tests: (tests) => void
}) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const [materialTab, setMaterialTab] = useState('tests'); // 'tests' | 'podcasts' | 'articles'
    const [allTests, setAllTests] = useState([]);
    const [allPodcasts, setAllPodcasts] = useState([]);
    const [allArticles, setAllArticles] = useState([]);
    const [selectorSearchTerm, setSelectorSearchTerm] = useState('');
    const [loadingSelector, setLoadingSelector] = useState(false);
    const [selectedTestsInModal, setSelectedTestsInModal] = useState([]);

    useEffect(() => {
        if (isOpen) {
            setSelectedTestsInModal(initialSelectedTests || []);
            fetchData();
        }
    }, [isOpen, initialSelectedTests]);

    const fetchData = async () => {
        setLoadingSelector(true);
        try {
            if (allTests.length === 0) {
                const q = query(
                    collection(db, "tests_metadata"), 
                    orderBy("createdAt", "desc"),
                    limit(200)
                );
                const snap = await getDocs(q);
                const testsList = snap.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .filter(t => !t.id.startsWith("_tag") && t.id !== "tag_metadata");
                setAllTests(testsList);
            }
            if (allPodcasts.length === 0) {
                const q = query(
                    collection(db, "podcasts"),
                    orderBy("createdAt", "desc"),
                    limit(200)
                );
                const snap = await getDocs(q);
                setAllPodcasts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            }
            if (allArticles.length === 0) {
                const q = query(
                    collection(db, "articles"),
                    orderBy("createdAt", "desc"),
                    limit(200)
                );
                const snap = await getDocs(q);
                setAllArticles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            }
        } catch (err) {
            console.error("Error fetching selector data:", err);
            toast.error("Ma'lumotlarni yuklab bo'lmadi.");
        } finally {
            setLoadingSelector(false);
        }
    };

    const toggleTestInModal = (test) => {
        setSelectedTestsInModal(prev => {
            const exists = prev.some(t => t.id === test.id);
            if (exists) {
                return prev.filter(t => t.id !== test.id);
            } else {
                return [...prev, test];
            }
        });
    };

    const getFilteredSelectorItems = () => {
        const queryStr = selectorSearchTerm.toLowerCase();
        if (materialTab === 'tests') {
            return allTests.filter(t => (t.title || '').toLowerCase().includes(queryStr) || (t.type || '').toLowerCase().includes(queryStr));
        } else if (materialTab === 'podcasts') {
            return allPodcasts.filter(p => (p.title || '').toLowerCase().includes(queryStr) || (p.level || '').toLowerCase().includes(queryStr));
        } else {
            return allArticles.filter(a => (a.title || '').toLowerCase().includes(queryStr) || (a.category || '').toLowerCase().includes(queryStr));
        }
    };

    if (!isOpen) return null;

    const filteredItems = getFilteredSelectorItems();
    const isTestTab = materialTab === 'tests';
    const isPostTarget = target === 'post';
    const isMultiSelect = isPostTarget && isTestTab;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <div className={`w-full max-w-lg rounded-3xl p-6 border relative flex flex-col max-h-[85vh] transition-colors ${
                isDark ? 'bg-[#1E1E1E] border-white/10 text-white' : 'bg-white border-gray-100 shadow-2xl'
            }`}>
                <button 
                    type="button"
                    onClick={() => { onClose(); setSelectorSearchTerm(''); }} 
                    className={`absolute top-4 right-4 hover:opacity-80 transition-opacity ${isDark ? 'text-white/40' : 'text-gray-400'}`}
                >
                    <FaTimes />
                </button>
                
                <h3 className="text-lg font-bold mb-1">Portal Materialini tanlang</h3>
                <p className={`text-xs mb-4 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    Story yoki Postga biriktirish uchun kerakli materialni tanlang.
                </p>

                {/* Material Selector Tabs */}
                <div className="flex border-b border-gray-200 dark:border-white/5 gap-4 mb-4 text-xs font-bold text-left">
                    {[
                        { id: 'tests', label: '📖 Testlar', color: 'text-blue-500', bar: 'bg-blue-500' },
                        { id: 'podcasts', label: '🎙️ Podcastlar', color: 'text-purple-500', bar: 'bg-purple-500' },
                        { id: 'articles', label: '📰 Maqolalar', color: 'text-emerald-500', bar: 'bg-emerald-500' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => { setMaterialTab(tab.id); setSelectorSearchTerm(''); }}
                            className={`pb-2 transition relative ${
                                materialTab === tab.id ? tab.color : 'text-gray-400 dark:text-zinc-500 hover:text-gray-350'
                            }`}
                        >
                            {tab.label}
                            {materialTab === tab.id && <div className={`absolute bottom-0 inset-x-0 h-0.5 ${tab.bar}`} />}
                        </button>
                    ))}
                </div>

                {/* Search Input */}
                <input
                    type="text"
                    value={selectorSearchTerm}
                    onChange={(e) => setSelectorSearchTerm(e.target.value)}
                    placeholder={`${
                        materialTab === 'tests' ? 'Test nomi yoki turi...' : 
                        materialTab === 'podcasts' ? 'Podcast nomi...' : 'Maqola nomi...'
                    } bo'yicha qidirish...`}
                    className={`w-full border rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-opacity-50 mb-4 transition-all ${
                        isDark 
                            ? 'bg-white/5 border-white/10 text-white focus:border-pink-500 focus:ring-pink-500' 
                            : 'bg-gray-55 border-gray-250 focus:border-blue-500 focus:ring-blue-500'
                    }`}
                />

                {/* List Area */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin max-h-[45vh]">
                    {loadingSelector ? (
                        <div className="flex justify-center items-center py-10">
                            <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="text-center py-10 text-xs text-gray-400">
                            Hech qanday material topilmadi.
                        </div>
                    ) : (
                        filteredItems.map(item => {
                            const isSelected = isMultiSelect && selectedTestsInModal.some(t => t.id === item.id);

                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                        if (isMultiSelect) {
                                            toggleTestInModal(item);
                                        } else {
                                            onSelect(item, materialTab);
                                            setSelectorSearchTerm('');
                                        }
                                    }}
                                    className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between text-xs font-bold gap-3 ${
                                        isSelected 
                                            ? 'bg-blue-600/10 border-blue-500 text-blue-600 dark:text-blue-400' 
                                            : (isDark ? 'bg-white/5 border-white/5 hover:border-white/10' : 'bg-gray-50 border-gray-150 hover:bg-gray-100 hover:border-gray-255')
                                    }`}
                                >
                                    <div className="min-w-0 flex-1 flex items-center gap-2">
                                        {isMultiSelect && (
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                                                isSelected 
                                                    ? 'bg-blue-600 border-blue-600 text-white' 
                                                    : (isDark ? 'border-white/25 bg-white/5' : 'border-gray-300 bg-white')
                                            }`}>
                                                {isSelected && <FaCheck size={8} />}
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1 text-left">
                                            <span className="line-clamp-1">{item.title || 'Sarlavhasiz'}</span>
                                            <p className={`text-[9px] mt-0.5 font-normal ${isSelected ? 'text-blue-500/60' : (isDark ? 'text-white/40' : 'text-gray-500')}`}>
                                                {materialTab === 'tests' ? `Kolleksiya: ${item.collectionName || 'Kolleksiyasiz'}` : 
                                                 materialTab === 'podcasts' ? `Level: ${item.level || 'Barcha darajalar'}` : `Kategoriya: ${item.category || 'Kategoriyasiz'}`}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border uppercase shrink-0 ${
                                        isSelected 
                                            ? 'bg-blue-600 text-white border-transparent' 
                                            : (materialTab === 'tests' 
                                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 border-blue-500/20' 
                                                : materialTab === 'podcasts' 
                                                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 border-purple-500/20' 
                                                    : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 border-emerald-500/20')
                                    }`}>
                                        {materialTab === 'tests' ? item.type : materialTab}
                                    </span>
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Confirm Button for Multi-Select Tests */}
                {isMultiSelect && (
                    <div className="mt-4 pt-3 border-t border-gray-200 dark:border-white/5 flex justify-between items-center">
                        <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                            Tanlandi: {selectedTestsInModal.length} ta test
                        </span>
                        <button
                            type="button"
                            onClick={() => {
                                onConfirmTests(selectedTestsInModal);
                                onClose();
                                setSelectorSearchTerm('');
                            }}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-md"
                        >
                            Tanlashni tasdiqlash
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
