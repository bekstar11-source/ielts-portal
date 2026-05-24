import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../../firebase/firebase";

// Hooks & Components
import { useAdminTests } from "../../hooks/useAdminTests";
import AdminTestsSidebar from "../../components/admin/AdminTests/AdminTestsSidebar";
import AdminTestsToolbar from "../../components/admin/AdminTests/AdminTestsToolbar";
import AdminTestsList from "../../components/admin/AdminTests/AdminTestsList";
import Pagination from "../../components/common/Pagination";
import { Loader2, Folder, X, Image as ImageIcon, Upload, Trash2, FolderPlus } from "lucide-react";

export default function AdminTests() {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    
    // UI State
    const [searchTerm, setSearchTerm] = useState("");
    const [viewMode, setViewMode] = useState("list");
    const [filterType, setFilterType] = useState("All");
    const [filterCollection, setFilterCollection] = useState("All");
    const [selectedTests, setSelectedTests] = useState([]);

    // Collection Modal State
    const [collectionModalOpen, setCollectionModalOpen] = useState(false);
    const [editingCol, setEditingCol] = useState(null); // If null, we are adding. If object, we are editing.
    const [colName, setColName] = useState("");
    const [colThumbnail, setColThumbnail] = useState("");
    const [colType, setColType] = useState("reading");
    const [uploadingImage, setUploadingImage] = useState(false);
    const [isSavingCol, setIsSavingCol] = useState(false);

    // Bulk Move State
    const [bulkAssignModalOpen, setBulkAssignModalOpen] = useState(false);
    const [targetCollectionId, setTargetCollectionId] = useState("");
    const [isAssigning, setIsAssigning] = useState(false);

    // Merge State
    const [mergeModalOpen, setMergeModalOpen] = useState(false);
    const [mergeTitle, setMergeTitle] = useState("");
    const [isMerging, setIsMerging] = useState(false);

    const {
        tests, collections, loading, totalTestCount, currentPage,
        handleDelete, bulkAssignToCollection, fetchPage, searchTests, fetchInitial,
        addCollection, updateCollection, deleteCollection, isBackgroundRefreshing
    } = useAdminTests(12); // Using 12 for better grid layout

    // Open/Close Collection handlers
    const handleOpenAddCollection = () => {
        setEditingCol(null);
        setColName("");
        setColThumbnail("");
        setColType("reading");
        setCollectionModalOpen(true);
    };

    const handleOpenEditCollection = (col) => {
        setEditingCol(col);
        setColName(col.name);
        setColThumbnail(col.thumbnail || "");
        setColType(col.type || "reading");
        setCollectionModalOpen(true);
    };

    const handleSaveCollection = async () => {
        if (!colName.trim()) return;
        setIsSavingCol(true);
        try {
            if (editingCol) {
                const ok = await updateCollection(editingCol.id, colName.trim(), colThumbnail.trim(), colType);
                if (!ok) throw new Error("Database update failed");
            } else {
                const ok = await addCollection(colName.trim(), colThumbnail.trim(), colType);
                if (!ok) throw new Error("Database insert failed");
            }
            setCollectionModalOpen(false);
            setEditingCol(null);
            setColName("");
            setColThumbnail("");
            setColType("reading");
        } catch (err) {
            alert("To'plamni saqlashda xatolik yuz berdi: " + err.message);
        } finally {
            setIsSavingCol(false);
        }
    };

    const handleDeleteCollection = async () => {
        if (!editingCol) return;
        if (!window.confirm("Haqiqatan ham ushbu to'plamni o'chirmoqchimisiz?")) return;
        setIsSavingCol(true);
        try {
            const ok = await deleteCollection(editingCol.id);
            if (!ok) throw new Error("Database delete failed");
            setCollectionModalOpen(false);
            setEditingCol(null);
            setColName("");
            setColThumbnail("");
            // If the deleted collection was the current filter, reset it
            if (filterCollection === editingCol.id) {
                setFilterCollection("All");
            }
        } catch (err) {
            alert("To'plamni o'chirishda xatolik yuz berdi: " + err.message);
        } finally {
            setIsSavingCol(false);
        }
    };

    const handleUploadImage = async (file) => {
        if (!file) return;
        setUploadingImage(true);
        try {
            const path = `test_collection_covers/${Date.now()}_${file.name}`;
            const sRef = ref(storage, path);
            const uploadTask = uploadBytesResumable(sRef, file);

            uploadTask.on(
                "state_changed",
                null,
                (err) => { 
                    alert("Rasm yuklashda xatolik: " + err.message); 
                    setUploadingImage(false); 
                },
                async () => {
                    const url = await getDownloadURL(uploadTask.snapshot.ref);
                    setColThumbnail(url);
                    setUploadingImage(false);
                }
            );
        } catch (err) {
            alert("Rasm yuklashda xatolik: " + err.message);
            setUploadingImage(false);
        }
    };

    const handleBulkAssign = async () => {
        if (!targetCollectionId) return;
        setIsAssigning(true);
        try {
            const ok = await bulkAssignToCollection(selectedTests, targetCollectionId);
            if (!ok) throw new Error("Bulk assign failed");
            setSelectedTests([]);
            setBulkAssignModalOpen(false);
        } catch (err) {
            alert("Xatolik yuz berdi: " + err.message);
        } finally {
            setIsAssigning(false);
        }
    };

    const handleOpenMerge = () => {
        if (selectedTests.length < 2) {
            alert("Birlashtirish uchun kamida 2 ta test tanlanishi kerak.");
            return;
        }
        const selectedObjects = tests.filter(t => selectedTests.includes(t.id));
        const firstType = selectedObjects[0]?.type || "reading";
        const allSameType = selectedObjects.every(t => (t.type || "reading") === firstType);
        if (!allSameType) {
            alert("Faqat bir xil turdagi testlarni birlashtirish mumkin (masalan, faqat Reading yoki faqat Listening).");
            return;
        }
        
        // Generate a default title: "Merged: [Test 1 Title] + [Test 2 Title]..."
        const defaultTitle = "Merged: " + selectedObjects.map(t => t.title || "Untitled").join(" + ");
        setMergeTitle(defaultTitle);
        setMergeModalOpen(true);
    };

    const handleMergeConfirm = async () => {
        if (!mergeTitle.trim()) {
            alert("Birlashtirilgan test nomini kiriting!");
            return;
        }
        setIsMerging(true);
        try {
            const selectedObjects = tests.filter(t => selectedTests.includes(t.id));
            const { mergeTestsLogic } = await import("../../utils/TestUtils");
            const mergedPayload = mergeTestsLogic(selectedObjects, mergeTitle.trim());

            const { db } = await import("../../firebase/firebase");
            const { collection, addDoc, setDoc, doc } = await import("firebase/firestore");
            const { getQuestionTypesFromQuestions } = await import("../../components/admin/CreateTest/CreateTestUtils");

            // Save new merged test to firestore 'tests' collection
            const docRef = await addDoc(collection(db, "tests"), mergedPayload);
            const newTestId = docRef.id;

            // Compile metadata (matching compileMetadata in useTestEditor.js)
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
            };

            if (mergedPayload.type === 'listening') {
                const parts = {};
                (mergedPayload.passages || []).forEach((passage, idx) => {
                    const partNum = idx + 1;
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
                    const passNum = idx + 1;
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

            // Save metadata
            await setDoc(doc(db, "tests_metadata", newTestId), metadata);

            alert("Testlar muvaffaqiyatli birlashtirildi!");
            setSelectedTests([]);
            setMergeModalOpen(false);
            
            // Reload page to reflect new tests
            fetchInitial(filterType, filterCollection);
        } catch (err) {
            console.error("Merge error:", err);
            alert("Birlashtirishda xatolik yuz berdi: " + err.message);
        } finally {
            setIsMerging(false);
        }
    };

    // Search (debounced) or filter/collection change — single effect avoids double-fetch races
    useEffect(() => {
        setSelectedTests([]);
        const timer = setTimeout(() => {
            if (searchTerm.trim().length >= 2) {
                searchTests(searchTerm, filterType, filterCollection);
            } else {
                fetchInitial(filterType, filterCollection);
            }
        }, searchTerm.trim().length >= 2 ? 400 : 0);
        return () => clearTimeout(timer);
    }, [searchTerm, filterType, filterCollection]);

    const filteredTests = useMemo(() => {
        // Now tests are already filtered by server for type and collection
        // But we keep this for search results or if we want extra client filtering
        return tests;
    }, [tests]);

    const totalPages = Math.ceil(totalTestCount / 12);

    const handlePageChange = (page) => {
        fetchPage(page, filterType, filterCollection);
    };

    const [isMigrating, setIsMigrating] = useState(false);

    const handleMigrateMetadata = async () => {
        if (!window.confirm("Haqiqatan ham barcha mavjud testlar uchun yengil metadatalarni yaratmoqchimisiz? Bu offline kesh va part filterlarining ishlashi uchun zarur.")) return;
        setIsMigrating(true);
        try {
            const { db } = await import("../../firebase/firebase");
            const { collection, getDocs, doc, setDoc } = await import("firebase/firestore");
            const { getQuestionTypesFromQuestions } = await import("../../components/admin/CreateTest/CreateTestUtils");

            const snap = await getDocs(collection(db, "tests"));
            const total = snap.docs.length;
            let successCount = 0;

            for (const d of snap.docs) {
                const payload = d.data();
                const testId = d.id;

                let duration = Number(payload.duration) || 30;
                if (payload.type === 'listening') {
                    duration = 30;
                } else if (payload.type === 'reading') {
                    duration = 60;
                }

                const metadata = {
                    id: testId,
                    title: payload.title || "",
                    type: payload.type || "reading",
                    difficulty: payload.difficulty || "medium",
                    duration: duration,
                    audioUrl: payload.audio_url || "",
                    isExclusive: payload.isExclusive || false,
                    createdAt: payload.createdAt || new Date().toISOString(),
                    updatedAt: payload.updatedAt || new Date().toISOString(),
                    questionTypes: payload.questionTypes || getQuestionTypesFromQuestions(payload.questions || []),
                };

                if (payload.type === 'listening') {
                    const parts = {};
                    (payload.passages || []).forEach((passage, idx) => {
                        const partNum = idx + 1;
                        const partKey = `part${partNum}`;
                        
                        const passageQuestions = (payload.questions || []).filter(
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
                            difficulty: passage.difficulty || payload.difficulty || "medium",
                            qTypes: Array.from(new Set(formattedQTypes)),
                            startSec: passage.startTime !== undefined && passage.startTime !== null ? Number(passage.startTime) : 0,
                            endSec: passage.endTime !== undefined && passage.endTime !== null ? Number(passage.endTime) : 0,
                            audioUrl: passage.audio || payload.audio_url || ""
                        };
                    });
                    metadata.parts = parts;
                } else if (payload.type === 'reading') {
                    const passages = {};
                    (payload.passages || []).forEach((passage, idx) => {
                        const passNum = idx + 1;
                        const passKey = `passage${passNum}`;
                        
                        const passageQuestions = (payload.questions || []).filter(
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
                            difficulty: passage.difficulty || payload.difficulty || "medium",
                            qTypes: Array.from(new Set(formattedQTypes))
                        };
                    });
                    metadata.passages = passages;
                }

                await setDoc(doc(db, "tests_metadata", testId), metadata);
                successCount++;
            }
            alert(`Metadata migratsiyasi muvaffaqiyatli bajarildi! ${successCount} ta test yangilandi.`);
        } catch (error) {
            console.error("Migration error:", error);
            alert("Xatolik: " + error.message);
        } finally {
            setIsMigrating(false);
        }
    };

    const handleToggleSelect = (id) => {
        setSelectedTests(prev => prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]);
    };

    return (
        <div className={`h-full w-full flex font-sans transition-colors duration-200 relative overflow-hidden ${isDark ? 'bg-[#121212] text-white' : 'bg-[#f5f5f7] text-zinc-900'}`}>
            <AdminTestsSidebar 
                collections={collections}
                filterCollection={filterCollection}
                setFilterCollection={setFilterCollection}
                filterType={filterType}
                setFilterType={setFilterType}
                totalTestCount={totalTestCount}
                onAddCollection={handleOpenAddCollection} 
                onEditCollection={handleOpenEditCollection}
                onMigrate={handleMigrateMetadata}
                isMigrating={isMigrating}
                isDark={isDark}
            />

            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <AdminTestsToolbar 
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    selectedCount={selectedTests.length}
                    onBulkAssign={() => setBulkAssignModalOpen(true)} 
                    onMerge={handleOpenMerge} 
                    onCreate={() => navigate("/admin/create-test")}
                    isDark={isDark}
                />

                <main className={`flex-1 flex flex-col min-h-0 transition-colors ${isDark ? 'bg-[#121212]' : 'bg-white'}`}>
                    {loading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <Loader2 className="animate-spin text-blue-500" size={32} />
                        </div>
                    ) : (
                        <>
                            {/* Scrollable List Area */}
                            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar relative">
                                {isBackgroundRefreshing && (
                                    <div className="absolute top-2 right-6 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-500 border border-blue-500/20 backdrop-blur-md animate-pulse">
                                        <Loader2 className="animate-spin" size={10} />
                                        Fonda yangilanmoqda...
                                    </div>
                                )}
                                <AdminTestsList 
                                    tests={filteredTests}
                                    selectedTests={selectedTests}
                                    onToggleSelect={handleToggleSelect}
                                    onDelete={handleDelete}
                                    onEdit={(id) => navigate(`/admin/edit-test/${id}`)}
                                    onView={(id) => navigate(`/test/${id}`)}
                                    isDark={isDark}
                                />

                                {/* Scrollable Pagination at the bottom of content */}
                                <div className="mt-8 border-t pt-6 border-zinc-100 dark:border-white/5">
                                    <Pagination 
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        onPageChange={handlePageChange}
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </main>
            </div>

            {/* COLLECTION MODAL (ADD / EDIT) */}
            {collectionModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCollectionModalOpen(false)} />
                    <div className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border ${isDark ? 'bg-[#1e1e1e] border-white/5 text-white' : 'bg-white border-zinc-100 text-zinc-900'}`}>
                        <div className={`p-6 border-b flex justify-between items-center ${isDark ? 'border-white/5 bg-white/5' : 'border-zinc-100 bg-zinc-50/50'}`}>
                            <h2 className="font-bold text-lg flex items-center gap-2">
                                <Folder className={isDark ? 'text-blue-400' : 'text-blue-600'} size={20} />
                                {editingCol ? "Edit Collection" : "New Collection"}
                            </h2>
                            <button onClick={() => setCollectionModalOpen(false)} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-200'}`}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Collection Name</label>
                                <input 
                                    className={`w-full border p-3 rounded-xl outline-none transition-all font-bold text-sm ${isDark ? 'bg-white/5 border-white/10 focus:border-blue-500 text-white' : 'bg-zinc-50 border-zinc-200 focus:border-blue-500 text-zinc-900'}`}
                                    placeholder="Enter collection name..."
                                    value={colName}
                                    onChange={e => setColName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>To'plam Turi (Collection Type)</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setColType("reading")}
                                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-bold text-sm transition-all ${
                                            colType === "reading"
                                                ? 'bg-blue-600 border-transparent text-white shadow-lg shadow-blue-500/10'
                                                : isDark 
                                                    ? 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
                                                    : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                                        }`}
                                    >
                                        📖 Reading
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setColType("listening")}
                                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-bold text-sm transition-all ${
                                            colType === "listening"
                                                ? 'bg-blue-600 border-transparent text-white shadow-lg shadow-blue-500/10'
                                                : isDark 
                                                    ? 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
                                                    : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                                        }`}
                                    >
                                        🎧 Listening
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Cover Image (URL or Upload)</label>
                                <div className="flex gap-3">
                                    <div className="flex-1 space-y-2">
                                        <input 
                                            className={`w-full border p-3 rounded-xl outline-none transition-all text-xs ${isDark ? 'bg-white/5 border-white/10 focus:border-blue-500 text-white' : 'bg-zinc-50 border-zinc-200 focus:border-blue-500 text-zinc-900'}`}
                                            placeholder="Paste image URL here..."
                                            value={colThumbnail}
                                            onChange={e => setColThumbnail(e.target.value)}
                                        />
                                        <div className="relative">
                                            <input 
                                                type="file" 
                                                id="col-upload" 
                                                hidden 
                                                accept="image/*"
                                                onChange={e => handleUploadImage(e.target.files[0])}
                                            />
                                            <label 
                                                htmlFor="col-upload"
                                                className={`flex items-center justify-center gap-2 w-full py-2 border border-dashed rounded-xl text-xs font-bold cursor-pointer transition-all ${isDark ? 'bg-white/5 border-white/15 text-zinc-400 hover:border-blue-500 hover:text-blue-400' : 'bg-white border-zinc-300 text-zinc-500 hover:border-blue-500 hover:text-blue-600'}`}
                                            >
                                                {uploadingImage ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                                {uploadingImage ? "Uploading..." : "Upload from Computer"}
                                            </label>
                                        </div>
                                    </div>
                                    <div className={`w-24 h-24 rounded-xl shrink-0 overflow-hidden shadow-inner border flex items-center justify-center ${isDark ? 'bg-white/5 border-white/10' : 'bg-zinc-100 border-zinc-200'}`}>
                                        {colThumbnail ? (
                                            <img src={colThumbnail} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className={isDark ? 'text-zinc-600' : 'text-zinc-300'}><ImageIcon size={24} /></div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className={`p-6 pt-0 flex gap-3 ${isDark ? 'bg-[#1e1e1e]' : 'bg-white'}`}>
                            {editingCol && (
                                <button 
                                    onClick={handleDeleteCollection} 
                                    className="px-4 py-3 text-rose-500 font-bold text-sm hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors"
                                >
                                    Delete
                                </button>
                            )}
                            <button 
                                onClick={handleSaveCollection} 
                                disabled={isSavingCol || !colName.trim()}
                                className={`flex-1 font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${isSavingCol ? 'opacity-70 cursor-not-allowed' : ''} ${isDark ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/10' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'}`}
                            >
                                {isSavingCol && <Loader2 size={16} className="animate-spin" />}
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* BULK ASSIGN TO COLLECTION MODAL */}
            {bulkAssignModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setBulkAssignModalOpen(false)} />
                    <div className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border ${isDark ? 'bg-[#1e1e1e] border-white/5 text-white' : 'bg-white border-zinc-100 text-zinc-900'}`}>
                        <div className={`p-6 border-b flex justify-between items-center ${isDark ? 'border-white/5 bg-white/5' : 'border-zinc-100 bg-zinc-50/50'}`}>
                            <h2 className="font-bold text-lg flex items-center gap-2">
                                <FolderPlus className={isDark ? 'text-blue-400' : 'text-blue-600'} size={20} />
                                Move {selectedTests.length} tests to Collection
                            </h2>
                            <button onClick={() => setBulkAssignModalOpen(false)} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-200'}`}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Select Collection</label>
                                <select 
                                    className={`w-full border p-3 rounded-xl outline-none transition-all font-bold text-sm ${isDark ? 'bg-[#2a2a2a] border-white/10 focus:border-blue-500 text-white' : 'bg-zinc-50 border-zinc-200 focus:border-blue-500 text-zinc-900'}`}
                                    value={targetCollectionId}
                                    onChange={e => setTargetCollectionId(e.target.value)}
                                >
                                    <option value="" disabled>-- Select a Collection --</option>
                                    <option value="None">📦 None (Remove from any Collection)</option>
                                    {collections.map(c => (
                                        <option key={c.id} value={c.id}>📁 {c.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className={`p-6 pt-0 flex gap-3 ${isDark ? 'bg-[#1e1e1e]' : 'bg-white'}`}>
                            <button 
                                onClick={() => setBulkAssignModalOpen(false)} 
                                className={`px-4 py-3 font-bold text-sm rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}`}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleBulkAssign} 
                                disabled={isAssigning || !targetCollectionId}
                                className={`flex-1 font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${isAssigning ? 'opacity-70 cursor-not-allowed' : ''} ${isDark ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/10' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'}`}
                            >
                                {isAssigning && <Loader2 size={16} className="animate-spin" />}
                                Move Tests
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MERGE MODAL */}
            {mergeModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMergeModalOpen(false)} />
                    <div className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border ${isDark ? 'bg-[#1e1e1e] border-white/5 text-white' : 'bg-white border-zinc-100 text-zinc-900'}`}>
                        <div className={`p-6 border-b flex justify-between items-center ${isDark ? 'border-white/5 bg-white/5' : 'border-zinc-100 bg-zinc-50/50'}`}>
                            <h2 className="font-bold text-lg flex items-center gap-2">
                                <span className={isDark ? 'text-emerald-400' : 'text-emerald-600'}>🔗</span>
                                Merge {selectedTests.length} tests
                            </h2>
                            <button onClick={() => setMergeModalOpen(false)} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-200'}`}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Merged Test Title</label>
                                <input 
                                    className={`w-full border p-3 rounded-xl outline-none transition-all font-bold text-sm ${isDark ? 'bg-white/5 border-white/10 focus:border-blue-500 text-white' : 'bg-zinc-50 border-zinc-200 focus:border-blue-500 text-zinc-900'}`}
                                    placeholder="Enter title for the merged test..."
                                    value={mergeTitle}
                                    onChange={e => setMergeTitle(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className={`p-6 pt-0 flex gap-3 ${isDark ? 'bg-[#1e1e1e]' : 'bg-white'}`}>
                            <button 
                                onClick={() => setMergeModalOpen(false)} 
                                className={`px-4 py-3 font-bold text-sm rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}`}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleMergeConfirm} 
                                disabled={isMerging || !mergeTitle.trim()}
                                className={`flex-1 font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${isMerging ? 'opacity-70 cursor-not-allowed' : ''} ${isDark ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/10' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'}`}
                            >
                                {isMerging && <Loader2 size={16} className="animate-spin" />}
                                Merge Tests
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}