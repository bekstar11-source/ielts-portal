import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
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
import LeaveConfirmModal from "../../components/admin/CreateTest/LeaveConfirmModal";
import AutoFixModal from "../../components/admin/CreateTest/AutoFixModal";
import AnswerKeyPanel from "../../components/admin/CreateTest/AnswerKeyPanel";
import AnswerImportModal from "../../components/admin/CreateTest/AnswerImportModal";
import PublishChecklistModal from "../../components/admin/CreateTest/PublishChecklistModal";
import CommandPalette from "../../components/admin/CreateTest/CommandPalette";
import ConfirmDialog from "../../components/admin/CreateTest/ConfirmDialog";
import DiffModal from "../../components/admin/CreateTest/DiffModal";
import { jsonOffsetForPath, lineOfOffset } from "../../components/admin/CreateTest/TestDoctor";

const DRAFT_KEY = "ielts_admin_draft_new";
// Mavjud testni tahrirlashda ham avto-saqlash ishlaydi — har bir test uchun alohida kalit
const draftKeyFor = (id) => (id ? `ielts_admin_draft_${id}` : DRAFT_KEY);
const PANEL_KEY = "ielts_admin_createtest_panel";
const VIEW_KEY = "ielts_admin_createtest_view";
const AUTOSAVE_MS = 15000;

const Icons = {
    Back: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>,
    Check: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>,
    Editor: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>,
    Split: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 5.25h16.5v13.5H3.75zM12 5.25v13.5" /></svg>,
    Eye: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    Cloud: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-.41-8.98 4.5 4.5 0 018.4-2.32A5.25 5.25 0 0121 13.5a4.5 4.5 0 01-4.5 4.5H6.75z" /></svg>,
};

// Fayl darajasida — komponent CreateTest ichida e'lon qilinganda har renderda yangi
// tur sifatida ko'rinib, butun switch qayta mount bo'lardi (ko'zga tashlanadigan pirpirash).
const ViewModeSwitch = memo(function ViewModeSwitch({ isWide, effectiveMode, setViewMode, isDark }) {
    const options = isWide
        ? [{ key: 'editor', label: 'Tahrir', Icon: Icons.Editor }, { key: 'split', label: 'Ikkisi', Icon: Icons.Split }, { key: 'preview', label: "Ko'rinish", Icon: Icons.Eye }]
        : [{ key: 'editor', label: 'Tahrir', Icon: Icons.Editor }, { key: 'preview', label: "Ko'rinish", Icon: Icons.Eye }];
    return (
        <div className={`flex items-center gap-0.5 p-1 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
            {options.map((opt) => {
                const active = effectiveMode === opt.key;
                return (
                    <button
                        key={opt.key}
                        type="button"
                        onClick={() => setViewMode(opt.key)}
                        aria-pressed={active}
                        title={opt.label}
                        className={`h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-[11px] font-bold transition ${active ? 'bg-blue-600 text-white shadow-sm' : (isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900')}`}
                    >
                        <opt.Icon className="w-3.5 h-3.5" />
                        <span className="hidden xl:inline">{opt.label}</span>
                    </button>
                );
            })}
        </div>
    );
});

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
    const isResizingPanel = useRef(false);
    const rootPanelRef = useRef(null);
    const validatorRef = useRef(null);

    // Panel width (persisted)
    const [panelWidth, setPanelWidth] = useState(() => {
        const saved = Number(localStorage.getItem(PANEL_KEY));
        return saved >= 20 && saved <= 80 ? saved : 50;
    });
    useEffect(() => { localStorage.setItem(PANEL_KEY, String(Math.round(panelWidth))); }, [panelWidth]);

    // View mode: 'editor' | 'split' | 'preview' (persisted)
    const [viewMode, setViewMode] = useState(() => localStorage.getItem(VIEW_KEY) || 'split');
    useEffect(() => { localStorage.setItem(VIEW_KEY, viewMode); }, [viewMode]);

    // Responsive: split view only makes sense on wide screens
    const [isWide, setIsWide] = useState(() => typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true);
    useEffect(() => {
        const mq = window.matchMedia('(min-width: 1024px)');
        const onChange = (e) => setIsWide(e.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    const effectiveMode = isWide ? viewMode : (viewMode === 'preview' ? 'preview' : 'editor');
    const showEditor = effectiveMode !== 'preview';
    const showPreview = effectiveMode !== 'editor';
    const isSplit = effectiveMode === 'split';

    // Validation modal state
    const [showValidationModal, setShowValidationModal] = useState(false);
    const [pendingValidationErrors, setPendingValidationErrors] = useState([]);

    // Template modal state
    const [showTemplateModal, setShowTemplateModal] = useState(false);

    // Yangi vositalar: avto-tuzatish, javob importi, saqlash oldidan tekshiruv, buyruqlar paneli
    const [showAutoFix, setShowAutoFix] = useState(false);
    const [showAnswerImport, setShowAnswerImport] = useState(false);
    const [showChecklist, setShowChecklist] = useState(false);
    const [showPalette, setShowPalette] = useState(false);
    const [typeChangeIntent, setTypeChangeIntent] = useState(null);
    const [showDiff, setShowDiff] = useState(false);
    const originalJsonRef = useRef(null); // serverdan yuklangan dastlabki JSON (diff uchun)
    const [focusRequest, setFocusRequest] = useState(null); // JSON'da belgilanadigan joy

    // Draft restore banner state
    const draftKey = useMemo(() => draftKeyFor(id), [id]);
    const [draftAvailable, setDraftAvailable] = useState(null);
    const [lastAutoSave, setLastAutoSave] = useState(null);
    const draftCheckedRef = useRef(false);

    // Unsaved-changes guard
    const [isDirty, setIsDirty] = useState(false);
    const baselineRef = useRef(null);
    const savedRef = useRef(false);
    const [leaveIntent, setLeaveIntent] = useState(null);

    // JSON undo/redo history — bo'sh matn boshlang'ich holat sifatida saqlanadi,
    // shunda birinchi tahrirni ham bekor qilish mumkin.
    const jsonHistoryRef = useRef([""]);
    const historyIdxRef = useRef(0);
    const historyInitRef = useRef(false);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    // Validation badge counts (memo — har bosilgan harfda qayta hisoblanmasin)
    const validation = useMemo(() => runValidation(testData), [testData]);
    const { errors: validationErrors, warnings: validationWarnings } = validation;
    const isCheckable = ['reading', 'listening'].includes(testData.type);

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

    // Check for a saved draft once (edit mode waits until the server copy has landed)
    useEffect(() => {
        if (draftCheckedRef.current) return;
        if (isEditMode && !jsonInput) return;
        draftCheckedRef.current = true;
        try {
            const raw = localStorage.getItem(draftKey);
            if (!raw) return;
            const draft = JSON.parse(raw);
            const hasContent = draft?.testData?.title || (draft?.jsonInput && draft.jsonInput.length > 10);
            if (!hasContent) return;
            if (isEditMode) {
                // Serverdagi nusxa yangiroq bo'lsa, eski draftni taklif qilishning ma'nosi yo'q
                const serverAt = testData.updatedAt ? new Date(testData.updatedAt).getTime() : 0;
                const draftAt = draft.savedAt ? new Date(draft.savedAt).getTime() : 0;
                if (!draftAt || draftAt <= serverAt) { localStorage.removeItem(draftKey); return; }
            }
            setDraftAvailable(draft);
        } catch (e) {
            console.warn("Draft o'qib bo'lmadi:", e.message);
        }
    }, [isEditMode, jsonInput, draftKey, testData.updatedAt]);

    // Seed the undo history with the initial JSON so the first edit can be reverted
    useEffect(() => {
        if (historyInitRef.current || !jsonInput) return;
        historyInitRef.current = true;
        if (originalJsonRef.current === null) originalJsonRef.current = jsonInput;
        jsonHistoryRef.current = [jsonInput];
        historyIdxRef.current = 0;
        setCanUndo(false);
        setCanRedo(false);
    }, [jsonInput]);

    // Snapshot of everything the user can edit — used for dirty tracking & autosave
    const snapshot = useMemo(
        () => JSON.stringify({ testData, jsonInput, isFree, isMockMode, publishToFeed }),
        [testData, jsonInput, isFree, isMockMode, publishToFeed]
    );

    // Establish the "clean" baseline once the initial data is in place
    useEffect(() => {
        if (baselineRef.current !== null) return;
        if (isEditMode && !jsonInput) return; // wait until the fetched test lands
        baselineRef.current = snapshot;
    }, [snapshot, isEditMode, jsonInput]);

    useEffect(() => {
        if (baselineRef.current === null) return;
        setIsDirty(snapshot !== baselineRef.current);
    }, [snapshot]);

    // Warn before closing/reloading the tab with unsaved work
    useEffect(() => {
        if (!isDirty) return;
        const onBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [isDirty]);

    // Auto-save draft (yangi test ham, tahrirlanayotgan test ham)
    const writeDraft = useCallback(() => {
        if (!testData.title && !jsonInput) return;
        if (baselineRef.current !== null && snapshot === baselineRef.current) return; // o'zgarish yo'q
        const draft = {
            testData, jsonInput, isFree, isMockMode, publishToFeed,
            audioMode, singleAudioUrl, partAudios, uploadedMaps,
            savedAt: new Date().toISOString()
        };
        try {
            localStorage.setItem(draftKey, JSON.stringify(draft));
            setLastAutoSave(new Date());
        } catch (e) { console.warn("Draft saqlanmadi:", e.message); }
    }, [draftKey, snapshot, testData, jsonInput, isFree, isMockMode, publishToFeed, audioMode, singleAudioUrl, partAudios, uploadedMaps]);

    // Interval barqaror bo'lishi shart: avval har bir tugma bosilishida qayta qurilib,
    // uzluksiz yozayotgan adminda 15 soniyalik taymer hech qachon ishga tushmasdi.
    const writeDraftRef = useRef(writeDraft);
    writeDraftRef.current = writeDraft;

    useEffect(() => {
        const timer = setInterval(() => writeDraftRef.current(), AUTOSAVE_MS);
        return () => clearInterval(timer);
    }, []);

    // Persist the draft when the tab is hidden/closed so nothing is lost mid-interval
    useEffect(() => {
        const onHide = () => { if (!savedRef.current) writeDraftRef.current(); };
        const onVisibility = () => { if (document.hidden) onHide(); };
        window.addEventListener('pagehide', onHide);
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            window.removeEventListener('pagehide', onHide);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, []);

    // Ctrl+S — handler ref orqali chaqiriladi, aks holda eskirgan (stale) holat bilan ishlaydi
    const preSaveRef = useRef(null);
    const modalOpenRef = useRef(false);
    modalOpenRef.current = showValidationModal || showDuplicateModal || showTemplateModal || !!leaveIntent
        || showAutoFix || showAnswerImport || showChecklist || showPalette || !!typeChangeIntent || showDiff;

    useEffect(() => {
        const handleKeyDown = (e) => {
            const mod = e.ctrlKey || e.metaKey;
            const key = e.key.toLowerCase();

            if (mod && key === 's') {
                e.preventDefault();
                if (modalOpenRef.current) return; // modal ochiq bo'lsa Ctrl+S ishlamasin
                preSaveRef.current?.();
                return;
            }
            if (mod && key === 'k') {
                e.preventDefault();
                setShowPalette(p => !p);
                return;
            }
            if (mod && e.shiftKey && key === 'f') {
                e.preventDefault();
                if (!modalOpenRef.current) setShowAutoFix(true);
                return;
            }
            if (key === 'escape') {
                setShowPalette(false);
                setShowAutoFix(false);
                setShowAnswerImport(false);
                setShowChecklist(false);
                setShowValidationModal(false);
                setShowTemplateModal(false);
                setShowDuplicateModal(false);
                setTypeChangeIntent(null);
                setShowDiff(false);
                setLeaveIntent(null);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    // ---- Resize logic (mouse + touch, dbl-click reset, keyboard) ----
    const applyPanelPosition = useCallback((clientX) => {
        if (!rootPanelRef.current) return;
        const rect = rootPanelRef.current.getBoundingClientRect();
        const pct = ((clientX - rect.left) / rect.width) * 100;
        setPanelWidth(Math.max(25, Math.min(75, pct)));
    }, []);

    const handlePanelMouseMove = useCallback((e) => {
        if (!isResizingPanel.current) return;
        applyPanelPosition(e.clientX);
    }, [applyPanelPosition]);

    const handlePanelTouchMove = useCallback((e) => {
        if (!isResizingPanel.current || !e.touches?.[0]) return;
        applyPanelPosition(e.touches[0].clientX);
    }, [applyPanelPosition]);

    const handlePanelMouseUp = useCallback(() => {
        isResizingPanel.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', handlePanelMouseMove);
        document.removeEventListener('mouseup', handlePanelMouseUp);
        document.removeEventListener('touchmove', handlePanelTouchMove);
        document.removeEventListener('touchend', handlePanelMouseUp);
    }, [handlePanelMouseMove, handlePanelTouchMove]);

    const handlePanelResizerMouseDown = useCallback((e) => {
        isResizingPanel.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', handlePanelMouseMove);
        document.addEventListener('mouseup', handlePanelMouseUp);
        document.addEventListener('touchmove', handlePanelTouchMove, { passive: true });
        document.addEventListener('touchend', handlePanelMouseUp);
        e.preventDefault();
    }, [handlePanelMouseMove, handlePanelMouseUp, handlePanelTouchMove]);

    const handleResizerKeyDown = (e) => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); setPanelWidth(w => Math.max(25, w - 2)); }
        if (e.key === 'ArrowRight') { e.preventDefault(); setPanelWidth(w => Math.min(75, w + 2)); }
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPanelWidth(50); }
    };

    // JSON undo/redo helpers
    // Bu ikkalasi useCallback bo'lishi shart: quyidagi barcha handlerlar shularga tayanadi,
    // ular esa memo'langan bolalarga prop bo'lib tushadi.
    const updateHistoryState = useCallback(() => {
        setCanUndo(historyIdxRef.current > 0);
        setCanRedo(historyIdxRef.current < jsonHistoryRef.current.length - 1);
    }, []);

    const applyJsonValue = useCallback((newValue) => {
        historyInitRef.current = true;
        const trimmed = jsonHistoryRef.current.slice(0, historyIdxRef.current + 1);
        trimmed.push(newValue);
        if (trimmed.length > 60) trimmed.shift();
        jsonHistoryRef.current = trimmed;
        historyIdxRef.current = trimmed.length - 1;
        setJsonInput(newValue);
        updateTestDataFromJSON(newValue);
        updateHistoryState();
    }, [setJsonInput, updateTestDataFromJSON, updateHistoryState]);

    const handleJsonChange = useCallback((e) => applyJsonValue(e.target.value), [applyJsonValue]);

    const handleJsonUndo = useCallback(() => {
        if (historyIdxRef.current > 0) {
            historyIdxRef.current--;
            const prev = jsonHistoryRef.current[historyIdxRef.current];
            setJsonInput(prev);
            updateTestDataFromJSON(prev);
            updateHistoryState();
        }
    }, [setJsonInput, updateTestDataFromJSON, updateHistoryState]);

    const handleJsonRedo = useCallback(() => {
        if (historyIdxRef.current < jsonHistoryRef.current.length - 1) {
            historyIdxRef.current++;
            const next = jsonHistoryRef.current[historyIdxRef.current];
            setJsonInput(next);
            updateTestDataFromJSON(next);
            updateHistoryState();
        }
    }, [setJsonInput, updateTestDataFromJSON, updateHistoryState]);

    // Prettify JSON (2-space indent)
    const handleJsonFormat = useCallback(() => {
        try {
            const pretty = JSON.stringify(JSON.parse(jsonInput), null, 2);
            applyJsonValue(pretty);
            toast.success("JSON tartibga solindi");
        } catch {
            toast.error("JSON xato — avval xatoni to'g'rilang");
        }
    }, [jsonInput, applyJsonValue]);

    // JSON'ning ma'lum joyiga sakrash (validator / javoblar kalitidan chaqiriladi)
    const jumpToJsonPath = useCallback((path) => {
        if (!path || !jsonInput) return;
        const offset = jsonOffsetForPath(jsonInput, path);
        if (offset === null) { toast.error("JSON'da bu joy topilmadi"); return; }
        if (!showEditor) setViewMode(isWide ? 'split' : 'editor');
        setFocusRequest({ offset, length: 0, nonce: Date.now() });
        toast.success(`${lineOfOffset(jsonInput, offset)}-qatorga o'tildi`, { duration: 1500 });
    }, [jsonInput, showEditor, isWide]);

    // Avto-tuzatish natijasini qo'llash — tarixga tushadi, Ctrl+Z bilan qaytariladi
    const handleApplyAutoFix = useCallback((result, changes) => {
        applyJsonValue(JSON.stringify(result, null, 2));
        setShowAutoFix(false);
        const total = changes.reduce((sum, c) => sum + c.count, 0);
        toast.success(`${total} ta xato tuzatildi — yoqmasa Ctrl+Z`);
    }, [applyJsonValue]);

    const handleApplyAnswers = useCallback((result, count) => {
        applyJsonValue(JSON.stringify(result, null, 2));
        setShowAnswerImport(false);
        toast.success(`${count} ta javob kiritildi`);
    }, [applyJsonValue]);

    // Test turi almashganda tuzilma yaroqsiz bo'lib qolishi mumkin
    const handleTypeChangeRequest = useCallback((nextType, apply) => {
        const hasContent = (testData.passages?.length || 0) > 0 || (testData.questions?.length || 0) > 0;
        if (!hasContent) { apply(); return; }
        setTypeChangeIntent({ nextType, apply });
    }, [testData.passages, testData.questions]);

    // Template apply
    const handleApplyTemplate = (templateData) => {
        const json = JSON.stringify(templateData, null, 2);
        setTestData(prev => ({ ...prev, ...templateData }));
        setJsonInput(json);
        updateTestDataFromJSON(json);
        historyInitRef.current = true;
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
            historyInitRef.current = true;
            jsonHistoryRef.current = [draft.jsonInput];
            historyIdxRef.current = 0;
            updateHistoryState();
        }
        if (draft.isFree !== undefined) setIsFree(draft.isFree);
        if (draft.isMockMode !== undefined) setIsMockMode(draft.isMockMode);
        if (draft.publishToFeed !== undefined) setPublishToFeed(draft.publishToFeed);
        // Media holati ham tiklanadi, aks holda yuklangan audiolar UI'da ko'rinmay qoladi
        if (draft.audioMode) setAudioMode(draft.audioMode);
        if (draft.singleAudioUrl !== undefined) setSingleAudioUrl(draft.singleAudioUrl);
        if (draft.partAudios) setPartAudios(draft.partAudios);
        if (Array.isArray(draft.uploadedMaps)) setUploadedMaps(draft.uploadedMaps);
        setDraftAvailable(null);
        toast.success("Loyiha tiklandi!");
    };

    const handleDiscardDraft = () => {
        localStorage.removeItem(draftKey);
        setDraftAvailable(null);
    };

    // Navigation guard
    const leaveNow = () => {
        savedRef.current = true;
        const target = leaveIntent?.to || "/admin/tests";
        setLeaveIntent(null);
        navigate(target);
    };

    const handleBack = () => {
        if (isDirty) { setLeaveIntent({ to: "/admin/tests" }); return; }
        navigate("/admin/tests");
    };

    // In-app navigatsiya himoyasi (BrowserRouter'da useBlocker mavjud emas):
    // ichki havolalar bosilganda va brauzer "orqaga" tugmasida tasdiq so'raladi.
    const popGuardRef = useRef(false);
    useEffect(() => {
        if (!isDirty) return;

        const onLinkClick = (e) => {
            if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            const anchor = e.target.closest?.('a[href]');
            if (!anchor || anchor.hasAttribute('download')) return;
            if (anchor.target && anchor.target !== '_self') return;
            const url = new URL(anchor.getAttribute('href'), window.location.href);
            if (url.origin !== window.location.origin) return;
            if (url.pathname === window.location.pathname) return;
            e.preventDefault();
            e.stopPropagation();
            setLeaveIntent({ to: url.pathname + url.search });
        };

        if (!popGuardRef.current) {
            popGuardRef.current = true;
            window.history.pushState(null, '', window.location.href);
        }
        const onPopState = () => {
            window.history.pushState(null, '', window.location.href); // sahifada ushlab turamiz
            setLeaveIntent({ to: "/admin/tests" });
        };

        document.addEventListener('click', onLinkClick, true);
        window.addEventListener('popstate', onPopState);
        return () => {
            document.removeEventListener('click', onLinkClick, true);
            window.removeEventListener('popstate', onPopState);
        };
    }, [isDirty]);

    // Pre-save: validation check → duplicate check → save
    const handlePreSave = async () => {
        if (uploading) { toast.error("Fayl yuklanmoqda, biroz kuting..."); return; }
        if (loading) return; // saqlash allaqachon ketyapti
        if (validationErrors.length > 0) {
            setPendingValidationErrors(validationErrors);
            setShowValidationModal(true);
            return;
        }
        setShowChecklist(true); // yakuniy tekshiruv oynasi
    };
    preSaveRef.current = handlePreSave;

    // Saqlash: draft faqat Firestore'ga muvaffaqiyatli yozilgach o'chiriladi
    const commitSave = async (bypassDuplicate = false) => {
        savedRef.current = true;
        const ok = await handleSave(bypassDuplicate);
        if (ok) {
            localStorage.removeItem(draftKey);
            setLastAutoSave(null);
        } else {
            savedRef.current = false; // draft saqlanib qolsin
        }
        return ok;
    };

    const runDuplicateAndSave = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "tests"), where("type", "==", testData.type));
            const snapshotDocs = await getDocs(q);
            const existingTests = snapshotDocs.docs
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
            toast.error("Dublikat tekshiruvi amalga oshmadi — test tekshirilmagan holda saqlanadi");
        } finally {
            setLoading(false);
        }
        await commitSave();
    };

    const handlePartAudioUpload = useCallback(async (e, index) => {
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
        } catch (err) { toast.error(err.message); } finally { setUploading(false); setUploadingPart(null); e.target.value = ""; }
    }, [uploadToFirebase, setPartAudios, setTestData, setUploading, setUploadingPart]);

    const handleSingleAudioUpload = useCallback(async (e) => {
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
        } catch (err) { toast.error(err.message); } finally { setUploading(false); setUploadingPart(null); e.target.value = ""; }
    }, [uploadToFirebase, setSingleAudioUrl, setTestData, setUploading, setUploadingPart]);

    const handleMapUpload = useCallback(async (e) => {
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
                    // applyJsonValue orqali — undo/redo tarixi JSON bilan sinxron qolishi uchun
                    applyJsonValue(JSON.stringify(parsed, null, 2));
                    toast.success("Rasm map_labeling savoliga biriktirildi");
                } else {
                    navigator.clipboard.writeText(url);
                    toast.success("Rasm linki nusxalandi!");
                }
            } catch {
                navigator.clipboard.writeText(url);
                toast.success("Rasm linki nusxalandi!");
            }
        } catch (err) { toast.error(err.message); } finally { setUploading(false); setUploadingPart(null); e.target.value = ""; }
    }, [uploadToFirebase, setUploadedMaps, jsonInput, applyJsonValue, setUploading, setUploadingPart]);

    const handleWritingUpdate = useCallback((field, value) => {
        setTestData(prev => {
            // Eski hujjatlarda writingTasks bo'lmasligi mumkin
            const newTasks = [...(prev.writingTasks || [])];
            newTasks[activeWritingTask] = { ...(newTasks[activeWritingTask] || {}), [field]: value };
            return { ...prev, writingTasks: newTasks };
        });
    }, [activeWritingTask, setTestData]);

    const handleWritingImageUpload = useCallback(async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        setUploadingPart('writing');
        try {
            const url = await uploadToFirebase(file, "writing_images");
            handleWritingUpdate('image', url);
        } catch (err) { toast.error(err.message); } finally { setUploading(false); setUploadingPart(null); e.target.value = ""; }
    }, [uploadToFirebase, handleWritingUpdate, setUploading, setUploadingPart]);

    // field — matn ("startTime") yoki bir nechta maydonli obyekt ({startTime, endTime}).
    // Obyekt shakli waveform uchun zarur: ketma-ket ikki chaqiruv bir xil eskirgan
    // jsonInput'ni o'qib, birinchi o'zgarishni yo'q qilib yuborardi.
    const handlePassageTimeChange = useCallback((index, field, value) => {
        const patch = typeof field === 'object' && field !== null ? field : { [field]: value };

        // Iloji bo'lsa o'zgarishni JSON orqali qo'llaymiz — shunda undo/redo tarixi
        // sinxron qoladi (avval JSON to'g'ridan-to'g'ri yozilib, tarix eskirib qolardi).
        if (jsonInput) {
            try {
                const parsed = JSON.parse(jsonInput);
                if (Array.isArray(parsed.passages)) {
                    if (!parsed.passages[index]) {
                        parsed.passages[index] = { id: index + 1, title: `Part ${index + 1}` };
                    }
                    Object.assign(parsed.passages[index], patch);
                    applyJsonValue(JSON.stringify(parsed, null, 2));
                    return;
                }
            } catch (e) {
                console.warn("JSON sync skipped:", e.message);
            }
        }
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
            newPassages[index] = { ...newPassages[index], ...patch };
            return { ...prev, passages: newPassages };
        });
    }, [jsonInput, applyJsonValue, setTestData, audioMode, singleAudioUrl, partAudios]);

    const scrollToValidator = () => {
        if (!showEditor) setViewMode(isWide ? 'split' : 'editor');
        requestAnimationFrame(() => {
            validatorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    };

    // Mini validator badge (clickable → jumps to the quality panel)
    const validatorBadge = () => {
        if (!isCheckable) return null;
        const base = "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black border transition hover:brightness-110 active:scale-95";
        if (validationErrors.length > 0) {
            return (
                <button type="button" onClick={scrollToValidator} title="Xatolarni ko'rish"
                    className={`${base} bg-red-500/10 border-red-500/20 text-red-500`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    {validationErrors.length} xato
                </button>
            );
        }
        if (validationWarnings.length > 0) {
            return (
                <button type="button" onClick={scrollToValidator} title="Ogohlantirishlarni ko'rish"
                    className={`${base} bg-amber-500/10 border-amber-500/20 text-amber-500`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    {validationWarnings.length} ogohlantirish
                </button>
            );
        }
        return (
            <button type="button" onClick={scrollToValidator} title="Sifat kontroli"
                className={`${base} bg-green-500/10 border-green-500/20 text-green-500`}>
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Tayyor
            </button>
        );
    };

    // Memo'langan bolalarga tushadigan barqaror callbacklar — inline strelka funksiyalari
    // har renderda yangi bo'lib, memo'ni butunlay bekor qilardi.
    const openAutoFix = useCallback(() => setShowAutoFix(true), []);
    const openAnswerImport = useCallback(() => setShowAnswerImport(true), []);
    const openTemplate = useCallback(() => setShowTemplateModal(true), []);
    const handleAudioUrlChange = useCallback((url, i) => setPartAudios(p => ({ ...p, [i]: url })), [setPartAudios]);
    const handleDeleteMap = useCallback((i) => setUploadedMaps(p => p.filter((_, idx) => idx !== i)), [setUploadedMaps]);

    // Ctrl+K buyruqlar ro'yxati
    const firstErrorWithPath = validationErrors.find(e => e.path);
    const paletteCommands = [
        { id: 'save', label: isEditMode ? "Testni saqlash" : "Testni yaratish", shortcut: 'Ctrl+S', run: () => handlePreSave() },
        { id: 'autofix', label: "Avto-tuzatish", hint: "ID, javob formati, passageId", shortcut: 'Ctrl+Shift+F', run: () => setShowAutoFix(true) },
        { id: 'answers', label: "Javoblarni ommaviy kiritish", hint: "1. TRUE  2. FALSE ...", run: () => setShowAnswerImport(true) },
        { id: 'format', label: "JSON'ni formatlash", hint: "2 probel chekinish", run: () => handleJsonFormat() },
        { id: 'template', label: "Shablon qo'llash", hidden: isEditMode, run: () => setShowTemplateModal(true) },
        { id: 'jump-error', label: "Birinchi xatoga o'tish", hint: firstErrorWithPath?.message, disabled: !firstErrorWithPath, run: () => jumpToJsonPath(firstErrorWithPath.path) },
        { id: 'validator', label: "Sifat kontroliga o'tish", hidden: !isCheckable, run: () => scrollToValidator() },
        { id: 'view-editor', label: "Ko'rinish: faqat tahrir", run: () => setViewMode('editor') },
        { id: 'view-split', label: "Ko'rinish: ikkisi", hidden: !isWide, run: () => setViewMode('split') },
        { id: 'view-preview', label: "Ko'rinish: faqat ko'rinish", run: () => setViewMode('preview') },
        { id: 'diff', label: "O'zgarishlarni ko'rish (diff)", hidden: !isEditMode, disabled: !isDirty, run: () => setShowDiff(true) },
        { id: 'back', label: "Testlar ro'yxatiga qaytish", run: () => handleBack() },
    ];

    if (loading && !testData.title) return (
        <div className="flex h-full min-h-[60vh] items-center justify-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className={`h-full min-h-0 flex flex-col transition-colors duration-300 ${isDark ? 'bg-[#181715] text-white' : 'bg-[#F5F5F7] text-gray-900'}`}>

            {/* --- HEADER --- */}
            <div className={`h-16 px-3 sm:px-6 flex items-center justify-between gap-3 border-b shrink-0 z-20 ${isDark ? 'bg-[#1f1e1b] border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        onClick={handleBack}
                        title="Testlar ro'yxatiga qaytish"
                        aria-label="Orqaga"
                        className={`w-10 h-10 shrink-0 flex items-center justify-center rounded-xl transition ${isDark ? 'hover:bg-white/5 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                    >
                        <Icons.Back className="w-5 h-5" />
                    </button>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h1 className="text-base sm:text-lg font-black tracking-tight truncate max-w-[40vw]">
                                {testData.title?.trim() || (isEditMode ? "Testni Tahrirlash" : "Yangi Test")}
                            </h1>
                            {isDirty && (
                                isEditMode ? (
                                    <button
                                        type="button"
                                        onClick={() => setShowDiff(true)}
                                        title="Serverdagi nusxadan farqni ko'rish"
                                        className="shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black transition hover:bg-amber-500/20 active:scale-95"
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                        O'zgardi
                                    </button>
                                ) : (
                                    <span className="shrink-0 w-2 h-2 rounded-full bg-amber-500" title="Saqlanmagan o'zgarishlar bor" />
                                )
                            )}
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 truncate">
                            {testData.type} • {isEditMode ? "Tahrirlash" : "Yaratish"}
                            {lastAutoSave && (
                                <span className="normal-case tracking-normal ml-1.5 opacity-80">
                                    · avto-saqlandi {lastAutoSave.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            )}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <div className="hidden sm:block">{validatorBadge()}</div>
                    <ViewModeSwitch
                        isWide={isWide}
                        effectiveMode={effectiveMode}
                        setViewMode={setViewMode}
                        isDark={isDark}
                    />
                    <button
                        onClick={handlePreSave}
                        disabled={loading || uploading}
                        title={`${isEditMode ? "Saqlash" : "Yaratish"} (Ctrl+S)`}
                        className="h-10 px-4 sm:px-6 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition flex items-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading
                            ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : <Icons.Check className="w-4 h-4" />
                        }
                        <span className="hidden sm:inline">{isEditMode ? "Saqlash" : "Yaratish"}</span>
                    </button>
                </div>
            </div>

            {/* Mobile validator badge row */}
            {isCheckable && (
                <div className={`sm:hidden shrink-0 px-3 py-2 border-b ${isDark ? 'border-white/5' : 'border-gray-200'}`}>
                    {validatorBadge()}
                </div>
            )}

            {/* --- DRAFT RESTORE BANNER --- */}
            {draftAvailable && (
                <div className={`shrink-0 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b ${isDark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
                            Saqlanmagan loyiha topildi
                            {draftAvailable.savedAt && (
                                <span className="font-normal opacity-60 ml-1">
                                    ({new Date(draftAvailable.savedAt).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })})
                                </span>
                            )}
                            {draftAvailable.testData?.title && (
                                <span className="font-normal opacity-60 ml-1">— "{draftAvailable.testData.title}"</span>
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
                {showEditor && (
                    <div
                        className="h-full overflow-y-auto custom-scrollbar p-4 sm:p-6"
                        style={{ width: isSplit ? `${panelWidth}%` : '100%' }}
                    >
                        <div className="max-w-3xl mx-auto space-y-5 pb-24">
                            {isCheckable && (
                                <div ref={validatorRef} className="scroll-mt-4">
                                    <TestValidator
                                        testData={testData}
                                        isDark={isDark}
                                        result={validation}
                                        onJump={jumpToJsonPath}
                                        onAutoFix={openAutoFix}
                                    />
                                </div>
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
                                onTypeChangeRequest={handleTypeChangeRequest}
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
                                handleAudioUrlChange={handleAudioUrlChange}
                                listeningPartCount={listeningPartCount}
                                uploadedMaps={uploadedMaps}
                                handleMapUpload={handleMapUpload}
                                handleDeleteMap={handleDeleteMap}
                                uploading={uploading}
                                uploadingPart={uploadingPart}
                                uploadProgress={uploadProgress}
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

                            {isCheckable && (
                                <AnswerKeyPanel
                                    testData={testData}
                                    isDark={isDark}
                                    onJump={jumpToJsonPath}
                                    onOpenImport={openAnswerImport}
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
                                onFormat={handleJsonFormat}
                                onOpenTemplate={!isEditMode ? openTemplate : null}
                                onAutoFix={openAutoFix}
                                focusRequest={focusRequest}
                            />
                        </div>
                    </div>
                )}

                {/* RESIZER */}
                {isSplit && (
                    <div
                        role="separator"
                        aria-orientation="vertical"
                        aria-label="Panellar kengligini o'zgartirish"
                        tabIndex={0}
                        onMouseDown={handlePanelResizerMouseDown}
                        onTouchStart={handlePanelResizerMouseDown}
                        onDoubleClick={() => setPanelWidth(50)}
                        onKeyDown={handleResizerKeyDown}
                        title="Tortib o'lchamni o'zgartiring · ikki marta bosing — 50/50"
                        className={`group w-1.5 h-full cursor-col-resize hover:bg-blue-500/40 focus:bg-blue-500/60 focus:outline-none transition-colors z-10 shrink-0 relative ${isDark ? 'bg-white/5' : 'bg-gray-200'}`}
                    >
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-current opacity-20 group-hover:opacity-60 transition-opacity" />
                    </div>
                )}

                {/* RIGHT PANEL: PREVIEW */}
                {showPreview && (
                    <div className={`h-full overflow-hidden flex-1 ${isDark ? 'bg-[#0A0A0A]' : 'bg-gray-50'}`}>
                        <div className="h-full overflow-y-auto p-4 sm:p-6 custom-scrollbar">
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
                )}
            </div>

            {/* DUPLICATE MODAL */}
            <DuplicateModal
                show={showDuplicateModal}
                duplicateInfo={duplicateInfo}
                onConfirm={() => { setShowDuplicateModal(false); commitSave(true); }}
                onCancel={() => setShowDuplicateModal(false)}
                isDark={isDark}
            />

            {/* VALIDATION MODAL */}
            <ValidationModal
                show={showValidationModal}
                errors={pendingValidationErrors}
                onConfirm={() => { setShowValidationModal(false); setShowChecklist(true); }}
                onCancel={() => setShowValidationModal(false)}
                onAutoFix={openAutoFix}
                onJump={jumpToJsonPath}
                isDark={isDark}
            />

            {/* AVTO-TUZATISH */}
            <AutoFixModal
                show={showAutoFix}
                jsonInput={jsonInput}
                testType={testData.type}
                onApply={handleApplyAutoFix}
                onClose={() => setShowAutoFix(false)}
                isDark={isDark}
            />

            {/* JAVOBLARNI OMMAVIY KIRITISH */}
            <AnswerImportModal
                show={showAnswerImport}
                jsonInput={jsonInput}
                onApply={handleApplyAnswers}
                onClose={() => setShowAnswerImport(false)}
                isDark={isDark}
            />

            {/* SAQLASHDAN OLDINGI YAKUNIY TEKSHIRUV */}
            <PublishChecklistModal
                show={showChecklist}
                testData={testData}
                isEditMode={isEditMode}
                isFree={isFree}
                isMockMode={isMockMode}
                publishToFeed={publishToFeed}
                validation={validation}
                audioMode={audioMode}
                singleAudioUrl={singleAudioUrl}
                partAudios={partAudios}
                onConfirm={() => { setShowChecklist(false); runDuplicateAndSave(); }}
                onCancel={() => setShowChecklist(false)}
                isDark={isDark}
            />

            {/* TEST TURINI O'ZGARTIRISH TASDIG'I */}
            <ConfirmDialog
                show={!!typeChangeIntent}
                title="Test turini o'zgartirasizmi?"
                message={`Hozirgi passage/part va savollar tuzilmasi "${typeChangeIntent?.nextType}" turiga mos kelmasligi mumkin — passageId'lar va savol raqamlarini qayta tekshirish kerak bo'ladi.`}
                confirmLabel="Ha, o'zgartirish"
                onConfirm={() => { typeChangeIntent.apply(); setTypeChangeIntent(null); }}
                onCancel={() => setTypeChangeIntent(null)}
                isDark={isDark}
            />

            {/* O'ZGARISHLAR DIFF'I */}
            <DiffModal
                show={showDiff}
                originalJson={originalJsonRef.current || ""}
                currentJson={jsonInput}
                onClose={() => setShowDiff(false)}
                onConfirm={() => { setShowDiff(false); handlePreSave(); }}
                isDark={isDark}
            />

            {/* BUYRUQLAR PANELI */}
            {showPalette && (
                <CommandPalette
                    commands={paletteCommands}
                    onClose={() => setShowPalette(false)}
                    isDark={isDark}
                />
            )}

            {/* TEMPLATE MODAL */}
            <TemplateModal
                show={showTemplateModal}
                onSelect={handleApplyTemplate}
                onBlank={() => setShowTemplateModal(false)}
                isDark={isDark}
            />

            {/* LEAVE CONFIRM MODAL */}
            <LeaveConfirmModal
                show={!!leaveIntent}
                isDark={isDark}
                onCancel={() => setLeaveIntent(null)}
                onConfirm={leaveNow}
                onSave={() => { setLeaveIntent(null); handlePreSave(); }}
            />

            {/* UPLOAD OVERLAY */}
            {uploading && (
                <div className="fixed bottom-6 right-6 z-[100] bg-white dark:bg-[#1f1e1b] rounded-2xl shadow-2xl border border-blue-500/20 p-4 min-w-[220px] animate-in slide-in-from-bottom-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-blue-500/10 rounded-xl flex items-center justify-center shrink-0">
                            <Icons.Cloud className="w-4 h-4 text-blue-500" />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-black uppercase tracking-wider">Yuklanmoqda</p>
                            <p className="text-[10px] opacity-50">
                                {uploadingPart === 'single' && "Yagona audio"}
                                {uploadingPart === 'map' && "Map / diagramma rasmi"}
                                {uploadingPart === 'writing' && "Writing task rasmi"}
                                {typeof uploadingPart === 'number' && `Part ${uploadingPart + 1} audiosi`}
                                {uploadingPart === null && "Fayl tizimga yuklanmoqda"}
                            </p>
                        </div>
                        <span className="text-xs font-black tabular-nums text-blue-500">{uploadProgress}%</span>
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
