// src/pages/CreateTest.jsx
import { useState, useEffect } from "react";
import { db, storage } from "../firebase/firebase";
import { collection, addDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigate, useParams } from "react-router-dom";

// --- ICONS ---
const Icons = {
  Back: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>,
  Cloud: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" /></svg>,
  Copy: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5" /></svg>,
  Check: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
};

export default function CreateTest() {
  const navigate = useNavigate();
  const { id } = useParams(); // Edit mode uchun
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  const [isMockMode, setIsMockMode] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const [jsonError, setJsonError] = useState("");

  const [partAudios, setPartAudios] = useState({ 0: "", 1: "", 2: "", 3: "" });
  const [uploadedMaps, setUploadedMaps] = useState([]);
  const [activeWritingTask, setActiveWritingTask] = useState(0);

  const [testData, setTestData] = useState({
    title: "",
    type: "reading",
    difficulty: "medium",
    passages: [], 
    audio_url: "",
    introDuration: 10,
    questions: [],
    writingTasks: [
        { id: 1, title: "Task 1", prompt: "", image: "", minWords: 150 },
        { id: 2, title: "Task 2", prompt: "", image: "", minWords: 250 }
    ],
    passage: ""
  });

  // --- INIT (EDIT MODE) ---
  useEffect(() => {
    if (id) {
        setIsEditMode(true);
        const fetchTest = async () => {
            setLoading(true);
            try {
                const docRef = doc(db, "tests", id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setTestData(data);
                    setIsMockMode(data.isExclusive || false);
                    
                    // JSON inputni to'ldirish
                    const jsonStructure = {
                        title: data.title,
                        introDuration: data.introDuration,
                        passages: data.passages?.map(p => ({ ...p, audio: "" })) || [],
                        questions: data.questions || []
                    };
                    setJsonInput(JSON.stringify(jsonStructure, null, 2));

                    // Audiolarni tiklash
                    const audioMap = {};
                    data.passages?.forEach((p, i) => { if (p.audio) audioMap[i] = p.audio; });
                    setPartAudios(audioMap);
                }
            } catch (error) { console.error(error); } 
            finally { setLoading(false); }
        };
        fetchTest();
    }
  }, [id]);

  // --- HELPER: Update State from JSON String ---
  // Bu funksiya JSON stringni olib, TestData ni yangilaydi (Kod takrorlanmasligi uchun ajratdik)
  const updateTestDataFromJSON = (jsonStr) => {
    try {
        if (!jsonStr.trim()) return;
        const cleanVal = jsonStr.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");
        const parsed = JSON.parse(cleanVal);
        
        let updatedPassages = parsed.passages || [];
        updatedPassages = updatedPassages.map((p, idx) => ({
            ...p,
            audio: partAudios[idx] || (testData.passages[idx]?.audio) || "" 
        }));

        setTestData(prev => ({
            ...prev,
            title: parsed.title || prev.title,
            audio_url: parsed.audio || prev.audio_url, 
            introDuration: parsed.introDuration || prev.introDuration,
            passages: updatedPassages,
            questions: parsed.questions || prev.questions
        }));
        setJsonError("");
    } catch (err) { setJsonError("JSON Xato: " + err.message); }
  };

  // --- HANDLERS ---
  const handleJsonChange = (e) => {
    const val = e.target.value;
    setJsonInput(val);
    updateTestDataFromJSON(val);
  };

  const handlePartAudioUpload = async (e, index) => {
      const file = e.target.files[0];
      if (!file) return;
      setUploading(true);
      try {
          const storageRef = ref(storage, `part_audios/${Date.now()}_${file.name}`);
          await uploadBytes(storageRef, file);
          const url = await getDownloadURL(storageRef);
          
          setPartAudios(prev => ({ ...prev, [index]: url }));
          setTestData(prev => {
              const newPassages = [...(prev.passages || [])];
              if (!newPassages[index]) newPassages[index] = { id: 100+index, title: `Part ${index+1}`, content: "", audio: url };
              else newPassages[index] = { ...newPassages[index], audio: url };
              return { ...prev, passages: newPassages };
          });
      } catch (err) { alert(err.message); } finally { setUploading(false); }
  };

  // 🔥 AVTOMATIK RASM QO'YISH LOGIKASI QO'SHILDI 🔥
  const handleMapUpload = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      setUploading(true);
      try {
          // 1. Rasmni yuklash
          const storageRef = ref(storage, `map_images/${Date.now()}_${file.name}`);
          await uploadBytes(storageRef, file);
          const url = await getDownloadURL(storageRef);
          
          // 2. Ro'yxatga qo'shish (Vizual uchun)
          setUploadedMaps(prev => [...prev, { name: file.name, url }]);

          // 3. JSON ichiga Avtomatik Joylash (Auto-Injection)
          // Biz JSON ichidan "image": "LINK_HERE..." yoki "image": "" degan joyni qidirib,
          // birinchi uchraganini yangi URL bilan almashtiramiz.
          if (jsonInput) {
              // Regex: "image": "..." qidiradi (bo'sh yoki LINK_HERE bilan boshlanadigan)
              const regex = /"image":\s*"(LINK_HERE[^"]*|)"/; 
              
              if (regex.test(jsonInput)) {
                  // Topilsa, almashtiramiz
                  const newJsonStr = jsonInput.replace(regex, `"image": "${url}"`);
                  setJsonInput(newJsonStr);
                  updateTestDataFromJSON(newJsonStr); // State ni ham yangilaymiz
                  alert("Rasm muvaffaqiyatli yuklandi va JSON ga avtomatik joylandi!");
              } else {
                  // Agar joy topilmasa, shunchaki nusxalaymiz
                  copyToClipboard(url);
                  alert("Rasm yuklandi! Lekin JSON da bo'sh 'image' joyi topilmadi. Link nusxalandi.");
              }
          } else {
              copyToClipboard(url);
              alert("Rasm yuklandi! Link nusxalandi.");
          }

      } catch (err) { alert(err.message); } finally { setUploading(false); }
  };

  const handleWritingImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        try {
            const storageRef = ref(storage, `writing_images/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            setTestData(prev => {
                const newTasks = [...prev.writingTasks];
                newTasks[activeWritingTask] = { ...newTasks[activeWritingTask], image: url };
                return { ...prev, writingTasks: newTasks };
            });
        } catch (err) { alert(err.message); } finally { setUploading(false); }
  };

  // 🔥 YETISHMAYOTGAN FUNKSIYA QO'SHILDI 🔥
  const handleWritingUpdate = (field, value) => {
      setTestData(prev => {
          const newTasks = [...prev.writingTasks];
          newTasks[activeWritingTask] = { ...newTasks[activeWritingTask], [field]: value };
          return { ...prev, writingTasks: newTasks };
      });
  };

  const copyToClipboard = (text) => { navigator.clipboard.writeText(text); alert("Link nusxalandi!"); };

  const handleSave = async () => {
    if (!testData.title) return alert("Test nomini yozing!");
    setLoading(true);
    try {
      const processedQuestions = testData.questions.map(q => {
          if (q.type === 'table_completion' && Array.isArray(q.rows)) {
              return { ...q, rows: q.rows.map(row => Array.isArray(row) ? { cells: row } : row) };
          }
          return q;
      });

      const payload = {
        ...testData,
        questions: processedQuestions,
        introDuration: Number(testData.introDuration),
        isExclusive: isMockMode,
        updatedAt: new Date().toISOString()
      };

      if (isEditMode) {
          await updateDoc(doc(db, "tests", id), payload);
          alert("Test yangilandi!");
      } else {
          payload.createdAt = new Date().toISOString();
          await addDoc(collection(db, "tests"), payload);
          alert("Test yaratildi!");
      }
      navigate("/admin/tests");
    } catch (error) { console.error(error); alert("Xato: " + error.message); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row h-screen overflow-hidden font-sans bg-[#141416] text-white selection:bg-[#3772FF]/30">
      
      {/* HEADER MOBILE (Only visible on small screens) */}
      <div className="md:hidden p-4 flex items-center justify-between bg-[#23262F] border-b border-white/5">
          <button onClick={() => navigate('/admin/tests')} className="text-white"><Icons.Back className="w-6 h-6"/></button>
          <span className="font-bold">Test Manager</span>
      </div>

      {/* --- LEFT PANEL: SETUP --- */}
      <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col h-full overflow-y-auto custom-scrollbar border-r border-[#353945]">
        
        {/* Back & Toggle */}
        <div className="flex justify-between items-center mb-8">
            <button onClick={() => navigate('/admin/tests')} className="flex items-center gap-2 text-[#777E90] hover:text-white transition group">
                <div className="p-2 rounded-full bg-[#23262F] group-hover:bg-[#353945] border border-white/5">
                    <Icons.Back className="w-4 h-4"/>
                </div>
                <span className="text-sm font-medium">Orqaga</span>
            </button>

            <div className="flex bg-[#23262F] p-1 rounded-xl border border-white/5">
                <button onClick={() => setIsMockMode(false)} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${!isMockMode ? 'bg-[#3772FF] text-white shadow-lg' : 'text-[#777E90] hover:text-white'}`}>Standard</button>
                <button onClick={() => setIsMockMode(true)} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${isMockMode ? 'bg-[#FFD166] text-black shadow-lg' : 'text-[#777E90] hover:text-white'}`}>Mock Exam</button>
            </div>
        </div>

        <h1 className="text-3xl font-medium mb-8 tracking-tight text-white">
            {isEditMode ? "Testni Tahrirlash" : "Yangi Test Yaratish"}
        </h1>

        {/* Form Fields */}
        <div className="space-y-6 mb-8">
            <div>
              <label className="block text-xs font-bold text-[#777E90] uppercase mb-2 ml-1">Test Nomi</label>
              <input 
                type="text" 
                className="w-full bg-[#23262F] border border-[#353945] rounded-2xl p-4 text-white focus:outline-none focus:border-[#3772FF] transition font-medium placeholder:text-[#777E90]/50" 
                placeholder="Masalan: Cambridge 18 - Test 1" 
                value={testData.title} 
                onChange={e => setTestData({...testData, title: e.target.value})} 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#777E90] uppercase mb-2 ml-1">Turi</label>
                  <div className="relative">
                      <select 
                        className="w-full bg-[#23262F] border border-[#353945] rounded-2xl p-4 text-white appearance-none focus:outline-none focus:border-[#3772FF] transition cursor-pointer" 
                        value={testData.type} 
                        onChange={e => setTestData({...testData, type: e.target.value})}
                      >
                          <option value="reading">Reading</option>
                          <option value="listening">Listening</option>
                          <option value="writing">Writing</option>
                          <option value="speaking">Speaking</option>
                      </select>
                      <div className="absolute right-4 top-4 text-[#777E90] pointer-events-none">▼</div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#777E90] uppercase mb-2 ml-1">Qiyinlik</label>
                  <div className="relative">
                      <select 
                        className="w-full bg-[#23262F] border border-[#353945] rounded-2xl p-4 text-white appearance-none focus:outline-none focus:border-[#3772FF] transition cursor-pointer" 
                        value={testData.difficulty} 
                        onChange={e => setTestData({...testData, difficulty: e.target.value})}
                      >
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                      </select>
                      <div className="absolute right-4 top-4 text-[#777E90] pointer-events-none">▼</div>
                  </div>
                </div>
            </div>

            {testData.type === 'listening' && (
                <div className="bg-[#23262F] p-4 rounded-2xl border border-[#353945] flex items-center justify-between">
                    <span className="text-sm font-medium text-[#777E90]">Intro Delay (Sekund)</span>
                    <input type="number" className="w-20 bg-[#141416] border border-[#353945] rounded-xl p-2 text-center text-white focus:border-[#3772FF] outline-none" value={testData.introDuration} onChange={(e) => setTestData({...testData, introDuration: e.target.value})} />
                </div>
            )}
        </div>

        {/* LISTENING UPLOADS */}
        {testData.type === 'listening' && (
            <div className="bg-[#23262F] p-6 rounded-[30px] border border-[#353945] mb-6">
                <h3 className="font-medium text-white mb-4 flex items-center gap-2"><Icons.Cloud className="w-5 h-5 text-[#9757D7]"/> Audio Fayllar</h3>
                <div className="grid grid-cols-2 gap-3">
                    {[0, 1, 2, 3].map((idx) => (
                        <label key={idx} className={`relative flex flex-col items-center justify-center h-24 rounded-2xl border-2 border-dashed cursor-pointer transition ${partAudios[idx] ? 'border-[#45B26B] bg-[#45B26B]/10' : 'border-[#353945] hover:border-[#777E90] hover:bg-[#353945]/50'}`}>
                            <span className="text-xs font-bold text-[#777E90] uppercase mb-1">Part {idx + 1}</span>
                            {partAudios[idx] ? (
                                <span className="text-[10px] text-[#45B26B] font-bold flex items-center gap-1"><Icons.Check className="w-3 h-3"/> Yuklandi</span>
                            ) : (
                                <span className="text-[10px] text-[#3772FF]">Yuklash</span>
                            )}
                            <input type="file" accept="audio/*" onChange={(e) => handlePartAudioUpload(e, idx)} disabled={uploading} className="hidden"/>
                        </label>
                    ))}
                </div>
            </div>
        )}

        {/* MAP/IMAGE UPLOADS */}
        {(testData.type === 'listening' || testData.type === 'reading') && (
            <div className="bg-[#23262F] p-6 rounded-[30px] border border-[#353945] mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium text-white flex items-center gap-2"><Icons.Cloud className="w-5 h-5 text-[#3772FF]"/> Map & Images</h3>
                    <label className="bg-[#3772FF] hover:bg-[#2e62e0] text-white px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition">
                        + Rasm
                        <input type="file" accept="image/*" onChange={handleMapUpload} disabled={uploading} className="hidden"/>
                    </label>
                </div>
                
                <div className="space-y-2">
                    {uploadedMaps.map((map, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-[#141416] p-3 rounded-xl border border-[#353945]">
                            <span className="text-xs text-[#777E90] truncate w-40">{map.name}</span>
                            <button onClick={() => copyToClipboard(map.url)} className="text-[#3772FF] hover:text-white transition p-1">
                                <Icons.Copy className="w-4 h-4"/>
                            </button>
                        </div>
                    ))}
                    {uploadedMaps.length === 0 && <p className="text-xs text-[#777E90] text-center py-2">Rasm yuklanmagan</p>}
                </div>
            </div>
        )}

        {/* WRITING TASK */}
        {testData.type === 'writing' && (
            <div className="bg-[#23262F] p-6 rounded-[30px] border border-[#353945] mb-6 flex-1 flex flex-col">
                <div className="flex bg-[#141416] p-1 rounded-xl mb-4 w-fit border border-[#353945]">
                    {[0,1].map(i => (
                        <button key={i} onClick={() => setActiveWritingTask(i)} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${activeWritingTask === i ? 'bg-[#3772FF] text-white' : 'text-[#777E90] hover:text-white'}`}>
                            Task {i+1}
                        </button>
                    ))}
                </div>
                
                <div className="flex items-center gap-3 mb-4">
                    <label className="bg-[#353945] hover:bg-[#454955] text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition flex-1 text-center">
                        Rasm Yuklash
                        <input type="file" accept="image/*" onChange={handleWritingImageUpload} className="hidden"/>
                    </label>
                    {testData.writingTasks[activeWritingTask].image && <span className="text-xs text-[#45B26B]">Rasm mavjud</span>}
                </div>

                <textarea 
                    className="w-full flex-1 bg-[#141416] border border-[#353945] rounded-2xl p-4 text-white text-sm focus:border-[#3772FF] outline-none resize-none leading-relaxed placeholder:text-[#777E90]/50" 
                    placeholder="Task description..." 
                    value={testData.writingTasks[activeWritingTask].prompt} 
                    onChange={e => handleWritingUpdate("prompt", e.target.value)}
                ></textarea>
            </div>
        )}

        {/* JSON INPUT */}
        {(testData.type === 'reading' || testData.type === 'listening') && (
            <div className="flex-1 flex flex-col min-h-[300px]">
                <div className="flex justify-between items-center mb-2 px-1">
                    <label className="text-xs font-bold text-[#777E90] uppercase">JSON Data</label>
                    {jsonError && <span className="text-xs text-[#FF5959] font-bold">{jsonError}</span>}
                </div>
                <textarea 
                    className="w-full flex-1 bg-[#23262F] border border-[#353945] rounded-[24px] p-5 font-mono text-xs text-[#777E90] focus:text-white focus:border-[#3772FF] outline-none resize-none leading-relaxed custom-scrollbar" 
                    value={jsonInput} 
                    onChange={handleJsonChange} 
                    placeholder='{ "passages": [], "questions": [] }' 
                    spellCheck="false"
                />
            </div>
        )}
      </div>

      {/* --- RIGHT PANEL: PREVIEW --- */}
      <div className="hidden md:flex w-1/2 bg-[#141416] p-8 flex-col border-l border-[#353945] relative">
        <div className="absolute inset-0 bg-gradient-to-br from-[#3772FF]/5 to-transparent pointer-events-none"/>
        
        <div className="flex justify-between items-center mb-6 relative z-10">
            <h2 className="text-xl font-medium text-white">Preview</h2>
            <span className="px-3 py-1 bg-[#23262F] rounded-lg text-xs font-bold text-[#3772FF] uppercase border border-[#353945]">
                {testData.type}
            </span>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-2 relative z-10">
            <h1 className="text-3xl font-bold text-white leading-tight">{testData.title || "Test Nomi..."}</h1>
            
            {/* Passages */}
            {testData.passages?.map((p, i) => (
                <div key={i} className="bg-[#23262F] p-6 rounded-[24px] border border-[#353945]">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-lg font-bold text-white">{p.title || `Part ${i+1}`}</h4>
                        {(partAudios[i] || p.audio) && <span className="text-[10px] bg-[#353945] text-[#9757D7] px-2 py-1 rounded font-bold">AUDIO</span>}
                    </div>
                    <div className="text-sm text-[#777E90] leading-relaxed" dangerouslySetInnerHTML={{__html: p.content || "Matn yo'q..."}}></div>
                </div>
            ))}

            {/* Questions */}
            <div className="space-y-4">
                {testData.questions?.map((g, i) => (
                    <div key={i} className="bg-[#23262F]/50 p-5 rounded-[24px] border border-[#353945] hover:border-[#3772FF]/30 transition">
                        <p className="text-xs font-bold text-[#3772FF] mb-2 uppercase tracking-wider">{g.type}</p>
                        <div className="text-sm text-white mb-3 font-medium" dangerouslySetInnerHTML={{__html: g.instruction}}></div>
                        {g.items?.map(q => (
                            <div key={q.id} className="flex gap-3 text-xs py-2 border-b border-[#353945] last:border-0 text-[#777E90]">
                                <span className="font-bold w-6 text-white">{q.id}.</span>
                                <span className="flex-1">{q.text}</span>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>

        {/* Action Button */}
        <div className="mt-6 pt-6 border-t border-[#353945] relative z-10">
            <button 
                onClick={handleSave} 
                disabled={loading || uploading} 
                className={`w-full py-4 rounded-2xl font-bold text-sm text-white shadow-lg transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${isEditMode ? 'bg-[#FFD166] text-black hover:bg-[#ffc642]' : 'bg-[#3772FF] hover:bg-[#2e62e0]'}`}
            >
                {loading ? "Jarayonda..." : (isEditMode ? "O'zgarishlarni Saqlash" : "Testni Yaratish")}
            </button>
        </div>
      </div>

    </div>
  );
}