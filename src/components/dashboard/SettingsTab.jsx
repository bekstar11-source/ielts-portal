// src/components/dashboard/SettingsTab.jsx
import React, { useState } from 'react';
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { Icons } from "./Icons";
import { useAuth } from "../../context/AuthContext"; // 🔥 Contextni chaqiramiz

// --- PROFESSIONAL & MINIMALIST AVATARS (Lorelei Style) ---
// Jiddiy, chiziqli va flat-dizayn uslubidagi avatarlar
const AVATAR_LIST = [
  // Jiddiy Erkaklar
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Robert&backgroundColor=ffffff",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Luis&backgroundColor=ffffff",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Caleb&backgroundColor=ffffff",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=George&backgroundColor=ffffff",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Ryan&backgroundColor=ffffff",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Christopher&backgroundColor=ffffff",
  
  // Jiddiy Ayollar
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Sarah&backgroundColor=ffffff",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Jessica&backgroundColor=ffffff",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Maria&backgroundColor=ffffff",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Sophia&backgroundColor=ffffff",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Jennifer&backgroundColor=ffffff",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Amaya&backgroundColor=ffffff"
];

export default function SettingsTab() {
  // AuthContext dan ma'lumot va yangilash funksiyasini olamiz
  const { user, userData, updateUserLocalData } = useAuth();

  // Inputlar uchun State
  const [fullName, setFullName] = useState(userData?.fullName || "");
  const [phone, setPhone] = useState(userData?.phone || "");
  
  // Avatar uchun State
  const [selectedAvatar, setSelectedAvatar] = useState(userData?.photoURL || null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  // Yuklanish holati
  const [isSaving, setIsSaving] = useState(false);

  // Saqlash funksiyasi
  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      const userRef = doc(db, "users", user.uid);
      
      const newData = {
        fullName: fullName,
        phone: phone,
        photoURL: selectedAvatar // Tanlangan rasmni saqlaymiz
      };

      // 1. Bazani yangilash (Firebase)
      await updateDoc(userRef, newData);

      // 2. Lokal ilovani yangilash (Reloadsiz)
      if (updateUserLocalData) {
          updateUserLocalData(newData);
      }

      alert("Ma'lumotlar muvaffaqiyatli saqlandi! ✅");
      // window.location.reload(); ❌ KERAK EMAS
      
    } catch (error) {
      console.error("Xatolik:", error);
      alert("Xatolik yuz berdi: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-300 relative">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 tracking-tight">Sozlamalar</h2>
      
      {/* Profil Kartasi */}
      <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm mb-6 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
        <div className="relative group">
            <div className="h-28 w-28 bg-gray-50 rounded-full flex items-center justify-center text-3xl font-bold text-gray-400 border border-gray-200 overflow-hidden shadow-sm">
                {/* 🔥 "grayscale" klassi rasmni oq-qora qiladi */}
                {selectedAvatar ? (
                    <img src={selectedAvatar} alt="Profile" className="w-full h-full object-cover grayscale" />
                ) : (
                    fullName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()
                )}
            </div>
            {/* Edit Icon Button */}
            <button 
                onClick={() => setShowAvatarModal(true)}
                className="absolute bottom-0 right-0 bg-black text-white p-2 rounded-full shadow-md hover:scale-110 transition border-2 border-white"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            </button>
        </div>
        
        <div className="flex-1 pt-2">
            <h3 className="text-2xl font-bold text-gray-900 leading-tight">{fullName || "Ism kiritilmagan"}</h3>
            <p className="text-sm text-gray-500 mb-4">{user?.email}</p>
            <button 
                onClick={() => setShowAvatarModal(true)}
                className="text-xs font-semibold text-gray-700 bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200 transition"
            >
                Rasmni o'zgartirish
            </button>
        </div>
      </div>

      {/* Shakl (Forma) */}
      <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
        <h3 className="text-base font-bold text-gray-900 mb-5 pb-2 border-b border-gray-100">Shaxsiy Ma'lumotlar</h3>
        
        <div className="space-y-5">
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">To'liq Ism</label>
                <input 
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ismingizni kiriting"
                    className="w-full p-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black/5 outline-none transition text-sm font-medium"
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Telefon Raqam</label>
                <input 
                    type="text" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+998 90 123 45 67" 
                    className="w-full p-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black/5 outline-none transition text-sm font-medium"
                />
            </div>
            <div className="pt-4 flex justify-end">
                <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className={`bg-black text-white px-8 py-3.5 rounded-xl font-bold text-sm hover:bg-gray-800 transition shadow-lg shadow-gray-200 flex items-center gap-2 ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                    {isSaving ? "Saqlanmoqda..." : "O'zgarishlarni Saqlash"}
                </button>
            </div>
        </div>
      </div>

      {/* --- AVATAR SELECTION MODAL --- */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-900">Avatarni tanlang</h3>
                    <button onClick={() => setShowAvatarModal(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition">
                        <Icons.Close className="w-5 h-5 text-gray-600"/>
                    </button>
                </div>

                {/* Avatar Grid */}
                <div className="grid grid-cols-4 gap-4 mb-6 max-h-[400px] overflow-y-auto p-2 custom-scrollbar">
                    {AVATAR_LIST.map((avatar, index) => (
                        <div 
                            key={index}
                            onClick={() => setSelectedAvatar(avatar)}
                            className={`cursor-pointer rounded-full p-1 border-2 transition-all hover:scale-105 relative ${selectedAvatar === avatar ? 'border-black ring-2 ring-black/20' : 'border-transparent hover:border-gray-200'}`}
                        >
                            {/* Modal ichida ham grayscale */}
                            <img src={avatar} alt={`Avatar ${index}`} className="w-full h-full rounded-full bg-gray-50 shadow-sm grayscale hover:grayscale-0 transition-all duration-300" />
                            
                            {selectedAvatar === avatar && (
                                <div className="absolute -bottom-1 -right-1 bg-black text-white rounded-full p-0.5 border-2 border-white">
                                    <Icons.Check className="w-3 h-3"/>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-100">
                    <button onClick={() => setShowAvatarModal(false)} className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition text-sm">Bekor qilish</button>
                    <button onClick={() => setShowAvatarModal(false)} className="flex-1 py-3 rounded-xl font-bold text-white bg-black hover:bg-gray-800 transition text-sm shadow-md">Tanlash</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}