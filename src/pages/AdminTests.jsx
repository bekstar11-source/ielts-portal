// src/pages/AdminTests.jsx
import { useState, useEffect } from "react";
import { db } from "../firebase/firebase";
import { collection, getDocs, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

// Icons
const Icons = {
  Edit: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>,
  Eye: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  Trash: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>,
  ArrowLeft: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>,
  Plus: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
};

export default function AdminTests() {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const q = query(collection(db, "tests"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        setTests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTests();
  }, []);

  const handleDelete = async (id) => {
    if(!window.confirm("Testni o'chirib yubormoqchimisiz?")) return;
    try {
        await deleteDoc(doc(db, "tests", id));
        setTests(tests.filter(t => t.id !== id));
    } catch(err) { alert("Xato: " + err.message); }
  };

  return (
    <div className="min-h-screen bg-[#141416] p-6 font-sans text-white">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8 max-w-6xl mx-auto">
        <div className="flex items-center gap-4">
            <button onClick={() => navigate('/admin')} className="p-2 bg-[#23262F] rounded-full hover:bg-white/10 transition text-[#777E90] hover:text-white">
                <Icons.ArrowLeft className="w-6 h-6"/>
            </button>
            <h1 className="text-2xl font-bold">Barcha Testlar</h1>
        </div>
        <button 
            onClick={() => navigate('/admin/create-test')}
            className="bg-[#3772FF] hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition"
        >
            <Icons.Plus className="w-5 h-5"/> Yangi Test
        </button>
      </div>

      {/* TABLE LIST */}
      <div className="max-w-6xl mx-auto space-y-3">
        {loading ? <div className="text-center text-[#777E90]">Yuklanmoqda...</div> : tests.map(test => (
            <div key={test.id} className="bg-[#23262F] p-4 rounded-2xl border border-white/5 flex items-center justify-between hover:border-[#3772FF]/50 transition group">
                
                {/* Info */}
                <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg 
                        ${test.type === 'reading' ? 'bg-blue-500/10 text-blue-500' : 
                          test.type === 'listening' ? 'bg-purple-500/10 text-purple-500' : 
                          'bg-yellow-500/10 text-yellow-500'}`}>
                        {test.type ? test.type.charAt(0).toUpperCase() : 'T'}
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-base">{test.title}</h3>
                        <p className="text-xs text-[#777E90] flex gap-2">
                            <span className="uppercase">{test.type}</span> • {test.difficulty} • {test.questions?.length || 0} savol
                        </p>
                    </div>
                </div>

                {/* ACTIONS */}
                <div className="flex items-center gap-2">
                    {/* 1. EDIT BUTTON */}
                    <button 
                        onClick={() => navigate(`/admin/edit-test/${test.id}`)}
                        className="p-2 bg-[#353945] hover:bg-[#3772FF] text-white rounded-lg transition tooltip-trigger"
                        title="Tahrirlash"
                    >
                        <Icons.Edit className="w-4 h-4"/>
                    </button>

                    {/* 2. PREVIEW BUTTON (Sinab ko'rish) */}
                    <button 
                        onClick={() => window.open(`/test/${test.id}`, '_blank')}
                        className="p-2 bg-[#353945] hover:bg-green-500 text-white rounded-lg transition"
                        title="O'quvchi sifatida ko'rish"
                    >
                        <Icons.Eye className="w-4 h-4"/>
                    </button>

                    {/* 3. DELETE BUTTON */}
                    <button 
                        onClick={() => handleDelete(test.id)}
                        className="p-2 bg-[#353945] hover:bg-red-500 text-white rounded-lg transition"
                        title="O'chirish"
                    >
                        <Icons.Trash className="w-4 h-4"/>
                    </button>
                </div>
            </div>
        ))}
        {tests.length === 0 && !loading && <p className="text-center text-[#777E90]">Testlar yo'q.</p>}
      </div>
    </div>
  );
}