// src/pages/admin/KeyManager.jsx
//
// Mock imtihonlar uchun access-key boshqaruvi.
//
// Ish oqimi uch bosqich: (1) Mock Exam yig'iladi — Reading + Listening + Writing
// bitta to'plamga bog'lanadi, (2) o'sha mock uchun bir martalik kalitlar
// generatsiya qilinadi, (3) mocklar ro'yxatidan qaysi kalit ishlatilgani
// kuzatiladi. Kalitni talaba `verifyAccessKey` funksiyasi orqali faollashtiradi,
// shuning uchun bu yerdagi sxema (type: 'mock_bundle', assignedTests.{readingId,
// listeningId, writingId}) o'sha funksiya kutgan ko'rinishda bo'lishi shart.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { db } from "../../firebase/firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
  writeBatch,
  setDoc,
  where,
  updateDoc,
} from "firebase/firestore";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useTheme } from "../../context/ThemeContext";
import {
  Key,
  Trash2,
  Copy,
  ArrowLeft,
  Bolt,
  Search,
  Sparkles,
  Check,
  Loader2,
  X,
  Download,
  Printer,
  RefreshCw,
  AlertTriangle,
  Layers,
  CheckCircle2,
  CircleDashed,
  Minus,
  Plus,
  Radio,
  ArrowDownUp,
  Undo2,
} from "lucide-react";

import SearchableTestSelect from "../../components/admin/keys/SearchableTestSelect";
import ConfirmModal from "../../components/admin/keys/ConfirmModal";
import MockExamEditModal from "../../components/admin/keys/MockExamEditModal";
import MockExamsList from "../../components/admin/keys/MockExamsList";
import KeyRow from "../../components/admin/keys/KeyRow";
import {
  MAX_BULK,
  buildKeysCsv,
  chunk,
  downloadCsv,
  findExistingCodes,
  generateUniqueCodes,
  printKeys,
  sortByCreatedDesc,
  toDate,
  writeClipboard,
} from "../../components/admin/keys/keyUtils";

const EMPTY_SELECTION = { reading: "", listening: "", writing: "" };
const PAGE_SIZE = 60;
const LS_PREFIX = "keyManager:";

const readLS = (key, fallback) => {
  try {
    const v = localStorage.getItem(LS_PREFIX + key);
    return v === null ? fallback : v;
  } catch {
    return fallback;
  }
};
const writeLS = (key, value) => {
  try {
    localStorage.setItem(LS_PREFIX + key, value);
  } catch {
    /* private rejim — muhim emas */
  }
};

/* ------------------------------------------------------------------ */
/* Statistika chipi — bosilsa filtr sifatida ham ishlaydi              */
/* ------------------------------------------------------------------ */

function StatChip({ icon, label, value, isDark, tone = "neutral", active, onClick }) {
  const Icon = icon;
  const toneCls =
    tone === "green"
      ? isDark
        ? "text-emerald-400"
        : "text-emerald-600"
      : tone === "blue"
        ? isDark
          ? "text-blue-400"
          : "text-blue-600"
        : isDark
          ? "text-zinc-400"
          : "text-zinc-500";

  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      onClick={onClick}
      className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border transition-all text-left ${
        onClick ? "active:scale-95 cursor-pointer" : ""
      } ${
        active
          ? isDark
            ? "bg-zinc-800 border-zinc-700"
            : "bg-zinc-900 border-zinc-900 text-white"
          : isDark
            ? "bg-[#0c0c0e] border-zinc-800 hover:border-zinc-700"
            : "bg-white border-zinc-200/80 hover:border-zinc-300"
      }`}
    >
      <Icon size={14} className={active && !isDark ? "text-white" : toneCls} />
      <div className="leading-none">
        <p className="text-sm font-black tabular-nums">{value}</p>
        <p
          className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${
            active && !isDark ? "text-zinc-300" : isDark ? "text-zinc-500" : "text-zinc-400"
          }`}
        >
          {label}
        </p>
      </div>
    </Tag>
  );
}

/* ------------------------------------------------------------------ */
/* Asosiy sahifa                                                       */
/* ------------------------------------------------------------------ */

export default function KeyManager() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  /* --- Kalitlar (jonli) --- */
  const [keys, setKeys] = useState([]);
  const [keysLoading, setKeysLoading] = useState(true);
  const [liveError, setLiveError] = useState("");

  /* --- Meta: testlar, to'plamlar, mocklar --- */
  const [availableTests, setAvailableTests] = useState({ reading: [], listening: [], writing: [] });
  const [testsById, setTestsById] = useState({});
  const [mockCollections, setMockCollections] = useState([]);
  const [mockExams, setMockExams] = useState([]);
  const [metaLoading, setMetaLoading] = useState(true);
  const [metaError, setMetaError] = useState("");

  /* --- Generator --- */
  const [activeTab, setActiveTab] = useState(() => readLS("tab", "create_mock"));
  const [selectedTests, setSelectedTests] = useState(EMPTY_SELECTION);
  const [showModuleErrors, setShowModuleErrors] = useState(false);
  const [selectedMockExamId, setSelectedMockExamId] = useState(() => readLS("mockId", ""));
  const [mockTitle, setMockTitle] = useState("");
  const [isCreatingMock, setIsCreatingMock] = useState(false);
  const [bulkCount, setBulkCount] = useState(1);
  const [generating, setGenerating] = useState(false);

  const [selectedCollectionId, setSelectedCollectionId] = useState("");
  const [newColName, setNewColName] = useState("");
  const [showAddCol, setShowAddCol] = useState(false);
  const [isAddingCol, setIsAddingCol] = useState(false);

  /* --- Ro'yxat --- */
  const [keySearch, setKeySearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(() => readLS("filter", "all"));
  const [sortMode, setSortMode] = useState("new"); // new | old | status
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [freshKeyIds, setFreshKeyIds] = useState([]);
  const [copiedKey, setCopiedKey] = useState("");
  const [selectedKeyIds, setSelectedKeyIds] = useState([]);
  const [mockFilterId, setMockFilterId] = useState("");

  /* --- Modallar --- */
  const [confirmState, setConfirmState] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [editingMock, setEditingMock] = useState(null);

  const searchInputRef = useRef(null);
  const targetColId = location.state?.collectionId;

  /* -------------------- Sozlamalarni eslab qolish -------------------- */

  useEffect(() => writeLS("tab", activeTab), [activeTab]);
  useEffect(() => writeLS("filter", statusFilter), [statusFilter]);
  useEffect(() => writeLS("mockId", selectedMockExamId), [selectedMockExamId]);

  /* ------------------------ Kalitlar: jonli oqim --------------------- */

  useEffect(() => {
    // Imtihon kunida admin kalitlar faollashuvini real vaqtda ko'rishi kerak —
    // shuning uchun bir martalik getDocs emas, onSnapshot.
    const unsub = onSnapshot(
      query(collection(db, "accessKeys"), orderBy("createdAt", "desc")),
      (snap) => {
        setKeys(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setKeysLoading(false);
        setLiveError("");
      },
      (err) => {
        console.error("accessKeys oqimi:", err);
        setLiveError(err?.message || "Kalitlarni yuklab bo'lmadi.");
        setKeysLoading(false);
      }
    );
    return unsub;
  }, []);

  /* ---------------------------- Meta yuklash ------------------------- */

  const loadMeta = useCallback(async () => {
    setMetaLoading(true);
    setMetaError("");
    try {
      const [testsSnap, colsSnap, mockMetaSnap] = await Promise.all([
        getDocs(query(collection(db, "tests"), orderBy("createdAt", "desc"))),
        getDocs(collection(db, "test_collections")).catch(() => ({ docs: [] })),
        getDocs(query(collection(db, "tests_metadata"), where("type", "==", "mock"))).catch(() => ({ docs: [] })),
      ]);

      const allTests = testsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAvailableTests({
        reading: allTests.filter((t) => t.type === "reading"),
        listening: allTests.filter((t) => t.type === "listening"),
        writing: allTests.filter((t) => t.type === "writing"),
      });
      setTestsById(Object.fromEntries(allTests.map((t) => [t.id, t])));

      const fetchedCols = colsSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((c) => c.type === "mock");
      setMockCollections(fetchedCols);

      // Mocklar ikkala kolleksiyada ham saqlanadi (tests + tests_metadata).
      // Faqat metadata'ga qarash boshqa joyda yaratilgan mocklarni ko'rinmas qilardi.
      const merged = new Map();
      allTests.filter((t) => t.type === "mock").forEach((m) => merged.set(m.id, m));
      mockMetaSnap.docs.forEach((d) => merged.set(d.id, { ...(merged.get(d.id) || {}), id: d.id, ...d.data() }));
      setMockExams(Array.from(merged.values()).sort(sortByCreatedDesc));

      if (targetColId) {
        setSelectedCollectionId(targetColId);
        const col = fetchedCols.find((c) => c.id === targetColId);
        if (col?.subTests) {
          setSelectedTests({
            reading: col.subTests.readingId || "",
            listening: col.subTests.listeningId || "",
            writing: col.subTests.writingId || "",
          });
        } else {
          setSelectedTests({
            reading: allTests.find((t) => t.type === "reading" && t.collectionId === targetColId)?.id || "",
            listening: allTests.find((t) => t.type === "listening" && t.collectionId === targetColId)?.id || "",
            writing: allTests.find((t) => t.type === "writing" && t.collectionId === targetColId)?.id || "",
          });
        }
      }
    } catch (error) {
      console.error("KeyManager meta yuklash xatosi:", error);
      setMetaError(error?.message || "Testlar ro'yxatini yuklab bo'lmadi.");
    } finally {
      setMetaLoading(false);
    }
  }, [targetColId]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  /* --------------------------- Klaviatura ---------------------------- */

  useEffect(() => {
    const onKeyDown = (e) => {
      const el = document.activeElement;
      const typing =
        el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "Escape" && el === searchInputRef.current) {
        setKeySearch("");
        el.blur();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  /* --------------------------- Hosilalar ----------------------------- */

  const collectionNameById = useMemo(
    () => Object.fromEntries(mockCollections.map((c) => [c.id, c.name])),
    [mockCollections]
  );
  const mockTitleById = useMemo(() => Object.fromEntries(mockExams.map((m) => [m.id, m.title])), [mockExams]);

  const stats = useMemo(() => {
    const used = keys.filter((k) => k.isUsed).length;
    return { total: keys.length, used, unused: keys.length - used };
  }, [keys]);

  const enrich = useCallback(
    (k) => ({
      ...k,
      mockName: k.mockTitle || mockTitleById[k.mockExamId] || "",
      collectionName: collectionNameById[k.collectionId] || "",
    }),
    [mockTitleById, collectionNameById]
  );

  const filteredKeys = useMemo(() => {
    const q = keySearch.trim().toLowerCase();
    const list = keys.filter((k) => {
      if (statusFilter === "used" && !k.isUsed) return false;
      if (statusFilter === "unused" && k.isUsed) return false;
      if (mockFilterId && k.mockExamId !== mockFilterId) return false;
      if (!q) return true;
      const haystack = [k.key, k.usedByName, k.mockTitle || mockTitleById[k.mockExamId], collectionNameById[k.collectionId]];
      return haystack.some((v) => (v || "").toLowerCase().includes(q));
    });

    const sorted = [...list];
    if (sortMode === "old") {
      sorted.sort((a, b) => (toDate(a.createdAt)?.getTime() || 0) - (toDate(b.createdAt)?.getTime() || 0));
    } else if (sortMode === "status") {
      sorted.sort((a, b) => Number(a.isUsed) - Number(b.isUsed) || sortByCreatedDesc(a, b));
    } else {
      sorted.sort(sortByCreatedDesc);
    }

    return sorted.map(enrich);
  }, [keys, keySearch, statusFilter, mockFilterId, sortMode, mockTitleById, collectionNameById, enrich]);

  // Filtr o'zgarsa — sahifalashni boshidan.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [keySearch, statusFilter, sortMode, mockFilterId]);

  const visibleKeys = filteredKeys.slice(0, visibleCount);
  const allVisibleSelected = filteredKeys.length > 0 && filteredKeys.every((k) => selectedKeyIds.includes(k.id));
  const freshKeys = keys.filter((k) => freshKeyIds.includes(k.id)).map(enrich);
  const selectedKeys = keys.filter((k) => selectedKeyIds.includes(k.id)).map(enrich);

  /* ----------------------------- To'plamlar -------------------------- */

  const handleCollectionChange = (colId) => {
    setSelectedCollectionId(colId);
    if (!colId) {
      setSelectedTests(EMPTY_SELECTION);
      return;
    }
    const col = mockCollections.find((c) => c.id === colId);
    if (col?.subTests) {
      setSelectedTests({
        reading: col.subTests.readingId || "",
        listening: col.subTests.listeningId || "",
        writing: col.subTests.writingId || "",
      });
      return;
    }
    setSelectedTests({
      reading: availableTests.reading.find((t) => t.collectionId === colId)?.id || "",
      listening: availableTests.listening.find((t) => t.collectionId === colId)?.id || "",
      writing: availableTests.writing.find((t) => t.collectionId === colId)?.id || "",
    });
  };

  const handleAddCollection = async () => {
    const name = newColName.trim();
    if (!name) return;
    if (mockCollections.some((c) => (c.name || "").toLowerCase() === name.toLowerCase())) {
      toast.error("Bunday nomli to'plam allaqachon bor");
      return;
    }
    setIsAddingCol(true);
    try {
      const payload = { name, type: "mock", createdAt: new Date().toISOString() };
      const docRef = await addDoc(collection(db, "test_collections"), payload);
      setMockCollections((prev) => [...prev, { id: docRef.id, ...payload }]);
      setSelectedCollectionId(docRef.id);
      setSelectedTests(EMPTY_SELECTION);
      setNewColName("");
      setShowAddCol(false);
      toast.success("Yangi mock to'plami yaratildi 🎉");
    } catch (e) {
      console.error(e);
      toast.error("To'plam yaratishda xatolik yuz berdi");
    } finally {
      setIsAddingCol(false);
    }
  };

  /* ------------------------- Mock exam yaratish ---------------------- */

  const moduleErrors = {
    reading: !selectedTests.reading,
    listening: !selectedTests.listening,
    writing: !selectedTests.writing,
  };
  const modulesReady = !moduleErrors.reading && !moduleErrors.listening && !moduleErrors.writing;
  const canCreateMock = modulesReady && Boolean(selectedCollectionId);

  const persistMockExam = async () => {
    setIsCreatingMock(true);
    setConfirmBusy(true);
    try {
      const colDoc = mockCollections.find((c) => c.id === selectedCollectionId);
      const titleToUse = mockTitle.trim() || (colDoc ? `${colDoc.name} Mock Exam` : "New Mock Exam");
      const subTests = {
        readingId: selectedTests.reading,
        listeningId: selectedTests.listening,
        writingId: selectedTests.writing,
      };
      const mockData = {
        title: titleToUse,
        type: "mock",
        collectionId: selectedCollectionId,
        subTests,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, "tests"), mockData);
      await setDoc(doc(db, "tests_metadata", docRef.id), { id: docRef.id, ...mockData });
      await updateDoc(doc(db, "test_collections", selectedCollectionId), { subTests });

      // Lokal holat ham yangilanadi, aks holda shu to'plam qayta tanlanganda
      // eski (subTests'siz) hujjatga qarab bo'sh tanlov chiqardi.
      setMockCollections((prev) => prev.map((c) => (c.id === selectedCollectionId ? { ...c, subTests } : c)));
      setMockExams((prev) => [{ id: docRef.id, ...mockData }, ...prev]);
      setSelectedMockExamId(docRef.id);
      setMockTitle("");
      setSelectedTests(EMPTY_SELECTION);
      setSelectedCollectionId("");
      setShowModuleErrors(false);

      toast.success("Mock imtihon yaratildi 🎉 Endi kalit generatsiya qiling.");
      setActiveTab("generate_keys");
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "Mock imtihon yaratishda xatolik yuz berdi");
    } finally {
      setIsCreatingMock(false);
      setConfirmState(null);
      setConfirmBusy(false);
    }
  };

  const handleCreateMockExam = () => {
    if (!modulesReady) {
      setShowModuleErrors(true);
      toast.error("Reading, Listening va Writing — uchalasini ham tanlang");
      return;
    }
    if (!selectedCollectionId) {
      toast.error("Mock to'plamini tanlang");
      return;
    }

    const duplicate = mockExams.find(
      (m) =>
        m.subTests?.readingId === selectedTests.reading &&
        m.subTests?.listeningId === selectedTests.listening &&
        m.subTests?.writingId === selectedTests.writing
    );
    if (duplicate) {
      setConfirmState({
        tone: "warning",
        title: "Bir xil mock mavjud",
        message: `Xuddi shu 3 ta test bilan "${duplicate.title || "Nomsiz"}" mock imtihoni allaqachon yaratilgan. Yana bittasini yaratasizmi?`,
        confirmLabel: "Baribir yaratish",
        onConfirm: persistMockExam,
      });
      return;
    }
    persistMockExam();
  };

  /* --------------------------- Mock tahriri -------------------------- */

  /**
   * Kalitga modul id'lari nusxa qilib yoziladi, shuning uchun mock o'zgarganda
   * hali faollashmagan kalitlarni ham yangilash kerak — aks holda admin
   * "o'zgartirdim" deb o'ylab, eski testni tarqatib yuboradi.
   */
  const syncUnusedKeys = async ({ mockId, subTests, title, collectionId }) => {
    const targets = keys.filter((k) => k.mockExamId === mockId && !k.isUsed);
    if (targets.length === 0) return 0;

    for (const part of chunk(targets, 400)) {
      const batch = writeBatch(db);
      part.forEach((k) =>
        batch.update(doc(db, "accessKeys", k.id), {
          assignedTests: {
            readingId: subTests.readingId,
            listeningId: subTests.listeningId,
            writingId: subTests.writingId,
          },
          mockTitle: title || "",
          collectionId: collectionId || null,
        })
      );
      await batch.commit();
    }
    return targets.length;
  };

  const handleMockSaved = (updated) => {
    setMockExams((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)));
    if (updated.collectionId) {
      setMockCollections((prev) =>
        prev.map((c) => (c.id === updated.collectionId ? { ...c, subTests: updated.subTests } : c))
      );
    }
  };

  const requestMockDelete = (mock, mockStats) => {
    setConfirmState({
      title: "Mock imtihonni o'chirish",
      message:
        mockStats.total > 0
          ? `"${mock.title}" o'chiriladi. Unga bog'langan ${mockStats.total} ta kalit o'chmaydi va ishlashda davom etadi (testlar kalitning o'zida saqlangan).`
          : `"${mock.title}" butunlay o'chiriladi. Bu amalni qaytarib bo'lmaydi.`,
      confirmLabel: "O'chirish",
      onConfirm: async () => {
        setConfirmBusy(true);
        try {
          await deleteDoc(doc(db, "tests", mock.id));
          await deleteDoc(doc(db, "tests_metadata", mock.id)).catch(() => null);
          setMockExams((prev) => prev.filter((m) => m.id !== mock.id));
          if (selectedMockExamId === mock.id) setSelectedMockExamId("");
          if (mockFilterId === mock.id) setMockFilterId("");
          toast.success("Mock imtihon o'chirildi");
          setConfirmState(null);
        } catch (e) {
          console.error(e);
          toast.error("O'chirib bo'lmadi: " + (e?.message || "xatolik"));
        } finally {
          setConfirmBusy(false);
        }
      },
    });
  };

  /* -------------------------- Kalit generatsiya ---------------------- */

  const selectedMockExam = mockExams.find((m) => m.id === selectedMockExamId) || null;

  const selectedMockModules = selectedMockExam
    ? [
        { label: "Reading", id: selectedMockExam.subTests?.readingId },
        { label: "Listening", id: selectedMockExam.subTests?.listeningId },
        { label: "Writing", id: selectedMockExam.subTests?.writingId },
      ].map((m) => ({ ...m, title: m.id ? testsById[m.id]?.title || null : null, missing: !m.id }))
    : [];

  const mockIsBroken = Boolean(selectedMockExam) && selectedMockModules.some((m) => m.missing);

  const clampBulk = (n) => Math.min(MAX_BULK, Math.max(1, n));

  const handleBulkInput = (raw) => {
    if (raw === "") {
      setBulkCount("");
      return;
    }
    const parsed = parseInt(raw, 10);
    // `Number("")` → NaN tekshiruvlardan o'tib ketib, bo'sh batch commit qilinardi.
    if (Number.isNaN(parsed)) return;
    setBulkCount(clampBulk(parsed));
  };

  const effectiveBulk = clampBulk(Number(bulkCount) || 1);

  const handleGenerate = async () => {
    if (!selectedMockExamId) {
      toast.error("Avval mock imtihonni tanlang");
      return;
    }
    const mockExam = mockExams.find((m) => m.id === selectedMockExamId);
    if (!mockExam) {
      toast.error("Tanlangan mock imtihon topilmadi. Ro'yxatni yangilang.");
      return;
    }

    const readingId = mockExam.subTests?.readingId;
    const listeningId = mockExam.subTests?.listeningId;
    const writingId = mockExam.subTests?.writingId;

    // Tarkibi to'liq bo'lmagan kalitni server faollashtirmaydi, lekin admin
    // buni faqat o'quvchidan eshitadi — shuning uchun shu yerda to'xtatamiz.
    if (!readingId || !listeningId || !writingId) {
      toast.error("Bu mock imtihonda modullar to'liq emas. Avval uni to'g'rilang.");
      return;
    }

    const count = effectiveBulk;
    setGenerating(true);
    try {
      const taken = keys.map((k) => k.key).filter(Boolean);
      let codes = generateUniqueCodes(count, taken);

      // Boshqa admin parallel yaratgan bo'lishi mumkin — bazadan ham tekshiramiz.
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const clashes = await findExistingCodes(codes);
        if (clashes.size === 0) break;
        const keep = codes.filter((c) => !clashes.has(c));
        const extra = generateUniqueCodes(codes.length - keep.length, [...taken, ...keep, ...Array.from(clashes)]);
        codes = [...keep, ...extra];
      }

      const batch = writeBatch(db);
      const createdAt = new Date().toISOString();
      const createdIds = [];

      codes.forEach((code) => {
        const docRef = doc(collection(db, "accessKeys"));
        batch.set(docRef, {
          key: code,
          isUsed: false,
          type: "mock_bundle",
          collectionId: mockExam.collectionId || null,
          mockExamId: selectedMockExamId,
          mockTitle: mockExam.title || "",
          createdAt,
          assignedTests: { readingId, listeningId, writingId },
        });
        createdIds.push(docRef.id);
      });

      await batch.commit();

      // Ro'yxatning o'zi onSnapshot orqali yangilanadi.
      setFreshKeyIds(createdIds);
      setStatusFilter("all");
      setKeySearch("");
      setMockFilterId("");
      setSortMode("new");
      toast.success(`${createdIds.length} ta kalit yaratildi 🎉`);
      setBulkCount(1);
    } catch (error) {
      console.error(error);
      toast.error(error?.message || "Kalit yaratishda xatolik yuz berdi");
    } finally {
      setGenerating(false);
    }
  };

  /* ------------------------------ Amallar ---------------------------- */

  const copyOne = async (code) => {
    const ok = await writeClipboard(code);
    if (!ok) {
      toast.error("Nusxalab bo'lmadi — kalitni qo'lda belgilang");
      return;
    }
    setCopiedKey(code);
    setTimeout(() => setCopiedKey((c) => (c === code ? "" : c)), 1500);
    toast.success("Nusxalandi 📋");
  };

  const copyMany = async (list, label) => {
    if (list.length === 0) {
      toast.error("Nusxalash uchun kalit yo'q");
      return;
    }
    const ok = await writeClipboard(list.map((k) => k.key).join("\n"));
    if (ok) toast.success(`${list.length} ta ${label} nusxalandi 📋`);
    else toast.error("Nusxalab bo'lmadi");
  };

  /** O'chirilgan kalitni qaytarish imkoni — tasodifiy bosish arzon bo'lsin. */
  const offerUndo = (docs) => {
    toast(
      (t) => (
        <span className="flex items-center gap-3 text-xs font-bold">
          {docs.length === 1 ? `${docs[0].data.key} o'chirildi` : `${docs.length} ta kalit o'chirildi`}
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                for (const part of chunk(docs, 400)) {
                  const batch = writeBatch(db);
                  part.forEach((d) => batch.set(doc(db, "accessKeys", d.id), d.data));
                  await batch.commit();
                }
                toast.success("Qaytarildi");
              } catch (e) {
                console.error(e);
                toast.error("Qaytarib bo'lmadi");
              }
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-900 text-white shrink-0"
          >
            <Undo2 size={12} /> Qaytarish
          </button>
        </span>
      ),
      { duration: 6000 }
    );
  };

  const requestDelete = (item) => {
    setConfirmState({
      title: "Kalitni o'chirish",
      message: item.isUsed
        ? `${item.key} allaqachon ishlatilgan (${item.usedByName || "noma'lum"}). O'chirilsa, kim ishlatgani haqidagi yozuv ham yo'qoladi.`
        : `${item.key} o'chiriladi. Keyin bir necha soniya ichida qaytarish mumkin.`,
      confirmLabel: "O'chirish",
      onConfirm: async () => {
        setConfirmBusy(true);
        try {
          const { id, mockName, collectionName, ...data } = item;
          void mockName;
          void collectionName;
          await deleteDoc(doc(db, "accessKeys", id));
          setSelectedKeyIds((prev) => prev.filter((k) => k !== id));
          setConfirmState(null);
          offerUndo([{ id, data }]);
        } catch (e) {
          console.error(e);
          toast.error("O'chirib bo'lmadi: " + (e?.message || "xatolik"));
        } finally {
          setConfirmBusy(false);
        }
      },
    });
  };

  const requestBulkDelete = () => {
    const targets = keys.filter((k) => selectedKeyIds.includes(k.id));
    if (targets.length === 0) return;
    const usedCount = targets.filter((k) => k.isUsed).length;

    setConfirmState({
      title: `${targets.length} ta kalitni o'chirish`,
      message: usedCount
        ? `Tanlanganlardan ${usedCount} tasi allaqachon ishlatilgan. Hammasi o'chiriladi.`
        : "Tanlangan kalitlar o'chiriladi. Keyin bir necha soniya ichida qaytarish mumkin.",
      confirmLabel: "O'chirish",
      onConfirm: async () => {
        setConfirmBusy(true);
        try {
          const snapshots = targets.map(({ id, ...data }) => ({ id, data }));
          // writeBatch limiti — 500 ta amal.
          for (const part of chunk(snapshots, 400)) {
            const batch = writeBatch(db);
            part.forEach((d) => batch.delete(doc(db, "accessKeys", d.id)));
            await batch.commit();
          }
          setSelectedKeyIds([]);
          setConfirmState(null);
          offerUndo(snapshots);
        } catch (e) {
          console.error(e);
          toast.error("O'chirib bo'lmadi: " + (e?.message || "xatolik"));
        } finally {
          setConfirmBusy(false);
        }
      },
    });
  };

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      const visible = new Set(filteredKeys.map((k) => k.id));
      setSelectedKeyIds((prev) => prev.filter((id) => !visible.has(id)));
    } else {
      setSelectedKeyIds((prev) => Array.from(new Set([...prev, ...filteredKeys.map((k) => k.id)])));
    }
  };

  const exportCsv = () => {
    if (filteredKeys.length === 0) {
      toast.error("Eksport qilish uchun kalit yo'q");
      return;
    }
    downloadCsv(buildKeysCsv(filteredKeys), `access-keys-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success("CSV yuklab olindi");
  };

  const handlePrint = () => {
    const rows = selectedKeys.length > 0 ? selectedKeys : filteredKeys;
    if (rows.length === 0) {
      toast.error("Chop etish uchun kalit yo'q");
      return;
    }
    const ok = printKeys(rows, mockFilterId ? mockTitleById[mockFilterId] || "Access Keys" : "Access Keys");
    if (!ok) toast.error("Brauzer yangi oynani bloklab qo'ydi — pop-up'ga ruxsat bering");
  };

  /* ------------------------------- Stillar --------------------------- */

  const panelCls = isDark ? "bg-[#0c0c0e] border-zinc-800" : "bg-white border-zinc-200/80";
  const inputCls = `w-full border p-3 rounded-xl outline-none text-xs font-bold transition-all ${
    isDark
      ? "bg-zinc-900 border-zinc-800 focus:border-zinc-600 text-zinc-100"
      : "bg-zinc-50 border-zinc-200 focus:border-zinc-400 text-zinc-800"
  }`;
  const labelCls = `block text-[10px] font-black uppercase tracking-wider mb-1.5 ${isDark ? "text-zinc-500" : "text-zinc-400"}`;
  const primaryBtnCls = `w-full font-bold text-xs py-3.5 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 flex justify-center items-center gap-2 ${
    isDark ? "bg-zinc-100 hover:bg-white text-zinc-900 shadow-zinc-950/40" : "bg-zinc-900 hover:bg-zinc-950 text-white shadow-zinc-900/10"
  }`;
  const ghostBtnCls = `flex items-center gap-2 border px-3 py-2 rounded-xl text-[11px] font-bold transition-all active:scale-95 disabled:opacity-40 ${
    isDark ? "bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300" : "bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-600"
  }`;

  const TABS = [
    { id: "create_mock", label: "1. Mock" },
    { id: "generate_keys", label: "2. Kalit" },
    { id: "mocks", label: `Ro'yxat (${mockExams.length})` },
  ];

  /* --------------------------------- UI ------------------------------ */

  return (
    <div
      className={`min-h-full font-sans transition-colors duration-200 p-3 sm:p-6 md:p-8 ${
        isDark ? "bg-[#1f1e1b] text-zinc-100" : "bg-[#fafafa] text-zinc-800"
      }`}
    >
      {/* HEADER */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">Access Keys</h1>
              <span
                className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${
                  isDark ? "bg-zinc-900 border-zinc-800 text-zinc-400" : "bg-zinc-100 border-zinc-200 text-zinc-500"
                }`}
              >
                Mock Manager
              </span>
              {!liveError && !keysLoading && (
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border flex items-center gap-1 ${
                    isDark ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-600"
                  }`}
                  title="Kalitlar holati real vaqtda yangilanadi"
                >
                  <Radio size={9} /> Jonli
                </span>
              )}
            </div>
            <p className={`text-xs mt-1 font-semibold ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
              Mock imtihonlar uchun aktivatsiya kalitlarini yaratish va boshqarish paneli.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={loadMeta} disabled={metaLoading} className={ghostBtnCls} title="Testlar va mocklarni yangilash">
              <RefreshCw size={13} className={metaLoading ? "animate-spin" : ""} />
              Yangilash
            </button>
            <button onClick={() => navigate("/admin")} className={ghostBtnCls}>
              <ArrowLeft size={13} /> Dashboard
            </button>
          </div>
        </div>

        {/* Statistika — bosilsa filtr */}
        <div className="flex flex-wrap gap-2.5 mt-5">
          <StatChip
            icon={Key}
            label="Jami kalit"
            value={keysLoading ? "—" : stats.total}
            isDark={isDark}
            active={statusFilter === "all"}
            onClick={() => setStatusFilter("all")}
          />
          <StatChip
            icon={CircleDashed}
            label="Faollashmagan"
            value={keysLoading ? "—" : stats.unused}
            isDark={isDark}
            tone="blue"
            active={statusFilter === "unused"}
            onClick={() => setStatusFilter("unused")}
          />
          <StatChip
            icon={CheckCircle2}
            label="Ishlatilgan"
            value={keysLoading ? "—" : stats.used}
            isDark={isDark}
            tone="green"
            active={statusFilter === "used"}
            onClick={() => setStatusFilter("used")}
          />
          <StatChip
            icon={Layers}
            label="Mock imtihon"
            value={metaLoading ? "—" : mockExams.length}
            isDark={isDark}
            onClick={() => setActiveTab("mocks")}
          />
        </div>

        {(liveError || metaError) && (
          <div className="mt-4 flex items-center justify-between gap-3 p-3.5 rounded-xl border border-red-500/30 bg-red-500/5 text-xs font-bold text-red-500">
            <span className="flex items-center gap-2">
              <AlertTriangle size={14} /> {liveError || metaError}
            </span>
            <button onClick={loadMeta} className="underline underline-offset-2 shrink-0">
              Qayta urinish
            </button>
          </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* CHAP USTUN */}
        <div className={`rounded-2xl border p-4 sm:p-6 shadow-sm lg:sticky lg:top-8 transition-colors ${panelCls}`}>
          <h2 className="font-extrabold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
            <Bolt className={`w-4 h-4 ${isDark ? "text-zinc-400" : "text-zinc-600"}`} /> Mock Manager
          </h2>

          <div className={`flex gap-1 p-1 rounded-xl mb-5 ${isDark ? "bg-zinc-950/60" : "bg-zinc-100/80"}`}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                  activeTab === tab.id
                    ? isDark
                      ? "bg-zinc-800 text-white shadow-sm"
                      : "bg-white text-zinc-900 shadow-sm"
                    : isDark
                      ? "text-zinc-500 hover:text-zinc-300"
                      : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="space-y-5">
            {/* --- TAB 1: MOCK YARATISH --- */}
            {activeTab === "create_mock" && (
              <>
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className={`block text-[10px] font-black uppercase tracking-wider ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                      Mock To'plami <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAddCol((v) => !v)}
                      className={`text-[10px] font-black tracking-tight transition-colors ${
                        isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"
                      }`}
                    >
                      {showAddCol ? "Bekor qilish" : "+ Yangi to'plam"}
                    </button>
                  </div>
                  <select className={inputCls} value={selectedCollectionId} onChange={(e) => handleCollectionChange(e.target.value)}>
                    <option value="">Tanlang...</option>
                    {mockCollections.map((c) => (
                      <option key={c.id} value={c.id}>
                        🎓 {c.name}
                      </option>
                    ))}
                  </select>
                  <p className={`text-[10px] mt-1.5 font-semibold ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>
                    To'plam nomi talabaga imtihon sarlavhasi sifatida ko'rinadi.
                  </p>
                </div>

                {showAddCol && (
                  <div className={`p-4 rounded-xl border space-y-3 ${isDark ? "bg-zinc-950/40 border-zinc-800" : "bg-blue-50/40 border-blue-100"}`}>
                    <label className={`block text-[10px] font-black uppercase tracking-wider ${isDark ? "text-zinc-400" : "text-blue-700"}`}>
                      Yangi Mock To'plam nomi
                    </label>
                    <input
                      type="text"
                      autoFocus
                      className={`w-full border p-2.5 rounded-lg outline-none text-xs font-bold ${
                        isDark ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-800"
                      }`}
                      placeholder="Masalan: CD Mock Test 1"
                      value={newColName}
                      onChange={(e) => setNewColName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddCollection()}
                    />
                    <div className="flex justify-end gap-2 text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddCol(false);
                          setNewColName("");
                        }}
                        className={`px-3 py-1.5 rounded transition ${isDark ? "text-zinc-400 hover:bg-zinc-800" : "text-zinc-500 hover:bg-zinc-100"}`}
                      >
                        Bekor qilish
                      </button>
                      <button
                        type="button"
                        onClick={handleAddCollection}
                        disabled={isAddingCol || !newColName.trim()}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded transition flex items-center gap-1.5"
                      >
                        {isAddingCol && <Loader2 size={11} className="animate-spin" />}
                        {isAddingCol ? "Yaratilmoqda..." : "Yaratish"}
                      </button>
                    </div>
                  </div>
                )}

                <div className={`h-[1px] my-1 ${isDark ? "bg-zinc-800" : "bg-zinc-200"}`} />

                <SearchableTestSelect
                  label="1. Reading Module *"
                  type="reading"
                  options={availableTests.reading}
                  value={selectedTests.reading}
                  onChange={(val) => setSelectedTests((p) => ({ ...p, reading: val }))}
                  placeholder="Reading testini tanlang..."
                  isDark={isDark}
                  error={showModuleErrors && moduleErrors.reading}
                />
                <SearchableTestSelect
                  label="2. Listening Module *"
                  type="listening"
                  options={availableTests.listening}
                  value={selectedTests.listening}
                  onChange={(val) => setSelectedTests((p) => ({ ...p, listening: val }))}
                  placeholder="Listening testini tanlang..."
                  isDark={isDark}
                  error={showModuleErrors && moduleErrors.listening}
                />
                <SearchableTestSelect
                  label="3. Writing Module *"
                  type="writing"
                  options={availableTests.writing}
                  value={selectedTests.writing}
                  onChange={(val) => setSelectedTests((p) => ({ ...p, writing: val }))}
                  placeholder="Writing testini tanlang..."
                  isDark={isDark}
                  error={showModuleErrors && moduleErrors.writing}
                />

                <div className={`h-[1px] my-1 ${isDark ? "bg-zinc-800" : "bg-zinc-200"}`} />

                <div>
                  <label className={labelCls}>Mock Exam Nomi (ixtiyoriy)</label>
                  <input
                    type="text"
                    className={inputCls}
                    placeholder="Bo'sh qoldirilsa to'plam nomidan olinadi"
                    value={mockTitle}
                    onChange={(e) => setMockTitle(e.target.value)}
                  />
                </div>

                <button onClick={handleCreateMockExam} disabled={isCreatingMock || !canCreateMock} className={primaryBtnCls}>
                  {isCreatingMock ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Yaratilmoqda...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} /> Mock Exam Yaratish
                    </>
                  )}
                </button>

                {!canCreateMock && (
                  <p className={`text-[10px] font-semibold text-center ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>
                    {!selectedCollectionId ? "To'plamni tanlang" : "3 ta modulni ham tanlang"}
                  </p>
                )}
              </>
            )}

            {/* --- TAB 2: KALIT YARATISH --- */}
            {activeTab === "generate_keys" && (
              <>
                <div>
                  <label className={labelCls}>Mock Imtihonni Tanlang</label>
                  <select className={inputCls} value={selectedMockExamId} onChange={(e) => setSelectedMockExamId(e.target.value)}>
                    <option value="">Mock imtihonni tanlang...</option>
                    {mockExams.map((m) => (
                      <option key={m.id} value={m.id}>
                        🎓 {m.title || "Nomsiz mock"}
                      </option>
                    ))}
                  </select>
                  {mockExams.length === 0 && !metaLoading && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("create_mock")}
                      className={`mt-2 text-[10px] font-bold underline underline-offset-2 ${isDark ? "text-blue-400" : "text-blue-600"}`}
                    >
                      Hali mock imtihon yo'q — avval bittasini yarating
                    </button>
                  )}
                </div>

                {selectedMockExam && (
                  <div className={`p-3.5 rounded-xl border space-y-2 ${isDark ? "bg-zinc-950/40 border-zinc-800" : "bg-zinc-50 border-zinc-200"}`}>
                    <div className="flex items-center justify-between">
                      <p className={`text-[9px] font-black uppercase tracking-wider ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                        Kalitga biriktiriladigan testlar
                      </p>
                      <button
                        onClick={() => setEditingMock(selectedMockExam)}
                        className={`text-[9px] font-black uppercase tracking-wider ${isDark ? "text-blue-400" : "text-blue-600"}`}
                      >
                        Tahrirlash
                      </button>
                    </div>
                    {selectedMockModules.map((m) => (
                      <div key={m.label} className="flex items-center gap-2 text-[11px] font-bold">
                        {m.missing ? (
                          <AlertTriangle size={12} className="text-red-500 shrink-0" />
                        ) : (
                          <Check size={12} className="text-emerald-500 shrink-0" />
                        )}
                        <span className={isDark ? "text-zinc-500" : "text-zinc-400"}>{m.label}:</span>
                        <span className="truncate">{m.missing ? "biriktirilmagan" : m.title || "(test o'chirilgan?)"}</span>
                      </div>
                    ))}
                    {mockIsBroken && (
                      <p className="text-[10px] font-bold text-red-500 leading-relaxed pt-1">
                        Modullar to'liq emas — bunday kalit talabada ishlamaydi.
                      </p>
                    )}
                  </div>
                )}

                <div className="pt-1">
                  <label className={labelCls}>Kalitlar Soni (maks. {MAX_BULK})</label>
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex items-center rounded-xl border overflow-hidden ${
                        isDark ? "border-zinc-800 bg-zinc-900" : "border-zinc-200 bg-zinc-50"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setBulkCount(clampBulk(effectiveBulk - 1))}
                        className={`px-2.5 py-3 transition ${isDark ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-zinc-100 text-zinc-500"}`}
                        aria-label="Kamaytirish"
                      >
                        <Minus size={13} />
                      </button>
                      <input
                        type="number"
                        min="1"
                        max={MAX_BULK}
                        inputMode="numeric"
                        className={`w-12 bg-transparent text-center font-extrabold text-sm outline-none py-3 ${
                          isDark ? "text-zinc-100" : "text-zinc-800"
                        }`}
                        value={bulkCount}
                        onChange={(e) => handleBulkInput(e.target.value)}
                        onBlur={() => setBulkCount(effectiveBulk)}
                        onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                      />
                      <button
                        type="button"
                        onClick={() => setBulkCount(clampBulk(effectiveBulk + 1))}
                        className={`px-2.5 py-3 transition ${isDark ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-zinc-100 text-zinc-500"}`}
                        aria-label="Ko'paytirish"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                    <div className="flex gap-1.5">
                      {[5, 10, 25].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setBulkCount(n)}
                          className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black border transition ${
                            effectiveBulk === n
                              ? isDark
                                ? "bg-zinc-800 border-zinc-700 text-white"
                                : "bg-zinc-900 border-zinc-900 text-white"
                              : isDark
                                ? "border-zinc-800 text-zinc-500 hover:text-zinc-300"
                                : "border-zinc-200 text-zinc-500 hover:text-zinc-700"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button onClick={handleGenerate} disabled={generating || !selectedMockExamId || mockIsBroken} className={`${primaryBtnCls} mt-3`}>
                    {generating ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Yaratilmoqda...
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} /> Kalitlarni yaratish ({effectiveBulk})
                      </>
                    )}
                  </button>
                  {!selectedMockExamId && (
                    <p className={`text-[10px] font-semibold text-center mt-2 ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>
                      Avval mock imtihonni tanlang
                    </p>
                  )}
                </div>
              </>
            )}

            {/* --- TAB 3: MOCKLAR RO'YXATI --- */}
            {activeTab === "mocks" && (
              <MockExamsList
                mocks={mockExams}
                keys={keys}
                collections={mockCollections}
                testsById={testsById}
                isDark={isDark}
                onGenerateKeys={(mock) => {
                  setSelectedMockExamId(mock.id);
                  setActiveTab("generate_keys");
                }}
                onEdit={(mock) => setEditingMock(mock)}
                onDelete={requestMockDelete}
              />
            )}
          </div>
        </div>

        {/* O'NG USTUN: KALITLAR */}
        <div className={`lg:col-span-2 rounded-2xl border shadow-sm flex flex-col lg:h-[82dvh] overflow-hidden transition-colors ${panelCls}`}>
          {/* Toolbar */}
          <div className={`p-4 border-b space-y-3 transition-colors ${isDark ? "border-zinc-800 bg-zinc-900/20" : "border-zinc-200 bg-zinc-50/50"}`}>
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <span className="font-extrabold text-sm uppercase tracking-wider flex items-center gap-2 shrink-0">
                <Key size={16} className="text-zinc-500" />
                Kalitlar
                <span className={`font-bold normal-case tracking-normal text-xs ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                  {filteredKeys.length === stats.total ? stats.total : `${filteredKeys.length} / ${stats.total}`}
                </span>
              </span>

              <div className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-2 border px-3 py-2 rounded-xl flex-1 sm:w-60 transition-all ${
                    isDark ? "bg-zinc-950 border-zinc-800 focus-within:border-zinc-600" : "bg-white border-zinc-200 focus-within:border-zinc-400"
                  }`}
                >
                  <Search size={14} className="text-zinc-400 shrink-0" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Qidirish...  ( / )"
                    className="bg-transparent border-none outline-none text-xs font-semibold placeholder:text-zinc-500 w-full"
                    value={keySearch}
                    onChange={(e) => setKeySearch(e.target.value)}
                  />
                  {keySearch && (
                    <button onClick={() => setKeySearch("")} className="text-zinc-400 hover:text-zinc-200 shrink-0">
                      <X size={12} />
                    </button>
                  )}
                </div>
                <button onClick={handlePrint} className={ghostBtnCls} title="Kalitlarni chop etish">
                  <Printer size={13} />
                </button>
                <button onClick={exportCsv} className={ghostBtnCls} title="CSV yuklab olish">
                  <Download size={13} />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <div className={`flex gap-1 p-1 rounded-lg ${isDark ? "bg-zinc-950/60" : "bg-zinc-100"}`}>
                  {[
                    { id: "all", label: "Hammasi" },
                    { id: "unused", label: "Faol emas" },
                    { id: "used", label: "Ishlatilgan" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setStatusFilter(f.id)}
                      className={`px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md transition ${
                        statusFilter === f.id
                          ? isDark
                            ? "bg-zinc-800 text-white"
                            : "bg-white text-zinc-900 shadow-sm"
                          : isDark
                            ? "text-zinc-500 hover:text-zinc-300"
                            : "text-zinc-500 hover:text-zinc-700"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {mockExams.length > 0 && (
                  <select
                    value={mockFilterId}
                    onChange={(e) => setMockFilterId(e.target.value)}
                    className={`border rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none max-w-[170px] ${
                      isDark ? "bg-zinc-950 border-zinc-800 text-zinc-300" : "bg-white border-zinc-200 text-zinc-600"
                    }`}
                  >
                    <option value="">Barcha mocklar</option>
                    {mockExams.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title || "Nomsiz mock"}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  onClick={() => setSortMode((s) => (s === "new" ? "old" : s === "old" ? "status" : "new"))}
                  className={ghostBtnCls}
                  title="Tartibni o'zgartirish"
                >
                  <ArrowDownUp size={12} />
                  {sortMode === "new" ? "Yangi" : sortMode === "old" ? "Eski" : "Holat"}
                </button>
              </div>

              <div className="flex items-center gap-2">
                {filteredKeys.length > 0 && (
                  <button onClick={toggleSelectAllVisible} className={ghostBtnCls}>
                    {allVisibleSelected ? "Bekor qilish" : "Hammasini tanlash"}
                  </button>
                )}
                {selectedKeyIds.length > 0 && (
                  <>
                    <button onClick={() => copyMany(selectedKeys, "tanlangan kalit")} className={ghostBtnCls}>
                      <Copy size={12} /> {selectedKeyIds.length} ta
                    </button>
                    <button
                      onClick={requestBulkDelete}
                      className="flex items-center gap-1.5 border border-red-500/30 bg-red-500/5 text-red-500 hover:bg-red-500/10 px-3 py-2 rounded-xl text-[11px] font-bold transition active:scale-95"
                    >
                      <Trash2 size={12} /> O'chirish
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Yangi yaratilgan kalitlar banneri */}
          {freshKeys.length > 0 && (
            <div
              className={`px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-b animate-content-in ${
                isDark ? "bg-emerald-500/5 border-zinc-800" : "bg-emerald-50/60 border-zinc-200"
              }`}
            >
              <p className={`text-xs font-bold flex items-center gap-2 ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>
                <Sparkles size={13} /> {freshKeys.length} ta yangi kalit yaratildi
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyMany(freshKeys, "yangi kalit")}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold transition active:scale-95"
                >
                  <Copy size={12} /> Nusxalash
                </button>
                <button
                  onClick={() => printKeys(freshKeys, "Yangi kalitlar")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition active:scale-95 border ${
                    isDark ? "border-zinc-800 text-zinc-300 hover:bg-zinc-800" : "border-zinc-200 text-zinc-600 hover:bg-white"
                  }`}
                >
                  <Printer size={12} /> Chop etish
                </button>
                <button
                  onClick={() => setFreshKeyIds([])}
                  className={`p-1.5 rounded-lg transition ${isDark ? "text-zinc-500 hover:text-zinc-300" : "text-zinc-400 hover:text-zinc-600"}`}
                  aria-label="Yopish"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          )}

          {/* Ro'yxat */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar min-h-[300px]">
            {keysLoading &&
              Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-[68px] rounded-xl border relative overflow-hidden ${
                    isDark ? "bg-zinc-900/40 border-zinc-800" : "bg-zinc-50 border-zinc-200"
                  }`}
                >
                  <div className="absolute inset-0 -translate-x-full animate-shimmer-sweep bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                </div>
              ))}

            {!keysLoading &&
              visibleKeys.map((item, index) => (
                <KeyRow
                  key={item.id}
                  item={item}
                  index={index}
                  isFresh={freshKeyIds.includes(item.id)}
                  isSelected={selectedKeyIds.includes(item.id)}
                  isCopied={copiedKey === item.key}
                  isDark={isDark}
                  mockName={item.mockName}
                  collectionName={item.collectionName}
                  onToggleSelect={() =>
                    setSelectedKeyIds((prev) => (prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id]))
                  }
                  onCopy={() => copyOne(item.key)}
                  onDelete={() => requestDelete(item)}
                />
              ))}

            {!keysLoading && filteredKeys.length > visibleKeys.length && (
              <button
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className={`w-full py-3 rounded-xl border text-xs font-bold transition ${
                  isDark ? "border-zinc-800 text-zinc-400 hover:bg-zinc-900" : "border-zinc-200 text-zinc-500 hover:bg-zinc-50"
                }`}
              >
                Yana {Math.min(PAGE_SIZE, filteredKeys.length - visibleKeys.length)} ta ko'rsatish{" "}
                <span className="opacity-50">
                  ({visibleKeys.length}/{filteredKeys.length})
                </span>
              </button>
            )}

            {!keysLoading && filteredKeys.length === 0 && (
              <div className="text-center py-16 px-6">
                <div
                  className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-3 ${
                    isDark ? "bg-zinc-900 text-zinc-600" : "bg-zinc-100 text-zinc-400"
                  }`}
                >
                  <Key size={20} />
                </div>
                <p className="text-sm font-bold">
                  {keySearch || statusFilter !== "all" || mockFilterId ? "Mos kalit topilmadi" : "Hozircha kalitlar yo'q"}
                </p>
                <p className={`text-xs font-semibold mt-1 ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                  {keySearch || statusFilter !== "all" || mockFilterId
                    ? "Qidiruv yoki filtrni o'zgartirib ko'ring."
                    : "Chapdagi paneldan mock imtihon tanlab, birinchi kalitlarni yarating."}
                </p>
                {(keySearch || statusFilter !== "all" || mockFilterId) && (
                  <button
                    onClick={() => {
                      setKeySearch("");
                      setStatusFilter("all");
                      setMockFilterId("");
                    }}
                    className={`mt-3 text-[11px] font-bold underline underline-offset-2 ${isDark ? "text-blue-400" : "text-blue-600"}`}
                  >
                    Filtrni tozalash
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        open={Boolean(confirmState)}
        title={confirmState?.title || ""}
        message={confirmState?.message || ""}
        confirmLabel={confirmState?.confirmLabel || "Davom etish"}
        tone={confirmState?.tone || "danger"}
        busy={confirmBusy}
        isDark={isDark}
        onConfirm={() => confirmState?.onConfirm?.()}
        onCancel={() => {
          if (!confirmBusy) setConfirmState(null);
        }}
      />

      <MockExamEditModal
        open={Boolean(editingMock)}
        mock={editingMock}
        collections={mockCollections}
        availableTests={availableTests}
        unusedKeysCount={editingMock ? keys.filter((k) => k.mockExamId === editingMock.id && !k.isUsed).length : 0}
        isDark={isDark}
        onClose={() => setEditingMock(null)}
        onSaved={handleMockSaved}
        onSyncUnusedKeys={syncUnusedKeys}
      />
    </div>
  );
}
