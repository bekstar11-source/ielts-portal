// src/pages/AdminTests.jsx
import React, { useState, useEffect, useMemo } from "react";
import { db, storage } from "../firebase/firebase";
import { 
    collection, 
    getDocs, 
    deleteDoc, 
    doc, 
    query, 
    orderBy, 
    onSnapshot, 
    updateDoc, 
    addDoc,
    serverTimestamp,
    limit,
    startAfter,
    writeBatch,
    getCountFromServer 
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { logAction } from "../utils/logger";
import TagSelector from "../components/ui/TagSelector";

// Icons from lucide-react
import { 
    Plus, Search, Filter, MoreVertical, Edit2, 
    Trash2, Eye, EyeOff, LayoutGrid, List, 
    ChevronRight, Loader2, Calendar, CheckCircle2, 
    MoreHorizontal, Globe, Lock, FolderPlus, 
    Folder, Hash, X, Image as ImageIcon, 
    Type, FileText, Upload, Layers, ArrowLeft,
    BookOpen, Headphones, PenTool, Mic2, Settings,
    GitMerge
} from "lucide-react";

const TEST_TYPES = ["All", "Reading", "Listening", "Writing", "Speaking"];

export default function AdminTests() {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const { user } = useAuth();
    
    const [tests, setTests] = useState([]);
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [lastVisible, setLastVisible] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [totalTestCount, setTotalTestCount] = useState(0);
    const PAGE_SIZE = 50;
    
    // UI State
    const [searchTerm, setSearchTerm] = useState("");
    const [viewMode, setViewMode] = useState("list"); // 'list' or 'grid'
    const [filterType, setFilterType] = useState("All");
    const [filterCollection, setFilterCollection] = useState("All");
    const [filterTag, setFilterTag] = useState("all");
    const [filterDifficulty, setFilterDifficulty] = useState("all");
    const [filterQuestionType, setFilterQuestionType] = useState("all");

    // Collection Management
    const [isAddingCollection, setIsAddingCollection] = useState(false);
    const [showCreateCol, setShowCreateCol] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState("");
    const [editingCol, setEditingCol] = useState(null);
    const [uploading, setUploading] = useState(false);

    // Merge State
    const [selectedTests, setSelectedTests] = useState([]);
    const [isMerging, setIsMerging] = useState(false);
    const [showMergeModal, setShowMergeModal] = useState(false);
    const [mergeTitle, setMergeTitle] = useState("");

    const fetchInitial = async () => {
        setLoading(true);
        try {
            // Fetch Tests (First Page)
            const qTests = query(
                collection(db, "tests"), 
                orderBy("createdAt", "desc"), 
                limit(PAGE_SIZE)
            );
            const snapTests = await getDocs(qTests);
            const testsData = snapTests.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(t => t.id !== "tag_metadata" && t.id !== "_tag_settings");
            
            setTests(testsData);
            setLastVisible(snapTests.docs[snapTests.docs.length - 1]);
            setHasMore(snapTests.docs.length === PAGE_SIZE);

            // Fetch Total Count
            const countSnap = await getCountFromServer(collection(db, "tests"));
            setTotalTestCount(countSnap.data().count);

            // Fetch Collections (Keep fetching all for now as they are usually few)
            const qCols = query(collection(db, "test_collections"), orderBy("createdAt", "asc"));
            const snapCols = await getDocs(qCols);
            setCollections(snapCols.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            console.error("Error fetching data:", err);
        } finally {
            setLoading(false);
        }
    };

    const loadMore = async () => {
        if (!lastVisible || loadingMore || !hasMore) return;
        setLoadingMore(true);
        try {
            const qTests = query(
                collection(db, "tests"), 
                orderBy("createdAt", "desc"), 
                startAfter(lastVisible),
                limit(PAGE_SIZE)
            );
            const snapTests = await getDocs(qTests);
            const newTests = snapTests.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(t => t.id !== "tag_metadata" && t.id !== "_tag_settings");
            
            setTests(prev => [...prev, ...newTests]);
            setLastVisible(snapTests.docs[snapTests.docs.length - 1]);
            setHasMore(snapTests.docs.length === PAGE_SIZE);
        } catch (err) {
            console.error("Error loading more tests:", err);
        } finally {
            setLoadingMore(false);
        }
    };

    useEffect(() => { fetchInitial(); }, []);

    const handleDelete = async (id, title) => {
        if (!window.confirm(`"${title}" testini o'chirishni tasdiqlaysizmi?`)) return;
        try {
            await deleteDoc(doc(db, "tests", id));
            logAction(user.uid, 'DELETE_TEST', { testId: id, title });
            setTests(prev => prev.filter(t => t.id !== id));
            setSelectedTests(prev => prev.filter(tid => tid !== id));
        } catch (err) { alert("Xato: " + err.message); }
    };

    const handleUpdateTags = async (testId, newTags) => {
        try {
            await updateDoc(doc(db, "tests", testId), { tags: newTags });
            setTests(prev => prev.map(t => t.id === testId ? { ...t, tags: newTags } : t));
        } catch (err) {
            alert("Taglarni yangilashda xatolik: " + err.message);
        }
    };

    // Collection Management Functions
    const handleCreateCollection = async () => {
        if (!newCollectionName.trim()) return;
        setLoading(true);
        try {
            await addDoc(collection(db, "test_collections"), {
                name: newCollectionName.trim(),
                description: "",
                thumbnail: "",
                createdAt: serverTimestamp()
            });
            setNewCollectionName("");
            setShowCreateCol(false);
            fetchInitial();
        } catch (err) { 
            console.error("Create collection error:", err);
            alert("Xatolik: " + err.message); 
        } finally {
            setLoading(false);
        }
    };

    const handleUploadImage = async (file) => {
        if (!file) return;
        setUploading(true);
        try {
            const path = `test_collection_covers/${Date.now()}_${file.name}`;
            const sRef = ref(storage, path);
            const uploadTask = uploadBytesResumable(sRef, file);

            uploadTask.on(
                "state_changed",
                null,
                (err) => { alert(err.message); setUploading(false); },
                async () => {
                    const url = await getDownloadURL(uploadTask.snapshot.ref);
                    setEditingCol(prev => ({ ...prev, thumbnail: url }));
                    setUploading(false);
                }
            );
        } catch (err) {
            alert(err.message);
            setUploading(false);
        }
    };

    const handleUpdateCollection = async () => {
        if (!editingCol.name.trim()) return;
        try {
            const { id, ...data } = editingCol;
            await updateDoc(doc(db, "test_collections", id), data);
            setEditingCol(null);
            fetchInitial();
        } catch (err) { alert(err.message); }
    };

    const deleteCollection = async (id) => {
        if (!window.confirm("To'plamni o'chirishni tasdiqlaysizmi?")) return;
        await deleteDoc(doc(db, "test_collections", id));
        fetchInitial();
    };

    const assignToCollection = async (testId, collectionId) => {
        try {
            await updateDoc(doc(db, "tests", testId), {
                collectionId: collectionId === 'None' ? null : collectionId
            });
            setTests(prev => prev.map(t => t.id === testId ? { ...t, collectionId: collectionId === 'None' ? null : collectionId } : t));
        } catch (err) {
            alert("Xatolik: " + err.message);
        }
    };

    const bulkAssignToCollection = async (collectionId) => {
        if (selectedTests.length === 0) return;
        setLoading(true);
        try {
            const batch = writeBatch(db);
            selectedTests.forEach(testId => {
                batch.update(doc(db, "tests", testId), { 
                    collectionId: collectionId === 'None' ? null : collectionId 
                });
            });
            await batch.commit();
            setTests(prev => prev.map(t => 
                selectedTests.includes(t.id) 
                ? { ...t, collectionId: collectionId === 'None' ? null : collectionId } 
                : t
            ));
            setSelectedTests([]);
            alert(`${selectedTests.length} ta test muvaffaqiyatli ko'chirildi!`);
        } catch (err) {
            alert("Xatolik: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Filter Logic
    const getPassageLabel = (test) => {
        if (test.passages && test.passages.length >= 3) return "Full Test";
        if (test.difficulty === 'easy') return "Passage 1";
        if (test.difficulty === 'medium') return "Passage 2";
        if (test.difficulty === 'hard') return "Passage 3";
        return null;
    };

    const getQuestionTypes = (test) => {
        if (!test.questions || !Array.isArray(test.questions)) return [];
        const seen = new Set();
        test.questions.forEach(group => {
            let type = group.type || 'Other';
            const mapping = {
                'multiple_choice': 'Multiple Choice',
                'tfng': 'TFNG',
                'true_false_not_given': 'TFNG',
                'yes_no_not_given': 'YNNG',
                'yesno': 'YNNG',
                'gap_filling': 'Gap Filling',
                'matching': 'Matching',
                'matching_headings': 'Matching Headings',
                'summary_completion': 'Summary',
                'summary_box': 'Summary (Box)',
                'table_completion': 'Table',
                'flow_chart_completion': 'Flow Chart',
                'diagram_labeling': 'Diagram',
                'sentence_completion': 'Sentence',
                'short_answer': 'Short Answer',
                'map_labeling': 'Map',
                'map': 'Map',
                'pick_two': 'Pick 2',
                'pick_three': 'Pick 3'
            };
            const displayType = mapping[type.toLowerCase()] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            seen.add(displayType);
        });
        return Array.from(seen);
    };

    const filteredTests = useMemo(() => {
        return tests.filter(t => {
            const matchesSearch = t.title?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = filterType === "All" || t.type?.toLowerCase() === filterType.toLowerCase();
            const matchesCollection = filterCollection === "All" || t.collectionId === filterCollection;
            const matchesTag = filterTag === 'all' || (t.tags && t.tags.includes(filterTag));
            const matchesDifficulty = filterDifficulty === 'all' || t.difficulty === filterDifficulty;
            const matchesQuestionType = filterQuestionType === 'all' || getQuestionTypes(t).includes(filterQuestionType);
            
            return matchesSearch && matchesType && matchesCollection && matchesTag && matchesDifficulty && matchesQuestionType;
        });
    }, [tests, searchTerm, filterType, filterCollection, filterTag, filterDifficulty, filterQuestionType]);

    const allAvailableQuestionTypes = useMemo(() => {
        const types = new Set();
        tests.forEach(test => {
            getQuestionTypes(test).forEach(t => types.add(t));
        });
        return Array.from(types).sort();
    }, [tests]);

    // Merge Logic (Preserved from original)
    const handleMergeTests = () => {
        if (selectedTests.length < 2) return alert("Kamida 2 ta testni tanlang!");
        const testObjects = selectedTests.map(id => tests.find(t => t.id === id));
        const firstType = testObjects[0]?.type;
        if (!testObjects.every(t => t && t.type === firstType)) {
            return alert("Faqat bir xil turdagi testlarni birlashtirish mumkin.");
        }
        if (firstType === 'writing' || firstType === 'speaking') {
            return alert("Hozircha faqat Reading va Listening testlarini birlashtirish mumkin.");
        }
        const autoTitle = testObjects.map(t => t.title || "Nomsiz test").join(" / ");
        setShowMergeModal(true);
        setMergeTitle(autoTitle);
    };

    const finalizeMerge = async () => {
        if (!mergeTitle.trim()) return alert("Test nomini kiriting!");
        setIsMerging(true);
        try {
            const sortedSelected = selectedTests.map(id => tests.find(t => t.id === id));
            
            let combinedPassages = [];
            let combinedQuestions = [];
            let combinedKeywords = [];
            let passageIdOffset = 0;
            let questionIdCounter = 1;

            sortedSelected.forEach((test) => {
                const passages = test.passages || [];
                const questions = test.questions || [];
                const keywords = test.keywordTable || [];

                const passageIdMap = {};
                const mappedPassages = passages.map((p, pIdx) => {
                    const newId = passageIdOffset + pIdx + 1;
                    passageIdMap[String(p.id)] = String(newId);
                    return { ...p, id: String(newId), originalId: p.id, partNumber: passageIdOffset + pIdx + 1 };
                });

                const updateRangeText = (text, min, max) => {
                    if (!text || typeof text !== 'string') return text;
                    const rangeRegex = /(Questions?\s+)\d+(?:\s*(?:[\-–]|to)\s*\d+)?/gi;
                    return text.replace(rangeRegex, (match, prefix) => `${prefix}${min}${max > min ? '–' + max : ''}`);
                };

                const mappedQuestions = questions.map(group => {
                    let groupMinId = Infinity;
                    let groupMaxId = -Infinity;

                    const updateIdCounter = (obj, field = 'id') => {
                        const idStr = String(obj[field] || "");
                        if (!idStr) return;
                        const isNumeric = /^\d+$/.test(idStr);
                        const isRange = /^\d+\s*[\-–]\s*\d+$/.test(idStr);
                        const isList = /^\d+(?:\s*,\s*\d+)+$/.test(idStr);
                        if (!isNumeric && !isRange && !isList) return;

                        let count = 1;
                        if (isRange) {
                            const parts = idStr.split(/[\-–]/);
                            const start = parseInt(parts[0].trim());
                            const end = parseInt(parts[1].trim());
                            if (!isNaN(start) && !isNaN(end)) count = Math.abs(end - start) + 1;
                        } else if (isList) {
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
                            obj[field] = isRange ? `${newIds[0]}–${newIds[newIds.length - 1]}` : newIds.join(', ');
                        } else {
                            const nextId = questionIdCounter++;
                            obj[field] = String(nextId);
                            if (nextId < groupMinId) groupMinId = nextId;
                            if (nextId > groupMaxId) groupMaxId = nextId;
                        }
                    };

                    const walkAndReindex = (obj) => {
                        if (!obj || typeof obj !== 'object') return obj;
                        if (Array.isArray(obj)) return obj.map(walkAndReindex);
                        let updated = { ...obj };
                        if (updated.passageId && passageIdMap[String(updated.passageId)]) {
                            updated.passageId = passageIdMap[String(updated.passageId)];
                        }
                        const CONTAINER_KEYS = ['items', 'questions', 'groups', 'rows', 'cells', 'parts', 'content'];
                        let hasChildrenQuestions = false;
                        for (const key of CONTAINER_KEYS) {
                            if (updated[key] && typeof updated[key] === 'object') {
                                hasChildrenQuestions = true;
                                updated[key] = walkAndReindex(updated[key]);
                            }
                        }
                        if (updated.id && !hasChildrenQuestions) updateIdCounter(updated);
                        return updated;
                    };

                    const newGroup = walkAndReindex({ ...group, passageId: passageIdMap[String(group.passageId)] || group.passageId });
                    if (groupMinId !== Infinity && groupMaxId !== -Infinity) {
                        const currentId = String(newGroup.id || "");
                        if (/^\d+([\-–]\d+)?$/.test(currentId) || (!currentId && (group.items?.length || group.questions?.length))) {
                            newGroup.id = groupMaxId > groupMinId ? `${groupMinId}–${groupMaxId}` : String(groupMinId);
                        }
                    }
                    if (groupMinId !== Infinity) {
                        if (newGroup.instruction) newGroup.instruction = updateRangeText(newGroup.instruction, groupMinId, groupMaxId);
                        if (newGroup.text) newGroup.text = updateRangeText(newGroup.text, groupMinId, groupMaxId);
                    }
                    return newGroup;
                });

                combinedPassages = [...combinedPassages, ...mappedPassages];
                combinedQuestions = [...combinedQuestions, ...mappedQuestions];
                combinedKeywords = [...combinedKeywords, ...keywords.map(kw => ({ ...kw, passageId: passageIdMap[String(kw.passageId)] || kw.passageId }))];
                passageIdOffset += passages.length;
            });

            const newTestData = {
                title: mergeTitle,
                type: sortedSelected[0]?.type,
                difficulty: "medium",
                passages: combinedPassages,
                questions: combinedQuestions,
                keywordTable: combinedKeywords,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const cleanObject = (obj) => {
                if (obj === null || obj === undefined) return undefined;
                if (typeof obj !== 'object') return obj;
                if (Array.isArray(obj)) return obj.map(cleanObject).filter(v => v !== undefined);
                const cleaned = {};
                Object.keys(obj).forEach(k => {
                    const v = cleanObject(obj[k]);
                    if (v !== undefined) cleaned[k] = v;
                });
                return cleaned;
            };

            const docRef = await addDoc(collection(db, "tests"), cleanObject(newTestData));
            logAction(user.uid, 'MERGE_TESTS', { newTestId: docRef.id, mergedFrom: selectedTests });
            alert("Testlar birlashtirildi!");
            fetchInitial();
            setSelectedTests([]);
            setShowMergeModal(false);
        } catch (err) {
            alert("Xatolik: " + err.message);
        } finally {
            setIsMerging(false);
        }
    };

    return (
        <div className={`h-screen flex font-sans transition-colors duration-200 overflow-hidden relative ${isDark ? 'bg-[#121212] text-white' : 'bg-[#f5f5f7] text-zinc-900'}`}>
            
            {/* CREATE COLLECTION MODAL */}
            {showCreateCol && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCreateCol(false)} />
                    <div className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 ${isDark ? 'bg-[#1E1E1E] border border-white/10' : 'bg-white'}`}>
                        <div className={`p-6 border-b flex justify-between items-center ${isDark ? 'border-white/5 bg-white/5' : 'border-zinc-100 bg-zinc-50/50'}`}>
                            <h2 className="font-bold text-lg flex items-center gap-2">
                                <Plus className="text-blue-500" size={20} /> Create New Collection
                            </h2>
                            <button onClick={() => setShowCreateCol(false)} className="p-2 hover:bg-black/10 rounded-full transition-colors"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Collection Name</label>
                                <input 
                                    autoFocus
                                    className={`w-full border p-3 rounded-xl outline-none transition-all font-bold text-sm ${isDark ? 'bg-white/5 border-white/10 focus:border-blue-500' : 'bg-zinc-50 border-zinc-200 focus:border-blue-500'}`}
                                    placeholder="Enter collection name..."
                                    value={newCollectionName}
                                    onChange={e => setNewCollectionName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleCreateCollection()}
                                />
                            </div>
                        </div>
                        <div className="p-6 pt-0 flex gap-3">
                            <button onClick={() => setShowCreateCol(false)} className={`flex-1 py-3 font-bold text-sm rounded-xl transition-colors ${isDark ? 'hover:bg-white/5 text-zinc-400' : 'hover:bg-zinc-50 text-zinc-500'}`}>Cancel</button>
                            <button 
                                onClick={handleCreateCollection} 
                                disabled={!newCollectionName.trim() || loading}
                                className="flex-[2] bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
                            >
                                {loading ? "Creating..." : "Create Collection"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* COLLECTION EDIT MODAL */}
            {editingCol && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditingCol(null)} />
                    <div className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 ${isDark ? 'bg-[#1E1E1E] border border-white/10' : 'bg-white'}`}>
                        <div className={`p-6 border-b flex justify-between items-center ${isDark ? 'border-white/5 bg-white/5' : 'border-zinc-100 bg-zinc-50/50'}`}>
                            <h2 className="font-bold text-lg flex items-center gap-2">
                                <Folder className="text-blue-500" size={20} /> Edit Collection
                            </h2>
                            <button onClick={() => setEditingCol(null)} className="p-2 hover:bg-black/10 rounded-full transition-colors"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Collection Name</label>
                                <input 
                                    className={`w-full border p-3 rounded-xl outline-none transition-all font-bold text-sm ${isDark ? 'bg-white/5 border-white/10 focus:border-blue-500' : 'bg-zinc-50 border-zinc-200 focus:border-blue-500'}`}
                                    value={editingCol.name}
                                    onChange={e => setEditingCol({ ...editingCol, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Cover Image</label>
                                <div className="flex gap-3">
                                    <div className="flex-1 space-y-2">
                                        <input 
                                            className={`w-full border p-3 rounded-xl outline-none transition-all text-xs ${isDark ? 'bg-white/5 border-white/10' : 'bg-zinc-50 border-zinc-200'}`}
                                            placeholder="Image URL..."
                                            value={editingCol.thumbnail || ""}
                                            onChange={e => setEditingCol({ ...editingCol, thumbnail: e.target.value })}
                                        />
                                        <div className="relative">
                                            <input type="file" id="col-upload" hidden accept="image/*" onChange={e => handleUploadImage(e.target.files[0])} />
                                            <label htmlFor="col-upload" className={`flex items-center justify-center gap-2 w-full py-2 border border-dashed rounded-xl text-xs font-bold cursor-pointer transition-all ${isDark ? 'border-white/20 text-zinc-500 hover:border-blue-500' : 'border-zinc-300 text-zinc-500 hover:border-blue-500'}`}>
                                                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                                {uploading ? "Uploading..." : "Upload Cover"}
                                            </label>
                                        </div>
                                    </div>
                                    <div className={`w-24 h-24 rounded-xl shrink-0 overflow-hidden shadow-inner border ${isDark ? 'bg-white/5 border-white/10' : 'bg-zinc-100 border-zinc-200'}`}>
                                        {editingCol.thumbnail ? <img src={editingCol.thumbnail} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-zinc-300"><ImageIcon size={24} /></div>}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 pt-0 flex gap-3">
                            <button onClick={() => deleteCollection(editingCol.id)} className="px-4 py-3 text-rose-500 font-bold text-sm hover:bg-rose-50 rounded-xl transition-colors">Delete</button>
                            <button onClick={handleUpdateCollection} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MERGE MODAL */}
            {showMergeModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMergeModal(false)} />
                    <div className={`relative w-full max-w-md rounded-[24px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border ${isDark ? 'bg-[#1E1E1E] border-white/10' : 'bg-white border-gray-100'}`}>
                        <div className="p-6">
                            <h3 className="text-xl font-bold mb-2">Merge Tests</h3>
                            <p className={`text-sm mb-6 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                Selected {selectedTests.length} tests will be combined into one. Enter a title:
                            </p>
                            <input 
                                className={`w-full border p-3 rounded-xl outline-none transition-all text-sm mb-4 ${isDark ? 'bg-white/5 border-white/10 focus:border-blue-500' : 'bg-zinc-50 border-zinc-200 focus:border-blue-500'}`}
                                placeholder="e.g. Full Reading Mock #1"
                                value={mergeTitle}
                                onChange={e => setMergeTitle(e.target.value)}
                            />
                            <div className={`p-4 rounded-xl border mb-6 ${isDark ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-100 text-blue-700'}`}>
                                <p className="text-[11px] font-medium leading-relaxed">
                                    💡 <b>Info:</b> Passages and questions will appear in the order you selected them. Original tests will not be deleted.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setShowMergeModal(false)} className={`flex-1 py-3 font-bold rounded-xl transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-zinc-100 hover:bg-zinc-200'}`}>Cancel</button>
                                <button onClick={finalizeMerge} disabled={isMerging || !mergeTitle.trim()} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50">
                                    {isMerging ? <Loader2 size={18} className="animate-spin mx-auto" /> : "Merge Tests"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SIDEBAR */}
            <aside className={`w-64 border-r flex flex-col shrink-0 overflow-y-auto transition-colors ${isDark ? 'bg-[#181818] border-white/5' : 'bg-[#fbfbfb] border-zinc-200'}`}>
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-8">
                        <button onClick={() => navigate("/admin")} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-zinc-200'}`}><ArrowLeft size={18} /></button>
                        <h1 className="text-xl font-bold tracking-tight">Tests</h1>
                    </div>
                    
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3 px-2 flex justify-between items-center">
                                Collections
                                <button onClick={() => setShowCreateCol(true)} className="hover:text-blue-500 transition-colors">
                                    <Plus size={12} />
                                </button>
                            </h3>
                            <nav className="space-y-0.5">
                                <button 
                                    onClick={() => setFilterCollection("All")}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-semibold transition-colors ${filterCollection === 'All' ? (isDark ? 'bg-white/10 text-white' : 'bg-zinc-200 text-zinc-900') : 'text-zinc-500 hover:bg-black/5'}`}
                                >
                                    <span className="flex items-center gap-3">
                                        <Folder size={16} /> All Tests
                                    </span>
                                    {!loading && totalTestCount > 0 && (
                                        <span className="text-[10px] font-bold opacity-40">{totalTestCount}</span>
                                    )}
                                </button>
                                {collections.map(c => (
                                    <div key={c.id} className="group relative">
                                        <button 
                                            onClick={() => setFilterCollection(c.id)}
                                            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-semibold transition-colors ${filterCollection === c.id ? (isDark ? 'bg-white/10 text-white' : 'bg-zinc-200 text-zinc-900') : 'text-zinc-500 hover:bg-black/5'}`}
                                        >
                                            <span className="flex items-center gap-3 truncate pr-10">
                                                <div className={`w-5 h-5 rounded overflow-hidden shrink-0 flex items-center justify-center border ${isDark ? 'bg-white/5 border-white/10' : 'bg-zinc-200 border-black/5'}`}>
                                                    {c.thumbnail ? <img src={c.thumbnail} className="w-full h-full object-cover" /> : <Folder size={12} className="text-zinc-400" />}
                                                </div>
                                                {c.name}
                                            </span>
                                            {/* We only show loaded count here as per-collection server count is expensive, but for "All" we show real total */}
                                        </button>
                                        <div className={`absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex items-center transition-all pl-4 ${isDark ? 'bg-gradient-to-l from-[#181818] via-[#181818]' : 'bg-gradient-to-l from-[#fbfbfb] via-[#fbfbfb]'} to-transparent`}>
                                            <button onClick={(e) => { e.stopPropagation(); setEditingCol(c); }} className="p-1.5 hover:text-blue-500 transition-colors"><Edit2 size={12} /></button>
                                        </div>
                                    </div>
                                ))}
                                {isAddingCollection && (
                                    <div className="px-2 py-2">
                                        <input 
                                            autoFocus
                                            className={`w-full px-2 py-1 rounded text-xs outline-none border ${isDark ? 'bg-white/5 border-white/10 focus:border-blue-500' : 'bg-white border-zinc-200 focus:border-blue-500'}`}
                                            placeholder="Name..."
                                            value={newCollectionName}
                                            onChange={e => setNewCollectionName(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleCreateCollection()}
                                            onBlur={() => !newCollectionName && setIsAddingCollection(false)}
                                        />
                                    </div>
                                )}
                            </nav>
                        </div>

                        <div>
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3 px-2">Module Type</h3>
                            <nav className="space-y-0.5">
                                {TEST_TYPES.map(type => (
                                    <button 
                                        key={type}
                                        onClick={() => setFilterType(type)}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-semibold transition-colors ${filterType === type ? (isDark ? 'bg-white/10 text-white' : 'bg-zinc-200 text-zinc-900') : 'text-zinc-500 hover:bg-black/5'}`}
                                    >
                                        <span className="flex items-center gap-3">
                                            {type === 'Reading' ? <BookOpen size={16} /> : 
                                             type === 'Listening' ? <Headphones size={16} /> : 
                                             type === 'Writing' ? <PenTool size={16} /> : 
                                             type === 'Speaking' ? <Mic2 size={16} /> : <Layers size={16} />}
                                            {type}
                                        </span>
                                        <span className="text-[10px] font-bold opacity-40">
                                            {type === 'All' 
                                                ? (!loading ? totalTestCount : tests.length)
                                                : tests.filter(t => t.type?.toLowerCase() === type.toLowerCase()).length
                                            }
                                        </span>
                                    </button>
                                ))}
                            </nav>
                        </div>

                        <div>
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3 px-2">Filters</h3>
                            <div className="px-3 space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold uppercase text-zinc-500">Difficulty / Part</label>
                                    <select 
                                        className={`w-full bg-transparent border-b text-xs py-1 outline-none transition-colors ${isDark ? 'border-white/10 focus:border-blue-500' : 'border-zinc-200 focus:border-blue-500'}`}
                                        value={filterDifficulty}
                                        onChange={e => setFilterDifficulty(e.target.value)}
                                    >
                                        <option value="all">All Difficulty</option>
                                        <option value="easy">Passage 1 / Easy</option>
                                        <option value="medium">Passage 2 / Medium</option>
                                        <option value="hard">Passage 3 / Hard</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold uppercase text-zinc-500">Question Type</label>
                                    <select 
                                        className={`w-full bg-transparent border-b text-xs py-1 outline-none transition-colors ${isDark ? 'border-white/10 focus:border-blue-500' : 'border-zinc-200 focus:border-blue-500'}`}
                                        value={filterQuestionType}
                                        onChange={e => setFilterQuestionType(e.target.value)}
                                    >
                                        <option value="all">All Savol Turlari</option>
                                        {allAvailableQuestionTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold uppercase text-zinc-500">Tag / Hashtag</label>
                                    <div className="flex items-center gap-2">
                                        <Hash size={12} className="text-zinc-400" />
                                        <input 
                                            className={`w-full bg-transparent text-xs py-1 outline-none border-b ${isDark ? 'border-white/10' : 'border-zinc-200'}`}
                                            placeholder="Filter by tag..."
                                            value={filterTag === 'all' ? '' : filterTag}
                                            onChange={e => setFilterTag(e.target.value || 'all')}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col overflow-hidden">
                
                {/* TOOLBAR */}
                <header className={`h-16 border-b flex items-center justify-between px-6 shrink-0 transition-colors ${isDark ? 'bg-[#1e1e1e] border-white/5' : 'bg-white border-zinc-200'}`}>
                    <div className="flex items-center gap-4 flex-1">
                        <div className={`flex p-1 rounded-lg ${isDark ? 'bg-white/5' : 'bg-zinc-100'}`}>
                            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? (isDark ? 'bg-white/10 text-white' : 'bg-white shadow-sm text-zinc-900') : 'text-zinc-400 hover:text-zinc-600'}`}><LayoutGrid size={16} /></button>
                            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? (isDark ? 'bg-white/10 text-white' : 'bg-white shadow-sm text-zinc-900') : 'text-zinc-400 hover:text-zinc-600'}`}><List size={16} /></button>
                        </div>
                        <div className="relative w-full max-w-sm group">
                            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${isDark ? 'text-zinc-600 group-focus-within:text-blue-500' : 'text-zinc-400 group-focus-within:text-blue-500'}`} size={14} />
                            <input 
                                type="text"
                                placeholder="Search tests..."
                                className={`w-full border-none pl-9 pr-4 py-1.5 rounded-lg text-sm outline-none transition-all ${isDark ? 'bg-white/5 focus:bg-white/10 text-white' : 'bg-zinc-100 focus:bg-zinc-200/50'}`}
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {selectedTests.length > 0 && (
                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="relative group">
                                    <button className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${isDark ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/20' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>
                                        <FolderPlus size={14} /> Move to Collection
                                    </button>
                                    <div className={`absolute top-full right-0 mt-2 w-56 rounded-xl shadow-2xl border p-2 z-[60] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 ${isDark ? 'bg-[#2A2A2A] border-white/10' : 'bg-white border-zinc-100'}`}>
                                        <button onClick={() => bulkAssignToCollection('None')} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-zinc-50 text-zinc-600'}`}>None (Remove)</button>
                                        {collections.map(c => (
                                            <button key={c.id} onClick={() => bulkAssignToCollection(c.id)} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-zinc-50 text-zinc-600'}`}>{c.name}</button>
                                        ))}
                                    </div>
                                </div>

                                {selectedTests.length >= 2 && (
                                    <button 
                                        onClick={handleMergeTests}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${isDark ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-900/20' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                                    >
                                        <GitMerge size={14} /> Merge ({selectedTests.length})
                                    </button>
                                )}
                                <div className="h-8 w-px bg-zinc-200 dark:bg-white/10 mx-1" />
                            </div>
                        )}
                        <button onClick={() => navigate("/admin/create-test")} className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 ${isDark ? 'bg-white text-zinc-900 hover:bg-zinc-200' : 'bg-zinc-900 text-white hover:bg-zinc-800'}`}>
                            <Plus size={14} /> Create Test
                        </button>
                    </div>
                </header>

                {/* CONTENT LISTING */}
                <main className={`flex-1 overflow-y-auto p-6 transition-colors ${isDark ? 'bg-[#121212]' : 'bg-white'}`}>
                    {loading ? (
                        <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={32} /></div>
                    ) : filteredTests.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-zinc-300">
                            <FileText size={64} strokeWidth={1} />
                            <p className="mt-4 text-sm font-bold">No tests found</p>
                        </div>
                    ) : viewMode === 'list' ? (
                        /* LIST VIEW */
                        <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-white/5 bg-[#1e1e1e]' : 'border-zinc-200 bg-white'}`}>
                            <table className="w-full border-collapse text-left">
                                <thead className={`border-b text-[10px] font-semibold uppercase tracking-widest transition-colors ${isDark ? 'bg-white/5 border-white/5 text-zinc-500' : 'bg-zinc-50 border-zinc-100 text-zinc-400'}`}>
                                    <tr>
                                        <th className="py-3 px-4 w-4">
                                            <input 
                                                type="checkbox" 
                                                className="rounded border-zinc-300 text-blue-600"
                                                checked={filteredTests.length > 0 && filteredTests.every(t => selectedTests.includes(t.id))}
                                                onChange={e => setSelectedTests(e.target.checked ? filteredTests.map(t => t.id) : [])}
                                            />
                                        </th>
                                        <th className="py-3 px-2 font-semibold">Test Title</th>
                                        <th className="py-3 px-2 font-semibold">Type</th>
                                        <th className="py-3 px-2 font-semibold">Collection</th>
                                        <th className="py-3 px-2 font-semibold">Tags</th>
                                        <th className="py-3 px-2 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-zinc-50'}`}>
                                    {filteredTests.map(t => (
                                        <tr key={t.id} className={`group hover:bg-black/5 transition-colors ${selectedTests.includes(t.id) ? (isDark ? 'bg-blue-500/10' : 'bg-blue-50') : ''}`}>
                                            <td className="py-3 px-4">
                                                <input 
                                                    type="checkbox" 
                                                    className="rounded border-zinc-300 text-blue-600"
                                                    checked={selectedTests.includes(t.id)}
                                                    onChange={() => setSelectedTests(prev => prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id])}
                                                />
                                            </td>
                                            <td className="py-3 px-2">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-zinc-100 border-zinc-200'}`}>
                                                        {t.type === 'reading' ? <BookOpen size={14} className="text-blue-500" /> : 
                                                         t.type === 'listening' ? <Headphones size={14} className="text-purple-500" /> : 
                                                         t.type === 'writing' ? <PenTool size={14} className="text-yellow-500" /> : <Mic2 size={14} className="text-emerald-500" />}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-semibold line-clamp-1">{t.title || "Untitled"}</div>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className="text-[10px] font-semibold uppercase text-zinc-400 tracking-tight">
                                                                    {getPassageLabel(t) && <span className="mr-2 text-blue-500/80">{getPassageLabel(t)} •</span>}
                                                                    {(() => {
                                                                        if (!t.questions || !Array.isArray(t.questions)) return 0;
                                                                        let total = 0;
                                                                        t.questions.forEach(g => {
                                                                            const idStr = String(g.id || "");
                                                                            const nums = idStr.match(/\d+/g);
                                                                            if (nums && nums.length >= 2 && (idStr.includes('-') || idStr.includes('–'))) {
                                                                                total += Math.abs(parseInt(nums[nums.length - 1]) - parseInt(nums[0])) + 1;
                                                                            } else if (nums && nums.length > 0) {
                                                                                total += nums.length;
                                                                            } else if (g.items) {
                                                                                total += g.items.length;
                                                                            } else {
                                                                                total += 1;
                                                                            }
                                                                        });
                                                                        return total;
                                                                    })()} Questions
                                                                </span>
                                                            {getQuestionTypes(t).slice(0, 2).map((qt, i) => (
                                                                <span key={i} className="text-[9px] font-semibold text-blue-500 bg-blue-500/10 px-1 rounded">{qt}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-2">
                                                <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                                                    t.type === 'reading' ? 'bg-blue-100 text-blue-600' :
                                                    t.type === 'listening' ? 'bg-purple-100 text-purple-600' :
                                                    'bg-zinc-100 text-zinc-600'
                                                }`}>
                                                    {t.type}
                                                </span>
                                            </td>
                                            <td className="py-3 px-2">
                                                <select 
                                                    className={`bg-transparent border-none text-[10px] font-bold uppercase tracking-tight outline-none cursor-pointer hover:text-blue-500 transition-colors appearance-none ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}
                                                    value={t.collectionId || "None"}
                                                    onChange={(e) => assignToCollection(t.id, e.target.value)}
                                                >
                                                    <option value="None">📦 No Collection</option>
                                                    {collections.map(c => <option key={c.id} value={c.id}>📁 {c.name}</option>)}
                                                </select>
                                            </td>
                                            <td className="py-3 px-2">
                                                <div className="flex flex-wrap gap-1 max-w-[150px]">
                                                    {t.tags?.slice(0, 3).map((tag, i) => (
                                                        <span key={i} className="text-[9px] font-bold text-zinc-400 bg-black/5 px-1.5 py-0.5 rounded">#{tag}</span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => navigate(`/admin/edit-test/${t.id}`)} className={`p-2 rounded-md border transition-all ${isDark ? 'hover:bg-white/5 border-transparent hover:border-white/10 text-zinc-400 hover:text-white' : 'hover:bg-zinc-50 border-transparent hover:border-zinc-200 text-zinc-400 hover:text-zinc-900'}`}><Edit2 size={14} /></button>
                                                    <button onClick={() => window.open(`/test/${t.id}`, '_blank')} className={`p-2 rounded-md border transition-all ${isDark ? 'hover:bg-white/5 border-transparent hover:border-white/10 text-zinc-400 hover:text-white' : 'hover:bg-zinc-50 border-transparent hover:border-zinc-200 text-zinc-400 hover:text-zinc-900'}`}><Eye size={14} /></button>
                                                    <button onClick={() => handleDelete(t.id, t.title)} className={`p-2 rounded-md border transition-all ${isDark ? 'hover:bg-white/5 border-transparent hover:border-white/10 text-zinc-400 hover:text-rose-500' : 'hover:bg-rose-50 border-transparent hover:border-zinc-200 text-zinc-300 hover:text-rose-600'}`}><Trash2 size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        /* GRID VIEW */
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                            {filteredTests.map(t => (
                                <div key={t.id} className={`group border rounded-2xl p-4 transition-all hover:shadow-xl hover:shadow-blue-500/5 ${isDark ? 'bg-[#1e1e1e] border-white/5 hover:border-blue-500/50' : 'bg-white border-zinc-200 hover:border-blue-500/50'}`}>
                                    <div className={`aspect-[4/3] rounded-xl mb-4 relative overflow-hidden border ${isDark ? 'bg-white/5 border-white/10' : 'bg-zinc-50 border-zinc-100'}`}>
                                        <div className="w-full h-full flex items-center justify-center opacity-20 group-hover:opacity-40 transition-opacity">
                                            {t.type === 'reading' ? <BookOpen size={48} /> : 
                                             t.type === 'listening' ? <Headphones size={48} /> : 
                                             t.type === 'writing' ? <PenTool size={48} /> : <Mic2 size={48} />}
                                        </div>
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2">
                                            <button onClick={() => navigate(`/admin/edit-test/${t.id}`)} className="p-2 bg-white text-zinc-900 rounded-lg shadow-xl hover:text-blue-600 active:scale-95"><Edit2 size={14} /></button>
                                            <button onClick={() => handleDelete(t.id, t.title)} className="p-2 bg-white text-rose-500 rounded-lg shadow-xl hover:bg-rose-50 active:scale-95"><Trash2 size={14} /></button>
                                        </div>
                                        <div className="absolute bottom-2 left-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <select 
                                                className="w-full bg-black/60 backdrop-blur-md text-white text-[9px] font-bold uppercase p-1.5 rounded-md outline-none cursor-pointer"
                                                value={t.collectionId || "None"}
                                                onChange={(e) => assignToCollection(t.id, e.target.value)}
                                            >
                                                <option value="None">📦 No Collection</option>
                                                {collections.map(c => <option key={c.id} value={c.id}>📁 {c.name}</option>)}
                                            </select>
                                        </div>
                                        {selectedTests.includes(t.id) && (
                                            <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center">
                                                <div className="bg-blue-600 text-white rounded-full p-1 shadow-lg"><CheckCircle2 size={24} /></div>
                                            </div>
                                        )}
                                        <button 
                                            onClick={() => setSelectedTests(prev => prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id])}
                                            className="absolute inset-0"
                                        />
                                    </div>
                                    <div className="p-4">
                                        <h3 className="text-sm font-semibold mb-3 line-clamp-2 min-h-[40px] leading-snug">{t.title || "Untitled"}</h3>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-semibold uppercase text-zinc-400 tracking-wider">
                                                {getPassageLabel(t) && <span className="text-blue-500 font-bold mr-1.5">{getPassageLabel(t)}</span>}
                                                {getPassageLabel(t) && <span className="mr-1.5">•</span>}
                                                {(() => {
                                                    if (!t.questions || !Array.isArray(t.questions)) return 0;
                                                    let total = 0;
                                                    t.questions.forEach(g => {
                                                        const idStr = String(g.id || "");
                                                        const nums = idStr.match(/\d+/g);
                                                        if (nums && nums.length >= 2 && (idStr.includes('-') || idStr.includes('–'))) {
                                                            total += Math.abs(parseInt(nums[nums.length - 1]) - parseInt(nums[0])) + 1;
                                                        } else if (nums && nums.length > 0) {
                                                            total += nums.length;
                                                        } else if (g.items) {
                                                            total += g.items.length;
                                                        } else {
                                                            total += 1;
                                                        }
                                                    });
                                                    return total;
                                                })()} Questions
                                            </span>
                                            <span className={`w-2 h-2 rounded-full ${t.type === 'reading' ? 'bg-blue-500' : 'bg-purple-500'}`}></span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Pagination - Load More */}
                    {hasMore && (
                        <div className="mt-8 mb-12 flex justify-center">
                            <button 
                                onClick={loadMore}
                                disabled={loadingMore}
                                className={`px-10 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-lg ${
                                    isDark 
                                    ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-900/20' 
                                    : 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-zinc-900/20'
                                } active:scale-95 disabled:opacity-50`}
                            >
                                {loadingMore ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Loading...
                                    </>
                                ) : (
                                    <>
                                        More Tests
                                        <ChevronRight size={16} />
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}