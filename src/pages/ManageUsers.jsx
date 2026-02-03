// src/pages/ManageUsers.jsx
import { useEffect, useState } from "react";
import { db } from "../firebase/firebase";
import { collection, getDocs, doc, deleteDoc, query, orderBy } from "firebase/firestore"; // deleteDoc qo'shildi
import { useNavigate } from "react-router-dom";

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  // Userlarni yuklash
  const fetchUsers = async () => {
    try {
      // Hozircha oddiy collection chaqiramiz. 
      // Real loyihada minglab user bo'lsa, pagination kerak bo'ladi.
      const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(data);
    } catch (error) {
      console.error("Xatolik:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Userni o'chirish
  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Siz rostaan ham ${userName} ni tizimdan o'chirmoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi!`)) return;

    try {
      await deleteDoc(doc(db, "users", userId));
      // Eslatma: Firebase Auth dan o'chirish uchun Backend (Node.js) kerak, 
      // lekin hozircha bazadan o'chiramiz, shunda u login qilolmaydi (Login logicga tekshiruv qo'shsak).
      
      alert("Foydalanuvchi o'chirildi 🗑️");
      fetchUsers(); // Jadvalni yangilash
    } catch (error) {
      console.error("O'chirishda xatolik:", error);
      alert("Xatolik yuz berdi.");
    }
  };

  // Qidiruv funksiyasi
  const filteredUsers = users.filter(user => 
    user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">👥 Foydalanuvchilar ({users.length})</h1>
            <p className="text-gray-500">Tizimdagi barcha o'quvchilar va adminlar</p>
          </div>
          <button onClick={() => navigate('/admin')} className="text-gray-500 hover:text-gray-800 font-medium">
            ⬅️ Admin Panel
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex gap-4">
            <div className="flex-1 relative">
                <span className="absolute left-3 top-3 text-gray-400">🔍</span>
                <input 
                    type="text" 
                    placeholder="Ism yoki Email orqali qidirish..." 
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        {/* Jadval */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-4 text-sm font-medium text-gray-500">№</th>
                <th className="p-4 text-sm font-medium text-gray-500">F.I.O</th>
                <th className="p-4 text-sm font-medium text-gray-500">Email</th>
                <th className="p-4 text-sm font-medium text-gray-500">Rol</th>
                <th className="p-4 text-sm font-medium text-gray-500">Ro'yxatdan o'tgan sana</th>
                <th className="p-4 text-sm font-medium text-gray-500 text-center">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                 <tr><td colSpan="6" className="p-8 text-center text-gray-500">Yuklanmoqda...</td></tr>
              ) : filteredUsers.length === 0 ? (
                 <tr><td colSpan="6" className="p-8 text-center text-gray-400">Hech kim topilmadi.</td></tr>
              ) : (
                filteredUsers.map((u, index) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition">
                    <td className="p-4 text-gray-400 font-mono text-sm">{index + 1}</td>
                    <td className="p-4 font-bold text-gray-800 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                            {u.fullName?.charAt(0) || "U"}
                        </div>
                        {u.fullName}
                    </td>
                    <td className="p-4 text-gray-600 text-sm">{u.email}</td>
                    <td className="p-4">
                        <span className={`text-xs px-2 py-1 rounded uppercase font-bold ${
                            u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'
                        }`}>
                            {u.role || 'student'}
                        </span>
                    </td>
                    <td className="p-4 text-gray-500 text-sm">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-"}
                    </td>
                    <td className="p-4 text-center">
                        {u.role !== 'admin' && (
                            <button 
                                onClick={() => handleDeleteUser(u.id, u.fullName)}
                                className="text-red-500 hover:bg-red-50 p-2 rounded transition text-sm font-medium"
                                title="O'chirish"
                            >
                                🗑️
                            </button>
                        )}
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