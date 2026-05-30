import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage, db } from "../../firebase/firebase";
import toast from "react-hot-toast";

// Hooks & Components
import { useAdminTests } from "../../hooks/useAdminTests";
import AdminTestsToolbar from "../../components/admin/AdminTests/AdminTestsToolbar";
import AdminTestsList from "../../components/admin/AdminTests/AdminTestsList";
import Pagination from "../../components/common/Pagination";
import { 
    Loader2, Folder, X, Image as ImageIcon, Upload, Trash2, FolderPlus, 
    ChevronRight, Key, BookOpen, Headphones, PenTool, ExternalLink, Edit3, 
    Award, Copy, Download, Globe, Lock, Shield, Search
} from "lucide-react";

export default function AdminTests() {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    
    // Custom Confirm Modal State
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: "",
        message: "",
        confirmText: "Tasdiqlash",
        cancelText: "Bekor qilish",
        onConfirm: null,
        type: "danger" // 'danger' | 'info' | 'warning'
    });

    const showConfirm = ({ title, message, onConfirm, type = 'danger', confirmText = "Ha, o'chirish", cancelText = "Bekor qilish" }) => {
        setConfirmModal({
            isOpen: true,
            title,
            message,
            confirmText,
            cancelText,
            onConfirm: () => {
                onConfirm();
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            },
            type
        });
    };
    
    // UI State
    const [viewMode, setViewMode] = useState("list");
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

    // Question Bank State
    const [questionBankOpen, setQuestionBankOpen] = useState(false);
    const [qBankSearchTerm, setQBankSearchTerm] = useState("");
    const [selectedQBankTestId, setSelectedQBankTestId] = useState("");
    const [qBankTestData, setQBankTestData] = useState(null);
    const [loadingQBankTestData, setLoadingQBankTestData] = useState(false);
    const [selectedPassageIndex, setSelectedPassageIndex] = useState(0);

    // Fetch all tests list for mock selection dropdowns
    useEffect(() => {
        const fetchAllTests = async () => {
            try {
                const { getDocs, collection, query, orderBy } = await import("firebase/firestore");
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
    }, []);

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
    const [quickEditIsFree, setQuickEditIsFree] = useState(false);
    const [isSavingQuickEdit, setIsSavingQuickEdit] = useState(false);

    const {
        // States
        tests, collections, loading, totalTestCount, currentPage,
        isBackgroundRefreshing, stats,
        searchTerm, setSearchTerm,
        filterType, setFilterType,
        filterCollection, setFilterCollection,
        filterStatus, setFilterStatus,
        filterAccess, setFilterAccess,
        sortBy, setSortBy,
        sortOrder, setSortOrder,

        // Actions
        handleDelete, bulkDeleteTests, bulkAssignToCollection,
        bulkUpdateStatus, bulkUpdateIsFree, duplicateTest, importTests,
        addCollection, updateCollection, deleteCollection, updateTestMetadata,
        fetchInitial, fetchPage
    } = useAdminTests(12);

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
                toast.success("To'plam muvaffaqiyatli yangilandi! 🎉");
            } else {
                const ok = await addCollection(colName.trim(), colThumbnail.trim(), colType, subTests);
                if (!ok) throw new Error("Database insert failed");
                toast.success("Yangi to'plam muvaffaqiyatli yaratildi! 🎉");
            }
            setCollectionModalOpen(false);
            setEditingCol(null);
            setColName("");
            setColThumbnail("");
            setColType("reading");
        } catch (err) {
            toast.error("To'plamni saqlashda xatolik yuz berdi: " + err.message);
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
            setMockExamModalOpen(false);
            setEditingMock(null);
            fetchInitial(filterType, filterCollection);
        } catch (err) {
            console.error("Mock exam save error:", err);
            toast.error("Saqlashda xatolik yuz berdi: " + err.message);
        } finally {
            setIsSavingMockExam(false);
        }
    };

    const handleOpenQuickEdit = (test) => {
        setEditingTest(test);
        setQuickEditTitle(test.title || "");
        setQuickEditCollectionId(test.collectionId || "");
        setQuickEditIsFree(test.isFree || false);
        setQuickEditModalOpen(true);
    };

    const handleSaveQuickEdit = async () => {
        if (!quickEditTitle.trim()) {
            toast.error("Test nomini kiriting!");
            return;
        }
        setIsSavingQuickEdit(true);
        try {
            const ok = await updateTestMetadata(editingTest.id, quickEditTitle.trim(), quickEditCollectionId, quickEditIsFree);
            if (ok) {
                toast.success("Test muvaffaqiyatli yangilandi! 🎉");
                setQuickEditModalOpen(false);
                setEditingTest(null);
            } else {
                toast.error("Saqlashda xatolik yuz berdi.");
            }
        } catch (err) {
            console.error("Quick edit save error:", err);
            toast.error("Saqlashda xatolik yuz berdi: " + err.message);
        } finally {
            setIsSavingQuickEdit(false);
        }
    };

    const handleDeleteCollection = () => {
        if (!editingCol) return;
        showConfirm({
            title: "To'plamni o'chirish",
            message: `Haqiqatan ham "${editingCol.name}" to'plamini o'chirmoqchimisiz? To'plam o'chirilishi undagi testlarga ta'sir qilmaydi.`,
            confirmText: "Ha, o'chirish",
            cancelText: "Bekor qilish",
            type: 'danger',
            onConfirm: async () => {
                setIsSavingCol(true);
                try {
                    const ok = await deleteCollection(editingCol.id);
                    if (!ok) throw new Error("Database delete failed");
                    setCollectionModalOpen(false);
                    setEditingCol(null);
                    setColName("");
                    setColThumbnail("");
                    if (filterCollection === editingCol.id) {
                        setFilterCollection("All");
                    }
                    toast.success("To'plam muvaffaqiyatli o'chirildi! 🗑️");
                } catch (err) {
                    toast.error("To'plamni o'chirishda xatolik yuz berdi: " + err.message);
                } finally {
                    setIsSavingCol(false);
                }
            }
        });
    };

    const handleConfirmDeleteTest = (id, title) => {
        showConfirm({
            title: "Testni o'chirish",
            message: `Haqiqatan ham "${title || 'Untitled'}" testini butunlay o'chirib tashlamoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi.`,
            confirmText: "Butunlay o'chirish",
            cancelText: "Bekor qilish",
            type: 'danger',
            onConfirm: async () => {
                const ok = await handleDelete(id);
                if (ok) {
                    toast.success("Test muvaffaqiyatli o'chirildi! 🗑️");
                } else {
                    toast.error("Testni o'chirishda xatolik yuz berdi.");
                }
            }
        });
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
                    toast.error("Rasm yuklashda xatolik: " + err.message); 
                    setUploadingImage(false); 
                },
                async () => {
                    const url = await getDownloadURL(uploadTask.snapshot.ref);
                    setColThumbnail(url);
                    setUploadingImage(false);
                    toast.success("Rasm muvaffaqiyatli yuklandi! 📸");
                }
            );
        } catch (err) {
            toast.error("Rasm yuklashda xatolik: " + err.message);
            setUploadingImage(false);
        }
    };

    // Guruhli amallar handlers
    const handleBulkAssign = async () => {
        if (!targetCollectionId) return;
        setIsAssigning(true);
        try {
            const ok = await bulkAssignToCollection(selectedTests, targetCollectionId);
            if (!ok) throw new Error("Bulk assign failed");
            setSelectedTests([]);
            setBulkAssignModalOpen(false);
            toast.success("Testlar to'plamga muvaffaqiyatli ko'chirildi! 📁");
        } catch (err) {
            toast.error("Xatolik yuz berdi: " + err.message);
        } finally {
            setIsAssigning(false);
        }
    };

    const handleBulkDelete = () => {
        showConfirm({
            title: "Guruhli o'chirish",
            message: `Haqiqatan ham tanlangan ${selectedTests.length} ta testni butunlay o'chirib tashlamoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi.`,
            confirmText: "Butunlay o'chirish",
            cancelText: "Bekor qilish",
            type: 'danger',
            onConfirm: async () => {
                const loadingId = toast.loading("O'chirilmoqda...");
                const ok = await bulkDeleteTests(selectedTests);
                toast.dismiss(loadingId);
                if (ok) {
                    toast.success("Tanlangan testlar muvaffaqiyatli o'chirildi! 🗑️");
                    setSelectedTests([]);
                } else {
                    toast.error("O'chirishda xatolik yuz berdi.");
                }
            }
        });
    };

    const handleBulkStatusChange = (isPublic) => {
        showConfirm({
            title: isPublic ? "Ommaviy (Public) qilish" : "Shaxsiy (Private) qilish",
            message: `Tanlangan ${selectedTests.length} ta test statusini ${isPublic ? 'Public' : 'Private'} ga o'zgartirmoqchimisiz?`,
            confirmText: "Tasdiqlash",
            cancelText: "Bekor qilish",
            type: 'info',
            onConfirm: async () => {
                const loadingId = toast.loading("Yangilanmoqda...");
                const ok = await bulkUpdateStatus(selectedTests, isPublic);
                toast.dismiss(loadingId);
                if (ok) {
                    toast.success("Testlar statusi muvaffaqiyatli yangilandi! 🎉");
                    setSelectedTests([]);
                } else {
                    toast.error("Yangilashda xatolik yuz berdi.");
                }
            }
        });
    };

    const handleBulkAccessChange = (isFree) => {
        showConfirm({
            title: isFree ? "Bepul (Free) qilish" : "Premium (Paid) qilish",
            message: `Tanlangan ${selectedTests.length} ta testni ${isFree ? 'bepul' : 'pullik'} guruhiga o'tkazmoqchimisiz?`,
            confirmText: "Tasdiqlash",
            cancelText: "Bekor qilish",
            type: 'info',
            onConfirm: async () => {
                const loadingId = toast.loading("Yangilanmoqda...");
                const ok = await bulkUpdateIsFree(selectedTests, isFree);
                toast.dismiss(loadingId);
                if (ok) {
                    toast.success("Testlar muvaffaqiyatli yangilandi! 🎉");
                    setSelectedTests([]);
                } else {
                    toast.error("Yangilashda xatolik yuz berdi.");
                }
            }
        });
    };

    // Duplicate test handler
    const handleDuplicateTest = (id, title) => {
        showConfirm({
            title: "Testdan nusxa olish",
            message: `Haqiqatan ham "${title || 'Untitled'}" testidan nusxa (Duplicate) olmoqchimisiz?`,
            confirmText: "Nusxa olish",
            cancelText: "Bekor qilish",
            type: 'info',
            onConfirm: async () => {
                const loadingId = toast.loading("Nusxalanmoqda...");
                const newId = await duplicateTest(id);
                toast.dismiss(loadingId);
                if (newId) {
                    toast.success("Test muvaffaqiyatli nusxalandi! 🎉");
                } else {
                    toast.error("Nusxa olishda xatolik yuz berdi.");
                }
            }
        });
    };

    // JSON and CSV Export Handlers
    const handleExportJSON = async () => {
        const loadingId = toast.loading("Eksport qilinmoqda...");
        try {
            const { getDoc, doc } = await import("firebase/firestore");
            const promises = selectedTests.map(id => getDoc(doc(db, "tests", id)));
            const snaps = await Promise.all(promises);
            const fullTests = snaps.map(s => s.data()).filter(Boolean);

            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullTests, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href",     dataStr);
            downloadAnchor.setAttribute("download", `ielts_tests_export_${Date.now()}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
            toast.success("JSON eksport muvaffaqiyatli yakunlandi! 📥");
        } catch (err) {
            console.error("Export JSON Error:", err);
            toast.error("Eksportda xatolik yuz berdi.");
        } finally {
            toast.dismiss(loadingId);
        }
    };

    const handleExportCSV = () => {
        try {
            const selectedObjects = tests.filter(t => selectedTests.includes(t.id));
            let csvRows = [];
            csvRows.push(["ID", "Title", "Type", "Difficulty", "IsFree", "IsPublic", "CreatedAt"].join(","));
            
            selectedObjects.forEach(t => {
                const values = [
                    t.id,
                    `"${(t.title || "").replace(/"/g, '""')}"`,
                    t.type || "",
                    t.difficulty || "",
                    t.isFree ? "TRUE" : "FALSE",
                    t.isPublic ? "TRUE" : "FALSE",
                    t.createdAt || ""
                ];
                csvRows.push(values.join(","));
            });

            const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(csvRows.join("\n"));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href",     csvContent);
            downloadAnchor.setAttribute("download", `ielts_tests_summary_${Date.now()}.csv`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
            toast.success("CSV eksport muvaffaqiyatli yakunlandi! 📥");
        } catch (err) {
            console.error("Export CSV Error:", err);
            toast.error("Eksportda xatolik yuz berdi.");
        }
    };

    // JSON Import Handler
    const handleImportFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const json = JSON.parse(event.target.result);
                const loadingId = toast.loading("Import qilinmoqda...");
                const ok = await importTests(json);
                toast.dismiss(loadingId);
                if (ok) {
                    toast.success("Testlar muvaffaqiyatli import qilindi! 🎉");
                } else {
                    toast.error("Import qilishda xatolik yuz berdi. JSON formatini tekshiring.");
                }
            } catch (err) {
                console.error("JSON parsing error:", err);
                toast.error("Noto'g'ri JSON fayl tanlandi.");
            }
        };
        reader.readAsText(file);
        e.target.value = ""; // reset file input
    };

    // Question Bank Test Load
    useEffect(() => {
        if (!selectedQBankTestId) {
            setQBankTestData(null);
            return;
        }
        const fetchTestData = async () => {
            setLoadingQBankTestData(true);
            try {
                const { getDoc, doc } = await import("firebase/firestore");
                const snap = await getDoc(doc(db, "tests", selectedQBankTestId));
                if (snap.exists()) {
                    setQBankTestData(snap.data());
                    setSelectedPassageIndex(0);
                } else {
                    toast.error("Test yuklanmadi");
                }
            } catch (err) {
                console.error("Fetch QBank doc error:", err);
                toast.error("Yuklashda xatolik");
            } finally {
                setLoadingQBankTestData(false);
            }
        };
        fetchTestData();
    }, [selectedQBankTestId]);

    const handleCopyPassageJSON = () => {
        if (!qBankTestData || !qBankTestData.passages || !qBankTestData.passages[selectedPassageIndex]) return;
        try {
            const passage = qBankTestData.passages[selectedPassageIndex];
            const passageId = passage.id;
            const questions = (qBankTestData.questions || []).filter(q => String(q.passageId) === String(passageId));
            const keywordTable = (qBankTestData.keywordTable || []).filter(kw => String(kw.passageId) === String(passageId));
            
            const payload = {
                passage,
                questions,
                keywordTable
            };
            
            navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
            toast.success("Nusxalandi! Buni yangi test tahrirlagichining JSON maydoniga qo'shishingiz mumkin. 📋");
        } catch (err) {
            toast.error("Nusxa olishda xatolik.");
        }
    };

    const handleOpenMerge = () => {
        if (selectedTests.length < 2) {
            toast.error("Birlashtirish uchun kamida 2 ta test tanlanishi kerak.");
            return;
        }
        const selectedObjects = tests.filter(t => selectedTests.includes(t.id));
        const firstType = selectedObjects[0]?.type || "reading";
        const allSameType = selectedObjects.every(t => (t.type || "reading") === firstType);
        if (!allSameType) {
            toast.error("Faqat bir xil turdagi testlarni birlashtirish mumkin (masalan, faqat Reading yoki faqat Listening).");
            return;
        }
        
        const defaultTitle = "Merged: " + selectedObjects.map(t => t.title || "Untitled").join(" + ");
        setMergeTitle(defaultTitle);
        setMergeModalOpen(true);
    };

    const handleMergeConfirm = async () => {
        if (!mergeTitle.trim()) {
            toast.error("Birlashtirilgan test nomini kiriting!");
            return;
        }
        setIsMerging(true);
        try {
            const selectedObjects = tests.filter(t => selectedTests.includes(t.id));
            const { mergeTestsLogic } = await import("../../utils/TestUtils");
            const mergedPayload = mergeTestsLogic(selectedObjects, mergeTitle.trim());

            const { writeBatch, doc, collection } = await import("firebase/firestore");
            const { getQuestionTypesFromQuestions, getPassageOrPartNum } = await import("../../components/admin/CreateTest/CreateTestUtils");

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
            setSelectedTests([]);
            setMergeModalOpen(false);
            
            fetchInitial(filterType, filterCollection);
        } catch (err) {
            console.error("Merge error:", err);
            toast.error("Birlashtirishda xatolik yuz berdi: " + err.message);
        } finally {
            setIsMerging(false);
        }
    };

    const handlePageChange = (page) => {
        fetchPage(page);
    };

    const [isMigrating, setIsMigrating] = useState(false);

    const handleMigrateMetadata = () => {
        showConfirm({
            title: "Metadata migratsiyasi",
            message: "Haqiqatan ham barcha mavjud testlar uchun yengil metadatalarni yaratmoqchimisiz? Bu offline kesh va part filterlarining ishlashi uchun zarur.",
            confirmText: "Migratsiyani boshlash",
            cancelText: "Bekor qilish",
            type: 'warning',
            onConfirm: async () => {
                setIsMigrating(true);
                try {
                    const { getDocs, doc, setDoc, query, limit, startAfter, collection } = await import("firebase/firestore");
                    const { getQuestionTypesFromQuestions, getPassageOrPartNum } = await import("../../components/admin/CreateTest/CreateTestUtils");

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
                                isFree: payload.isFree || false,
                                createdAt: payload.createdAt || new Date().toISOString(),
                                updatedAt: payload.updatedAt || new Date().toISOString(),
                                questionTypes: payload.questionTypes || getQuestionTypesFromQuestions(payload.questions || []),
                                collectionId: payload.collectionId && payload.collectionId !== "None" ? payload.collectionId : null,
                            };

                            if (payload.type === 'listening') {
                                const parts = {};
                                (payload.passages || []).forEach((passage, idx) => {
                                    const partNum = getPassageOrPartNum(passage, idx, 'listening', payload.questions || []);
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
                                    const passNum = getPassageOrPartNum(passage, idx, 'reading', payload.questions || []);
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

                    toast.success(`Metadata migratsiyasi muvaffaqiyatli bajarildi! ${successCount} ta test yangilandi.`);
                } catch (error) {
                    console.error("Migration error:", error);
                    toast.error("Xatolik: " + error.message);
                } finally {
                    setIsMigrating(false);
                }
            }
        });
    };

    const handleToggleSelect = (id) => {
        setSelectedTests(prev => prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]);
    };

    const filteredTests = useMemo(() => tests, [tests]);
    const totalPages = Math.ceil(totalTestCount / 12);

    // Question Bank filtered list
    const filteredQBankTests = useMemo(() => {
        if (!qBankSearchTerm.trim()) return allAvailableTests.reading.concat(allAvailableTests.listening);
        const term = qBankSearchTerm.toLowerCase();
        return allAvailableTests.reading.concat(allAvailableTests.listening).filter(t => 
            t.title.toLowerCase().includes(term) || t.id.toLowerCase().includes(term)
        );
    }, [allAvailableTests, qBankSearchTerm]);

    return (
        <div className={`h-full w-full flex font-sans transition-colors duration-200 relative overflow-hidden ${isDark ? 'bg-[#121212] text-white' : 'bg-[#f5f5f7] text-zinc-900'}`}>
            
            {/* Hidden Input for Importing JSON */}
            <input 
                type="file" 
                id="import-json-file" 
                accept=".json" 
                className="hidden" 
                onChange={handleImportFileChange} 
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

                    // New sorting and filtering states
                    filterStatus={filterStatus}
                    setFilterStatus={setFilterStatus}
                    filterAccess={filterAccess}
                    setFilterAccess={setFilterAccess}
                    filterTag={filterTag}
                    setFilterTag={setFilterTag}
                    allAvailableTags={allAvailableTags}
                    sortBy={sortBy}
                    setSortBy={setSortBy}
                    sortOrder={sortOrder}
                    setSortOrder={setSortOrder}

                    // Bulk Action Handlers
                    onBulkDelete={handleBulkDelete}
                    onBulkStatusChange={handleBulkStatusChange}
                    onBulkAccessChange={handleBulkAccessChange}
                    onImport={() => document.getElementById("import-json-file").click()}
                    onExportJSON={handleExportJSON}
                    onExportCSV={handleExportCSV}
                    onOpenQuestionBank={() => setQuestionBankOpen(true)}
                />

                {/* Dashboard stats panel */}
                {stats && (
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 px-6 pt-5 pb-1 shrink-0 select-none">
                        {[
                            { title: "Jami Testlar", value: stats.total, color: "from-blue-500/10 to-indigo-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25" },
                            { title: "Ommaviy (Public)", value: stats.publicCount, color: "from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25" },
                            { title: "Shaxsiy (Private)", value: stats.privateCount, color: "from-zinc-500/10 to-neutral-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/25" },
                            { title: "Bepul (Free)", value: stats.freeCount, color: "from-cyan-500/10 to-teal-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/25" },
                            { title: "Mock Imtihonlar", value: stats.mockCount, color: "from-rose-500/10 to-pink-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25" }
                        ].map((card, i) => (
                            <div key={i} className={`p-4 rounded-xl border bg-gradient-to-br ${card.color} shadow-sm flex flex-col justify-between hover:scale-[1.02] transition-transform duration-200`}>
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{card.title}</span>
                                <span className="text-xl font-black tracking-tight mt-1">{card.value}</span>
                            </div>
                        ))}
                    </div>
                )}

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
                                onSelectAll={(checked) => {
                                    if (checked) {
                                        setSelectedTests(filteredTests.map(t => t.id));
                                    } else {
                                        setSelectedTests([]);
                                    }
                                }}
                                onDelete={handleConfirmDeleteTest}
                                onDuplicate={handleDuplicateTest}
                                onEdit={(id) => {
                                    const test = tests.find(t => t.id === id);
                                    if (test && test.type === 'mock') {
                                        handleOpenEditMockExam(test);
                                    } else {
                                        navigate(`/admin/edit-test/${id}`);
                                    }
                                }}
                                onQuickEdit={handleOpenQuickEdit}
                                onView={(id) => navigate(`/test/${id}`, { state: { from: "/admin/tests" } })}
                                isDark={isDark}
                            />

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

            {/* QUESTION BANK MODAL */}
            {questionBankOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setQuestionBankOpen(false)} />
                    <div className={`relative w-full max-w-5xl h-[80vh] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border flex flex-col ${isDark ? 'bg-[#1e1e1e] border-white/5 text-white' : 'bg-white border-zinc-100 text-zinc-900'}`}>
                        <div className={`p-4 border-b flex justify-between items-center ${isDark ? 'border-white/5 bg-white/5' : 'border-zinc-100 bg-zinc-50/50'}`}>
                            <h2 className="font-bold text-lg flex items-center gap-2">
                                <BookOpen className={isDark ? 'text-blue-400' : 'text-blue-600'} size={20} />
                                Savollar banki (Browse Passages & Parts)
                            </h2>
                            <button onClick={() => setQuestionBankOpen(false)} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-200'}`}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 flex min-h-0">
                            {/* Left panel: Test List */}
                            <div className={`w-80 border-r flex flex-col min-h-0 ${isDark ? 'border-white/5' : 'border-zinc-100'}`}>
                                <div className="p-3 border-b border-inherit">
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                                        <input 
                                            type="text"
                                            className={`w-full text-xs pl-8 pr-3 py-2 rounded-lg border outline-none ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-800'}`}
                                            placeholder="Test nomini qidiring..."
                                            value={qBankSearchTerm}
                                            onChange={e => setQBankSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                                    {filteredQBankTests.map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => setSelectedQBankTestId(t.id)}
                                            className={`w-full text-left p-2.5 rounded-lg text-xs font-bold transition-all block truncate ${
                                                selectedQBankTestId === t.id
                                                    ? 'bg-blue-600 text-white'
                                                    : isDark ? 'hover:bg-white/5 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'
                                            }`}
                                        >
                                            <span className="opacity-70 text-[9px] uppercase block tracking-wider mb-0.5">{t.type}</span>
                                            {t.title}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Right panel: Passages list & Preview */}
                            <div className="flex-1 flex flex-col min-h-0 p-4">
                                {loadingQBankTestData ? (
                                    <div className="flex-1 flex items-center justify-center">
                                        <Loader2 className="animate-spin text-blue-500" size={24} />
                                    </div>
                                ) : qBankTestData ? (
                                    <div className="flex-1 flex flex-col min-h-0">
                                        {/* Passage selector tab bar */}
                                        <div className="flex gap-2 border-b pb-3 mb-3 border-zinc-100 dark:border-white/5 shrink-0 overflow-x-auto">
                                            {(qBankTestData.passages || []).map((pass, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => setSelectedPassageIndex(i)}
                                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all shrink-0 ${
                                                        selectedPassageIndex === i
                                                            ? 'bg-blue-600 text-white border-transparent'
                                                            : isDark ? 'bg-white/5 border-white/5 text-zinc-300 hover:bg-white/10' : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                                                    }`}
                                                >
                                                    {pass.title || `Passage ${i+1}`}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Passage Content and Questions display */}
                                        {qBankTestData.passages && qBankTestData.passages[selectedPassageIndex] ? (
                                            <div className="flex-1 flex min-h-0 gap-4">
                                                {/* Text content preview */}
                                                <div className={`flex-1 border p-4 rounded-xl overflow-y-auto custom-scrollbar text-sm leading-relaxed ${isDark ? 'bg-zinc-900 border-white/5' : 'bg-zinc-50 border-zinc-150'}`}>
                                                    <h3 className="font-extrabold text-base mb-3">{qBankTestData.passages[selectedPassageIndex].title}</h3>
                                                    <div 
                                                        dangerouslySetInnerHTML={{ __html: qBankTestData.passages[selectedPassageIndex].content || "<p className='italic text-zinc-400'>Matn yo'q</p>" }} 
                                                        className="space-y-3 prose dark:prose-invert max-w-none text-xs"
                                                    />
                                                </div>

                                                {/* Actions and Questions Summary */}
                                                <div className="w-80 flex flex-col min-h-0 border-l pl-4 border-zinc-100 dark:border-white/5 shrink-0">
                                                    <div className="mb-4">
                                                        <button 
                                                            onClick={handleCopyPassageJSON}
                                                            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-500/10 active:scale-95 transition-all"
                                                        >
                                                            <Copy size={14} /> Passage JSON nusxalash
                                                        </button>
                                                    </div>
                                                    <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Savollar Ro'yxati</h4>
                                                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                                                        {(qBankTestData.questions || [])
                                                            .filter(q => String(q.passageId) === String(qBankTestData.passages[selectedPassageIndex].id))
                                                            .map((q, idx) => (
                                                                <div key={idx} className={`p-2 rounded-lg border text-[11px] font-bold ${isDark ? 'bg-white/5 border-white/5 text-zinc-300' : 'bg-white border-zinc-150 text-zinc-700'}`}>
                                                                    <span className="text-blue-500 mr-1.5">S{q.id || idx+1}</span>
                                                                    <span className="opacity-70 uppercase text-[9px] px-1 bg-zinc-500/10 rounded">{q.type}</span>
                                                                    <p className="mt-1 font-medium line-clamp-2">{q.question || q.title || "Savol matni kiritilmagan"}</p>
                                                                </div>
                                                            ))
                                                        }
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex-1 flex items-center justify-center text-zinc-400 italic text-sm">
                                                Ushbu modulda bo'limlar topilmadi.
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 italic text-sm">
                                        <BookOpen size={48} className="stroke-1 text-zinc-350 dark:text-zinc-650 mb-3" />
                                        Chap paneldan biror test tanlang. Undagi bo'limlar va savollarni bu yerda ko'rishingiz mumkin.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto custom-scrollbar">
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
                        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto custom-scrollbar">
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
                        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
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
                        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
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
                        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto custom-scrollbar">
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
                            <div className="flex items-center justify-between p-3 rounded-xl border border-dashed border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-white/5">
                                <div className="space-y-0.5">
                                    <label className={`text-xs font-bold block ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>Is Free Test?</label>
                                    <span className="text-[10px] text-zinc-400 block leading-tight">Shown first for all users with FREE badge. Free-plan users can start it without daily limit.</span>
                                </div>
                                <button 
                                    onClick={() => setQuickEditIsFree(!quickEditIsFree)}
                                    className={`w-10 h-5 rounded-full p-1 transition-all duration-300 shrink-0 ${quickEditIsFree ? 'bg-[#0066cc]' : 'bg-gray-400'}`}
                                >
                                    <div className={`w-3 h-3 bg-white rounded-full transition-transform duration-300 ${quickEditIsFree ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
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

            {/* CUSTOM CONFIRM MODAL */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} />
                    <div className={`relative w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border p-6 space-y-5 ${
                        isDark ? 'bg-[#1e1e1e] border-white/5 text-white' : 'bg-white border-zinc-100 text-zinc-900'
                    }`}>
                        <div className="flex flex-col items-center text-center space-y-3">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                confirmModal.type === 'danger' 
                                    ? 'bg-rose-500/10 text-rose-500' 
                                    : confirmModal.type === 'warning'
                                        ? 'bg-amber-500/10 text-amber-500'
                                        : 'bg-blue-500/10 text-blue-500'
                            }`}>
                                {confirmModal.type === 'danger' ? <Trash2 size={24} /> : confirmModal.type === 'warning' ? <Award size={24} /> : <Folder size={24} />}
                            </div>
                            <h3 className="font-bold text-base leading-tight">{confirmModal.title}</h3>
                            <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>{confirmModal.message}</p>
                        </div>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                                className={`flex-1 font-bold py-2.5 rounded-xl text-xs transition-colors ${
                                    isDark ? 'bg-white/5 hover:bg-white/10 text-zinc-300' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                                }`}
                            >
                                {confirmModal.cancelText}
                            </button>
                            <button 
                                onClick={confirmModal.onConfirm}
                                className={`flex-1 font-bold py-2.5 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5 ${
                                    confirmModal.type === 'danger' 
                                        ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/15' 
                                        : confirmModal.type === 'warning'
                                            ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/15'
                                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/15'
                                }`}
                            >
                                {confirmModal.confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}