import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { db } from "../../firebase/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import toast from "react-hot-toast";

// Hooks & Utils
import { useTestEditor } from "../../hooks/useTestEditor";
import { checkDuplicateTest } from "../../components/admin/CreateTest/CreateTestUtils";

// Components
import TestPreview from "../../components/admin/TestPreview";
import TestBasicInfo from "../../components/admin/CreateTest/TestBasicInfo";
import MediaManager from "../../components/admin/CreateTest/MediaManager";
import JsonEditor from "../../components/admin/CreateTest/JsonEditor";
import DuplicateModal from "../../components/admin/CreateTest/DuplicateModal";
import WritingSection from "../../components/admin/CreateTest/WritingSection";
import TestValidator, { runValidation } from "../../components/admin/CreateTest/TestValidator";
import ValidationModal from "../../components/admin/CreateTest/ValidationModal";
import TemplateModal from "../../components/admin/CreateTest/TemplateModal";

const DRAFT_KEY = "ielts_admin_draft_new";

const Icons = {
    Back: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>,
    Check: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>,
};

export default function CreateTest() {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const navigate = useNavigate();
    const { id } = useParams();

    const editor = useTestEditor(id);
    const {
        testData, setTestData,
        loading, setLoading,
        uploading, setUploading,
        uploadProgress,
        isEditMode, isMockMode, setIsMockMode,
        isFree, setIsFree,
        publishToFeed, setPublishToFeed,
        jsonInput, setJsonInput, jsonError,
        partAudios, setPartAudios,
        audioMode, setAudioMode,
        singleAudioUrl, setSingleAudioUrl,
        uploadedMaps, setUploadedMaps,
        listeningPartCount,
        uploadingPart, setUploadingPart,
        uploadToFirebase,
        updateTestDataFromJSON,
        handleSave
    } = editor;

    // Local UI states
    const [collections, setCollections] = useState([]);
    const [activeWritingTask, setActiveWritingTask] = useState(0);
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [duplicateInfo, setDuplicateInfo] = useState(null);
    const [panelWidth, setPanelWidth] = useState(50);
    const isResizingPanel = useRef(false);
    const rootPanelRef = useRef(null);

    // Validation modal state
    const [showValidationModal, setShowValidationModal] = useState(false);
    const [pendingValidationErrors, setPendingValidationErrors] = useState([]);

    // Template modal state
    const [showTemplateModal, setShowTemplateModal] = useState(false);

    // Draft restore banner state
    const [draftAvailable, setDraftAvailable] = useState(null);

    // JSON undo/redo history
    const jsonHistoryRef = useRef([]);
    const historyIdxRef = useRef(-1);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    // Validation badge counts
    const { errors: validationErrors, warnings: validationWarnings } = runValidation(testData);

    // Fetch collections
    useEffect(() => {
        const fetchCollections = async () => {
            try {
                const qCols = query(collection(db, "test_collections"));
                const snapCols = await getDocs(qCols);
                const cols = snapCols.docs.map(d => ({ id: d.id, ...d.data() }));
                cols.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
                setCollections(cols);
            } catch (error) { console.error(error); }
        };
        fetchCollections();
    }, []);

    // Check for saved draft on mount (new test only)
    useEffect(() => {
        if (isEditMode) return;
        try {
            const raw = localStorage.getItem(DRAFT_KEY);
            if (!raw) return;
            const draft = JSON.parse(raw);
            if (draft?.testData?.title || (draft?.jsonInput && draft.jsonInput.length > 10)) {
                setDraftAvailable(draft);
            }
        } catch {}
    }, [isEditMode]);

    // Auto-save draft every 30 seconds (new test only)
    useEffect(() => {
        if (isEditMode) return;
        if (!testData.title && !jsonInput) return;
        const timer = setInterval(() => {
            const draft = {
                testData,
                jsonInput,
                isFree,
                isMockMode,
                publishToFeed,
                savedAt: new Date().toISOString()
            };
            localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        }, 30000);
        return () => clearInterval(timer);
    }, [testData, jsonInput, isFree, isMockMode, publishToFeed, isEditMode]);

    // Ctrl+S keyboard shortcut
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handlePreSave();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [testData, jsonInput]);

    // Resize logic
    const handlePanelMouseMove = useCallback((e) => {
        if (!isResizingPanel.current || !rootPanelRef.current) return;
        const rect = rootPanelRef.current.getBoundingClientRect();
        const pct = ((e.clientX - rect.left) / rect.width) * 100;
        setPanelWidth(Math.max(20, Math.min(80, pct)));
    }, []);

    const handlePanelMouseUp = useCallback(() => {
        isResizingPanel.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', handlePanelMouseMove);
        document.removeEventListener('mouseup', handlePanelMouseUp);
    }, [handlePanelMouseMove]);

    const handlePanelResizerMouseDown = useCallback((e) => {
        isResizingPanel.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', handlePanelMouseMove);
        document.addEventListener('mouseup', handlePanelMouseUp);
        e.preventDefault();
    }, [handlePanelMouseMove, handlePanelMouseUp]);

    // JSON undo/redo helpers
    const updateHistoryState = () => {
        setCanUndo(historyIdxRef.current > 0);
        setCanRedo(historyIdxRef.current < jsonHistoryRef.current.length - 1);
    };

    const handleJsonChange = (e) => {
        const newValue = e.target.value;
        const trimmed = jsonHistoryRef.current.slice(0, historyIdxRef.current + 1);
        trimmed.push(newValue);
        if (trimmed.length > 60) trimmed.shift();
        jsonHistoryRef.current = trimmed;
        historyIdxRef.current = trimmed.length - 1;
        setJsonInput(newValue);
        updateTestDataFromJSON(newValue);
        updateHistoryState();
    };

    const handleJsonUndo = useCallback(() => {
        if (historyIdxRef.current > 0) {
            historyIdxRef.current--;
            const prev = jsonHistoryRef.current[historyIdxRef.current];
            setJsonInput(prev);
            updateTestDataFromJSON(prev);
            updateHistoryState();
        }
    }, [setJsonInput, updateTestDataFromJSON]);

    const handleJsonRedo = useCallback(() => {
        if (historyIdxRef.current < jsonHistoryRef.current.length - 1) {
            historyIdxRef.current++;
            const next = jsonHistoryRef.current[historyIdxRef.current];
            setJsonInput(next);
            updateTestDataFromJSON(next);
            updateHistoryState();
        }
    }, [setJsonInput, updateTestDataFromJSON]);

    // Template apply
    const handleApplyTemplate = (templateData) => {
        const json = JSON.stringify(templateData, null, 2);
        setTestData(prev => ({ ...prev, ...templateData }));
        setJsonInput(json);
        updateTestDataFromJSON(json);
        jsonHistoryRef.current = [json];
        historyIdxRef.current = 0;
        updateHistoryState();
        setShowTemplateModal(false);
        toast.success("Shablon qo'llandi!");
    };

    // Draft restore
    const handleRestoreDraft = (draft) => {
        if (draft.testData) setTestData(draft.testData);
        if (draft.jsonInput) {
            setJsonInput(draft.jsonInput);
            updateTestDataFromJSON(draft.jsonInput);
            jsonHistoryRef.current = [draft.jsonInput];
            historyIdxRef.current = 0;
            updateHistoryState();
        }
        if (draft.isFree !== undefined) setIsFree(draft.isFree);
        if (draft.isMockMode !== undefined) setIsMockMode(draft.isMockMode);
        if (draft.publishToFeed !== undefined) setPublishToFeed(draft.publishToFeed);
        setDraftAvailable(null);
        toast.success("Loyiha tiklandi!");
    };

    const handleDiscardDraft = () => {
        localStorage.removeItem(DRAFT_KEY);
        setDraftAvailable(null);
    };

    // Pre-save: validation check → duplicate check → save
    const handlePreSave = async () => {
        const { errors } = runValidation(testData);
        if (errors.length > 0) {
            setPendingValidationErrors(errors);
            setShowValidationModal(true);
            return;
        }
        await runDuplicateAndSave();
    };

    const runDuplicateAndSave = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "tests"), where("type", "==", testData.type));
            const snapshot = await getDocs(q);
            const existingTests = snapshot.docs
                .filter(docSnap => !id || docSnap.id !== id)
                .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));

            const { isDuplicate, duplicateTitle } = await checkDuplicateTest(testData, existingTests);
            if (isDuplicate) {
                setDuplicateInfo(duplicateTitle);
                setShowDuplicateModal(true);
                setLoading(false);
                return;
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
        localStorage.removeItem(DRAFT_KEY);
        handleSave();
    };

    const handlePartAudioUpload = async (e, index) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        setUploadingPart(index);
        try {
            const url = await uploadToFirebase(file, "part_audios");
            setPartAudios(prev => ({ ...prev, [index]: url }));
            setTestData(prev => {
                const newPassages = [...(prev.passages || [])];
                if (!newPassages[index]) newPassages[index] = { id: 100 + index, title: `Part ${index + 1}`, content: "", audio: url };
                else newPassages[index] = { ...newPassages[index], audio: url };
                return { ...prev, passages: newPassages };
            });
        } catch (err) { toast.error(err.message); } finally { setUploading(false); setUploadingPart(null); }
    };

    const handleSingleAudioUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        setUploadingPart('single');
        try {
            const url = await uploadToFirebase(file, "part_audios");
            setSingleAudioUrl(url);
            setTestData(prev => {
                const newPassages = (prev.passages || []).map(p => ({ ...p, audio: url }));
                return { ...prev, passages: newPassages, audio_url: url };
            });
        } catch (err) { toast.error(err.message); } finally { setUploading(false); setUploadingPart(null); }
    };

    const handleMapUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        setUploadingPart('map');
        try {
            const url = await uploadToFirebase(file, "map_images");
            setUploadedMaps(prev => [...prev, { name: file.name, url }]);
            try {
                const parsed = JSON.parse(jsonInput);
                let found = false;
                if (parsed.questions) {
                    parsed.questions = parsed.questions.map(q => {
                        if (q.type === 'map_labeling') { found = true; return { ...q, image: url }; }
                        return q;
                    });
                }
                if (found) {
                    const newJson = JSON.stringify(parsed, null, 2);
                    setJsonInput(newJson);
                    updateTestDataFromJSON(newJson);
                } else {
                    navigator.clipboard.writeText(url);
                    toast.success("Rasm linki nusxalandi!");
                }
            } catch {
                navigator.clipboard.writeText(url);
                toast.success("Rasm linki nusxalandi!");
            }
        } catch (err) { toast.error(err.message); } finally { setUploading(false); setUploadingPart(null); }
    };

    const handleWritingUpdate = (field, value) => {
        setTestData(prev => {
            const newTasks = [...prev.writingTasks];
            newTasks[activeWritingTask] = { ...newTasks[activeWritingTask], [field]: value };
            return { ...prev, writingTasks: newTasks };
        });
    };

    const handleWritingImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        setUploadingPart('writing');
        try {
            const url = await uploadToFirebase(file, "writing_images");
            handleWritingUpdate('image', url);
        } catch (err) { toast.error(err.message); } finally { setUploading(false); setUploadingPart(null); }
    };

    const handlePassageTimeChange = (index, field, value) => {
        setTestData(prev => {
            const newPassages = [...(prev.passages || [])];
            if (!newPassages[index]) {
                newPassages[index] = {
                    id: index + 1,
                    title: `Part ${index + 1}`,
                    content: "",
                    audio: audioMode === 'single' ? singleAudioUrl : (partAudios[index] || "")
                };
            }
            newPassages[index] = { ...newPassages[index], [field]: value };
            return { ...prev, passages: newPassages };
        });
        try {
            if (jsonInput) {
                const parsed = JSON.parse(jsonInput);
                if (parsed.passages) {
                    if (!parsed.passages[index]) {
                        parsed.passages[index] = { id: index + 1, title: `Part ${index + 1}` };
                    }
                    parsed.passages[index][field] = value;
                    setJsonInput(JSON.stringify(parsed, null, 2));
                }
            }
        } catch (e) {
            console.warn("JSON sync skipped:", e.message);
        }
    };

    // Mini validator badge
    const validatorBadge = () => {
        if (!['reading', 'listening'].includes(testData.type)) return null;
        if (validationErrors.length > 0) {
            return (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    {validationErrors.length} xato
                </div>
            );
        }
        if (validationWarnings.length > 0) {
            return (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    {validationWarnings.length} ogohlantirish
                </div>
            );
        }
        return (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 text-[10px] font-black">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Tayyor
            </div>
        );
    };

    if (loading && !testData.title) return (
        <div className="flex h-screen items-center justify-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className={`h-screen flex flex-col transition-colors duration-300 ${isDark ? 'bg-[#121212] text-white' : 'bg-[#F5F5F7] text-gray-900'}`}>

            {/* --- HEADER --- */}
            <div className={`h-16 px-6 flex items-center justify-between border-b shrink-0 z-20 ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate("/admin/tests")}
                        className={`w-10 h-10 flex items-center justify-center rounded-xl transition ${isDark ? 'hover:bg-white/5 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                    >
                        <Icons.Back className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-lg font-black tracking-tight">{isEditMode ? "Testni Tahrirlash" : "Yangi Test"}</h1>
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Admin Panel • {isEditMode ? "Tahrirlash" : "Yaratish"}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {validatorBadge()}
                    <button
                        onClick={handlePreSave}
                        disabled={loading}
                        className="h-10 px-6 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition flex items-center gap-2 active:scale-95 disabled:opacity-50"
                    >
                        {loading
                            ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : <Icons.Check className="w-4 h-4" />
                        }
                        {isEditMode ? "Saqlash" : "Yaratish"}
                    </button>
                </div>
            </div>

            {/* --- DRAFT RESTORE BANNER --- */}
            {draftAvailable && (
                <div className={`shrink-0 px-6 py-2.5 flex items-center justify-between gap-4 border-b ${isDark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
                            Saqlanmagan loyiha topildi
                            {draftAvailable.savedAt && (
                                <span className="font-normal opacity-60 ml-1">
                                    ({new Date(draftAvailable.savedAt).toLocaleString('uz-UZ', { hour: '2-digit', minute: '2-digit' })})
                                </span>
                            )}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => handleRestoreDraft(draftAvailable)}
                            className="h-7 px-3 rounded-lg bg-amber-500 text-white text-[11px] font-black hover:bg-amber-600 transition active:scale-95"
                        >
                            Davom etish
                        </button>
                        <button
                            onClick={handleDiscardDraft}
                            className={`h-7 px-3 rounded-lg text-[11px] font-black border transition active:scale-95 ${isDark ? 'border-white/10 hover:bg-white/5 text-gray-400' : 'border-gray-200 hover:bg-gray-100 text-gray-600'}`}
                        >
                            O'chirish
                        </button>
                    </div>
                </div>
            )}

            {/* --- MAIN CONTENT --- */}
            <div ref={rootPanelRef} className="flex-1 flex overflow-hidden relative">

                {/* LEFT PANEL: EDITOR */}
                <div
                    className="h-full overflow-y-auto custom-scrollbar p-6"
                    style={{ width: `${panelWidth}%` }}
                >
                    <div className="max-w-3xl mx-auto space-y-6">
                        {(testData.type === 'reading' || testData.type === 'listening') && (
                            <TestValidator testData={testData} isDark={isDark} />
                        )}
                        <TestBasicInfo
                            testData={testData}
                            setTestData={setTestData}
                            collections={collections}
                            isDark={isDark}
                            isFree={isFree}
                            setIsFree={setIsFree}
                            isMockMode={isMockMode}
                            setIsMockMode={setIsMockMode}
                            publishToFeed={publishToFeed}
                            setPublishToFeed={setPublishToFeed}
                            isEditMode={isEditMode}
                        />

                        <MediaManager
                            testData={testData}
                            setTestData={setTestData}
                            audioMode={audioMode}
                            setAudioMode={setAudioMode}
                            singleAudioUrl={singleAudioUrl}
                            handleSingleAudioUpload={handleSingleAudioUpload}
                            handleSingleAudioUrlChange={setSingleAudioUrl}
                            partAudios={partAudios}
                            handlePartAudioUpload={handlePartAudioUpload}
                            handleAudioUrlChange={(url, i) => setPartAudios(p => ({ ...p, [i]: url }))}
                            listeningPartCount={listeningPartCount}
                            uploadedMaps={uploadedMaps}
                            handleMapUpload={handleMapUpload}
                            handleDeleteMap={(i) => setUploadedMaps(p => p.filter((_, idx) => idx !== i))}
                            uploading={uploading}
                            uploadingPart={uploadingPart}
                            isDark={isDark}
                            onPassageTimeChange={handlePassageTimeChange}
                        />

                        {testData.type === 'writing' && (
                            <WritingSection
                                testData={testData}
                                activeWritingTask={activeWritingTask}
                                setActiveWritingTask={setActiveWritingTask}
                                handleWritingUpdate={handleWritingUpdate}
                                handleWritingImageUpload={handleWritingImageUpload}
                                uploading={uploading}
                                uploadingPart={uploadingPart}
                                isDark={isDark}
                            />
                        )}

                        <JsonEditor
                            jsonInput={jsonInput}
                            handleJsonChange={handleJsonChange}
                            jsonError={jsonError}
                            isDark={isDark}
                            handleUndo={handleJsonUndo}
                            handleRedo={handleJsonRedo}
                            canUndo={canUndo}
                            canRedo={canRedo}
                            onOpenTemplate={!isEditMode ? () => setShowTemplateModal(true) : null}
                        />
                    </div>
                </div>

                {/* RESIZER */}
                <div
                    onMouseDown={handlePanelResizerMouseDown}
                    className={`w-1.5 h-full cursor-col-resize hover:bg-blue-500/30 transition-colors z-10 shrink-0 ${isDark ? 'bg-white/5' : 'bg-gray-200'}`}
                />

                {/* RIGHT PANEL: PREVIEW */}
                <div className={`h-full overflow-hidden flex-1 ${isDark ? 'bg-[#0A0A0A]' : 'bg-gray-50'}`}>
                    <div className="h-full overflow-y-auto p-6 custom-scrollbar">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-[10px] font-black uppercase tracking-widest opacity-30">Jonli Ko'rinish</h3>
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 text-[9px] font-bold border border-blue-500/10">
                                <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
                                JONLI
                            </div>
                        </div>
                        <TestPreview testData={testData} testType={testData.type} />
                    </div>
                </div>
            </div>

            {/* DUPLICATE MODAL */}
            <DuplicateModal
                show={showDuplicateModal}
                duplicateInfo={duplicateInfo}
                onConfirm={() => { setShowDuplicateModal(false); localStorage.removeItem(DRAFT_KEY); handleSave(true); }}
                onCancel={() => setShowDuplicateModal(false)}
                isDark={isDark}
            />

            {/* VALIDATION MODAL */}
            <ValidationModal
                show={showValidationModal}
                errors={pendingValidationErrors}
                onConfirm={() => { setShowValidationModal(false); runDuplicateAndSave(); }}
                onCancel={() => setShowValidationModal(false)}
                isDark={isDark}
            />

            {/* TEMPLATE MODAL */}
            <TemplateModal
                show={showTemplateModal}
                onSelect={handleApplyTemplate}
                onBlank={() => setShowTemplateModal(false)}
                isDark={isDark}
            />

            {/* UPLOAD OVERLAY */}
            {uploading && (
                <div className="fixed bottom-6 right-6 z-[100] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-blue-500/20 p-4 min-w-[200px] animate-in slide-in-from-bottom-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-blue-500/10 rounded-xl flex items-center justify-center">
                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-wider">Yuklanmoqda...</p>
                            <p className="text-[10px] opacity-50">Fayl tizimga yuklanmoqda</p>
                        </div>
                    </div>
                    <div className="h-1.5 w-full bg-gray-500/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-500 transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
