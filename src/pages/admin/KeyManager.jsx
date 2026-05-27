// src/pages/admin/KeyManager.jsx
import React, { useEffect, useState } from "react";
import { db } from "../../firebase/firebase";
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, writeBatch, setDoc, where, updateDoc } from "firebase/firestore";
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
  ChevronDown, 
  Plus, 
  FolderKanban, 
  Loader2,
  Calendar,
  User,
  X,
  FileText,
  HelpCircle
} from "lucide-react";

// --- SEARCHABLE DROP-DOWN SELECT COMPONENT ---
function SearchableTestSelect({ label, type, options, value, onChange, placeholder, isDark }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  
  const selectedTest = options.find(o => o.id === value);
  
  const filtered = options.filter(o => 
    (o.title || "").toLowerCase().includes(search.toLowerCase())
  );
  
  // Close dropdown on clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClose = () => setIsOpen(false);
    window.addEventListener("click", handleClose);
    return () => window.removeEventListener("click", handleClose);
  }, [isOpen]);

  const typeIcons = {
    reading: "📖",
    listening: "🎧",
    writing: "✍️",
    speaking: "🗣️"
  };

  return (
    <div className="relative space-y-1.5" onClick={(e) => e.stopPropagation()}>
      <label className={`block text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
        {label}
      </label>
      
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between border rounded-xl p-3 text-left transition-all text-xs font-bold ${
          isDark 
            ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-100 focus:border-zinc-600' 
            : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300 text-zinc-800 focus:border-zinc-400'
        }`}
      >
        {selectedTest ? (
          <div className="flex-1 min-w-0 pr-2">
            <p className="truncate text-sm">{selectedTest.title}</p>
            <div className="flex items-center gap-2 mt-1 text-[9px] font-bold opacity-60">
              <span className={`px-1.5 py-0.5 rounded uppercase ${isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-200/50 text-zinc-600'}`}>
                {selectedTest.difficulty || "medium"}
              </span>
              {selectedTest.createdAt && (
                <span>• {new Date(selectedTest.createdAt).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        ) : (
          <span className={isDark ? 'text-zinc-500' : 'text-zinc-400'}>{placeholder}</span>
        )}
        <ChevronDown size={16} className={`text-zinc-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {/* Dropdown Panel */}
      {isOpen && (
        <div className={`absolute left-0 right-0 mt-1 z-50 border rounded-xl shadow-xl max-h-60 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 ${
          isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-800'
        }`}>
          {/* Search Input */}
          <div className={`p-2 border-b flex items-center gap-2 ${isDark ? 'border-zinc-800 bg-zinc-950/40' : 'border-zinc-100 bg-zinc-50/50'}`}>
            <Search size={14} className="text-zinc-400 shrink-0" />
            <input
              type="text"
              autoFocus
              className="w-full bg-transparent outline-none text-xs font-semibold placeholder:text-zinc-500"
              placeholder="Qidirish..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} className="text-zinc-400 hover:text-zinc-200">
                <X size={12} />
              </button>
            )}
          </div>
          
          {/* Options List */}
          <div className="flex-1 overflow-y-auto p-1 space-y-0.5 custom-scrollbar">
            {filtered.map(opt => {
              const isSelected = opt.id === value;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange(opt.id);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className={`w-full text-left p-2.5 rounded-lg transition-colors flex items-center justify-between text-xs ${
                    isSelected 
                      ? (isDark ? 'bg-zinc-800 text-white font-bold' : 'bg-zinc-900 text-white font-bold') 
                      : (isDark ? 'hover:bg-zinc-800/60 text-zinc-300 font-medium' : 'hover:bg-zinc-100 text-zinc-700 font-medium')
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <p className="truncate">{typeIcons[type] || ""} {opt.title}</p>
                    <p className={`text-[9px] mt-0.5 font-bold ${isSelected ? 'text-zinc-300' : 'text-zinc-500'}`}>
                      Qiyinchilik: {opt.difficulty || "medium"} • {opt.createdAt ? new Date(opt.createdAt).toLocaleDateString() : ""}
                    </p>
                  </div>
                  {isSelected && <Check size={14} className="text-white shrink-0" />}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-center text-zinc-500 py-6 text-xs italic">Hech narsa topilmadi</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function KeyManager() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [keys, setKeys] = useState([]);
  const [keySearch, setKeySearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [bulkCount, setBulkCount] = useState(1);

  // Tabs
  const [activeGeneratorTab, setActiveGeneratorTab] = useState("create_mock");

  // Tests
  const [availableTests, setAvailableTests] = useState({ reading: [], listening: [], writing: [] });
  const [selectedTests, setSelectedTests] = useState({ reading: "", listening: "", writing: "" });

  // Mock Exams
  const [mockExams, setMockExams] = useState([]);
  const [selectedMockExamId, setSelectedMockExamId] = useState("");
  const [mockTitle, setMockTitle] = useState("");
  const [isCreatingMock, setIsCreatingMock] = useState(false);

  // Mock Collections
  const [mockCollections, setMockCollections] = useState([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState("");
  const [newColName, setNewColName] = useState("");
  const [showAddCol, setShowAddCol] = useState(false);
  const [isAddingCol, setIsAddingCol] = useState(false);

  // --- 1. DATA LOAD ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [keysSnap, testsSnap, colsSnap, mockExamsSnap] = await Promise.all([
            getDocs(query(collection(db, "accessKeys"), orderBy("createdAt", "desc"))),
            getDocs(query(collection(db, "tests"), orderBy("createdAt", "desc"))),
            getDocs(collection(db, "test_collections")).catch(() => ({ docs: [] })),
            getDocs(query(collection(db, "tests_metadata"), where("type", "==", "mock"))).catch(() => ({ docs: [] }))
        ]);

        setKeys(keysSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        
        const allTests = testsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const avTests = {
          reading: allTests.filter(t => t.type === 'reading'),
          listening: allTests.filter(t => t.type === 'listening'),
          writing: allTests.filter(t => t.type === 'writing'),
        };
        setAvailableTests(avTests);

        const fetchedCols = colsSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(c => c.type === 'mock');
        setMockCollections(fetchedCols);

        const fetchedMocks = mockExamsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMockExams(fetchedMocks);

        // Auto select if passed via navigation state
        const targetColId = location.state?.collectionId;
        if (targetColId) {
          setSelectedCollectionId(targetColId);
          const col = fetchedCols.find(c => c.id === targetColId);
          if (col && col.subTests) {
            setSelectedTests({
              reading: col.subTests.readingId || "",
              listening: col.subTests.listeningId || "",
              writing: col.subTests.writingId || ""
            });
          } else {
            const readingTest = avTests.reading.find(t => t.collectionId === targetColId);
            const listeningTest = avTests.listening.find(t => t.collectionId === targetColId);
            const writingTest = avTests.writing.find(t => t.collectionId === targetColId);
            setSelectedTests({
              reading: readingTest ? readingTest.id : "",
              listening: listeningTest ? listeningTest.id : "",
              writing: writingTest ? writingTest.id : ""
            });
          }
        }
      } catch (error) { console.error("Xatolik:", error); }
    };
    fetchData();
  }, [location.state?.collectionId]);

  const handleCollectionChange = (colId) => {
    setSelectedCollectionId(colId);
    if (!colId || colId === "None") {
      setSelectedTests({ reading: "", listening: "", writing: "" });
      return;
    }
    
    // Find tests that belong to this collection, checking collection document subTests first
    const col = mockCollections.find(c => c.id === colId);
    if (col && col.subTests) {
      setSelectedTests({
        reading: col.subTests.readingId || "",
        listening: col.subTests.listeningId || "",
        writing: col.subTests.writingId || ""
      });
    } else {
      const readingTest = availableTests.reading.find(t => t.collectionId === colId);
      const listeningTest = availableTests.listening.find(t => t.collectionId === colId);
      const writingTest = availableTests.writing.find(t => t.collectionId === colId);

      setSelectedTests({
        reading: readingTest ? readingTest.id : "",
        listening: listeningTest ? listeningTest.id : "",
        writing: writingTest ? writingTest.id : ""
      });
    }
  };

  const handleAddCollection = async () => {
    if (!newColName.trim()) return;
    setIsAddingCol(true);
    try {
      const docRef = await addDoc(collection(db, "test_collections"), {
        name: newColName.trim(),
        type: "mock",
        createdAt: new Date().toISOString()
      });
      const newCol = { id: docRef.id, name: newColName.trim(), type: "mock" };
      setMockCollections(prev => [...prev, newCol]);
      setSelectedCollectionId(docRef.id);
      setNewColName("");
      setShowAddCol(false);
      toast.success("Yangi mock to'plami yaratildi! 🎉");
    } catch (e) {
      console.error(e);
      toast.error("To'plam yaratishda xatolik yuz berdi");
    } finally {
      setIsAddingCol(false);
    }
  };

  // --- MOCK EXAM CREATION LOGIC ---
  const handleCreateMockExam = async () => {
    if (!selectedTests.reading || !selectedTests.listening || !selectedTests.writing) {
      toast.error("Iltimos, 3 ta fanni ham tanlang!");
      return;
    }
    if (!selectedCollectionId || selectedCollectionId === "None") {
      toast.error("Iltimos, Mock To'plamini tanlang!");
      return;
    }

    setIsCreatingMock(true);
    try {
      const colDoc = mockCollections.find(c => c.id === selectedCollectionId);
      const defaultTitle = colDoc ? `${colDoc.name} Mock Exam` : "New Mock Exam";
      const titleToUse = mockTitle.trim() || defaultTitle;

      const mockData = {
        title: titleToUse,
        type: "mock",
        collectionId: selectedCollectionId,
        subTests: {
          readingId: selectedTests.reading,
          listeningId: selectedTests.listening,
          writingId: selectedTests.writing
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, "tests"), mockData);
      
      // Also write to tests_metadata
      await setDoc(doc(db, "tests_metadata", docRef.id), {
        id: docRef.id,
        ...mockData
      });

      // Update the collection document with the associated subTests (for backward compatibility)
      await updateDoc(doc(db, "test_collections", selectedCollectionId), {
        subTests: {
          readingId: selectedTests.reading,
          listeningId: selectedTests.listening,
          writingId: selectedTests.writing
        }
      });

      const newMockObj = { id: docRef.id, ...mockData };
      setMockExams(prev => [newMockObj, ...prev]);
      setSelectedMockExamId(docRef.id);
      setMockTitle("");
      
      // Reset selected tests and collection
      setSelectedTests({ reading: "", listening: "", writing: "" });
      setSelectedCollectionId("");

      toast.success("Mock imtihon muvaffaqiyatli yaratildi! 🎉");
      setActiveGeneratorTab("generate_keys");
    } catch (e) {
      console.error(e);
      toast.error("Mock imtihon yaratishda xatolik yuz berdi");
    } finally {
      setIsCreatingMock(false);
    }
  };

  // --- 2. GENERATE LOGIC ---
  const generateRandomCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; 
    let result = "";
    for (let i = 0; i < 6; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
  };

  const handleGenerate = async () => {
    if (!selectedMockExamId) {
      toast.error("Iltimos, avval Mock imtihonni tanlang!");
      return;
    }
    
    if (bulkCount > 50) return toast.error("Maksimal 50 ta kalit yaratish mumkin.");
    if (bulkCount < 1) return toast.error("Kamida 1 ta.");

    setLoading(true);
    const batch = writeBatch(db);
    const newKeysList = [];

    try {
      const mockExam = mockExams.find(m => m.id === selectedMockExamId);
      if (!mockExam) throw new Error("Tanlangan Mock imtihon topilmadi");

      const colId = mockExam.collectionId;
      const readingId = mockExam.subTests?.readingId;
      const listeningId = mockExam.subTests?.listeningId;
      const writingId = mockExam.subTests?.writingId;

      if (!readingId || !listeningId || !writingId) {
        throw new Error("Mock imtihon tarkibidagi testlar to'liq emas");
      }

      for (let i = 0; i < bulkCount; i++) {
        const newCode = generateRandomCode();
        const docRef = doc(collection(db, "accessKeys"));
        const keyData = {
          key: newCode, 
          isUsed: false,
          type: 'mock_bundle', 
          collectionId: colId || null,
          mockExamId: selectedMockExamId,
          createdAt: new Date().toISOString(),
          assignedTests: { 
            readingId,
            listeningId,
            writingId
          }
        };
        
        batch.set(docRef, keyData);
        newKeysList.push({ id: docRef.id, ...keyData });
      }

      await batch.commit();
      
      setKeys([...newKeysList, ...keys]);
      toast.success(`${bulkCount} ta kalit muvaffaqiyatli yaratildi! 🎉`);
      setBulkCount(1);
    } catch (error) { 
      console.error(error);
      toast.error(error.message || "Xatolik yuz berdi"); 
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
      if(!window.confirm("Haqiqatan ham ushbu kalitni o'chirmoqchimisiz?")) return;
      await deleteDoc(doc(db, "accessKeys", id));
      setKeys(prev => prev.filter(k => k.id !== id));
      toast.success("Kalit o'chirildi");
  };

  const copyToClipboard = (text) => {
      navigator.clipboard.writeText(text);
      toast.success("Nusxalandi! 📋");
  };

  const filteredKeys = keys.filter(k => 
    k.key.toLowerCase().includes(keySearch.toLowerCase()) ||
    (k.usedByName || "").toLowerCase().includes(keySearch.toLowerCase())
  );

  return (
    <div className={`min-h-screen font-sans transition-colors duration-200 p-4 sm:p-6 md:p-8 ${
      isDark ? 'bg-[#09090b] text-zinc-100' : 'bg-[#fafafa] text-zinc-800'
    }`}>
      
      {/* HEADER */}
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight">Access Keys</h1>
            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${
              isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 'bg-zinc-100 border-zinc-200 text-zinc-500'
            }`}>Mock Manager</span>
          </div>
          <p className={`text-xs mt-1 font-semibold ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            Mock imtihonlar uchun aktivatsiya kalitlarini yaratish va boshqarish paneli.
          </p>
        </div>
        <button 
          onClick={() => navigate('/admin')} 
          className={`flex items-center gap-2 border px-4 py-2.5 rounded-xl text-xs font-bold tracking-tight transition-all active:scale-95 ${
            isDark 
              ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-300' 
              : 'bg-white border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 text-zinc-600'
          }`}
        >
          <ArrowLeft size={14}/> Dashboardga orqaga
        </button>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: GENERATOR PANEL */}
        <div className={`rounded-2xl border p-6 shadow-sm h-fit sticky top-8 transition-colors ${
          isDark ? 'bg-[#0c0c0e] border-zinc-850' : 'bg-white border-zinc-200/80'
        }`}>
          <h2 className="font-extrabold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
            <Bolt className={`w-4 h-4 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}/> Mock Manager
          </h2>

          {/* Generator Tabs */}
          <div className={`flex gap-1.5 p-1 rounded-xl mb-5 ${isDark ? 'bg-zinc-900 bg-zinc-950/60' : 'bg-zinc-100/80'}`}>
            <button
              type="button"
              onClick={() => setActiveGeneratorTab("create_mock")}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                activeGeneratorTab === "create_mock"
                  ? (isDark ? "bg-zinc-850 text-white shadow-sm" : "bg-white text-zinc-900 shadow-sm")
                  : (isDark ? "text-zinc-500 hover:text-zinc-300" : "text-zinc-500 hover:text-zinc-700")
              }`}
            >
              Mock Exam Yaratish
            </button>
            <button
              type="button"
              onClick={() => setActiveGeneratorTab("generate_keys")}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                activeGeneratorTab === "generate_keys"
                  ? (isDark ? "bg-zinc-850 text-white shadow-sm" : "bg-white text-zinc-900 shadow-sm")
                  : (isDark ? "text-zinc-500 hover:text-zinc-300" : "text-zinc-500 hover:text-zinc-700")
              }`}
            >
              Kalit Yaratish
            </button>
          </div>
          
          <div className="space-y-5">
            {activeGeneratorTab === "create_mock" ? (
              <>
                {/* Mock Collection Select */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className={`block text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      Mock To'plami (Collection)
                    </label>
                    <button 
                      type="button"
                      onClick={() => setShowAddCol(!showAddCol)} 
                      className={`text-[10px] font-black tracking-tight transition-colors ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                    >
                      {showAddCol ? "Bekor qilish" : "+ Yangi to'plam"}
                    </button>
                  </div>
                  <select 
                    className={`w-full border p-3 rounded-xl outline-none text-xs font-bold transition-all ${
                      isDark 
                        ? 'bg-zinc-900 border-zinc-855 focus:border-zinc-700 text-zinc-100' 
                        : 'bg-zinc-50 border-zinc-200 focus:border-zinc-400 text-zinc-800'
                    }`}
                    value={selectedCollectionId}
                    onChange={(e) => handleCollectionChange(e.target.value)}
                  >
                    <option value="">Tanlang (ixtiyoriy)...</option>
                    <option value="None">📦 To'plamsiz (Hech qanday)</option>
                    {mockCollections.map(c => (
                      <option key={c.id} value={c.id}>🎓 {c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Inline Collection Create Panel */}
                {showAddCol && (
                  <div className={`p-4 rounded-xl border space-y-3 ${
                    isDark ? 'bg-zinc-950/40 border-zinc-800' : 'bg-blue-50/30 border-blue-100'
                  }`}>
                    <label className={`block text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-blue-700'}`}>
                      Yangi Mock To'plam nomi
                    </label>
                    <input 
                      type="text" 
                      className={`w-full border p-2.5 rounded-lg outline-none text-xs font-bold ${
                        isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-250 text-zinc-800'
                      }`}
                      placeholder="Masalan: CD Mock Test 1"
                      value={newColName}
                      onChange={e => setNewColName(e.target.value)}
                    />
                    <div className="flex justify-end gap-2 text-[10px] font-bold">
                      <button 
                        type="button"
                        onClick={() => { setShowAddCol(false); setNewColName(""); }}
                        className={`px-3 py-1.5 rounded transition ${isDark ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-500 hover:bg-gray-100'}`}
                      >
                        Bekor qilish
                      </button>
                      <button 
                        type="button"
                        onClick={handleAddCollection}
                        disabled={isAddingCol || !newColName.trim()}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded transition"
                      >
                        {isAddingCol ? "Yaratilmoqda..." : "Yaratish"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Test Selection Custom Selectors */}
                <div className={`h-[1px] my-1 ${isDark ? 'bg-zinc-850' : 'bg-zinc-150'}`} />

                <SearchableTestSelect 
                  label="1. Reading Module"
                  type="reading"
                  options={availableTests.reading}
                  value={selectedTests.reading}
                  onChange={(val) => setSelectedTests({ ...selectedTests, reading: val })}
                  placeholder="Reading testini tanlang..."
                  isDark={isDark}
                />

                <SearchableTestSelect 
                  label="2. Listening Module"
                  type="listening"
                  options={availableTests.listening}
                  value={selectedTests.listening}
                  onChange={(val) => setSelectedTests({ ...selectedTests, listening: val })}
                  placeholder="Listening testini tanlang..."
                  isDark={isDark}
                />

                <SearchableTestSelect 
                  label="3. Writing Module"
                  type="writing"
                  options={availableTests.writing}
                  value={selectedTests.writing}
                  onChange={(val) => setSelectedTests({ ...selectedTests, writing: val })}
                  placeholder="Writing testini tanlang..."
                  isDark={isDark}
                />

                <div className={`h-[1px] my-1 ${isDark ? 'bg-zinc-850' : 'bg-zinc-150'}`} />

                {/* Mock Exam Title */}
                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-wider mb-1.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    Mock Exam Nomi (Sarlavha)
                  </label>
                  <input 
                    type="text" 
                    className={`w-full border p-3 rounded-xl outline-none text-xs font-bold transition-all ${
                      isDark 
                        ? 'bg-zinc-900 border-zinc-855 focus:border-zinc-700 text-zinc-100' 
                        : 'bg-zinc-50 border-zinc-200 focus:border-zinc-400 text-zinc-800'
                    }`}
                    placeholder="Masalan: CD Mock Test 1 Exam"
                    value={mockTitle}
                    onChange={e => setMockTitle(e.target.value)}
                  />
                </div>

                <button 
                  onClick={handleCreateMockExam} 
                  disabled={isCreatingMock} 
                  className={`w-full font-bold text-xs py-3.5 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 flex justify-center items-center gap-2 ${
                    isDark 
                      ? 'bg-zinc-100 hover:bg-white text-zinc-900 shadow-zinc-950/40' 
                      : 'bg-zinc-900 hover:bg-zinc-950 text-white shadow-zinc-900/10'
                  }`}
                >
                  {isCreatingMock ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Yaratilmoqda...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      Mock Exam Yaratish
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                {/* Select Mock Exam */}
                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-wider mb-1.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    Mock Imtihonni Tanlang
                  </label>
                  <select 
                    className={`w-full border p-3 rounded-xl outline-none text-xs font-bold transition-all ${
                      isDark 
                        ? 'bg-zinc-900 border-zinc-855 focus:border-zinc-700 text-zinc-100' 
                        : 'bg-zinc-50 border-zinc-200 focus:border-zinc-400 text-zinc-800'
                    }`}
                    value={selectedMockExamId}
                    onChange={(e) => setSelectedMockExamId(e.target.value)}
                  >
                    <option value="">Mock Imtihonni tanlang...</option>
                    {mockExams.map(m => (
                      <option key={m.id} value={m.id}>🎓 {m.title}</option>
                    ))}
                  </select>
                </div>

                {/* Count Selector & Action */}
                <div className="pt-2">
                  <label className={`block text-[10px] font-black uppercase tracking-wider mb-2 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    Kalitlar Soni
                  </label>
                  <div className="flex gap-3">
                    <input 
                      type="number" 
                      min="1" max="50"
                      className={`w-20 border rounded-xl text-center font-extrabold text-sm outline-none focus:ring-1 focus:ring-zinc-400 ${
                        isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-zinc-50 border-zinc-200 text-zinc-800'
                      }`}
                      value={bulkCount}
                      onChange={(e) => setBulkCount(Number(e.target.value))}
                    />
                    <button 
                      onClick={handleGenerate} 
                      disabled={loading} 
                      className={`flex-1 font-bold text-xs py-3.5 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 flex justify-center items-center gap-2 ${
                        isDark 
                          ? 'bg-zinc-100 hover:bg-white text-zinc-900 shadow-zinc-950/40' 
                          : 'bg-zinc-900 hover:bg-zinc-950 text-white shadow-zinc-900/10'
                      }`}
                    >
                      {loading ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Yaratilmoqda...
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} />
                          Kalitlarni yaratish ({bulkCount})
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: ACCESS KEYS LIST */}
        <div className={`lg:col-span-2 rounded-2xl border shadow-sm flex flex-col h-[82vh] overflow-hidden transition-colors ${
          isDark ? 'bg-[#0c0c0e] border-zinc-850' : 'bg-white border-zinc-200/80'
        }`}>
          {/* List Toolbar */}
          <div className={`p-4 border-b flex flex-col sm:flex-row gap-4 items-center justify-between transition-colors ${
            isDark ? 'border-zinc-850 bg-zinc-900/20' : 'border-zinc-150 bg-zinc-50/50'
          }`}>
            <span className="font-extrabold text-sm uppercase tracking-wider flex items-center gap-2 shrink-0">
              <Key size={16} className="text-zinc-500" />
              Mavjud Kalitlar ({keys.length})
            </span>
            <div className={`flex items-center gap-2 border px-3 py-1.5 rounded-xl w-full sm:max-w-xs transition-all ${
              isDark ? 'bg-zinc-950 border-zinc-800 focus-within:border-zinc-700' : 'bg-white border-zinc-200 focus-within:border-zinc-300'
            }`}>
              <Search size={14} className="text-zinc-400" />
              <input 
                type="text"
                placeholder="Kalit yoki foydalanuvchidan qidirish..."
                className="bg-transparent border-none outline-none text-xs font-semibold placeholder:text-zinc-500 w-full"
                value={keySearch}
                onChange={e => setKeySearch(e.target.value)}
              />
              {keySearch && (
                <button onClick={() => setKeySearch("")} className="text-zinc-400 hover:text-zinc-200">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* List Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
            {filteredKeys.map((item, index) => (
              <div 
                key={item.id} 
                className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-3.5 rounded-xl border transition-all hover:shadow-sm ${
                  item.isUsed 
                    ? (isDark ? 'bg-zinc-950/20 border-zinc-900 opacity-60' : 'bg-zinc-50 border-zinc-200/60 opacity-70') 
                    : (isDark ? 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700' : 'bg-white border-zinc-200 hover:border-zinc-250')
                }`}
              >
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 min-w-0">
                  <span className={`text-[10px] font-black w-6 text-center ${isDark ? 'text-zinc-700' : 'text-zinc-300'}`}>
                    {filteredKeys.length - index}
                  </span>
                  
                  {/* Key Code Bubble */}
                  <button 
                    onClick={() => !item.isUsed && copyToClipboard(item.key)}
                    disabled={item.isUsed}
                    className={`font-mono text-base font-black px-3.5 py-1.5 rounded-xl tracking-widest border transition-all ${
                      item.isUsed
                        ? (isDark ? 'bg-zinc-900 border-zinc-850 text-zinc-600' : 'bg-zinc-200 border-zinc-300 text-zinc-400')
                        : (isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-100 hover:border-zinc-600 active:scale-95' : 'bg-zinc-900 border-zinc-950 text-zinc-100 hover:bg-black active:scale-95')
                    }`}
                  >
                    {item.key}
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                        isDark ? 'text-zinc-500' : 'text-zinc-400'
                      }`}>
                        <Calendar size={10} />
                        {new Date(item.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                      </p>
                      
                      {item.collectionId && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-0.5 ${
                          isDark ? 'bg-blue-500/10 border-blue-500/25 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600'
                        }`}>
                          <FolderKanban size={9} /> {mockCollections.find(c => c.id === item.collectionId)?.name || "Mock Package"}
                        </span>
                      )}
                    </div>
                    
                    <p className={`text-xs font-semibold mt-1 flex items-center gap-1.5 truncate ${
                      item.isUsed 
                        ? 'text-emerald-600' 
                        : (isDark ? 'text-zinc-400' : 'text-zinc-500')
                    }`}>
                      {item.isUsed ? (
                        <>
                          <User size={12} />
                          {item.usedByName}
                        </>
                      ) : (
                        "🆕 Faollashmagan"
                      )}
                    </p>
                  </div>
                </div>

                {/* Actions Panel */}
                <div className="flex gap-2 self-end sm:self-center mt-3 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-zinc-200/50 w-full sm:w-auto justify-end">
                  {!item.isUsed && (
                    <button 
                      onClick={() => copyToClipboard(item.key)} 
                      className={`p-2.5 rounded-xl border transition-all active:scale-95 ${
                        isDark 
                          ? 'border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800' 
                          : 'border-zinc-200 hover:border-zinc-300 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50'
                      }`}
                      title="Nusxalash"
                    >
                      <Copy className="w-4 h-4"/>
                    </button>
                  )}
                  <button 
                    onClick={() => handleDelete(item.id)} 
                    className={`p-2.5 rounded-xl border transition-all active:scale-95 ${
                      isDark 
                        ? 'border-zinc-800 hover:border-zinc-700 text-zinc-500 hover:text-red-400 hover:bg-red-500/5' 
                        : 'border-zinc-200 hover:border-zinc-300 text-zinc-400 hover:text-red-650 hover:bg-red-50'
                    }`}
                    title="O'chirish"
                  >
                    <Trash2 className="w-4 h-4"/>
                  </button>
                </div>
              </div>
            ))}
            
            {filteredKeys.length === 0 && (
              <div className="text-center py-20 text-zinc-500 italic text-xs">
                {keySearch ? "Qidiruv bo'yicha kalitlar topilmadi." : "Hozircha kalitlar mavjud emas."}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}