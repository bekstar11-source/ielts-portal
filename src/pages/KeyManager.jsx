// src/pages/KeyManager.jsx
import React, { useEffect, useState } from "react";
import { db } from "../firebase/firebase";
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, writeBatch } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

// --- ICONS ---
const Icons = {
  Back: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>,
  Key: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" /></svg>,
  Trash: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>,
  Copy: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-2.278-3.694-4.125-8.25-4.125T3.75 11.25C3.75 11.25 3.75 11.25 3.75 11.25" /></svg>,
  Bolt: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
};

export default function KeyManager() {
  const navigate = useNavigate();
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bulkCount, setBulkCount] = useState(1); // Default 1 ta

  // Tests
  const [availableTests, setAvailableTests] = useState({ reading: [], listening: [], writing: [] });
  const [selectedTests, setSelectedTests] = useState({ reading: "", listening: "", writing: "" });

  // --- 1. DATA LOAD ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [keysSnap, testsSnap] = await Promise.all([
            getDocs(query(collection(db, "accessKeys"), orderBy("createdAt", "desc"))),
            getDocs(query(collection(db, "tests"), orderBy("createdAt", "desc")))
        ]);

        setKeys(keysSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        
        const allTests = testsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAvailableTests({
          reading: allTests.filter(t => t.type === 'reading'),
          listening: allTests.filter(t => t.type === 'listening'),
          writing: allTests.filter(t => t.type === 'writing'),
        });
      } catch (error) { console.error("Xatolik:", error); }
    };
    fetchData();
  }, []);

  // --- 2. GENERATE LOGIC ---
  const generateRandomCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; 
    let result = "";
    for (let i = 0; i < 6; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
  };

  const handleGenerate = async () => {
    if (!selectedTests.reading || !selectedTests.listening || !selectedTests.writing) {
      alert("Iltimos, 3 ta fanni ham tanlang!");
      return;
    }
    
    // Cheklov (xavfsizlik uchun)
    if (bulkCount > 50) return alert("Maksimal 50 ta kalit yaratish mumkin.");
    if (bulkCount < 1) return alert("Kamida 1 ta.");

    setLoading(true);
    const batch = writeBatch(db); // Batch Write (Hammasini bittada yozadi)
    const newKeysList = [];

    try {
      for(let i=0; i<bulkCount; i++) {
          const newCode = generateRandomCode();
          const docRef = doc(collection(db, "accessKeys")); // Yangi bo'sh doc
          const keyData = {
            key: newCode, 
            isUsed: false,
            type: 'mock_bundle', 
            createdAt: new Date().toISOString(),
            assignedTests: { 
              readingId: selectedTests.reading,
              listeningId: selectedTests.listening,
              writingId: selectedTests.writing
            }
          };
          
          batch.set(docRef, keyData);
          newKeysList.push({ id: docRef.id, ...keyData });
      }

      await batch.commit(); // Baza bilan bitta tranzaksiya
      
      setKeys([...newKeysList, ...keys]);
      alert(`${bulkCount} ta kalit muvaffaqiyatli yaratildi! 🎉`);
      setBulkCount(1); // Reset

    } catch (error) { 
        console.error(error);
        alert("Xatolik yuz berdi"); 
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
      if(!window.confirm("O'chirasizmi?")) return;
      await deleteDoc(doc(db, "accessKeys", id));
      setKeys(prev => prev.filter(k => k.id !== id));
  };

  const copyToClipboard = (text) => {
      navigator.clipboard.writeText(text);
      alert("Nusxalandi!");
  };

  // Faqat yangi yaratilganlarni nusxalash (Oxirgi N tasi)
  const copyLatestBatch = () => {
      // Hozirgi eng yangi `bulkCount` ta kalitni olib berish mantiqi murakkab bo'lishi mumkin,
      // shuning uchun oddiygina sahifadagi eng yuqori N tasini olamiz (chunki ular eng yangisi).
      // Lekin UX uchun har birini alohida copy qilgan yaxshi.
      alert("Hozircha faqat bittalab nusxalash mumkin.");
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6 font-sans text-slate-800">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span className="bg-yellow-100 text-yellow-600 p-2 rounded-lg"><Icons.Key className="w-6 h-6"/></span> 
          Mock Exam Kalitlari
        </h1>
        <button onClick={() => navigate('/admin')} className="flex items-center gap-2 bg-white border border-gray-300 px-4 py-2 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 transition">
          <Icons.Back className="w-5 h-5"/> Orqaga
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CREATE PANEL */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm h-fit sticky top-6">
          <h2 className="font-bold text-lg mb-4 text-gray-800 flex items-center gap-2">
              <Icons.Bolt className="w-5 h-5 text-yellow-500"/> Generator
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-blue-600 uppercase mb-1">1. Reading</label>
              <select className="w-full border p-2.5 rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500" onChange={(e) => setSelectedTests({...selectedTests, reading: e.target.value})}>
                <option value="">Tanlang...</option>
                {availableTests.reading.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-purple-600 uppercase mb-1">2. Listening</label>
              <select className="w-full border p-2.5 rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-purple-500" onChange={(e) => setSelectedTests({...selectedTests, listening: e.target.value})}>
                <option value="">Tanlang...</option>
                {availableTests.listening.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-yellow-600 uppercase mb-1">3. Writing</label>
              <select className="w-full border p-2.5 rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-yellow-500" onChange={(e) => setSelectedTests({...selectedTests, writing: e.target.value})}>
                <option value="">Tanlang...</option>
                {availableTests.writing.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>

            <div className="pt-4 border-t">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Soni (Nechta kalit?)</label>
                <div className="flex gap-2">
                    <input 
                        type="number" 
                        min="1" max="50"
                        className="w-20 border-2 border-gray-300 rounded-lg text-center font-bold text-lg focus:border-yellow-500 outline-none"
                        value={bulkCount}
                        onChange={(e) => setBulkCount(Number(e.target.value))}
                    />
                    <button 
                        onClick={handleGenerate} 
                        disabled={loading} 
                        className="flex-1 bg-yellow-500 text-white py-3 rounded-xl font-bold hover:bg-yellow-600 transition shadow-lg active:scale-95 disabled:bg-gray-300 flex justify-center items-center gap-2"
                    >
                        {loading ? "Yaratilmoqda..." : `YARATISH (${bulkCount})`}
                    </button>
                </div>
            </div>
          </div>
        </div>

        {/* LIST PANEL */}
        <div className="lg:col-span-2 bg-white rounded-2xl border shadow-sm flex flex-col h-[80vh] overflow-hidden">
          <div className="p-4 border-b bg-gray-50 font-bold text-gray-700 flex justify-between items-center">
              <span>Mavjud Kalitlar ({keys.length})</span>
              <span className="text-xs font-normal text-gray-400">Eng yangilari tepada</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {keys.map((item, index) => (
              <div key={item.id} className={`flex justify-between items-center p-3 rounded-xl border transition animate-in fade-in slide-in-from-top-2 ${item.isUsed ? 'bg-gray-100 opacity-60' : 'bg-white border-yellow-100 hover:border-yellow-300 hover:shadow-sm'}`}>
                <div className="flex items-center gap-4">
                   <span className="text-gray-300 font-mono text-xs w-6">{keys.length - index}</span>
                   <div className="bg-slate-800 text-white font-mono text-lg font-bold px-3 py-1.5 rounded-lg tracking-widest selection:bg-yellow-500">
                       {item.key}
                   </div>
                   <div>
                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{new Date(item.createdAt).toLocaleDateString()}</p>
                       <p className={`text-xs font-bold ${item.isUsed ? "text-green-600" : "text-blue-500"}`}>
                           {item.isUsed ? `👤 ${item.usedByName}` : "🆕 Yangi"}
                       </p>
                   </div>
                </div>
                <div className="flex gap-2">
                    {!item.isUsed && <button onClick={() => copyToClipboard(item.key)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition" title="Nusxalash"><Icons.Copy className="w-5 h-5"/></button>}
                    <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="O'chirish"><Icons.Trash className="w-5 h-5"/></button>
                </div>
              </div>
            ))}
            {keys.length === 0 && <div className="text-center text-gray-400 mt-10">Kalitlar yo'q.</div>}
          </div>
        </div>

      </div>
    </div>
  );
}