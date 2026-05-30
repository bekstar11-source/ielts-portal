import React, { useState, useEffect } from "react";
import { Award, X, Loader2 } from "lucide-react";
import { db } from "../../../firebase/firebase";
import toast from "react-hot-toast";

export default function MockExamModal({
    isOpen,
    onClose,
    editingMock,
    collections,
    allAvailableTests,
    isDark,
    onSaved
}) {
    const [mockExamTitle, setMockExamTitle] = useState("");
    const [mockExamCollectionId, setMockExamCollectionId] = useState("");
    const [mockReadingId, setMockReadingId] = useState("");
    const [mockListeningId, setMockListeningId] = useState("");
    const [mockWritingId, setMockWritingId] = useState("");
    const [isSavingMockExam, setIsSavingMockExam] = useState(false);

    useEffect(() => {
        if (isOpen && editingMock) {
            setMockExamTitle(editingMock.title || "");
            setMockExamCollectionId(editingMock.collectionId || "");
            setMockReadingId(editingMock.subTests?.readingId || "");
            setMockListeningId(editingMock.subTests?.listeningId || "");
            setMockWritingId(editingMock.subTests?.writingId || "");
        }
    }, [isOpen, editingMock]);

    if (!isOpen) return null;

    const handleSaveMockExam = async () => {
        if (!mockExamTitle.trim()) {
            toast.error("Mock imtihon nomini kiriting!");
            return;
        }
        if (!mockReadingId || !mockListeningId || !mockWritingId) {
            toast.error("Iltimos, 3 ta fanni ham tanlang!");
            return;
        }
        setIsSavingMockExam(true);
        try {
            const { doc, writeBatch } = await import("firebase/firestore");
            
            const updatedData = {
                title: mockExamTitle.trim(),
                collectionId: mockExamCollectionId || null,
                subTests: {
                    readingId: mockReadingId,
                    listeningId: mockListeningId,
                    writingId: mockWritingId
                },
                updatedAt: new Date().toISOString()
            };

            const batch = writeBatch(db);
            batch.update(doc(db, "tests", editingMock.id), updatedData);
            batch.update(doc(db, "tests_metadata", editingMock.id), updatedData);
            await batch.commit();

            toast.success("Mock imtihon muvaffaqiyatli yangilandi! 🎉");
            onSaved();
            onClose();
        } catch (err) {
            console.error("Mock exam save error:", err);
            toast.error("Saqlashda xatolik yuz berdi: " + err.message);
        } finally {
            setIsSavingMockExam(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
                onClick={onClose} 
            />
            <div className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border ${
                isDark ? 'bg-[#1e1e1e] border-white/5 text-white' : 'bg-white border-zinc-100 text-zinc-900'
            }`}>
                <div className={`p-6 border-b flex justify-between items-center ${
                    isDark ? 'border-white/5 bg-white/5' : 'border-zinc-100 bg-zinc-50/50'
                }`}>
                    <h2 className="font-bold text-lg flex items-center gap-2">
                        <Award className={isDark ? 'text-blue-400' : 'text-blue-600'} size={20} />
                        Edit Mock Exam
                    </h2>
                    <button 
                        onClick={onClose} 
                        className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-200'}`}
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    <div>
                        <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            Mock Exam Title
                        </label>
                        <input 
                            className={`w-full border p-3 rounded-xl outline-none transition-all font-bold text-sm ${
                                isDark ? 'bg-white/5 border-white/10 focus:border-blue-500 text-white' : 'bg-zinc-50 border-zinc-200 focus:border-blue-500 text-zinc-900'
                            }`}
                            placeholder="Enter mock exam title..."
                            value={mockExamTitle}
                            onChange={e => setMockExamTitle(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            Mock Collection
                        </label>
                        <select 
                            className={`w-full border p-3 rounded-xl outline-none transition-all font-bold text-sm ${
                                isDark ? 'bg-[#2a2a2a] border-white/10 focus:border-blue-500 text-white' : 'bg-zinc-50 border-zinc-200 focus:border-blue-500 text-zinc-900'
                            }`}
                            value={mockExamCollectionId}
                            onChange={e => setMockExamCollectionId(e.target.value)}
                        >
                            <option value="">No Collection</option>
                            {(collections || []).filter(c => c.type === 'mock').map(c => (
                                <option key={c.id} value={c.id}>📁 {c.name}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="space-y-4 p-4 rounded-xl border border-dashed border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-white/5">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Linked Modules</h4>
                        <div>
                            <label className={`text-[10px] font-black uppercase tracking-widest mb-1.5 block ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                1. Reading Test
                            </label>
                            <select
                                className={`w-full border p-2.5 rounded-lg outline-none text-xs font-semibold ${
                                    isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-800'
                                }`}
                                value={mockReadingId}
                                onChange={e => setMockReadingId(e.target.value)}
                            >
                                <option value="">Select Reading Test...</option>
                                {(allAvailableTests?.reading || []).map(t => (
                                    <option key={t.id} value={t.id}>{t.title}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={`text-[10px] font-black uppercase tracking-widest mb-1.5 block ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                2. Listening Test
                            </label>
                            <select
                                className={`w-full border p-2.5 rounded-lg outline-none text-xs font-semibold ${
                                    isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-800'
                                }`}
                                value={mockListeningId}
                                onChange={e => setMockListeningId(e.target.value)}
                            >
                                <option value="">Select Listening Test...</option>
                                {(allAvailableTests?.listening || []).map(t => (
                                    <option key={t.id} value={t.id}>{t.title}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={`text-[10px] font-black uppercase tracking-widest mb-1.5 block ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                3. Writing Test
                            </label>
                            <select
                                className={`w-full border p-2.5 rounded-lg outline-none text-xs font-semibold ${
                                    isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-800'
                                }`}
                                value={mockWritingId}
                                onChange={e => setMockWritingId(e.target.value)}
                            >
                                <option value="">Select Writing Test...</option>
                                {(allAvailableTests?.writing || []).map(t => (
                                    <option key={t.id} value={t.id}>{t.title}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
                <div className="p-6 pt-0 flex gap-3 bg-transparent">
                    <button 
                        onClick={onClose} 
                        className={`px-4 py-3 font-bold text-sm rounded-xl transition-colors ${
                            isDark ? 'hover:bg-white/10 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
                        }`}
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSaveMockExam} 
                        disabled={isSavingMockExam || !mockExamTitle.trim()}
                        className={`flex-1 font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${
                            isSavingMockExam ? 'opacity-70 cursor-not-allowed' : ''
                        } ${
                            isDark ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/10' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
                        }`}
                    >
                        {isSavingMockExam && <Loader2 size={16} className="animate-spin" />}
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
