import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/firebase';
import { collection, getDocs, doc, getDoc, setDoc, query, orderBy } from 'firebase/firestore';
import { 
  Flame, Save, RefreshCw, ChevronLeft, 
  BookOpen, Headphones, PenTool, MessageCircle, 
  Zap, Star, Search, Filter, Info, ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

export default function AdminRoadmap() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tests, setTests] = useState([]);
  const [roadmap, setRoadmap] = useState(() => {
    const initial = {};
    for (let i = 1; i <= 7; i++) {
      initial[i] = [
        { id: `d${i}_1`, title: "", desc: "", type: 'reading', testId: '' },
        { id: `d${i}_2`, title: "", desc: "", type: 'reading', testId: '' }
      ];
    }
    return initial;
  });
  const [activeDay, setActiveDay] = useState(1);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Tests - Try separately
      try {
        const q = query(collection(db, "tests"), orderBy("createdAt", "desc"));
        const testSnapshot = await getDocs(q);
        const testList = testSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTests(testList);
      } catch (e) {
        console.warn("Tests collection fetch failed (Permissions?):", e);
      }

      // Fetch Roadmap Config - Try separately
      try {
        const roadmapDoc = await getDoc(doc(db, "configs", "roadmap"));
        if (roadmapDoc.exists()) {
          const data = roadmapDoc.data().days || {};
          setRoadmap(prev => ({ ...prev, ...data }));
        }
      } catch (e) {
        console.warn("Configs collection fetch failed (Permissions?):", e);
      }
    } catch (err) {
      console.error("General fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "configs", "roadmap"), { 
        days: roadmap,
        updatedAt: new Date().toISOString()
      });
      alert("Roadmap muvaffaqiyatli saqlandi!");
    } catch (err) {
      console.error("Save error:", err);
      alert("Saqlashda xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  const updateTask = (day, taskIdx, field, value) => {
    const newRoadmap = { ...roadmap };
    newRoadmap[day][taskIdx] = { ...newRoadmap[day][taskIdx], [field]: value };
    setRoadmap(newRoadmap);
  };

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center">
      <RefreshCw className="animate-spin text-blue-600" size={32} />
    </div>
  );

  return (
    <div className={`min-h-screen p-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Flame className="text-orange-500" /> 7-Day Route Management
          </h1>
          <p className="text-sm opacity-60">Talabalar uchun 8 kunlik o'quv rejasini boshqarish</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
        >
          {saving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
          Saqlash
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Days Sidebar */}
        <div className="lg:col-span-3 space-y-2">
          {[...Array(7)].map((_, i) => {
            const day = i + 1;
            return (
              <button
                key={day}
                onClick={() => setActiveDay(day)}
                className={`w-full flex items-center justify-between p-4 rounded-xl transition-all font-bold ${
                  activeDay === day 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white border border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span>Day {day}</span>
                {activeDay === day && <ArrowRight size={16} />}
              </button>
            );
          })}
        </div>

        {/* Right: Task Editor */}
        <div className="lg:col-span-9 space-y-6">
          <div className={`p-8 rounded-3xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
            <h2 className="text-xl font-bold mb-8 flex items-center gap-2 text-blue-500">
              <Star size={20} /> Day {activeDay} Konfiguratsiyasi
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {(roadmap[activeDay] || []).map((task, idx) => (
                <div key={idx} className="space-y-4 p-6 rounded-2xl border border-dashed border-gray-300 dark:border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                      Task {idx + 1}
                    </span>
                    <select 
                      value={task.type}
                      onChange={(e) => updateTask(activeDay, idx, 'type', e.target.value)}
                      className={`text-xs font-bold bg-transparent border-none outline-none cursor-pointer ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                    >
                      <option value="reading">Reading</option>
                      <option value="listening">Listening</option>
                      <option value="writing">Writing AI</option>
                      <option value="speaking">Speaking AI</option>
                      <option value="article">Article</option>
                      <option value="podcast">Podcast</option>
                      <option value="mock">Mock Exam</option>
                    </select>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase opacity-50 block mb-1">Vazifa Sarlavhasi</label>
                      <input 
                        type="text" 
                        value={task.title}
                        onChange={(e) => updateTask(activeDay, idx, 'title', e.target.value)}
                        className={`w-full p-3 rounded-xl text-sm font-bold border outline-none transition ${isDark ? 'bg-white/5 border-white/5 focus:border-blue-500' : 'bg-gray-50 border-gray-200 focus:border-blue-500'}`}
                        placeholder="Masalan: Reading Basics"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase opacity-50 block mb-1">Qisqa Tavsif</label>
                      <textarea 
                        value={task.desc}
                        onChange={(e) => updateTask(activeDay, idx, 'desc', e.target.value)}
                        className={`w-full p-3 rounded-xl text-sm border outline-none transition h-20 resize-none ${isDark ? 'bg-white/5 border-white/5 focus:border-blue-500' : 'bg-gray-50 border-gray-200 focus:border-blue-500'}`}
                        placeholder="Vazifa haqida ma'lumot..."
                      />
                    </div>

                    {['reading', 'listening', 'mock'].includes(task.type) && (
                      <div>
                        <label className="text-[10px] font-bold uppercase opacity-50 block mb-1">Haqiqiy Testni Biriktirish</label>
                        <select 
                          value={task.testId}
                          onChange={(e) => updateTask(activeDay, idx, 'testId', e.target.value)}
                          className={`w-full p-3 rounded-xl text-sm font-medium border outline-none transition ${isDark ? 'bg-[#2C2C2C] border-white/5' : 'bg-gray-50 border-gray-200'}`}
                        >
                          <option value="">Testni tanlang...</option>
                          {tests.filter(t => t.type === (task.type === 'mock' ? 'reading' : task.type)).map(t => (
                            <option key={t.id} value={t.id}>{t.title} ({t.type})</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Info Card */}
          <div className="p-6 rounded-3xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-500/20 flex gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0">
              <Info size={20} />
            </div>
            <div>
              <h4 className="font-bold text-blue-900 dark:text-blue-400 mb-1">Maslahat</h4>
              <p className="text-sm text-blue-800/70 dark:text-blue-400/70 leading-relaxed">
                Har bir kunga biriktirilgan testlar talabaning dashboard'ida avtomatik ravishda ko'rinadi. 
                Writing va Speaking AI uchun alohida test tanlash shart emas, ular avtomatik ravishda AI modullarini ochadi.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
