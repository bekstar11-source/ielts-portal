import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db, storage } from '../../firebase/firebase';
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
    Mail,
    Zap,
    Sparkles,
    Check,
    Lock,
    Shield
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import { useTheme } from '../../context/ThemeContext';
import BottomNav from '../../components/dashboard/BottomNav';
import SiteFooter from '../../components/common/SiteFooter';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../../context/LanguageContext';

import PlanetBackground from '../../components/dashboard/PlanetBackground'; // Import PlanetBackground

export default function Settings() {
    const { user, userData, logout } = useAuth();
    const { t } = useTranslation();
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

    const getRemainingDays = () => {
        if (!userData?.subscriptionEnd) return 0;
        const end = userData.subscriptionEnd.seconds 
            ? new Date(userData.subscriptionEnd.seconds * 1000) 
            : new Date(userData.subscriptionEnd);
        const diffTime = end - new Date();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    };

    const isPremium = userData?.isPremium || userData?.accountType === 'premium' || userData?.accountType === 'pro' || userData?.accountType === 'standard';
    const activeTier = userData?.accountType || (userData?.isPremium ? 'premium' : 'free');

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
                setMessage(t('settings.imageSizeError'));
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

            setMessage(t('settings.saveSuccess'));
        } catch (error) {
            console.error("Settings save error:", error);
            setMessage(t('settings.saveError'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`min-h-screen transition-colors duration-500 ${isDark ? 'bg-warm-dark text-warm-on-dark' : 'bg-warm-canvas text-warm-ink'} font-sans selection:bg-warm-primary/20`}>
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

            <div className={`max-w-4xl mx-auto px-4 md:px-6 py-xl md:py-xxl relative z-10`}>
                {userData?.role !== 'admin' && (
                    <motion.button 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => navigate('/dashboard')} 
                        className={`flex items-center gap-xs mb-xl transition-all group ${isDark ? 'text-warm-on-dark-soft hover:text-warm-on-dark' : 'text-warm-muted hover:text-warm-ink'}`}
                    >
                        <div className={`p-2 rounded-full transition-colors ${isDark ? 'group-hover:bg-white/10' : 'group-hover:bg-black/5'}`}>
                            <ArrowLeft size={18} />
                        </div>
                        <span className="font-medium text-sm">{t('roadmap.backToDashboard')}</span>
                    </motion.button>
                )}

                <div className="flex flex-col md:flex-row gap-10 items-start">
                    {/* Left Sidebar Navigation */}
                    <div className="w-full md:w-64 shrink-0 space-y-1">
                        <h1 className="text-xl font-bold tracking-tight mb-md px-2">
                            {t('settings.title')}
                        </h1>
                        
                        {[
                            { id: 'profile', label: t('settings.profileInfo'), icon: User },
                            { id: 'exam', label: t('settings.examPrep'), icon: Target },
                            { id: 'subscription', label: t('settings.subscription'), icon: Zap },
                            { id: 'account', label: t('settings.account'), icon: Smartphone }
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveSection(item.id)}
                                className={`w-full flex items-center gap-sm px-md py-2.5 rounded-md transition-all duration-300 text-[13px] font-bold ${
                                    activeSection === item.id
                                        ? (isDark ? 'bg-warm-primary text-white shadow-sm' : 'bg-warm-primary text-white shadow-sm')
                                        : (isDark ? 'text-warm-on-dark-soft hover:bg-white/5 hover:text-warm-on-dark' : 'text-warm-muted hover:bg-warm-primary/5 hover:text-warm-ink')
                                }`}
                            >
                                <item.icon size={16} />
                                {item.label}
                                {activeSection === item.id && <motion.div layoutId="active-pill" className="ml-auto"><ChevronRight size={14} /></motion.div>}
                            </button>
                        ))}
                        
                        <div className="pt-md mt-md border-t border-warm-hairline dark:border-white/10 md:block hidden">
                            <button
                                onClick={logout}
                                className="w-full flex items-center gap-sm px-md py-2.5 rounded-md text-[13px] font-bold text-warm-error hover:bg-warm-error/10 transition-all"
                            >
                                <LogOut size={16} />
                                {t('dashboard.logout')}
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
                            className={`${isDark ? 'bg-warm-dark-elevated border-white/5' : 'bg-white border-warm-hairline'} rounded-lg p-lg md:p-xl border shadow-sm relative overflow-hidden max-w-2xl`}
                        >
                            <form onSubmit={handleSubmit} className="space-y-xl relative z-10">
                                {activeSection === 'profile' && (
                                    <div className="space-y-xl">
                                        {/* Avatar Section */}
                                        <div className="flex flex-col items-center">
                                            <div className="relative group">
                                                <div className={`w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 ${isDark ? 'border-white/10' : 'border-warm-hairline'} shadow-2xl transition-transform duration-500 group-hover:scale-[1.02]`}>
                                                    {imagePreview ? (
                                                        <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className={`w-full h-full flex items-center justify-center text-5xl font-black ${isDark ? 'bg-warm-dark-soft text-white/20' : 'bg-warm-card text-warm-muted'}`}>
                                                            {formData.fullName ? formData.fullName.charAt(0).toUpperCase() : <User size={48} />}
                                                        </div>
                                                    )}
                                                    {loading && (
                                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm">
                                                            <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                        </div>
                                                    )}
                                                </div>
                                                <label htmlFor="profile-upload" className={`absolute bottom-1 right-1 p-3 shadow-xl cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95 rounded-full ${isDark ? 'bg-warm-primary text-white' : 'bg-warm-primary text-white'}`}>
                                                    <Camera size={20} />
                                                </label>
                                                <input id="profile-upload" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                                            </div>
                                            <div className="mt-md text-center">
                                                <h3 className="text-base font-bold">{formData.fullName || t('settings.defaultUser')}</h3>
                                                <p className="text-warm-muted text-sm mt-1">{t('settings.updatePhotoPrompt')}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
                                            <div className="space-y-xs">
                                                <label className="text-xs font-bold text-warm-muted ml-1">{t('settings.fullName')}</label>
                                                <div className="relative group">
                                                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-muted-soft group-focus-within:text-warm-primary transition-colors" />
                                                    <input
                                                        type="text"
                                                        name="fullName"
                                                        value={formData.fullName}
                                                        onChange={handleChange}
                                                        className={`w-full py-2.5 pl-12 pr-4 rounded-md outline-none border transition-all duration-300 font-bold text-[13px] ${isDark ? 'bg-warm-dark-soft border-white/5 focus:border-white/20' : 'bg-warm-card border-transparent focus:border-warm-hairline focus:bg-white'}`}
                                                        placeholder={t('settings.enterNamePlaceholder')}
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-xs">
                                                <label className="text-xs font-bold text-warm-muted ml-1">{t('settings.phoneNumber')}</label>
                                                <div className="relative group">
                                                    <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-muted-soft group-focus-within:text-warm-primary transition-colors" />
                                                    <input
                                                        type="tel"
                                                        name="phoneNumber"
                                                        value={formData.phoneNumber}
                                                        onChange={handleChange}
                                                        className={`w-full py-2.5 pl-12 pr-4 rounded-md outline-none border transition-all duration-300 font-bold text-[13px] ${isDark ? 'bg-warm-dark-soft border-white/5 focus:border-white/20' : 'bg-warm-card border-transparent focus:border-warm-hairline focus:bg-white'}`}
                                                        placeholder="+998 90 123 45 67"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeSection === 'exam' && (
                                    <div className="space-y-xl">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">
                                            <div className="space-y-md">
                                                <label className="text-xs font-bold text-warm-muted ml-1">{t('settings.targetBand')}</label>
                                                <div className="grid grid-cols-3 gap-xs">
                                                    {['6.0', '6.5', '7.0', '7.5', '8.0', '9.0'].map(band => (
                                                        <button
                                                            key={band}
                                                            type="button"
                                                            onClick={() => setFormData(prev => ({ ...prev, targetBand: band }))}
                                                            className={`py-2 rounded-md font-bold text-[12px] transition-all duration-300 border-2 ${
                                                                formData.targetBand === band
                                                                    ? (isDark ? 'bg-warm-primary text-white border-warm-primary shadow-sm' : 'bg-warm-primary text-white border-warm-primary shadow-sm')
                                                                    : (isDark ? 'bg-warm-dark-soft text-warm-on-dark-soft border-white/5 hover:border-white/20' : 'bg-warm-card text-warm-muted border-transparent hover:bg-warm-card-strong')
                                                            }`}
                                                        >
                                                            {band}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-md">
                                                <label className="text-xs font-bold text-warm-muted ml-1">{t('settings.examDate')}</label>
                                                <div className="relative group">
                                                    <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-muted-soft group-focus-within:text-warm-primary transition-colors pointer-events-none" />
                                                    <input
                                                        type="date"
                                                        name="examDate"
                                                        value={formData.examDate}
                                                        onChange={handleChange}
                                                        className={`w-full py-4 pl-12 pr-4 rounded-md outline-none border-2 transition-all duration-300 font-semibold [color-scheme:dark] ${isDark ? 'bg-warm-dark-soft border-white/5 focus:border-warm-primary/50' : 'bg-warm-card border-warm-hairline focus:border-warm-primary'}`}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeSection === 'subscription' && (
                                    <div className="space-y-lg">
                                        <div className={`relative overflow-hidden rounded-lg border ${isDark ? 'border-white/10 bg-warm-dark-soft' : 'border-warm-hairline bg-warm-card/50'} p-lg shadow-xl`}>
                                            {/* Glow effect */}
                                            <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-warm-primary/10 blur-[80px]" />
                                            <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-warm-accent-amber/10 blur-[80px]" />

                                            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-lg">
                                                <div>
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                                                        isPremium
                                                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black'
                                                            : 'bg-warm-card-strong dark:bg-white/10 text-warm-muted dark:text-warm-on-dark-soft'
                                                    }`}>
                                                        <Zap size={12} fill="currentColor" />
                                                        {isPremium ? t('settings.premiumPlan') : t('settings.freePlan')}
                                                    </span>

                                                    <h3 className="text-2xl font-black tracking-tight mt-sm">
                                                        {isPremium
                                                            ? `${(activeTier === 'pro' || userData?.isPro) ? 'PRO' : 'STANDARD'} PLAN`
                                                            : 'FREE PLAN'
                                                        }
                                                    </h3>
                                                    <p className="text-warm-muted dark:text-warm-on-dark-soft text-xs mt-1.5 leading-relaxed">
                                                        {isPremium
                                                            ? (userData?.groupId && userData?.groupId !== 'none'
                                                                ? "Siz o'quv guruhi a'zosisiz. Obunangiz o'qituvchingiz tomonidan faollashtirilgan."
                                                                : "Barcha premium va mock imtihonlardan cheksiz foydalanish huquqiga egasiz.")
                                                            : "IELTS tayyorgarligi uchun cheklangan bepul rejimdagi hisob."
                                                        }
                                                    </p>
                                                </div>

                                                <div className="flex flex-col items-center justify-center bg-black/[0.03] dark:bg-white/5 border border-warm-hairline dark:border-white/5 backdrop-blur-md rounded-lg p-md min-w-[120px] text-center">
                                                    <span className="text-[10px] font-bold text-warm-muted uppercase tracking-wider">{t('settings.daysRemaining')}</span>
                                                    <span className="text-3xl font-black text-warm-primary mt-1">
                                                        {userData?.groupId && userData?.groupId !== 'none'
                                                            ? '∞'
                                                            : (isPremium ? getRemainingDays() : '0')
                                                        }
                                                    </span>
                                                    <span className="text-xs font-bold text-warm-muted mt-0.5">
                                                        {userData?.groupId && userData?.groupId !== 'none'
                                                            ? t('settings.unlimitedAccess')
                                                            : `${t('settings.days')}`
                                                        }
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Upgrade Motivation Card */}
                                        {!isPremium && (
                                            <div className="space-y-lg">
                                                {/* Visual indicator of limited usage */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                                                    <div className={`p-md rounded-lg border ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-warm-hairline bg-warm-card/50'} flex items-start gap-sm`}>
                                                        <div className="p-2 rounded-md bg-red-500/10 text-red-400 shrink-0">
                                                            <Lock size={16} />
                                                        </div>
                                                        <div>
                                                            <h4 className={`text-xs font-bold ${isDark ? 'text-warm-on-dark' : 'text-warm-body-strong'}`}>Cheklangan Mock Imtihonlar</h4>
                                                            <p className="text-[11px] text-warm-muted mt-1">Haqiqiy imtihon muhitidagi to'liq testlar bepul tarifda yopiq.</p>
                                                        </div>
                                                    </div>
                                                    <div className={`p-md rounded-lg border ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-warm-hairline bg-warm-card/50'} flex items-start gap-sm`}>
                                                        <div className="p-2 rounded-md bg-amber-500/10 text-amber-400 shrink-0">
                                                            <Sparkles size={16} />
                                                        </div>
                                                        <div>
                                                            <h4 className={`text-xs font-bold ${isDark ? 'text-warm-on-dark' : 'text-warm-body-strong'}`}>Sun'iy Intellekt Tahlili</h4>
                                                            <p className="text-[11px] text-warm-muted mt-1">Writing va Speaking insholaringizni AI orqali baholash cheklangan.</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Premium details / comparison table */}
                                                <div className={`p-5 rounded-lg border ${isDark ? 'border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-indigo-500/5' : 'border-violet-200 bg-gradient-to-r from-violet-50 to-indigo-50'} relative overflow-hidden`}>
                                                    <div className="absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 opacity-10">
                                                        <Sparkles size={150} className="text-violet-400" />
                                                    </div>
                                                    <h4 className="text-sm font-bold text-violet-600 dark:text-violet-300 flex items-center gap-1.5">
                                                        <Sparkles size={16} />
                                                        Nega premiumga o'tishingiz kerak?
                                                    </h4>
                                                    <p className={`text-xs ${isDark ? 'text-warm-on-dark-soft' : 'text-warm-body'} mt-xs leading-relaxed`}>
                                                        Englev Premium orqali IELTS ballingizni tezroq va samaraliroq oshiring. Har bir testdan so'ng xatolaringiz ustida ishlang, batafsil tushuntirishlarni o'qing va sun'iy intellektdan tavsiyalar oling.
                                                    </p>

                                                    <div className={`mt-md pt-sm border-t ${isDark ? 'border-white/5' : 'border-warm-hairline'} space-y-xs`}>
                                                        {[
                                                            "50+ dan ortiq to'liq Listening & Reading amaliyot testlari",
                                                            "Writing insholaringizni soniyalar ichida grammatik, leksik va umumiy ball bo'yicha tahlil qilish",
                                                            "Speaking simulator: AI imtihon oluvchi bilan og'zaki nutq mashg'uloti",
                                                            "Siz yo'l qo'ygan xatolarning batafsil tushuntirishlari (explanations)"
                                                        ].map((benefit, i) => (
                                                            <div key={i} className="flex items-start gap-xs text-[11px] text-warm-muted dark:text-warm-on-dark-soft">
                                                                <Check size={12} className="text-emerald-500 mt-0.5 shrink-0" />
                                                                <span>{benefit}</span>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* CTA button */}
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate('/pricing')}
                                                        className="w-full mt-5 py-3 rounded-md font-bold text-xs bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-xs shadow-lg shadow-indigo-600/20"
                                                    >
                                                        <Zap size={14} fill="currentColor" />
                                                        Premiumga O'tish & Tariflarni Ko'rish
                                                    </button>

                                                    <div className="text-center mt-sm text-[10px] text-warm-muted-soft dark:text-warm-on-dark-soft">
                                                        IELTS 7.5+ band natijaga erishgan o'quvchilarimizning 92% premium tariflardan foydalangan!
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Standard user upgrading to Pro motivation */}
                                        {isPremium && activeTier === 'standard' && (
                                            <div className={`p-5 rounded-lg border ${isDark ? 'border-amber-500/20 bg-gradient-to-r from-amber-500/10 to-orange-500/5' : 'border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50'} relative overflow-hidden`}>
                                                <h4 className="text-sm font-bold text-amber-600 dark:text-amber-300 flex items-center gap-1.5">
                                                    <Zap size={16} fill="currentColor" />
                                                    PRO tarifiga yangilang!
                                                </h4>
                                                <p className={`text-xs ${isDark ? 'text-warm-on-dark-soft' : 'text-warm-body'} mt-xs leading-relaxed`}>
                                                    Sizda joriy "Standard" obunasi mavjud. "PRO" rejimiga o'tish orqali siz to'liq shaxsiy Roadmap, ko'proq Mock testlar va ilg'or AI tahlillariga ega bo'lasiz.
                                                </p>

                                                <button
                                                    type="button"
                                                    onClick={() => navigate('/pricing')}
                                                    className="w-full mt-md py-3 rounded-md font-bold text-xs bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black dark:text-white transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-xs shadow-lg"
                                                >
                                                    <Sparkles size={14} fill="currentColor" />
                                                    PRO Tarifga Yangilash
                                                </button>
                                            </div>
                                        )}

                                        {/* Pro active */}
                                        {isPremium && (activeTier === 'pro' || userData?.isPro) && (
                                            <div className={`p-5 rounded-lg border ${isDark ? 'border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 to-teal-500/5' : 'border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50'} text-center`}>
                                                <Sparkles className="mx-auto text-emerald-500 dark:text-emerald-400 mb-xs" size={24} />
                                                <h4 className="text-sm font-bold text-emerald-600 dark:text-emerald-300">Sizda PRO tarif faol!</h4>
                                                <p className={`text-xs ${isDark ? 'text-warm-on-dark-soft' : 'text-warm-muted'} mt-1`}>
                                                    IELTS imtihonidan eng yuqori ballni egallashingiz uchun platformamizning barcha premium imkoniyatlari ochiq. Har kuni mashq qiling va muvaffaqiyatga erishing!
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeSection === 'account' && (
                                    <div className="space-y-sm">
                                        <div className={`py-3 px-4 rounded-lg ${isDark ? 'bg-warm-dark-soft' : 'bg-warm-card'} border ${isDark ? 'border-white/10' : 'border-warm-hairline'}`}>
                                            <div className="flex items-center gap-md">
                                                <div className={`p-2 rounded-md ${isDark ? 'bg-warm-primary/10 text-warm-primary' : 'bg-warm-primary/10 text-warm-primary'}`}>
                                                    <Mail size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-bold text-warm-muted">{t('settings.emailAddress')}</p>
                                                    <p className="font-bold text-[14px] leading-tight">{user?.email}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={`py-3 px-4 rounded-lg ${isDark ? 'bg-warm-dark-soft' : 'bg-warm-card'} border ${isDark ? 'border-white/10' : 'border-warm-hairline'}`}>
                                            <div className="flex items-center gap-md">
                                                <div className={`p-2 rounded-md ${isDark ? 'bg-orange-500/10 text-orange-500' : 'bg-orange-50 text-orange-600'}`}>
                                                    <Target size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-bold text-warm-muted">{t('settings.accountStatus')}</p>
                                                    <p className="font-bold text-[14px] leading-tight flex items-center gap-xs">
                                                        {userData?.isPremium ? t('settings.premiumPlan') : t('settings.freePlan')}
                                                        {userData?.isPremium && <CheckCircle2 size={14} className="text-warm-success" />}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Bottom Action Bar */}
                                <div className="pt-xl flex flex-col md:flex-row items-center justify-between gap-lg border-t border-warm-hairline dark:border-white/10">
                                    <AnimatePresence>
                                        {message && (
                                            <motion.div
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                className={`flex items-center gap-xs text-sm font-bold ${message.includes('❌') ? 'text-warm-error' : 'text-warm-success'}`}
                                            >
                                                {message.includes('❌') ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
                                                {message}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className={`w-full md:w-auto px-lg py-2.5 rounded-md font-bold transition-all duration-300 flex items-center justify-center gap-xs shadow-lg ${
                                            loading
                                                ? 'bg-warm-muted cursor-not-allowed opacity-70'
                                                : (isDark ? 'bg-warm-primary text-white hover:scale-[1.02] active:scale-95' : 'bg-warm-primary text-white hover:scale-[1.02] active:scale-95')
                                        }`}
                                    >
                                        {loading ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin"></div>
                                                {t('settings.saving')}
                                            </>
                                        ) : (
                                            <>
                                                <Save size={20} />
                                                {t('common.save')}
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
            {userData?.role !== 'admin' && <BottomNav activeTab="settings" />}
            <SiteFooter />
        </div>
    );
}
