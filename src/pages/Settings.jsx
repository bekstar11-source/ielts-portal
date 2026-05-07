import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../firebase/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth'; // Import updateProfile
import { FaUser, FaBullseye, FaCalendarAlt, FaSave, FaArrowLeft, FaCamera, FaPhone } from 'react-icons/fa';
import { 
    User, 
    Target, 
    Calendar, 
    Save, 
    ArrowLeft, 
    Camera, 
    Phone, 
    CheckCircle2, 
    AlertCircle, 
    LogOut,
    ChevronRight,
    Smartphone,
    Mail
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

import PlanetBackground from '../components/dashboard/PlanetBackground'; // Import PlanetBackground

export default function Settings() {
    const { user, userData, logout } = useAuth();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        fullName: '',
        targetBand: '7.0',
        examDate: '',
        phoneNumber: '',
        photoURL: ''
    });
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [activeSection, setActiveSection] = useState('profile');

    useEffect(() => {
        if (userData) {
            setFormData({
                fullName: userData.fullName || '',
                targetBand: userData.targetBand || '7.0',
                examDate: userData.examDate || '',
                phoneNumber: userData.phoneNumber || '',
                photoURL: userData.photoURL || ''
            });
            setImagePreview(userData.photoURL || null);
        }
    }, [userData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Check file size (2MB limit)
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            let photoURL = formData.photoURL;

            // 1. Upload Image if Logic exists (agar yangi rasm tanlangan bo'lsa)
            if (imageFile) {
                const storageRef = ref(storage, `profile_pictures/${user.uid}`);
                await uploadBytes(storageRef, imageFile);
                photoURL = await getDownloadURL(storageRef);
            }

            // 2. Update Firestore
            await updateDoc(doc(db, 'users', user.uid), {
                fullName: formData.fullName,
                targetBand: parseFloat(formData.targetBand),
                examDate: formData.examDate,
                phoneNumber: formData.phoneNumber,
                photoURL: photoURL
            });

            // 3. Update Auth Profile (Muhim: Headerda darhol o'zgarishi uchun)
            await updateProfile(user, {
                displayName: formData.fullName,
                photoURL: photoURL
            });

            setMessage('Ma\'lumotlar muvaffaqiyatli saqlandi! ✅');
        } catch (error) {
            console.error("Settings save error:", error);
            setMessage('Xatolik yuz berdi. ❌');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`min-h-screen transition-colors duration-500 ${isDark ? 'bg-black text-white' : 'bg-[#F5F5F7] text-zinc-900'} font-sans selection:bg-blue-500/20`}>
            {/* Show Header only for Students */}
            {userData?.role !== 'admin' && (
                <DashboardHeader
                    user={user}
                    userData={userData}
                    activeTab="settings"
                    setActiveTab={() => { }}
                    onKeyClick={() => navigate('/dashboard')}
                    onLogoutClick={logout}
                />
            )}

            <div className={`max-w-4xl mx-auto px-4 md:px-6 py-10 md:py-16 relative z-10`}>
                {userData?.role !== 'admin' && (
                    <motion.button 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => navigate('/dashboard')} 
                        className={`flex items-center gap-2 mb-8 transition-all group ${isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-black'}`}
                    >
                        <div className={`p-2 rounded-full transition-colors ${isDark ? 'group-hover:bg-white/10' : 'group-hover:bg-black/5'}`}>
                            <ArrowLeft size={18} />
                        </div>
                        <span className="font-medium text-sm">Dashboardga qaytish</span>
                    </motion.button>
                )}

                <div className="flex flex-col md:flex-row gap-10 items-start">
                    {/* Left Sidebar Navigation */}
                    <div className="w-full md:w-64 shrink-0 space-y-1">
                        <h1 className="text-xl font-bold tracking-tight mb-4 px-2">
                            Sozlamalar
                        </h1>
                        
                        {[
                            { id: 'profile', label: 'Profil ma\'lumotlari', icon: User },
                            { id: 'exam', label: 'Imtihon tayyorgarligi', icon: Target },
                            { id: 'account', label: 'Hisob', icon: Smartphone }
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveSection(item.id)}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-300 text-[13px] font-bold ${
                                    activeSection === item.id 
                                        ? (isDark ? 'bg-white text-black shadow-lg shadow-white/5' : 'bg-black text-white shadow-lg shadow-black/10') 
                                        : (isDark ? 'text-zinc-400 hover:bg-white/5 hover:text-white' : 'text-zinc-500 hover:bg-black/5 hover:text-black')
                                }`}
                            >
                                <item.icon size={16} />
                                {item.label}
                                {activeSection === item.id && <motion.div layoutId="active-pill" className="ml-auto"><ChevronRight size={14} /></motion.div>}
                            </button>
                        ))}
                        
                        <div className="pt-4 mt-4 border-t border-zinc-200/10 md:block hidden">
                            <button
                                onClick={logout}
                                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-[13px] font-bold text-red-500 hover:bg-red-500/10 transition-all"
                            >
                                <LogOut size={16} />
                                Chiqish
                            </button>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 w-full">
                        <motion.div 
                            key={activeSection}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                            className={`${isDark ? 'bg-[#121212] border-white/5' : 'bg-white border-[#eee]'} rounded-xl p-6 md:p-8 border shadow-sm relative overflow-hidden max-w-2xl`}
                        >
                            <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
                                {activeSection === 'profile' && (
                                    <div className="space-y-8">
                                        {/* Avatar Section */}
                                        <div className="flex flex-col items-center">
                                            <div className="relative group">
                                                <div className={`w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 ${isDark ? 'border-zinc-800' : 'border-zinc-100'} shadow-2xl transition-transform duration-500 group-hover:scale-[1.02]`}>
                                                    {imagePreview ? (
                                                        <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className={`w-full h-full flex items-center justify-center text-5xl font-black ${isDark ? 'bg-zinc-800 text-white/20' : 'bg-zinc-200 text-zinc-400'}`}>
                                                            {formData.fullName ? formData.fullName.charAt(0).toUpperCase() : <User size={48} />}
                                                        </div>
                                                    )}
                                                    {loading && (
                                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm">
                                                            <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                        </div>
                                                    )}
                                                </div>
                                                <label htmlFor="profile-upload" className={`absolute bottom-1 right-1 p-3 shadow-xl cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95 rounded-full ${isDark ? 'bg-white text-black' : 'bg-black text-white'}`}>
                                                    <Camera size={20} />
                                                </label>
                                                <input id="profile-upload" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                                            </div>
                                            <div className="mt-4 text-center">
                                                <h3 className="text-base font-bold">{formData.fullName || 'Foydalanuvchi'}</h3>
                                                <p className="text-zinc-500 text-sm mt-1">Profil rasmingizni yangilash uchun kamerani bosing</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-zinc-500 ml-1">Ism Familiya</label>
                                                <div className="relative group">
                                                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-500 transition-colors" />
                                                    <input
                                                        type="text"
                                                        name="fullName"
                                                        value={formData.fullName}
                                                        onChange={handleChange}
                                                        className={`w-full py-2.5 pl-12 pr-4 rounded-lg outline-none border transition-all duration-300 font-bold text-[13px] ${isDark ? 'bg-zinc-900 border-white/5 focus:border-white/20' : 'bg-[#f5f5f7] border-transparent focus:border-black/10 focus:bg-white'}`}
                                                        placeholder="Ismingizni kiriting"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-zinc-500 ml-1">Telefon Raqam</label>
                                                <div className="relative group">
                                                    <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-500 transition-colors" />
                                                    <input
                                                        type="tel"
                                                        name="phoneNumber"
                                                        value={formData.phoneNumber}
                                                        onChange={handleChange}
                                                        className={`w-full py-2.5 pl-12 pr-4 rounded-lg outline-none border transition-all duration-300 font-bold text-[13px] ${isDark ? 'bg-zinc-900 border-white/5 focus:border-white/20' : 'bg-[#f5f5f7] border-transparent focus:border-black/10 focus:bg-white'}`}
                                                        placeholder="+998 90 123 45 67"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeSection === 'exam' && (
                                    <div className="space-y-8">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-4">
                                                <label className="text-xs font-bold text-zinc-500 ml-1">Target Band</label>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {['6.0', '6.5', '7.0', '7.5', '8.0', '9.0'].map(band => (
                                                        <button
                                                            key={band}
                                                            type="button"
                                                            onClick={() => setFormData(prev => ({ ...prev, targetBand: band }))}
                                                            className={`py-2 rounded-lg font-bold text-[12px] transition-all duration-300 border-2 ${
                                                                formData.targetBand === band
                                                                    ? (isDark ? 'bg-white text-black border-white shadow-md shadow-white/5' : 'bg-black text-white border-black shadow-md shadow-black/10')
                                                                    : (isDark ? 'bg-zinc-900 text-zinc-400 border-white/5 hover:border-white/20' : 'bg-[#f8f8f9] text-[#aaa] border-transparent hover:bg-[#ececf0]')
                                                            }`}
                                                        >
                                                            {band}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <label className="text-xs font-bold text-zinc-500 ml-1">Imtihon Sanasi</label>
                                                <div className="relative group">
                                                    <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
                                                    <input
                                                        type="date"
                                                        name="examDate"
                                                        value={formData.examDate}
                                                        onChange={handleChange}
                                                        className={`w-full py-4 pl-12 pr-4 rounded-2xl outline-none border-2 transition-all duration-300 font-semibold [color-scheme:dark] ${isDark ? 'bg-zinc-900 border-white/5 focus:border-blue-500/50' : 'bg-zinc-50 border-zinc-100 focus:border-blue-500'}`}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeSection === 'account' && (
                                    <div className="space-y-3">
                                        <div className={`py-3 px-4 rounded-xl ${isDark ? 'bg-zinc-900/50' : 'bg-[#f8f8f9]'} border ${isDark ? 'border-white/5' : 'border-[#eee]'}`}>
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-500/10 text-blue-500' : 'bg-blue-50 text-blue-600'}`}>
                                                    <Mail size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-bold text-zinc-500">Email Manzil</p>
                                                    <p className="font-bold text-[14px] leading-tight">{user?.email}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={`py-3 px-4 rounded-xl ${isDark ? 'bg-zinc-900/50' : 'bg-[#f8f8f9]'} border ${isDark ? 'border-white/5' : 'border-[#eee]'}`}>
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-lg ${isDark ? 'bg-orange-500/10 text-orange-500' : 'bg-orange-50 text-orange-600'}`}>
                                                    <Target size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-bold text-zinc-500">Account Holati</p>
                                                    <p className="font-bold text-[14px] leading-tight flex items-center gap-2">
                                                        {userData?.isPremium ? 'Premium Plan' : 'Free Plan'}
                                                        {userData?.isPremium && <CheckCircle2 size={14} className="text-green-500" />}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Bottom Action Bar */}
                                <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-zinc-200/10">
                                    <AnimatePresence>
                                        {message && (
                                            <motion.div 
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                className={`flex items-center gap-2 text-sm font-bold ${message.includes('❌') ? 'text-red-500' : 'text-emerald-500'}`}
                                            >
                                                {message.includes('❌') ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
                                                {message}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className={`w-full md:w-auto px-6 py-2.5 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg ${
                                            loading 
                                                ? 'bg-zinc-500 cursor-not-allowed opacity-70' 
                                                : (isDark ? 'bg-white text-black hover:scale-[1.02] active:scale-95 shadow-white/5' : 'bg-black text-white hover:scale-[1.02] active:scale-95 shadow-black/20')
                                        }`}
                                    >
                                        {loading ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin"></div>
                                                Saqlanmoqda...
                                            </>
                                        ) : (
                                            <>
                                                <Save size={20} />
                                                Saqlash
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                input[type="date"]::-webkit-calendar-picker-indicator {
                    filter: ${isDark ? 'invert(1)' : 'none'};
                    cursor: pointer;
                }
            ` }} />
        </div>
    );
}
