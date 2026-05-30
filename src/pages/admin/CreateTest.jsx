import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { db } from "../../firebase/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

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

// --- ICONS ---
const Icons = {
    Back: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>,
    Check: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
};

export default function CreateTest() {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const navigate = useNavigate();
    const { id } = useParams();

    // Use our custom hook
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

    // Handlers mapped to Editor Hook
    const handleJsonChange = (e) => {
        setJsonInput(e.target.value);
        updateTestDataFromJSON(e.target.value);
    };

    const handlePreSave = async () => {
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
        } catch (err) { alert(err.message); } finally { setUploading(false); setUploadingPart(null); }
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
        } catch (err) { alert(err.message); } finally { setUploading(false); setUploadingPart(null); }
    };

    const handleMapUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        setUploadingPart('map');
        try {
            const url = await uploadToFirebase(file, "map_images");
            setUploadedMaps(prev => [...prev, { name: file.name, url }]);
            // Auto-inject into JSON if map_labeling found
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
                    alert("Rasm linki nusxalandi!");
                }
            } catch (e) { 
                navigator.clipboard.writeText(url);
                alert("Rasm linki nusxalandi!");
            }
        } catch (err) { alert(err.message); } finally { setUploading(false); setUploadingPart(null); }
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
        } catch (err) { alert(err.message); } finally { setUploading(false); setUploadingPart(null); }
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
                        parsed.passages[index] = {
                            id: index + 1,
                            title: `Part ${index + 1}`
                        };
                    }
                    parsed.passages[index][field] = value;
                    setJsonInput(JSON.stringify(parsed, null, 2));
                }
            }
        } catch (e) {
            console.warn("JSON sync skipped due to parsing error:", e.message);
        }
    };

    if (loading && !testData.title) return (
        <div className="flex h-screen items-center justify-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className={`h-screen flex flex-col transition-colors duration-300 ${isDark ? 'bg-[#121212] text-white' : 'bg-[#F5F5F7] text-gray-900'}`}>
            {/* --- HEADER --- */}
            <div className={`h-16 px-6 flex items-center justify-between border-b shrink-0 z-20 ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate("/admin/tests")} className={`w-10 h-10 flex items-center justify-center rounded-xl transition ${isDark ? 'hover:bg-white/5 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                        <Icons.Back className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-lg font-black tracking-tight">{isEditMode ? "Testni Tahrirlash" : "Yangi Test"}</h1>
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Admin Panel • Create</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {!isEditMode && (
                        <div className="flex items-center gap-2 mr-2 px-3 py-1.5 rounded-xl bg-gray-500/5 border border-white/5">
                            <span className="text-[10px] font-bold uppercase tracking-wider opacity-50">Feedga post qilish?</span>
                            <button 
                                onClick={() => setPublishToFeed(!publishToFeed)}
                                className={`w-10 h-5 rounded-full p-1 transition-all duration-300 ${publishToFeed ? 'bg-blue-600' : 'bg-gray-400'}`}
                            >
                                <div className={`w-3 h-3 bg-white rounded-full transition-transform duration-300 ${publishToFeed ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    )}

                    <div className="flex items-center gap-2 mr-2 px-3 py-1.5 rounded-xl bg-gray-500/5 border border-white/5">
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-50">Is Free?</span>
                        <button 
                            onClick={() => setIsFree(!isFree)}
                            className={`w-10 h-5 rounded-full p-1 transition-all duration-300 ${isFree ? 'bg-blue-600' : 'bg-gray-400'}`}
                        >
                            <div className={`w-3 h-3 bg-white rounded-full transition-transform duration-300 ${isFree ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    <div className="flex items-center gap-2 mr-4 px-3 py-1.5 rounded-xl bg-gray-500/5 border border-white/5">
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-50">Is Exclusive?</span>
                        <button 
                            onClick={() => setIsMockMode(!isMockMode)}
                            className={`w-10 h-5 rounded-full p-1 transition-all duration-300 ${isMockMode ? 'bg-blue-600' : 'bg-gray-400'}`}
                        >
                            <div className={`w-3 h-3 bg-white rounded-full transition-transform duration-300 ${isMockMode ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>
                    
                    <button
                        onClick={handlePreSave}
                        disabled={loading}
                        className="h-10 px-6 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition flex items-center gap-2 active:scale-95 disabled:opacity-50"
                    >
                        {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Icons.Check className="w-4 h-4" />}
                        {isEditMode ? "Saqlash" : "Yaratish"}
                    </button>
                </div>
            </div>

            {/* --- MAIN CONTENT --- */}
            <div ref={rootPanelRef} className="flex-1 flex overflow-hidden relative">
                
                {/* LEFT PANEL: EDITOR */}
                <div 
                    className="h-full overflow-y-auto custom-scrollbar p-6"
                    style={{ width: `${panelWidth}%` }}
                >
                    <div className="max-w-3xl mx-auto space-y-6">
                        <TestBasicInfo 
                            testData={testData} 
                            setTestData={setTestData} 
                            collections={collections} 
                            isDark={isDark} 
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
                            handleAudioUrlChange={(url, i) => setPartAudios(p => ({...p, [i]: url}))}
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
                            <h3 className="text-[10px] font-black uppercase tracking-widest opacity-30">Real-time Preview</h3>
                            <div className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 text-[9px] font-bold border border-blue-500/10">LIVE</div>
                        </div>
                        <TestPreview testData={testData} testType={testData.type} />
                    </div>
                </div>
            </div>

            {/* DUPLICATE MODAL */}
            <DuplicateModal 
                show={showDuplicateModal}
                duplicateInfo={duplicateInfo}
                onConfirm={() => { setShowDuplicateModal(false); handleSave(true); }}
                onCancel={() => setShowDuplicateModal(false)}
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
                            <p className="text-xs font-black uppercase tracking-wider">Uploading...</p>
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