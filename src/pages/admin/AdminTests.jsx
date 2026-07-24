import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { db } from "../../firebase/firebase";
import toast from "react-hot-toast";

// Hooks & Components
import { useAdminTests } from "../../hooks/useAdminTests";
import AdminTestsToolbar from "../../components/admin/AdminTests/AdminTestsToolbar";
import AdminTestsList from "../../components/admin/AdminTests/AdminTestsList";
import AdminTestsGrid from "../../components/admin/AdminTests/AdminTestsGrid";
import BulkActionBar from "../../components/admin/AdminTests/BulkActionBar";
import Pagination from "../../components/common/Pagination";
import { Loader2, Layers, Award, BookOpen, Headphones, PenTool, Mic2, Globe, Lock, Sparkles, Settings, Folder } from "lucide-react";

// Extracted Modals
import ConfirmModal from "../../components/admin/AdminTests/ConfirmModal";
import CollectionModal from "../../components/admin/AdminTests/CollectionModal";
import MockExamModal from "../../components/admin/AdminTests/MockExamModal";
import QuickEditModal from "../../components/admin/AdminTests/QuickEditModal";
import BulkAssignModal from "../../components/admin/AdminTests/BulkAssignModal";
import MergeModal from "../../components/admin/AdminTests/MergeModal";
import QuestionBankModal from "../../components/admin/AdminTests/QuestionBankModal";
import FindDuplicatesModal from "../../components/admin/AdminTests/FindDuplicatesModal";

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
    const [showStats, setShowStats] = useState(() => {
        const saved = localStorage.getItem("admin_show_stats");
        return saved !== null ? JSON.parse(saved) : true;
    });

    const toggleStats = () => {
        setShowStats(prev => {
            const next = !prev;
            localStorage.setItem("admin_show_stats", JSON.stringify(next));
            return next;
        });
    };

    // Modals Visibility States
    const [collectionModalOpen, setCollectionModalOpen] = useState(false);
    const [questionBankOpen, setQuestionBankOpen] = useState(false);
    const [bulkAssignModalOpen, setBulkAssignModalOpen] = useState(false);
    const [mergeModalOpen, setMergeModalOpen] = useState(false);
    const [mockExamModalOpen, setMockExamModalOpen] = useState(false);
    const [quickEditModalOpen, setQuickEditModalOpen] = useState(false);
    const [duplicatesModalOpen, setDuplicatesModalOpen] = useState(false);

    // Active Edit Objects
    const [editingCol, setEditingCol] = useState(null); 
    const [editingMock, setEditingMock] = useState(null);
    const [editingTest, setEditingTest] = useState(null);
    const [highlightedTestId, setHighlightedTestId] = useState(null);
    const [previousFilterCollection, setPreviousFilterCollection] = useState(null);
    const [audioSearch, setAudioSearch] = useState("");
    const [audioSearchResult, setAudioSearchResult] = useState(null);

    const handleAudioSearch = async () => {
        if (!audioSearch.trim()) return;
        setAudioSearchResult("Qidirilmoqda...");
        try {
            const { getDocs, collection } = await import("firebase/firestore");
            const querySnapshot = await getDocs(collection(db, "tests"));
            let results = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.audioUrl && data.audioUrl.includes(audioSearch)) {
                    results.push(`✅ Test ID: ${doc.id} | Sarlavha: ${data.title} (Umumiy audio)`);
                }
                if (data.passages && Array.isArray(data.passages)) {
                    data.passages.forEach((p, idx) => {
                        if ((p.audio && p.audio.includes(audioSearch)) || (p.audioUrl && p.audioUrl.includes(audioSearch))) {
                            results.push(`✅ Test ID: ${doc.id} | Sarlavha: ${data.title} | Part: ${idx + 1}`);
                        }
                    });
                }
            });
            const podcastsSnap = await getDocs(collection(db, "podcasts"));
            podcastsSnap.forEach((doc) => {
                const data = doc.data();
                if (data.audioUrl && data.audioUrl.includes(audioSearch)) {
                    results.push(`🎙️ Podcast ID: ${doc.id} | Sarlavha: ${data.title}`);
                }
            });
            if (results.length > 0) {
                setAudioSearchResult(results.join("\n"));
            } else {
                setAudioSearchResult("❌ Hech qanday test yoki podcast topilmadi.");
            }
        } catch (error) {
            setAudioSearchResult("Xatolik yuz berdi: " + error.message);
        }
    };

    const handleHighlightTest = (id) => {
        setHighlightedTestId(id);
        if (previousFilterCollection === null) {
            setPreviousFilterCollection(filterCollection);
        }
        setTimeout(() => {
            setHighlightedTestId(prev => prev === id ? null : prev);
        }, 5000);
    };

    const handleSelectCollectionAndClearBack = (colId) => {
        setFilterCollection(colId);
        setPreviousFilterCollection(null);
    };
    
    const {
        // States
        tests, collections, loading, totalTestCount, currentPage,
        isBackgroundRefreshing, stats, allTests,
        searchTerm, setSearchTerm,
        contentSearchTerm, setContentSearchTerm,
        filterType, setFilterType,
        filterCollection, setFilterCollection,
        filterStatus, setFilterStatus,
        filterAccess, setFilterAccess,
        filterTag, setFilterTag,
        allAvailableTags,
        sortBy, setSortBy,
        sortOrder, setSortOrder,

        // Actions
        handleDelete, bulkDeleteTests, bulkAssignToCollection,
        bulkUpdateStatus, bulkUpdateIsFree, duplicateTest, importTests,
        addCollection, updateCollection, deleteCollection, updateTestMetadata,
        fetchInitial, fetchPage
    } = useAdminTests(12);

    // Compute available tests list client-side for mock selection dropdowns (saves Firestore reads)
    const allAvailableTests = useMemo(() => {
        if (!allTests) return { reading: [], listening: [], writing: [] };
        const sorted = [...allTests].sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeB - timeA;
        });
        return {
            reading: sorted.filter(t => t.type === 'reading'),
            listening: sorted.filter(t => t.type === 'listening'),
            writing: sorted.filter(t => t.type === 'writing')
        };
    }, [allTests]);

    // Open Collection handlers
    const handleOpenAddCollection = () => {
        setEditingCol(null);
        setCollectionModalOpen(true);
    };

    const handleOpenEditCollection = (col) => {
        setEditingCol(col);
        setCollectionModalOpen(true);
    };

    const handleOpenEditMockExam = (mockTest) => {
        setEditingMock(mockTest);
        setMockExamModalOpen(true);
    };

    const handleOpenQuickEdit = (test) => {
        setEditingTest(test);
        setQuickEditModalOpen(true);
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
                try {
                    const ok = await deleteCollection(editingCol.id);
                    if (!ok) throw new Error("Database delete failed");
                    setCollectionModalOpen(false);
                    setEditingCol(null);
                    if (filterCollection === editingCol.id) {
                        setFilterCollection("All");
                    }
                    toast.success("To'plam muvaffaqiyatli o'chirildi! 🗑️");
                } catch (err) {
                    toast.error("To'plamni o'chirishda xatolik yuz berdi: " + err.message);
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

    // Guruhli amallar handlers
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
            const selectedObjects = allTests.filter(t => selectedTests.includes(t.id));
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

    const handleOpenMerge = () => {
        if (selectedTests.length < 2) {
            toast.error("Birlashtirish uchun kamida 2 ta test tanlanishi kerak.");
            return;
        }
        const selectedObjects = allTests.filter(t => selectedTests.includes(t.id));
        const firstType = selectedObjects[0]?.type || "reading";
        const allSameType = selectedObjects.every(t => (t.type || "reading") === firstType);
        if (!allSameType) {
            toast.error("Faqat bir xil turdagi testlarni birlashtirish mumkin (masalan, faqat Reading yoki faqat Listening).");
            return;
        }
        setMergeModalOpen(true);
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

                            let combinedContent = "";
                            if (payload.passages && Array.isArray(payload.passages)) {
                                payload.passages.forEach(p => {
                                    if (p.title) combinedContent += p.title + " ";
                                    if (p.content) {
                                        const cleanText = p.content.replace(/<[^>]*>/g, ' ');
                                        combinedContent += cleanText + " ";
                                    }
                                });
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
                                isPublic: payload.isPublic !== undefined ? payload.isPublic : false,
                                createdAt: payload.createdAt || new Date().toISOString(),
                                updatedAt: payload.updatedAt || new Date().toISOString(),
                                questionTypes: payload.questionTypes || getQuestionTypesFromQuestions(payload.questions || []),
                                collectionId: payload.collectionId && payload.collectionId !== "None" ? payload.collectionId : null,
                                thumbnail: payload.thumbnail || "",
                                isMerged: payload.isMerged || payload.title?.toLowerCase().startsWith("merged:") || false,
                                combinedContent: combinedContent.trim()
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

                            // ✅ Use merge:true to preserve existing thumbnail and other fields
                            // that may have been set manually (e.g. via test editor).
                            // Without merge, setDoc would overwrite and lose the thumbnail.
                            const { getDoc: _getDoc } = await import("firebase/firestore");
                            const existingMetaSnap = await _getDoc(doc(db, "tests_metadata", testId));
                            const existingThumbnail = existingMetaSnap.exists() 
                                ? (existingMetaSnap.data().thumbnail || "") 
                                : "";
                            
                            // Use existing thumbnail if tests collection doesn't have one
                            if (!metadata.thumbnail && existingThumbnail) {
                                metadata.thumbnail = existingThumbnail;
                            }

                            await setDoc(doc(db, "tests_metadata", testId), metadata, { merge: true });
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
    const mergedCount = useMemo(() => {
        return allTests.filter(t => t.isMerged || t.title?.toLowerCase().startsWith("merged:")).length;
    }, [allTests]);

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
                    contentSearchTerm={contentSearchTerm}
                    setContentSearchTerm={setContentSearchTerm}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    onCreate={() => navigate("/admin/create-test")}
                    collections={collections}
                    filterCollection={filterCollection}
                    setFilterCollection={handleSelectCollectionAndClearBack}
                    filterType={filterType}
                    setFilterType={setFilterType}
                    totalTestCount={totalTestCount}
                    mergedCount={mergedCount}
                    onAddCollection={handleOpenAddCollection}
                    onEditCollection={handleOpenEditCollection}
                    onMigrate={handleMigrateMetadata}
                    isMigrating={isMigrating}
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
                    onImport={() => document.getElementById("import-json-file").click()}
                    onOpenQuestionBank={() => setQuestionBankOpen(true)}
                    onFindDuplicates={() => setDuplicatesModalOpen(true)}
                    showStats={showStats}
                    onToggleStats={toggleStats}
                />
 
                {/* Vaqtincha audio qidirish UI */}
                <div className={`mx-6 mt-4 p-4 rounded-xl border ${isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200'} shrink-0`}>
                    <div className="flex gap-2 items-center">
                        <input 
                            type="text" 
                            placeholder="Audio URL yoki fayl nomini qidiring (masalan: 170564...)" 
                            value={audioSearch}
                            onChange={(e) => setAudioSearch(e.target.value)}
                            className={`flex-1 px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        />
                        <button 
                            onClick={handleAudioSearch}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                        >
                            Qidirish
                        </button>
                        {audioSearchResult && (
                            <button onClick={() => setAudioSearchResult(null)} className="px-3 py-2 bg-red-100 text-red-600 hover:bg-red-200 text-sm font-medium rounded-lg transition-colors whitespace-nowrap">
                                Tozalash
                            </button>
                        )}
                    </div>
                    {audioSearchResult && (
                        <pre className={`mt-3 p-3 rounded-lg text-xs whitespace-pre-wrap ${isDark ? 'bg-zinc-900 text-zinc-300' : 'bg-zinc-100 text-zinc-700'}`}>
                            {audioSearchResult}
                        </pre>
                    )}
                </div>

                {/* Dashboard stats panel */}
                {stats && showStats && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-2.5 px-6 pt-4 pb-2 shrink-0 select-none">
                        {[
                            { title: "Tests", value: stats.total, icon: <Layers size={13} />, color: "from-blue-500/10 to-indigo-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25" },
                            { title: "Mock", value: stats.mockCount, icon: <Award size={13} />, color: "from-rose-500/10 to-pink-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25" },
                            { title: "Reading", value: stats.readingCount, icon: <BookOpen size={13} />, color: "from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25" },
                            { title: "Listening", value: stats.listeningCount, icon: <Headphones size={13} />, color: "from-amber-500/10 to-orange-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25" },
                            { title: "Writing", value: stats.writingCount, icon: <PenTool size={13} />, color: "from-violet-500/10 to-purple-500/10 text-violet-600 dark:text-violet-400 border-violet-500/25" },
                            { title: "Speaking", value: stats.speakingCount, icon: <Mic2 size={13} />, color: "from-fuchsia-500/10 to-pink-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/25" },
                            { title: "Public", value: stats.publicCount, icon: <Globe size={13} />, color: "from-teal-500/10 to-green-500/10 text-teal-600 dark:text-teal-400 border-teal-500/25" },
                            { title: "Private", value: stats.privateCount, icon: <Lock size={13} />, color: "from-zinc-500/10 to-neutral-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/25" },
                            { title: "Free", value: stats.freeCount, icon: <Sparkles size={13} />, color: "from-cyan-500/10 to-sky-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/25" }
                        ].map((card, i) => (
                            <div key={i} className={`py-2 px-3 rounded-xl border bg-gradient-to-br ${card.color} shadow-sm flex items-center justify-between hover:scale-[1.02] transition-transform duration-200`}>
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="opacity-70 shrink-0">{card.icon}</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60 truncate">{card.title}</span>
                                </div>
                                <span className="text-sm font-black tracking-tight shrink-0 ml-2">{card.value}</span>
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

                            {/* Collection Info Banner */}
                            {(() => {
                                const currentColl = collections.find(c => c.id === filterCollection);
                                if (!currentColl) return null;
                                return (
                                    <div className={`mb-6 p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors duration-200 ${
                                        isDark 
                                            ? 'bg-white/5 border-white/5 text-white' 
                                            : 'bg-zinc-50 border-zinc-200 text-zinc-900'
                                    }`}>
                                        <div className="flex items-center gap-4.5">
                                            <div className={`w-12 h-12 rounded-lg overflow-hidden border flex items-center justify-center shrink-0 ${
                                                isDark ? 'bg-white/5 border-white/10' : 'bg-white border-zinc-200'
                                            }`}>
                                                {currentColl.thumbnail ? (
                                                    <img src={currentColl.thumbnail} className="w-full h-full object-cover" alt="" />
                                                ) : (
                                                    <Folder className={
                                                        currentColl.type === 'listening' ? 'text-amber-500' :
                                                        currentColl.type === 'reading' ? 'text-emerald-500' :
                                                        currentColl.type === 'mock' ? 'text-blue-500' : 'text-zinc-400'
                                                    } size={20} />
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-base leading-snug">{currentColl.name}</h3>
                                                    <button
                                                        onClick={() => handleOpenEditCollection(currentColl)}
                                                        className={`p-1.5 rounded-lg border transition-all active:scale-95 flex items-center justify-center shrink-0 ${
                                                            isDark 
                                                                ? 'bg-white/5 border-white/10 hover:bg-white/10 text-zinc-300' 
                                                                : 'bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-600'
                                                        }`}
                                                        title="To'plam sozlamalari"
                                                    >
                                                        <Settings size={14} className="hover:rotate-45 transition-transform duration-200" />
                                                    </button>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                                                        currentColl.type === 'listening' ? 'bg-amber-500/10 text-amber-500' :
                                                        currentColl.type === 'reading' ? 'bg-emerald-500/10 text-emerald-500' :
                                                        'bg-blue-500/10 text-blue-500'
                                                    }`}>
                                                        {currentColl.type}
                                                    </span>
                                                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1 ${
                                                        currentColl.isPublic !== false 
                                                            ? 'bg-emerald-500/10 text-emerald-600' 
                                                            : 'bg-zinc-500/10 text-zinc-500'
                                                    }`}>
                                                        {currentColl.isPublic !== false ? <Globe size={9} /> : <Lock size={9} />}
                                                        {currentColl.isPublic !== false ? 'Public' : 'Private'}
                                                    </span>
                                                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1 ${
                                                        currentColl.accessTier === 'free' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                                                        currentColl.accessTier === 'standard' ? 'bg-blue-500/10 text-blue-600' :
                                                        'bg-amber-500/10 text-amber-500'
                                                    }`}>
                                                        {currentColl.accessTier === 'free' ? 'FREE' :
                                                         currentColl.accessTier === 'standard' ? 'STANDARD' :
                                                         'PRO'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border ${
                                                isDark ? 'bg-white/5 border-white/5' : 'bg-white border-zinc-200'
                                            }`}>
                                                {filteredTests.length} ta test
                                            </span>
                                        </div>
                                    </div>
                                );
                            })()}

                            {previousFilterCollection !== null && (
                                <div className={`mb-4 flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                                    isDark 
                                        ? 'bg-purple-500/5 border-purple-500/20 text-white' 
                                        : 'bg-purple-50 border-purple-200 text-zinc-900'
                                }`}>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded bg-purple-600 text-white">Navigatsiya</span>
                                        <span className="text-xs font-bold opacity-80">Birlashtirilgan testga (Source) o'tildi. Oldingi ro'yxatga qaytishni xohlaysizmi?</span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setFilterCollection(previousFilterCollection);
                                            setPreviousFilterCollection(null);
                                        }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-black shadow-sm transition-all active:scale-95"
                                    >
                                        ⬅️ Orqaga qaytish
                                    </button>
                                </div>
                            )}

                            {(() => {
                                const listProps = {
                                    tests: filteredTests,
                                    collections,
                                    allTests,
                                    onSelectCollection: setFilterCollection,
                                    searchTerm,
                                    contentSearchTerm,
                                    highlightedTestId,
                                    onHighlightTest: handleHighlightTest,
                                    selectedTests,
                                    onToggleSelect: handleToggleSelect,
                                    onSelectAll: (checked) => {
                                        if (checked) setSelectedTests(filteredTests.map(t => t.id));
                                        else setSelectedTests([]);
                                    },
                                    onDelete: handleConfirmDeleteTest,
                                    onDuplicate: handleDuplicateTest,
                                    onEdit: (id) => {
                                        const test = tests.find(t => t.id === id);
                                        if (test && test.type === 'mock') handleOpenEditMockExam(test);
                                        else navigate(`/admin/edit-test/${id}`);
                                    },
                                    onQuickEdit: handleOpenQuickEdit,
                                    onView: (id) => navigate(`/test/${id}`, { state: { from: "/admin/tests" } })
                                };
                                return viewMode === 'grid'
                                    ? <AdminTestsGrid {...listProps} />
                                    : <AdminTestsList {...listProps} />;
                            })()}

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

            <BulkActionBar
                selectedCount={selectedTests.length}
                onClear={() => setSelectedTests([])}
                onBulkAssign={() => setBulkAssignModalOpen(true)}
                onMerge={handleOpenMerge}
                onBulkStatusChange={handleBulkStatusChange}
                onBulkAccessChange={handleBulkAccessChange}
                onExportJSON={handleExportJSON}
                onExportCSV={handleExportCSV}
                onBulkDelete={handleBulkDelete}
            />

            {/* QUESTION BANK MODAL */}
            <QuestionBankModal
                isOpen={questionBankOpen}
                onClose={() => setQuestionBankOpen(false)}
                allAvailableTests={allAvailableTests}
            />

            <FindDuplicatesModal
                isOpen={duplicatesModalOpen}
                onClose={() => setDuplicatesModalOpen(false)}
                onDeleteTest={handleConfirmDeleteTest}
            />

            {/* COLLECTION MODAL (ADD / EDIT) */}
            <CollectionModal
                isOpen={collectionModalOpen}
                onClose={() => { setCollectionModalOpen(false); setEditingCol(null); }}
                editingCol={editingCol}
                allAvailableTests={allAvailableTests}
                addCollection={addCollection}
                updateCollection={updateCollection}
                onDelete={handleDeleteCollection}
            />

            {/* EDIT MOCK EXAM MODAL */}
            <MockExamModal
                isOpen={mockExamModalOpen}
                onClose={() => { setMockExamModalOpen(false); setEditingMock(null); }}
                editingMock={editingMock}
                collections={collections}
                allAvailableTests={allAvailableTests}
                onSaved={() => fetchInitial(filterType, filterCollection)}
            />

            {/* BULK ASSIGN TO COLLECTION MODAL */}
            <BulkAssignModal
                isOpen={bulkAssignModalOpen}
                onClose={() => setBulkAssignModalOpen(false)}
                selectedTests={selectedTests}
                collections={collections}
                bulkAssignToCollection={bulkAssignToCollection}
                onSaved={() => setSelectedTests([])}
            />

            {/* MERGE MODAL */}
            <MergeModal
                isOpen={mergeModalOpen}
                onClose={() => setMergeModalOpen(false)}
                selectedTests={selectedTests}
                tests={allTests}
                onSaved={() => { setSelectedTests([]); fetchInitial(filterType, filterCollection); }}
            />

            {/* QUICK EDIT MODAL */}
            <QuickEditModal
                isOpen={quickEditModalOpen}
                onClose={() => { setQuickEditModalOpen(false); setEditingTest(null); }}
                editingTest={editingTest}
                collections={collections}
                updateTestMetadata={updateTestMetadata}
                onSaved={() => {}}
            />

            {/* CUSTOM CONFIRM MODAL */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText={confirmModal.confirmText}
                cancelText={confirmModal.cancelText}
                onConfirm={confirmModal.onConfirm}
                type={confirmModal.type}
            />
        </div>
    );
}