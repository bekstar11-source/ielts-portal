import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../../firebase/firebase";

// Hooks & Components
import { useAdminTests } from "../../hooks/useAdminTests";
import AdminTestsSidebar from "../../components/admin/AdminTests/AdminTestsSidebar";
import AdminTestsToolbar from "../../components/admin/AdminTests/AdminTestsToolbar";
import AdminTestsList from "../../components/admin/AdminTests/AdminTestsList";
import Pagination from "../../components/common/Pagination";
import { Loader2, Folder, X, Image as ImageIcon, Upload, Trash2, FolderPlus, ChevronRight, Key, BookOpen, Headphones, PenTool, ExternalLink, Edit3, Award } from "lucide-react";

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
    
    // Sub-tests for mock package
    const [colReadingId, setColReadingId] = useState("");
    const [colListeningId, setColListeningId] = useState("");
    const [colWritingId, setColWritingId] = useState("");
    const [allAvailableTests, setAllAvailableTests] = useState({ reading: [], listening: [], writing: [] });

    // Fetch all tests list for the dropdowns
    useEffect(() => {
        const fetchAllTests = async () => {
            try {
                const { getDocs, collection, query, orderBy } = await import("firebase/firestore");
                const { db } = await import("../../firebase/firebase");
                const snap = await getDocs(query(collection(db, "tests_metadata"), orderBy("createdAt", "desc")));
                const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setAllAvailableTests({
                    reading: list.filter(t => t.type === 'reading'),
                    listening: list.filter(t => t.type === 'listening'),
                    writing: list.filter(t => t.type === 'writing')
                });
            } catch (err) {
                console.error("Failed to load tests list:", err);
            }
        };
        fetchAllTests();
    }, []); // Load/Refresh list on mount

    // Bulk Move State
    const [bulkAssignModalOpen, setBulkAssignModalOpen] = useState(false);
    const [targetCollectionId, setTargetCollectionId] = useState("");
    const [isAssigning, setIsAssigning] = useState(false);

    // Merge State
    const [mergeModalOpen, setMergeModalOpen] = useState(false);
    const [mergeTitle, setMergeTitle] = useState("");
    const [isMerging, setIsMerging] = useState(false);

    // Mock Exam Edit Modal State
    const [mockExamModalOpen, setMockExamModalOpen] = useState(false);
    const [editingMock, setEditingMock] = useState(null);
    const [mockExamTitle, setMockExamTitle] = useState("");
    const [mockExamCollectionId, setMockExamCollectionId] = useState("");
    const [mockReadingId, setMockReadingId] = useState("");
    const [mockListeningId, setMockListeningId] = useState("");
    const [mockWritingId, setMockWritingId] = useState("");
    const [isSavingMockExam, setIsSavingMockExam] = useState(false);

    // Quick Edit State
    const [quickEditModalOpen, setQuickEditModalOpen] = useState(false);
    const [editingTest, setEditingTest] = useState(null);
    const [quickEditTitle, setQuickEditTitle] = useState("");
    const [quickEditCollectionId, setQuickEditCollectionId] = useState("");
    const [isSavingQuickEdit, setIsSavingQuickEdit] = useState(false);

    const {
        tests, collections, loading, totalTestCount, currentPage,
        handleDelete, bulkAssignToCollection, fetchPage, searchTests, fetchInitial,
        addCollection, updateCollection, deleteCollection, isBackgroundRefreshing,
        updateTestMetadata
    } = useAdminTests(12); // Using 12 for better grid layout

    // Open/Close Collection handlers
    const handleOpenAddCollection = () => {
        setEditingCol(null);
        setColName("");
        setColThumbnail("");
        setColType("reading");
        setColReadingId("");
        setColListeningId("");
        setColWritingId("");
        setCollectionModalOpen(true);
    };

    const handleOpenEditCollection = (col) => {
        setEditingCol(col);
        setColName(col.name);
        setColThumbnail(col.thumbnail || "");
        setColType(col.type || "reading");
        setColReadingId(col.subTests?.readingId || "");
        setColListeningId(col.subTests?.listeningId || "");
        setColWritingId(col.subTests?.writingId || "");
        setCollectionModalOpen(true);
    };

    const handleSaveCollection = async () => {
        if (!colName.trim()) return;
        setIsSavingCol(true);
        try {
            const subTests = colType === 'mock' 
                ? { readingId: colReadingId, listeningId: colListeningId, writingId: colWritingId }
                : null;

            if (editingCol) {
                const ok = await updateCollection(editingCol.id, colName.trim(), colThumbnail.trim(), colType, subTests);
                if (!ok) throw new Error("Database update failed");
            } else {
                const ok = await addCollection(colName.trim(), colThumbnail.trim(), colType, subTests);
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

    const handleOpenEditMockExam = (mockTest) => {
        setEditingMock(mockTest);
        setMockExamTitle(mockTest.title || "");
        setMockExamCollectionId(mockTest.collectionId || "");
        setMockReadingId(mockTest.subTests?.readingId || "");
        setMockListeningId(mockTest.subTests?.listeningId || "");
        setMockWritingId(mockTest.subTests?.writingId || "");
        setMockExamModalOpen(true);
    };

    const handleSaveMockExam = async () => {
        if (!mockExamTitle.trim()) {
            alert("Mock imtihon nomini kiriting!");
            return;
        }
        if (!mockReadingId || !mockListeningId || !mockWritingId) {
            alert("Iltimos, 3 ta fanni ham tanlang!");
            return;
        }
        setIsSavingMockExam(true);
        try {
            const { db } = await import("../../firebase/firebase");
            const { doc, updateDoc } = await import("firebase/firestore");
            
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

            await Promise.all([
                updateDoc(doc(db, "tests", editingMock.id), updatedData),
                updateDoc(doc(db, "tests_metadata", editingMock.id), updatedData)
            ]);

            alert("Mock imtihon muvaffaqiyatli yangilandi! 🎉");
            setMockExamModalOpen(false);
            setEditingMock(null);
            
            // Reload list
            fetchInitial(filterType, filterCollection);
        } catch (err) {
            console.error("Mock exam save error:", err);
            alert("Saqlashda xatolik yuz berdi: " + err.message);
        } finally {
            setIsSavingMockExam(false);
        }
    };

    const handleOpenQuickEdit = (test) => {
        setEditingTest(test);
        setQuickEditTitle(test.title || "");
        setQuickEditCollectionId(test.collectionId || "");
        setQuickEditModalOpen(true);
    };

    const handleSaveQuickEdit = async () => {
        if (!quickEditTitle.trim()) {
            alert("Test nomini kiriting!");
            return;
        }
        setIsSavingQuickEdit(true);
        try {
            const ok = await updateTestMetadata(editingTest.id, quickEditTitle.trim(), quickEditCollectionId);
            if (ok) {
                setQuickEditModalOpen(false);
                setEditingTest(null);
            } else {
                alert("Saqlashda xatolik yuz berdi.");
            }
        } catch (err) {
            console.error("Quick edit save error:", err);
            alert("Saqlashda xatolik yuz berdi: " + err.message);
        } finally {
            setIsSavingQuickEdit(false);
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
                collectionId: mergedPayload.collectionId && mergedPayload.collectionId !== "None" ? mergedPayload.collectionId : null,
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
            const { collection, getDocs, doc, setDoc, query, limit, startAfter } = await import("firebase/firestore");
            const { getQuestionTypesFromQuestions } = await import("../../components/admin/CreateTest/CreateTestUtils");

            let lastVisibleDoc = null;
            let successCount = 0;
            let hasMoreToMigrate = true;

            while (hasMoreToMigrate) {
                let q = query(collection(db, "tests"), limit(10));
                if (lastVisibleDoc) {
                    q = query(collection(db, "tests"), startAfter(lastVisibleDoc), limit(10));
                }
                const snap = await getDocs(q);
                if (snap.empty) {
                    hasMoreToMigrate = false;
                    break;
                }
                lastVisibleDoc = snap.docs[snap.docs.length - 1];

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
                        collectionId: payload.collectionId && payload.collectionId !== "None" ? payload.collectionId : null,
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

                if (snap.docs.length < 10) {
                    hasMoreToMigrate = false;
                }
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
                                onEdit={(id) => {
                                    const test = tests.find(t => t.id === id);
                                    if (test && test.type === 'mock') {
                                        handleOpenEditMockExam(test);
                                    } else {
                                        navigate(`/admin/edit-test/${id}`);
                                    }
                                }}
                                onQuickEdit={handleOpenQuickEdit}
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
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setColType("reading")}
                                        className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border font-bold text-xs transition-all ${
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
                                        className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border font-bold text-xs transition-all ${
                                            colType === "listening"
                                                ? 'bg-blue-600 border-transparent text-white shadow-lg shadow-blue-500/10'
                                                : isDark 
                                                    ? 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
                                                    : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                                        }`}
                                    >
                                        🎧 Listening
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setColType("mock")}
                                        className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border font-bold text-xs transition-all ${
                                            colType === "mock"
                                                ? 'bg-blue-600 border-transparent text-white shadow-lg shadow-blue-500/10'
                                                : isDark 
                                                    ? 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
                                                    : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                                        }`}
                                    >
                                        🎓 Mock
                                    </button>
                                </div>
                            </div>
                            {colType === "mock" && (
                                <div className="space-y-4 p-4 rounded-xl border border-dashed border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-white/5 animate-in slide-in-from-top-2 duration-200">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Birlashtiriluvchi Skill Testlar</h4>
                                    <div>
                                        <label className={`text-[10px] font-black uppercase tracking-widest mb-1.5 block ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>1. Reading Test</label>
                                        <select
                                            className={`w-full border p-2.5 rounded-lg outline-none text-xs font-semibold ${isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-800'}`}
                                            value={colReadingId}
                                            onChange={e => setColReadingId(e.target.value)}
                                        >
                                            <option value="">Tanlang...</option>
                                            {allAvailableTests.reading.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={`text-[10px] font-black uppercase tracking-widest mb-1.5 block ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>2. Listening Test</label>
                                        <select
                                            className={`w-full border p-2.5 rounded-lg outline-none text-xs font-semibold ${isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-800'}`}
                                            value={colListeningId}
                                            onChange={e => setColListeningId(e.target.value)}
                                        >
                                            <option value="">Tanlang...</option>
                                            {allAvailableTests.listening.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={`text-[10px] font-black uppercase tracking-widest mb-1.5 block ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>3. Writing Test</label>
                                        <select
                                            className={`w-full border p-2.5 rounded-lg outline-none text-xs font-semibold ${isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-800'}`}
                                            value={colWritingId}
                                            onChange={e => setColWritingId(e.target.value)}
                                        >
                                            <option value="">Tanlang...</option>
                                            {allAvailableTests.writing.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}
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

            {/* EDIT MOCK EXAM MODAL */}
            {mockExamModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMockExamModalOpen(false)} />
                    <div className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border ${isDark ? 'bg-[#1e1e1e] border-white/5 text-white' : 'bg-white border-zinc-100 text-zinc-900'}`}>
                        <div className={`p-6 border-b flex justify-between items-center ${isDark ? 'border-white/5 bg-white/5' : 'border-zinc-100 bg-zinc-50/50'}`}>
                            <h2 className="font-bold text-lg flex items-center gap-2">
                                <Award className={isDark ? 'text-blue-400' : 'text-blue-600'} size={20} />
                                Edit Mock Exam
                            </h2>
                            <button onClick={() => setMockExamModalOpen(false)} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-200'}`}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Mock Exam Title</label>
                                <input 
                                    className={`w-full border p-3 rounded-xl outline-none transition-all font-bold text-sm ${isDark ? 'bg-white/5 border-white/10 focus:border-blue-500 text-white' : 'bg-zinc-50 border-zinc-200 focus:border-blue-500 text-zinc-900'}`}
                                    placeholder="Enter mock exam title..."
                                    value={mockExamTitle}
                                    onChange={e => setMockExamTitle(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Mock Collection</label>
                                <select 
                                    className={`w-full border p-3 rounded-xl outline-none transition-all font-bold text-sm ${isDark ? 'bg-[#2a2a2a] border-white/10 focus:border-blue-500 text-white' : 'bg-zinc-50 border-zinc-200 focus:border-blue-500 text-zinc-900'}`}
                                    value={mockExamCollectionId}
                                    onChange={e => setMockExamCollectionId(e.target.value)}
                                >
                                    <option value="">No Collection</option>
                                    {collections.filter(c => c.type === 'mock').map(c => (
                                        <option key={c.id} value={c.id}>📁 {c.name}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="space-y-4 p-4 rounded-xl border border-dashed border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-white/5">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Linked Modules</h4>
                                <div>
                                    <label className={`text-[10px] font-black uppercase tracking-widest mb-1.5 block ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>1. Reading Test</label>
                                    <select
                                        className={`w-full border p-2.5 rounded-lg outline-none text-xs font-semibold ${isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-800'}`}
                                        value={mockReadingId}
                                        onChange={e => setMockReadingId(e.target.value)}
                                    >
                                        <option value="">Select Reading Test...</option>
                                        {allAvailableTests.reading.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={`text-[10px] font-black uppercase tracking-widest mb-1.5 block ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>2. Listening Test</label>
                                    <select
                                        className={`w-full border p-2.5 rounded-lg outline-none text-xs font-semibold ${isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-800'}`}
                                        value={mockListeningId}
                                        onChange={e => setMockListeningId(e.target.value)}
                                    >
                                        <option value="">Select Listening Test...</option>
                                        {allAvailableTests.listening.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={`text-[10px] font-black uppercase tracking-widest mb-1.5 block ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>3. Writing Test</label>
                                    <select
                                        className={`w-full border p-2.5 rounded-lg outline-none text-xs font-semibold ${isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-800'}`}
                                        value={mockWritingId}
                                        onChange={e => setMockWritingId(e.target.value)}
                                    >
                                        <option value="">Select Writing Test...</option>
                                        {allAvailableTests.writing.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className={`p-6 pt-0 flex gap-3 bg-transparent`}>
                            <button 
                                onClick={() => setMockExamModalOpen(false)} 
                                className={`px-4 py-3 font-bold text-sm rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}`}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSaveMockExam} 
                                disabled={isSavingMockExam || !mockExamTitle.trim()}
                                className={`flex-1 font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${isSavingMockExam ? 'opacity-70 cursor-not-allowed' : ''} ${isDark ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/10' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'}`}
                            >
                                {isSavingMockExam && <Loader2 size={16} className="animate-spin" />}
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

            {/* QUICK EDIT MODAL */}
            {quickEditModalOpen && editingTest && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setQuickEditModalOpen(false)} />
                    <div className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border ${isDark ? 'bg-[#1e1e1e] border-white/5 text-white' : 'bg-white border-zinc-100 text-zinc-900'}`}>
                        <div className={`p-6 border-b flex justify-between items-center ${isDark ? 'border-white/5 bg-white/5' : 'border-zinc-100 bg-zinc-50/50'}`}>
                            <h2 className="font-bold text-lg flex items-center gap-2">
                                <Edit3 className={isDark ? 'text-blue-400' : 'text-blue-600'} size={20} />
                                Quick Edit Test
                            </h2>
                            <button onClick={() => setQuickEditModalOpen(false)} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-200'}`}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Test Title</label>
                                <input 
                                    className={`w-full border p-3 rounded-xl outline-none transition-all font-bold text-sm ${isDark ? 'bg-[#2a2a2a] border-white/10 focus:border-blue-500 text-white' : 'bg-zinc-50 border-zinc-200 focus:border-blue-500 text-zinc-900'}`}
                                    placeholder="Enter test title..."
                                    value={quickEditTitle}
                                    onChange={e => setQuickEditTitle(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Collection</label>
                                <select 
                                    className={`w-full border p-3 rounded-xl outline-none transition-all font-bold text-sm ${isDark ? 'bg-[#2a2a2a] border-white/10 focus:border-blue-500 text-white' : 'bg-zinc-50 border-zinc-200 focus:border-blue-500 text-zinc-900'}`}
                                    value={quickEditCollectionId}
                                    onChange={e => setQuickEditCollectionId(e.target.value)}
                                >
                                    <option value="">No Collection</option>
                                    {collections
                                        .filter(c => c.type === editingTest.type)
                                        .map(c => (
                                            <option key={c.id} value={c.id}>📁 {c.name}</option>
                                        ))
                                    }
                                </select>
                            </div>
                        </div>
                        <div className={`p-6 pt-0 flex gap-3 bg-transparent`}>
                            <button 
                                onClick={() => setQuickEditModalOpen(false)} 
                                className={`px-4 py-3 font-bold text-sm rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}`}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSaveQuickEdit} 
                                disabled={isSavingQuickEdit || !quickEditTitle.trim()}
                                className={`flex-1 font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${isSavingQuickEdit ? 'opacity-70 cursor-not-allowed' : ''} ${isDark ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/10' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'}`}
                            >
                                {isSavingQuickEdit && <Loader2 size={16} className="animate-spin" />}
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}