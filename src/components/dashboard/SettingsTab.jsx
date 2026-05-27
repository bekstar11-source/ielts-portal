// src/components/dashboard/SettingsTab.jsx
import React, { useState } from 'react';
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { db, storage } from "../../firebase/firebase";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { motion, AnimatePresence } from 'framer-motion';
import { User, Phone, Save, Camera, CheckCircle2, AlertCircle, Mail, Target } from 'lucide-react';

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
  const { user, userData, updateUserLocalData } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [fullName, setFullName] = useState(userData?.fullName || "");
  const [phone, setPhone] = useState(userData?.phoneNumber || "");
  const [targetBand, setTargetBand] = useState(userData?.targetBand || "7.0");
  
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(userData?.photoURL || null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setMessage('Rasm hajmi 2MB dan oshmasligi kerak! ❌');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    setMessage('');

    try {
      let photoURL = userData?.photoURL;

      if (imageFile) {
        const storageRef = ref(storage, `profile_pictures/${user.uid}`);
        await uploadBytes(storageRef, imageFile);
        photoURL = await getDownloadURL(storageRef);
      }

      const userRef = doc(db, "users", user.uid);
      
      const newData = {
        fullName: fullName,
        phoneNumber: phone,
        targetBand: parseFloat(targetBand),
        photoURL: photoURL
      };

      await updateDoc(userRef, newData);

      // Update Auth Profile
      await updateProfile(user, {
        displayName: fullName,
        photoURL: photoURL
      });

      if (updateUserLocalData) {
          updateUserLocalData(newData);
      }

      setMessage("Muvaffaqiyatli saqlandi! ✅");
      setTimeout(() => setMessage(''), 3000);
      
    } catch (error) {
      console.error("Xatolik:", error);
      setMessage("Xatolik: " + error.message + " ❌");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`max-w-2xl mx-auto py-8 px-4 animate-in fade-in zoom-in-95 duration-500`}>
      <h2 className={`text-xl font-bold mb-6 tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>Profil Sozlamalari</h2>
       {/* Profile Card */}
      <div className={`${isDark ? 'bg-[#121212] border-white/5' : 'bg-white border-[#eee]'} rounded-xl p-6 border shadow-sm mb-6 flex flex-col sm:flex-row items-center gap-6`}>
        <div className="relative group">
            <div className={`h-24 w-24 rounded-full flex items-center justify-center text-3xl font-black border-2 overflow-hidden shadow-sm transition-transform duration-500 group-hover:scale-105 ${isDark ? 'bg-zinc-800 text-white/20 border-zinc-700' : 'bg-[#f5f5f7] text-zinc-300 border-white'}`}>
                {imagePreview ? (
                    <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                    fullName?.charAt(0).toUpperCase() || <User size={32} />
                )}
            </div>
            <label htmlFor="profile-upload-tab" className={`absolute bottom-0 right-0 p-2 rounded-full shadow-lg border-2 cursor-pointer hover:scale-110 active:scale-95 transition-all ${isDark ? 'bg-white text-black border-zinc-900' : 'bg-black text-white border-white'}`}>
                <Camera size={14} />
            </label>
            <input id="profile-upload-tab" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
        </div>
        
        <div className="text-center sm:text-left space-y-1">
            <h3 className={`text-lg font-bold leading-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>{fullName || "Ism Familiya"}</h3>
            <div className="flex flex-col gap-1">
                <div className="flex items-center justify-center sm:justify-start gap-2 text-zinc-500 dark:text-zinc-400 text-[12px] font-medium">
                    <Mail size={12} />
                    {user?.email}
                </div>
                <div className="flex items-center justify-center sm:justify-start gap-2 text-zinc-500 dark:text-zinc-400 text-[12px] font-medium">
                    <Target size={12} />
                    Target Band: {targetBand}
                </div>
            </div>
        </div>
      </div>

      {/* Form Fields */}
      <div className={`${isDark ? 'bg-[#121212] border-white/5' : 'bg-white border-[#eee]'} rounded-xl p-6 border shadow-sm space-y-6`}>
        <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-zinc-500 dark:text-zinc-400 ml-1">To'liq Ism</label>
                <div className="relative group">
                    <User size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 transition-colors ${isDark ? 'group-focus-within:text-white' : 'group-focus-within:text-black'}`} />
                    <input 
                        type="text" 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Ismingizni kiriting"
                        className={`w-full py-2 pl-12 pr-4 rounded-lg outline-none border transition-all duration-300 font-bold text-[13px] ${isDark ? 'bg-zinc-900 border-white/5 focus:border-white/20 text-white' : 'bg-[#f5f5f7] border-transparent focus:border-black/10 focus:bg-white text-zinc-900'}`}
                    />
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-zinc-500 dark:text-zinc-400 ml-1">Telefon Raqam</label>
                <div className="relative group">
                    <Phone size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 transition-colors ${isDark ? 'group-focus-within:text-white' : 'group-focus-within:text-black'}`} />
                    <input 
                        type="text" 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+998 90 123 45 67" 
                        className={`w-full py-2 pl-12 pr-4 rounded-lg outline-none border transition-all duration-300 font-bold text-[13px] ${isDark ? 'bg-zinc-900 border-white/5 focus:border-white/20 text-white' : 'bg-[#f5f5f7] border-transparent focus:border-black/10 focus:bg-white text-zinc-900'}`}
                    />
                </div>
            </div>

            <div className="space-y-3">
                <label className="text-[12px] font-bold text-zinc-500 dark:text-zinc-400 ml-1">Target Band</label>
                <div className="grid grid-cols-4 gap-1.5">
                    {['6.5', '7.0', '7.5', '8.0'].map(band => (
                        <button
                            key={band}
                            type="button"
                            onClick={() => setTargetBand(band)}
                            className={`py-1.5 rounded-lg font-bold text-[12px] transition-all duration-300 border-2 ${
                                targetBand === band
                                    ? (isDark ? 'bg-white text-black border-white shadow-md shadow-white/5' : 'bg-black text-white border-black shadow-md shadow-black/10')
                                    : (isDark ? 'bg-zinc-900 text-zinc-400 border-white/5 hover:border-white/20' : 'bg-[#f8f8f9] text-[#aaa] border-transparent hover:bg-[#ececf0]')
                            }`}
                        >
                            {band}
                        </button>
                    ))}
                </div>
            </div>
        </div>

        <div className="pt-6 border-t border-zinc-100/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <AnimatePresence>
                {message && (
                    <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className={`text-sm font-bold flex items-center gap-2 ${message.includes('❌') ? 'text-red-500' : 'text-emerald-500'}`}
                    >
                        {message.includes('❌') ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                        {message}
                    </motion.div>
                )}
            </AnimatePresence>
            
            <button 
                onClick={handleSave}
                disabled={isSaving}
                className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg ${
                    isSaving 
                        ? 'bg-zinc-500 cursor-not-allowed opacity-70' 
                        : (isDark ? 'bg-white text-black hover:scale-[1.02] active:scale-95 shadow-white/5' : 'bg-black text-white hover:scale-[1.02] active:scale-95 shadow-black/20')
                }`}
            >
                {isSaving ? (
                    <>
                        <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin"></div>
                        Saqlanmoqda...
                    </>
                ) : (
                    <>
                        <Save size={18} />
                        Saqlash
                    </>
                )}
            </button>
        </div>
      </div>
    </div>
  );
}