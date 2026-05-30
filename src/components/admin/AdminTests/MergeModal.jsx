import React, { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { db } from "../../../firebase/firebase";
import toast from "react-hot-toast";

export default function MergeModal({
    isOpen,
    onClose,
    selectedTests,
    tests,
    isDark,
    onSaved
}) {
    const [mergeTitle, setMergeTitle] = useState("");
    const [isMerging, setIsMerging] = useState(false);

    useEffect(() => {
        if (isOpen && selectedTests.length >= 2) {
            const selectedObjects = tests.filter(t => selectedTests.includes(t.id));
            const defaultTitle = "Merged: " + selectedObjects.map(t => t.title || "Untitled").join(" + ");
            setMergeTitle(defaultTitle);
        }
    }, [isOpen, selectedTests, tests]);

    if (!isOpen) return null;

    const handleMergeConfirm = async () => {
        if (!mergeTitle.trim()) {
            toast.error("Birlashtirilgan test nomini kiriting!");
            return;
        }
        setIsMerging(true);
        try {
            const selectedObjects = tests.filter(t => selectedTests.includes(t.id));
            const { mergeTestsLogic } = await import("../../../utils/TestUtils");
            const mergedPayload = mergeTestsLogic(selectedObjects, mergeTitle.trim());

            const { writeBatch, doc, collection } = await import("firebase/firestore");
            const { getQuestionTypesFromQuestions, getPassageOrPartNum } = await import("../CreateTest/CreateTestUtils");

            const batch = writeBatch(db);
            const testDocRef = doc(collection(db, "tests"));
            const newTestId = testDocRef.id;

            let duration = Number(mergedPayload.duration) || 30;
            if (mergedPayload.type === 'listening') {
                duration = 30;
            } else if (mergedPayload.type === 'reading') {
                duration = 60;
            }

            const metadata = {
                id: newTestId,
                title: mergedPayload.title || "",
                type: mergedPayload.type || "reading",
                difficulty: mergedPayload.difficulty || "medium",
                duration: duration,
                audioUrl: mergedPayload.audioUrl || mergedPayload.audio_url || "",
                isExclusive: mergedPayload.isExclusive || false,
                createdAt: mergedPayload.createdAt,
                updatedAt: mergedPayload.updatedAt,
                questionTypes: getQuestionTypesFromQuestions(mergedPayload.questions || []),
                collectionId: mergedPayload.collectionId && mergedPayload.collectionId !== "None" ? mergedPayload.collectionId : null,
            };

            if (mergedPayload.type === 'listening') {
                const parts = {};
                (mergedPayload.passages || []).forEach((passage, idx) => {
                    const partNum = getPassageOrPartNum(passage, idx, 'listening', mergedPayload.questions || []);
                    const partKey = `part${partNum}`;
                    const passageQuestions = (mergedPayload.questions || []).filter(
                        q => String(q.passageId) === String(passage.id)
                    );
                    const qTypes = Array.from(new Set(
                        passageQuestions.map(q => q.type).filter(Boolean)
                    ));
                    const formattedQTypes = qTypes.map(t => {
                        const lower = t.toLowerCase();
                        if (lower.includes('multiple_choice') || lower.includes('multi_choice') || lower.includes('selection')) return 'Multiple Choice';
                        if (lower.includes('table')) return 'Table Completion';
                        if (lower.includes('note') || lower.includes('gap_fill') || lower.includes('sentence') || lower.includes('summary') || lower.includes('form')) return 'Completion';
                        if (lower.includes('flow_chart') || lower.includes('flowchart')) return 'Flow Chart';
                        if (lower.includes('map_labeling') || lower.includes('diagram')) return 'Map/Diagram';
                        if (lower.includes('short_answer')) return 'Short Answer';
                        return t.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                    });
                    parts[partKey] = {
                        id: passage.id !== undefined ? String(passage.id) : `part-${partNum}`,
                        title: passage.title || `Part ${partNum}`,
                        difficulty: passage.difficulty || mergedPayload.difficulty || "medium",
                        qTypes: Array.from(new Set(formattedQTypes)),
                        startSec: passage.startTime !== undefined && passage.startTime !== null ? Number(passage.startTime) : 0,
                        endSec: passage.endTime !== undefined && passage.endTime !== null ? Number(passage.endTime) : 0,
                        audioUrl: passage.audio || mergedPayload.audio_url || ""
                    };
                });
                metadata.parts = parts;
            } else if (mergedPayload.type === 'reading') {
                const passages = {};
                (mergedPayload.passages || []).forEach((passage, idx) => {
                    const passNum = getPassageOrPartNum(passage, idx, 'reading', mergedPayload.questions || []);
                    const passKey = `passage${passNum}`;
                    const passageQuestions = (mergedPayload.questions || []).filter(
                        q => String(q.passageId) === String(passage.id)
                    );
                    const qTypes = Array.from(new Set(
                        passageQuestions.map(q => q.type).filter(Boolean)
                    ));
                    const formattedQTypes = qTypes.map(t => {
                        const lower = t.toLowerCase();
                        if (lower.includes('multiple_choice') || lower.includes('multi_choice') || lower.includes('selection')) return 'Multiple Choice';
                        if (lower.includes('matching_headings')) return 'Matching Headings';
                        if (lower.includes('true_false') || lower.includes('yes_no')) return 'TFNG/YNNG';
                        if (lower.includes('matching')) return 'Matching';
                        if (lower.includes('table')) return 'Table Completion';
                        if (lower.includes('note') || lower.includes('gap_fill') || lower.includes('sentence') || lower.includes('summary')) return 'Completion';
                        return t.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                    });
                    passages[passKey] = {
                        id: passage.id !== undefined ? String(passage.id) : `passage-${passNum}`,
                        title: passage.title || `Passage ${passNum}`,
                        difficulty: passage.difficulty || mergedPayload.difficulty || "medium",
                        qTypes: Array.from(new Set(formattedQTypes))
                    };
                });
                metadata.passages = passages;
            }

            const metadataDocRef = doc(db, "tests_metadata", newTestId);
            batch.set(testDocRef, mergedPayload);
            batch.set(metadataDocRef, metadata);
            await batch.commit();

            toast.success("Testlar muvaffaqiyatli birlashtirildi! 🎉");
            onSaved();
            onClose();
        } catch (err) {
            console.error("Merge error:", err);
            toast.error("Birlashtirishda xatolik yuz berdi: " + err.message);
        } finally {
            setIsMerging(false);
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
                        <span className={isDark ? 'text-emerald-400' : 'text-emerald-600'}>🔗</span>
                        Merge {selectedTests.length} tests
                    </h2>
                    <button 
                        onClick={onClose} 
                        className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-200'}`}
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    <div>
                        <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            Merged Test Title
                        </label>
                        <input 
                            className={`w-full border p-3 rounded-xl outline-none transition-all font-bold text-sm ${
                                isDark ? 'bg-white/5 border-white/10 focus:border-blue-500 text-white' : 'bg-zinc-50 border-zinc-200 focus:border-blue-500 text-zinc-900'
                            }`}
                            placeholder="Enter title for the merged test..."
                            value={mergeTitle}
                            onChange={e => setMergeTitle(e.target.value)}
                        />
                    </div>
                </div>
                <div className={`p-6 pt-0 flex gap-3 ${isDark ? 'bg-[#1e1e1e]' : 'bg-white'}`}>
                    <button 
                        onClick={onClose} 
                        className={`px-4 py-3 font-bold text-sm rounded-xl transition-colors ${
                            isDark ? 'hover:bg-white/10 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
                        }`}
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleMergeConfirm} 
                        disabled={isMerging || !mergeTitle.trim()}
                        className={`flex-1 font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${
                            isMerging ? 'opacity-70 cursor-not-allowed' : ''
                        } ${
                            isDark ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/10' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                        }`}
                    >
                        {isMerging && <Loader2 size={16} className="animate-spin" />}
                        Merge Tests
                    </button>
                </div>
            </div>
        </div>
    );
}
