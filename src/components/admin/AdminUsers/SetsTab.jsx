import React, { useState } from 'react';
import { Layers, Plus, Trash2, Search, Settings2, CheckCircle2, X } from 'lucide-react';
import { db } from '../../../firebase/firebase';
import { addDoc, deleteDoc, doc, collection, serverTimestamp } from 'firebase/firestore';

const SetsTab = ({ testSets, allTests, onRefresh, theme }) => {
    const isDark = theme === 'dark';
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [setName, setSetName] = useState("");
    const [selectedTests, setSelectedTests] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [testSearch, setTestSearch] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    const filteredSets = testSets.filter(s => s.name?.toLowerCase().includes(searchTerm.toLowerCase()));
    const filteredTests = allTests.filter(t => t.title.toLowerCase().includes(testSearch.toLowerCase())).slice(0, 8);

    const handleToggleTest = (testId) => {
        setSelectedTests(prev => prev.includes(testId) ? prev.filter(id => id !== testId) : [...prev, testId]);
    };

    const handleCreateSet = async () => {
        if (!setName || selectedTests.length === 0) return;
        setIsCreating(true);
        try {
            const selectedTestData = allTests.filter(t => selectedTests.includes(t.id)).map(t => ({ id: t.id, title: t.title, type: t.type }));
            await addDoc(collection(db, 'testSets'), {
                name: setName,
                tests: selectedTestData,
                createdAt: serverTimestamp()
            });
            setSetName("");
            setSelectedTests([]);
            setShowCreateModal(false);
            onRefresh();
        } catch (e) { console.error(e); } finally { setIsCreating(false); }
    };

    const handleDeleteSet = async (setId) => {
        if (!window.confirm("To'plamni o'chirmoqchimisiz?")) return;
        try {
            await deleteDoc(doc(db, 'testSets', setId));
            onRefresh();
        } catch (e) { console.error(e); }
    };

    return (
        <div className="h-full flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className={`flex items-center px-4 py-2.5 rounded-xl border transition-all group w-full sm:w-80 ${isDark ? 'bg-white/5 border-white/5 focus-within:bg-white/[0.08]' : 'bg-white border-gray-200 focus-within:border-blue-400'}`}>
                    <Search size={16} className={`mr-2 shrink-0 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                    <input
                        type="text"
                        placeholder="To'plamlarni qidirish..."
                        className="bg-transparent border-none outline-none text-sm w-full font-medium placeholder:text-gray-500"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="w-full sm:w-auto h-11 px-6 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-purple-900/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    <Plus size={18} /> To'plam Yaratish
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto custom-scrollbar pb-6">
                {filteredSets.map(set => (
                    <div
                        key={set.id}
                        className={`group relative p-6 rounded-3xl border transition-all duration-500 hover:shadow-2xl ${isDark ? 'bg-[#1E1E1E] border-white/5 hover:border-purple-500/30' : 'bg-white border-gray-100 hover:border-purple-200 shadow-sm'}`}
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDark ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
                                <Layers size={24} />
                            </div>
                            <button
                                onClick={() => handleDeleteSet(set.id)}
                                className={`p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${isDark ? 'hover:bg-red-500/10 text-red-400' : 'hover:bg-red-50 text-red-500'}`}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>

                        <h3 className="text-xl font-black tracking-tight mb-2">{set.name}</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-6">{set.tests?.length || 0} ta Test Jamlangan</p>

                        <div className="space-y-2">
                            {set.tests?.map((t, i) => (
                                <div key={i} className={`flex items-center justify-between p-3 rounded-xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                                    <span className="text-xs font-bold truncate flex-1 mr-2">{t.title}</span>
                                    <span className="text-[9px] font-black uppercase opacity-40">{t.type}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Create Set Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
                    <div className={`relative w-full max-w-2xl p-8 rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-300 ${isDark ? 'bg-[#1E1E1E] text-white border border-white/5' : 'bg-white text-gray-900'}`}>
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-3xl font-black tracking-tighter">Yangi To'plam</h2>
                            <button onClick={() => setShowCreateModal(false)} className="p-2 rounded-full hover:bg-white/5 opacity-50"><X size={24} /></button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 block">To'plam Nomi</label>
                                    <input
                                        type="text"
                                        className={`w-full h-14 px-6 rounded-2xl border outline-none font-bold text-lg transition ${isDark ? 'bg-[#121212] border-white/5 focus:border-purple-500' : 'bg-gray-50 border-gray-200 focus:border-purple-500'}`}
                                        placeholder="Masalan: Cambridge 1-18"
                                        value={setName}
                                        onChange={e => setSetName(e.target.value)}
                                    />
                                </div>

                                <div className={`p-6 rounded-3xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4">Tanlanganlar ({selectedTests.length})</p>
                                    <div className="max-h-[200px] overflow-y-auto custom-scrollbar space-y-2">
                                        {allTests.filter(t => selectedTests.includes(t.id)).map(t => (
                                            <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-purple-500/10 text-purple-400">
                                                <span className="text-xs font-bold truncate">{t.title}</span>
                                                <button onClick={() => handleToggleTest(t.id)}><X size={12} /></button>
                                            </div>
                                        ))}
                                        {selectedTests.length === 0 && <p className="text-xs opacity-20 italic">Hali hech narsa tanlanmadi</p>}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-4">
                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 block">Testlarni Tanlang</label>
                                <div className={`flex items-center px-4 h-11 rounded-xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                                    <Search size={14} className="mr-2 opacity-30" />
                                    <input
                                        type="text"
                                        placeholder="Qidirish..."
                                        className="bg-transparent border-none outline-none text-xs w-full font-medium"
                                        value={testSearch}
                                        onChange={e => setTestSearch(e.target.value)}
                                    />
                                </div>
                                <div className="flex-1 max-h-[350px] overflow-y-auto custom-scrollbar space-y-2 pr-2">
                                    {filteredTests.map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => handleToggleTest(t.id)}
                                            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${selectedTests.includes(t.id) ? 'bg-purple-600 border-purple-500 text-white' : (isDark ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-white border-gray-100 hover:bg-gray-50')}`}
                                        >
                                            <span className="text-xs font-bold truncate text-left">{t.title}</span>
                                            {selectedTests.includes(t.id) && <CheckCircle2 size={14} />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 mt-10">
                            <button
                                onClick={handleCreateSet}
                                disabled={isCreating || !setName || selectedTests.length === 0}
                                className={`flex-1 h-16 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-3 shadow-2xl ${(!setName || selectedTests.length === 0) ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30 active:scale-95'}`}
                            >
                                {isCreating ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus size={20} />}
                                To'plamni Saqlash
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SetsTab;
