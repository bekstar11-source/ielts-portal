// src/pages/ManageTests.jsx
import { useEffect, useState } from "react";
import { db } from "../firebase/firebase";
import { collection, getDocs, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function ManageTests() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Testlarni yuklash
  const fetchTests = async () => {
    try {
      const q = query(collection(db, "tests"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setTests(data);
    } catch (error) {
      console.error("Xatolik:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, []);

  // Testni o'chirish
  const handleDelete = async (testId, testTitle) => {
    if (!window.confirm(`DIQQAT! "${testTitle}" testini o'chirmoqchimisiz?\nBu amalni ortga qaytarib bo'lmaydi!`)) return;

    try {
      await deleteDoc(doc(db, "tests", testId));
      // Eslatma: Agar bu testga bog'liq natijalar (results) bo'lsa, ular bazada qolib ketadi.
      // Hozircha bu muhim emas, lekin kelajakda ularni ham tozalash kerak bo'ladi.
      alert("Test o'chirildi! 🗑️");
      fetchTests(); // Jadvalni yangilash
    } catch (error) {
      console.error("O'chirishda xatolik:", error);
      alert("Xatolik yuz berdi.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">📚 Barcha Testlar Boshqaruvi</h1>
            <p className="text-gray-500">Jami testlar soni: {tests.length}</p>
          </div>
          <div className="flex gap-3">
             <button onClick={() => navigate('/admin/create-test')} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition">
                + Yangi Test
             </button>
             <button onClick={() => navigate('/admin')} className="text-gray-500 hover:text-gray-800 px-4 py-2 bg-white rounded-lg border">
                Admin Panel
             </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-4 text-sm font-medium text-gray-500">Test Nomi</th>
                <th className="p-4 text-sm font-medium text-gray-500">Turi</th>
                <th className="p-4 text-sm font-medium text-gray-500">Qiyinligi</th>
                <th className="p-4 text-sm font-medium text-gray-500">Yaratilgan sana</th>
                <th className="p-4 text-sm font-medium text-gray-500 text-center">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="5" className="p-8 text-center text-gray-500">Yuklanmoqda...</td></tr>
              ) : tests.length === 0 ? (
                <tr><td colSpan="5" className="p-8 text-center text-gray-400">Testlar mavjud emas.</td></tr>
              ) : (
                tests.map((test) => (
                  <tr key={test.id} className="hover:bg-slate-50 transition">
                    <td className="p-4 font-bold text-gray-800">{test.title}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded uppercase font-bold ${
                        test.type === 'listening' ? 'bg-purple-100 text-purple-700' : 
                        test.type === 'writing' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {test.type}
                      </span>
                    </td>
                    <td className="p-4 capitalize text-gray-600 text-sm">{test.difficulty || "Medium"}</td>
                    <td className="p-4 text-gray-500 text-sm">
                        {test.createdAt ? new Date(test.createdAt).toLocaleDateString() : "-"}
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => handleDelete(test.id, test.title)}
                        className="text-red-500 hover:bg-red-50 px-3 py-1 rounded transition text-sm font-bold border border-red-200 hover:border-red-400"
                      >
                        O'chirish 🗑️
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}