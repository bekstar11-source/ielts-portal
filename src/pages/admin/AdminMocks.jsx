// src/pages/admin/AdminMocks.jsx
import React, { useEffect, useState } from "react";
import { db } from "../../firebase/firebase";
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, setDoc, where, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useTheme } from "../../context/ThemeContext";
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  ArrowLeft,
  Loader2,
  Search,
  BookOpen,
  Headphones,
  PenTool,
  Sparkles,
  Calendar,
  DollarSign
} from "lucide-react";

// --- SEARCH MODAL COMPONENT FOR TESTS ---
function TestSearchModal({ isOpen, onClose, type, tests, onSelect, selectedId, isDark }) {
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("all");

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setDifficulty("all");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = tests.filter((t) => {
    const matchesSearch = (t.title || "").toLowerCase().includes(search.toLowerCase());
    const matchesDifficulty = difficulty === "all" || (t.difficulty || "medium") === difficulty;
    return matchesSearch && matchesDifficulty;
  });

  const typeDetails = {
    reading: { icon: BookOpen, label: "Reading Test", color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
    listening: { icon: Headphones, label: "Listening Test", color: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
    writing: { icon: PenTool, label: "Writing Test", color: "text-pink-500 bg-pink-500/10 border-pink-500/20" }
  };

  const current = typeDetails[type] || { icon: BookOpen, label: "Test", color: "text-gray-500 bg-gray-500/10" };
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" 
        onClick={onClose} 
      />
      
      {/* Content Container */}
      <div className={`relative w-full max-w-xl rounded-2xl border p-6 shadow-2xl flex flex-col max-h-[85dvh] overflow-hidden transition-all animate-in zoom-in-95 duration-200 ${
        isDark ? "bg-[#0c0c0e] border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-800"
      }`}>
        {/* Header */}
        <div className="flex justify-between items-center mb-5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg border flex items-center justify-center ${current.color}`}>
              <Icon size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm uppercase tracking-wider">{current.label} Tanlash</h3>
              <p className={`text-[10px] font-medium ${isDark ? "text-zinc-500" : "text-gray-400"}`}>
                Mock tarkibiga qo'shish uchun testni belgilang
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className={`p-2 rounded-xl transition-all ${isDark ? "hover:bg-zinc-900 text-zinc-400 hover:text-white" : "hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900"}`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex gap-2.5 mb-5 shrink-0">
          <div className={`flex items-center gap-2 border px-3.5 py-2.5 rounded-xl flex-1 transition-all ${
            isDark ? "bg-zinc-950 border-zinc-850 focus-within:border-zinc-700" : "bg-zinc-50 border-zinc-200 focus-within:border-zinc-350"
          }`}>
            <Search size={15} className="text-zinc-400" />
            <input 
              type="text" 
              placeholder="Test nomini kiriting..."
              className="bg-transparent border-none outline-none text-xs font-semibold placeholder:text-zinc-550 w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className={`border px-4 py-2.5 rounded-xl text-xs font-bold outline-none transition-all cursor-pointer ${
              isDark ? "bg-zinc-950 border-zinc-850 text-zinc-300 focus:border-zinc-700" : "bg-zinc-50 border-zinc-200 text-zinc-700 focus:border-zinc-400"
            }`}
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option value="all">Qiyinchilik: Barchasi</option>
            <option value="easy">Oson (Easy)</option>
            <option value="medium">O'rtacha (Medium)</option>
            <option value="hard">Qiyin (Hard)</option>
          </select>
        </div>

        {/* List Scroll Area */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
          {filtered.map((t) => {
            const isSelected = t.id === selectedId;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  onSelect(t.id);
                  onClose();
                }}
                className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between group active:scale-[0.99] ${
                  isSelected
                    ? (isDark ? "bg-blue-600/10 border-blue-500/50 text-blue-400" : "bg-blue-50 border-blue-300 text-blue-700")
                    : (isDark ? "bg-zinc-900/40 border-zinc-850 hover:bg-zinc-900 hover:border-zinc-750 text-zinc-300" : "bg-white border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 text-zinc-750")
                }`}
              >
                <div className="min-w-0 pr-4">
                  <p className="font-bold text-sm leading-snug group-hover:translate-x-0.5 transition-transform">{t.title}</p>
                  <div className="flex items-center gap-2 mt-1.5 text-[10px] font-bold opacity-60">
                    <span className={`px-1.5 py-0.5 rounded uppercase ${isDark ? "bg-zinc-800 text-zinc-300" : "bg-zinc-100 text-zinc-600"}`}>
                      {t.difficulty || "medium"}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5">
                      <Calendar size={10} />
                      {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "No Date"}
                    </span>
                  </div>
                </div>
                {isSelected ? (
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isDark ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-700"}`}>
                    <Check size={12} strokeWidth={3} />
                  </div>
                ) : (
                  <ChevronRightForModal isDark={isDark} />
                )}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <BookOpen size={32} className="mx-auto text-zinc-400 opacity-30 mb-3" />
              <p className="text-zinc-500 text-xs italic">Mos keladigan test topilmadi.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Chevron Right SVG helper for clean presentation
const ChevronRightForModal = ({ isDark }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="16" 
    height="16" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={`opacity-100 md:opacity-0 md:group-hover:opacity-100 group-hover:translate-x-0.5 transition-all ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}
  >
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

export default function AdminMocks() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Data State
  const [mockExams, setMockExams] = useState([]);
  const [availableTests, setAvailableTests] = useState({ reading: [], listening: [], writing: [] });
  const [loading, setLoading] = useState(true);

  // Form State
  const [editingId, setEditingId] = useState(null); // null if creating, ID if editing
  const [mockTitle, setMockTitle] = useState("");
  const [mockDescription, setMockDescription] = useState("");
  const [mockPrice, setMockPrice] = useState("");
  const [selectedTests, setSelectedTests] = useState({ reading: "", listening: "", writing: "" });
  const [isSaving, setIsSaving] = useState(false);

  // Search Modals State
  const [modalOpen, setModalOpen] = useState({ reading: false, listening: false, writing: false });

  // 1. Fetch Data on Mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [testsSnap, mocksSnap] = await Promise.all([
          getDocs(query(collection(db, "tests_metadata"), orderBy("createdAt", "desc"))),
          getDocs(query(collection(db, "tests_metadata"), where("type", "==", "mock"), orderBy("createdAt", "desc")))
        ]);

        const allMeta = testsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Filter tests by categories
        setAvailableTests({
          reading: allMeta.filter(t => t.type === "reading"),
          listening: allMeta.filter(t => t.type === "listening"),
          writing: allMeta.filter(t => t.type === "writing")
        });

        // Filter premium / standard mocks
        setMockExams(mocksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Error fetching mock data:", err);
        toast.error("Ma'lumotlarni yuklashda xatolik.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Open specific test selector modal
  const openModal = (type) => {
    setModalOpen(prev => ({ ...prev, [type]: true }));
  };

  const closeModal = (type) => {
    setModalOpen(prev => ({ ...prev, [type]: false }));
  };

  const selectTest = (type, id) => {
    setSelectedTests(prev => ({ ...prev, [type]: id }));
  };

  // Helper to fetch details of selected tests
  const getSelectedTestDetails = (type, id) => {
    if (!id) return null;
    return availableTests[type]?.find(t => t.id === id) || null;
  };

  // Form Submit (Create or Edit)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mockTitle.trim()) return toast.error("Mock imtihon nomini kiriting!");
    if (!selectedTests.reading || !selectedTests.listening || !selectedTests.writing) {
      return toast.error("Iltimos, barcha 3 ta fanni ham tanlang!");
    }

    setIsSaving(true);
    try {
      const priceVal = mockPrice ? Number(mockPrice) : 30000;
      const mockData = {
        title: mockTitle.trim(),
        description: mockDescription.trim(),
        price: priceVal,
        type: "mock",
        isPremiumMock: true,
        subTests: {
          readingId: selectedTests.reading,
          listeningId: selectedTests.listening,
          writingId: selectedTests.writing
        },
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        // Edit Mode
        const docRef = doc(db, "tests", editingId);
        const metaRef = doc(db, "tests_metadata", editingId);

        await Promise.all([
          updateDoc(docRef, mockData),
          updateDoc(metaRef, mockData)
        ]);

        setMockExams(prev => prev.map(m => m.id === editingId ? { ...m, ...mockData } : m));
        toast.success("Mock test muvaffaqiyatli yangilandi! 🎉");
      } else {
        // Create Mode
        const newMockData = {
          ...mockData,
          createdAt: new Date().toISOString()
        };

        const docRef = await addDoc(collection(db, "tests"), newMockData);
        await setDoc(doc(db, "tests_metadata", docRef.id), {
          id: docRef.id,
          ...newMockData
        });

        setMockExams(prev => [{ id: docRef.id, ...newMockData }, ...prev]);
        toast.success("Yangi mock test muvaffaqiyatli yaratildi! 🎉");
      }

      // Reset Form
      resetForm();
    } catch (err) {
      console.error("Save mock exam error:", err);
      toast.error("Saqlashda xatolik yuz berdi.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (mock) => {
    setEditingId(mock.id);
    setMockTitle(mock.title || "");
    setMockDescription(mock.description || "");
    setMockPrice(mock.price ? mock.price.toString() : "");
    setSelectedTests({
      reading: mock.subTests?.readingId || "",
      listening: mock.subTests?.listeningId || "",
      writing: mock.subTests?.writingId || ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Haqiqatan ham ushbu Mock testni o'chirmoqchimisiz?")) return;

    try {
      await Promise.all([
        deleteDoc(doc(db, "tests", id)),
        deleteDoc(doc(db, "tests_metadata", id))
      ]);
      setMockExams(prev => prev.filter(m => m.id !== id));
      toast.success("Mock test o'chirildi.");
      if (editingId === id) resetForm();
    } catch (err) {
      console.error("Delete mock error:", err);
      toast.error("O'chirishda xatolik yuz berdi.");
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setMockTitle("");
    setMockDescription("");
    setMockPrice("");
    setSelectedTests({ reading: "", listening: "", writing: "" });
  };

  // Helper for UZS formatting
  const formatUZS = (val) => {
    return new Intl.NumberFormat("uz-UZ").format(val) + " UZS";
  };

  const selectedReading = getSelectedTestDetails("reading", selectedTests.reading);
  const selectedListening = getSelectedTestDetails("listening", selectedTests.listening);
  const selectedWriting = getSelectedTestDetails("writing", selectedTests.writing);

  return (
    <div className={`min-h-full font-sans transition-colors duration-200 p-3 sm:p-6 md:p-8 ${
      isDark ? "bg-[#1f1e1b] text-zinc-150" : "bg-[#fafafa] text-zinc-800"
    }`}>
      
      {/* HEADER */}
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">Mock Creator</h1>
            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${
              isDark ? "bg-zinc-900 border-zinc-805 text-zinc-400" : "bg-zinc-100 border-zinc-200 text-zinc-500"
            }`}>Mock Manager</span>
          </div>
          <p className={`text-xs mt-1 font-semibold ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
            Reading, Listening va Writing testlarini birlashtirib mock paketlar yarating va narxlarini belgilang.
          </p>
        </div>
        
        <button 
          onClick={() => navigate("/admin")} 
          className={`flex items-center gap-2 border px-4 py-2.5 rounded-xl text-xs font-bold tracking-tight transition-all active:scale-95 ${
            isDark 
              ? "bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-300" 
              : "bg-white border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 text-zinc-650"
          }`}
        >
          <ArrowLeft size={14} /> Dashboardga qaytish
        </button>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        
        {/* LEFT COLUMN: CREATOR / EDITOR FORM */}
        <div className={`lg:col-span-1 rounded-2xl border p-4 sm:p-6 shadow-sm h-fit lg:sticky lg:top-8 transition-colors ${
          isDark ? "bg-[#0c0c0e] border-zinc-850" : "bg-white border-zinc-200/80"
        }`}>
          <h2 className="font-extrabold text-sm uppercase tracking-wider mb-5 flex items-center gap-2">
            {editingId ? <Edit2 size={16} className="text-blue-500" /> : <Plus size={16} className="text-emerald-500" />}
            {editingId ? "Mockni Tahrirlash" : "Yangi Mock Yaratish"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div className="space-y-1.5">
              <label className={`block text-[10px] font-black uppercase tracking-wider ${isDark ? "text-zinc-550" : "text-zinc-400"}`}>
                Mock Test Nomi
              </label>
              <input 
                type="text" 
                required
                className={`w-full border p-3 rounded-xl outline-none text-xs font-semibold transition-all ${
                  isDark 
                    ? "bg-zinc-950 border-zinc-855 focus:border-zinc-700 text-zinc-100" 
                    : "bg-zinc-50 border-zinc-200 focus:border-zinc-350 text-zinc-800"
                }`}
                placeholder="Masalan: IELTS Computer Academic Mock #1"
                value={mockTitle}
                onChange={e => setMockTitle(e.target.value)}
              />
            </div>

            {/* Description (Izoh) */}
            <div className="space-y-1.5">
              <label className={`block text-[10px] font-black uppercase tracking-wider ${isDark ? "text-zinc-550" : "text-zinc-400"}`}>
                Izoh / Tafsif (Description)
              </label>
              <textarea 
                rows="3"
                className={`w-full border p-3 rounded-xl outline-none text-xs font-semibold transition-all resize-none ${
                  isDark 
                    ? "bg-zinc-950 border-zinc-855 focus:border-zinc-700 text-zinc-100" 
                    : "bg-zinc-50 border-zinc-200 focus:border-zinc-350 text-zinc-800"
                }`}
                placeholder="Ushbu mock test uchun izoh yozing (o'quvchi buni kartochkada ko'radi)..."
                value={mockDescription}
                onChange={e => setMockDescription(e.target.value)}
              />
            </div>

            {/* Price */}
            <div className="space-y-1.5">
              <label className={`block text-[10px] font-black uppercase tracking-wider ${isDark ? "text-zinc-550" : "text-zinc-400"}`}>
                Narxi (UZS)
              </label>
              <div className="relative flex items-center">
                <input 
                  type="number" 
                  min="0"
                  className={`w-full border p-3 pl-9 rounded-xl outline-none text-xs font-bold transition-all ${
                    isDark 
                      ? "bg-zinc-950 border-zinc-855 focus:border-zinc-700 text-zinc-100" 
                      : "bg-zinc-50 border-zinc-200 focus:border-zinc-350 text-zinc-800"
                  }`}
                  placeholder="Masalan: 30000"
                  value={mockPrice}
                  onChange={e => setMockPrice(e.target.value)}
                />
                <DollarSign size={14} className="absolute left-3 text-zinc-500" />
              </div>
            </div>

            <div className={`h-[1px] ${isDark ? "bg-zinc-850" : "bg-zinc-150"}`} />

            {/* SUB-TEST SELECTORS */}
            <div className="space-y-4">
              <h3 className={`text-[10px] font-black uppercase tracking-widest ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                Tarkibiy qismlar
              </h3>

              {/* 1. Reading Select */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Reading module</span>
                  {selectedTests.reading && (
                    <button 
                      type="button" 
                      onClick={() => selectTest("reading", "")}
                      className="text-[9px] font-bold text-red-500 hover:underline"
                    >
                      O'chirish
                    </button>
                  )}
                </div>
                {selectedReading ? (
                  <div 
                    onClick={() => openModal("reading")}
                    className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isDark ? "bg-zinc-950 border-zinc-850 hover:border-zinc-750" : "bg-zinc-50 border-zinc-200 hover:border-zinc-300"
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold truncate">{selectedReading.title}</p>
                      <p className="text-[9px] opacity-60 font-bold uppercase mt-0.5">{selectedReading.difficulty || "medium"}</p>
                    </div>
                    <BookOpen size={14} className="text-blue-500 shrink-0" />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => openModal("reading")}
                    className={`w-full flex items-center justify-center gap-2 border border-dashed rounded-xl p-3.5 text-xs font-bold transition-all ${
                      isDark 
                        ? "bg-zinc-950/30 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-400" 
                        : "bg-zinc-50/50 border-zinc-250 text-zinc-500 hover:border-zinc-350 hover:text-zinc-750"
                    }`}
                  >
                    <Plus size={14} /> Reading testini ulash
                  </button>
                )}
              </div>

              {/* 2. Listening Select */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-purple-500 uppercase tracking-wider">Listening module</span>
                  {selectedTests.listening && (
                    <button 
                      type="button" 
                      onClick={() => selectTest("listening", "")}
                      className="text-[9px] font-bold text-red-500 hover:underline"
                    >
                      O'chirish
                    </button>
                  )}
                </div>
                {selectedListening ? (
                  <div 
                    onClick={() => openModal("listening")}
                    className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isDark ? "bg-zinc-950 border-zinc-850 hover:border-zinc-750" : "bg-zinc-50 border-zinc-200 hover:border-zinc-300"
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold truncate">{selectedListening.title}</p>
                      <p className="text-[9px] opacity-60 font-bold uppercase mt-0.5">{selectedListening.difficulty || "medium"}</p>
                    </div>
                    <Headphones size={14} className="text-purple-500 shrink-0" />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => openModal("listening")}
                    className={`w-full flex items-center justify-center gap-2 border border-dashed rounded-xl p-3.5 text-xs font-bold transition-all ${
                      isDark 
                        ? "bg-zinc-950/30 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-400" 
                        : "bg-zinc-50/50 border-zinc-250 text-zinc-500 hover:border-zinc-350 hover:text-zinc-750"
                    }`}
                  >
                    <Plus size={14} /> Listening testini ulash
                  </button>
                )}
              </div>

              {/* 3. Writing Select */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-pink-500 uppercase tracking-wider">Writing module</span>
                  {selectedTests.writing && (
                    <button 
                      type="button" 
                      onClick={() => selectTest("writing", "")}
                      className="text-[9px] font-bold text-red-500 hover:underline"
                    >
                      O'chirish
                    </button>
                  )}
                </div>
                {selectedWriting ? (
                  <div 
                    onClick={() => openModal("writing")}
                    className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isDark ? "bg-zinc-950 border-zinc-850 hover:border-zinc-750" : "bg-zinc-50 border-zinc-200 hover:border-zinc-300"
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold truncate">{selectedWriting.title}</p>
                      <p className="text-[9px] opacity-60 font-bold uppercase mt-0.5">{selectedWriting.difficulty || "medium"}</p>
                    </div>
                    <PenTool size={14} className="text-pink-500 shrink-0" />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => openModal("writing")}
                    className={`w-full flex items-center justify-center gap-2 border border-dashed rounded-xl p-3.5 text-xs font-bold transition-all ${
                      isDark 
                        ? "bg-zinc-950/30 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-400" 
                        : "bg-zinc-50/50 border-zinc-250 text-zinc-500 hover:border-zinc-350 hover:text-zinc-750"
                    }`}
                  >
                    <Plus size={14} /> Writing testini ulash
                  </button>
                )}
              </div>
            </div>

            <div className={`h-[1px] ${isDark ? "bg-zinc-850" : "bg-zinc-150"}`} />

            {/* ACTION BUTTONS */}
            <div className="flex gap-2.5 pt-2">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className={`w-1/3 py-3 rounded-xl font-bold text-xs transition-all active:scale-95 border ${
                    isDark 
                      ? "bg-transparent border-zinc-800 hover:bg-zinc-900 text-zinc-400" 
                      : "bg-transparent border-zinc-200 hover:bg-zinc-100 text-zinc-500"
                  }`}
                >
                  Bekor qilish
                </button>
              )}
              <button 
                type="submit" 
                disabled={isSaving} 
                className={`flex-1 font-bold text-xs py-3 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 flex justify-center items-center gap-1.5 ${
                  isDark 
                    ? "bg-zinc-100 hover:bg-white text-zinc-900 shadow-zinc-950/30" 
                    : "bg-zinc-900 hover:bg-zinc-950 text-white shadow-zinc-900/10"
                }`}
              >
                {isSaving ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Saqlanmoqda...
                  </>
                ) : (
                  <>
                    <Sparkles size={13} />
                    {editingId ? "Yangilash" : "Yaratish"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN: MOCK EXAMS LIST */}
        <div className="lg:col-span-2 space-y-4">
          <div className={`rounded-2xl border p-6 shadow-sm transition-colors ${
            isDark ? "bg-[#0c0c0e] border-zinc-850" : "bg-white border-zinc-200/80"
          }`}>
            <h2 className="font-extrabold text-sm uppercase tracking-wider mb-5 flex items-center gap-2">
              <Layers size={16} className="text-zinc-450" />
              Mavjud Premium Mocklar ({mockExams.length})
            </h2>

            {loading ? (
              <div className="py-20 text-center text-zinc-500 font-bold uppercase tracking-widest text-xs">
                <Loader2 className="animate-spin mx-auto mb-4 opacity-30" size={32} /> 
                Mock testlar yuklanmoqda...
              </div>
            ) : mockExams.length > 0 ? (
              <div className="space-y-4">
                {mockExams.map((mock) => (
                  <div 
                    key={mock.id}
                    className={`border rounded-xl p-5 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-sm ${
                      isDark 
                        ? "bg-zinc-900/20 border-zinc-850 hover:border-zinc-800" 
                        : "bg-white border-zinc-200 hover:border-zinc-250"
                    }`}
                  >
                    <div className="space-y-2.5 flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h4 className="font-extrabold text-base leading-snug">{mock.title}</h4>
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border shrink-0 ${
                          isDark ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-600"
                        }`}>
                          {formatUZS(mock.price || 30000)}
                        </span>
                      </div>
                      
                      {mock.description && (
                        <p className={`text-xs font-semibold leading-relaxed line-clamp-2 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                          {mock.description}
                        </p>
                      )}

                      {/* Component Tests details */}
                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
                          isDark ? "bg-blue-500/10 border-blue-500/20 text-blue-400" : "bg-blue-50 border-blue-200 text-blue-600"
                        }`}>
                          <BookOpen size={10} /> Reading
                        </span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
                          isDark ? "bg-purple-500/10 border-purple-500/20 text-purple-400" : "bg-purple-50 border-purple-200 text-purple-650"
                        }`}>
                          <Headphones size={10} /> Listening
                        </span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
                          isDark ? "bg-pink-500/10 border-pink-500/20 text-pink-400" : "bg-pink-50 border-pink-200 text-pink-600"
                        }`}>
                          <PenTool size={10} /> Writing
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2.5 shrink-0 w-full md:w-auto">
                      <button
                        type="button"
                        onClick={() => handleEdit(mock)}
                        className={`flex-1 md:flex-none border p-2.5 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1 text-xs font-bold ${
                          isDark 
                            ? "bg-zinc-800 border-zinc-700 hover:bg-zinc-750 text-zinc-300" 
                            : "bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-650"
                        }`}
                      >
                        <Edit2 size={13} />
                        Tahrirlash
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(mock.id)}
                        className={`flex-1 md:flex-none p-2.5 rounded-xl transition-all active:scale-95 flex items-center justify-center text-red-500 border hover:bg-red-500/10 ${
                          isDark ? "border-red-500/20 bg-red-500/5" : "border-red-200 bg-red-50/50"
                        }`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-dashed border-zinc-300 dark:border-white/10 rounded-xl py-20 text-center bg-gray-50/50 dark:bg-[#181715]/20">
                <Layers size={36} className="mx-auto mb-3 text-zinc-400 opacity-20" />
                <p className="text-zinc-500 text-xs italic">Siz yaratgan premium mocklar hali mavjud emas.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* SELECT MODALS */}
      <TestSearchModal
        isOpen={modalOpen.reading}
        onClose={() => closeModal("reading")}
        type="reading"
        tests={availableTests.reading}
        onSelect={(id) => selectTest("reading", id)}
        selectedId={selectedTests.reading}
        isDark={isDark}
      />

      <TestSearchModal
        isOpen={modalOpen.listening}
        onClose={() => closeModal("listening")}
        type="listening"
        tests={availableTests.listening}
        onSelect={(id) => selectTest("listening", id)}
        selectedId={selectedTests.listening}
        isDark={isDark}
      />

      <TestSearchModal
        isOpen={modalOpen.writing}
        onClose={() => closeModal("writing")}
        type="writing"
        tests={availableTests.writing}
        onSelect={(id) => selectTest("writing", id)}
        selectedId={selectedTests.writing}
        isDark={isDark}
      />

    </div>
  );
}
