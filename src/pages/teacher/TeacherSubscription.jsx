import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../firebase/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { ArrowLeft, Users, Zap, CheckCircle2, AlertCircle, Crown, Shield, CreditCard } from 'lucide-react';
import { hasActiveTeacherSubscription, getTeacherSubscriptionDaysLeft } from '../../utils/subscription';
import { collectStudentIds } from '../../utils/teacherResults';

export default function TeacherSubscription() {
    const { userData, user } = useAuth();
    const { theme } = useTheme();
    const navigate = useNavigate();
    const isDark = theme === 'dark';

    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [studentCount, setStudentCount] = useState(0);

    const subscription = userData?.teacherSubscription;
    const isSubscribed = hasActiveTeacherSubscription(userData);

    useEffect(() => {
        if (userData) {
            fetchStudentCount();
        }
    }, [userData]);

    const fetchStudentCount = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'groups'), where('teacherId', '==', userData.uid));
            const querySnap = await getDocs(q);
            const fetchedGroups = querySnap.docs.map(d => d.data());
            setStudentCount(collectStudentIds(fetchedGroups).length);
        } catch (error) {
            console.error("Error fetching students:", error);
        } finally {
            setLoading(false);
        }
    };

    // ⚠️ Ilgari bu funksiya to'g'ridan-to'g'ri `teacherSubscription` maydonini
    // yozardi — ya'ni 1.5 mln so'mlik tarif bir marta bosishda, hech qanday
    // to'lovsiz faollashardi. Endi o'quvchilar tarifi bilan bir xil oqim:
    // Telegram bot → chek → admin tasdiqlaydi → Admin SDK yozadi.
    const handleSubscribe = (tierId) => {
        if (!user) return;
        setActionLoading(true);
        setMessage('');
        try {
            // Bot payload'i "_" bo'yicha bo'linadi (UID_PLAN_BILLING), shuning uchun
            // tarif ID sidagi "_" ni "-" ga almashtiramiz: tier_10 → tier-10.
            const params = `${user.uid}_teacher_${tierId.replace(/_/g, '-')}`;
            window.open(`https://t.me/ielts_portal_auth_bot?start=${params}`, '_blank');
            setMessage("💬 Telegram bot ochildi. To'lov chekini yuborganingizdan so'ng admin obunani faollashtiradi.");
        } catch (error) {
            console.error("Subscription error:", error);
            setMessage('❌ Xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.');
        } finally {
            setActionLoading(false);
        }
    };

    const tiers = [
        {
            id: 'tier_10',
            name: "Kichik Guruh",
            maxStudents: 10,
            price: "500 000",
            priceNum: 500000,
            color: "from-blue-500 to-cyan-500",
            darkBorder: "border-blue-500/20",
            lightBorder: "border-blue-200"
        },
        {
            id: 'tier_20',
            name: "O'rta Guruh",
            maxStudents: 20,
            price: "1 000 000",
            priceNum: 1000000,
            color: "from-violet-500 to-indigo-500",
            darkBorder: "border-violet-500/20",
            lightBorder: "border-violet-200",
            popular: true
        },
        {
            id: 'tier_30',
            name: "Katta Guruh",
            maxStudents: 30,
            price: "1 500 000",
            priceNum: 1500000,
            color: "from-amber-500 to-orange-500",
            darkBorder: "border-amber-500/20",
            lightBorder: "border-amber-200"
        }
    ];

    const remainingDays = getTeacherSubscriptionDaysLeft(userData);

    return (
        <div className={`min-h-screen font-sans transition-colors duration-500 pb-20 ${isDark ? 'bg-[#0f0f0f] text-white' : 'bg-[#f8f9fa] text-zinc-900'}`}>
            
            {/* Header */}
            <div className={`sticky top-0 z-40 border-b backdrop-blur-md ${isDark ? 'bg-black/60 border-white/10' : 'bg-white/70 border-zinc-200'} px-6 py-4 flex items-center justify-between`}>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate('/teacher')} 
                        className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10 text-zinc-400 hover:text-white' : 'hover:bg-black/5 text-zinc-500 hover:text-black'}`}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="font-bold text-xl tracking-tight">Guruh Obunalari</h1>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-8">
                
                {/* Current Status Section */}
                <div className={`p-6 rounded-3xl mb-10 border relative overflow-hidden ${isDark ? 'bg-zinc-900 border-white/10' : 'bg-white border-zinc-200 shadow-sm'}`}>
                    {/* Background decoration */}
                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-violet-500/10 rounded-full blur-[80px]"></div>
                    
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex-1">
                            <h2 className="text-sm font-bold uppercase tracking-wider mb-2 flex items-center gap-2" style={{ color: isDark ? '#a1a1aa' : '#71717a' }}>
                                <Shield size={16} /> Joriy Obuna Holati
                            </h2>
                            
                            {loading ? (
                                <div className="h-10 w-48 bg-zinc-500/20 animate-pulse rounded-lg mt-4"></div>
                            ) : isSubscribed ? (
                                <div>
                                    <div className="flex items-end gap-3 mt-3">
                                        <h3 className="text-3xl font-black">{subscription.tier}</h3>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold mb-1 ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>Faol</span>
                                    </div>
                                    <p className="mt-2 text-sm text-zinc-500">
                                        Limit: {subscription.maxStudents} ta o'quvchi. 
                                        Guruhlaringizdagi jami o'quvchilar soni hozirda: <span className="font-bold text-current">{studentCount}</span> ta.
                                    </p>
                                </div>
                            ) : (
                                <div>
                                    <div className="flex items-center gap-3 mt-3">
                                        <h3 className="text-2xl font-black">Obuna mavjud emas</h3>
                                    </div>
                                    <p className="mt-2 text-sm text-zinc-500">
                                        Sizda faol guruh obunasi yo'q. O'quvchilaringiz platformaning PRO imkoniyatlaridan foydalanishi uchun obuna xarid qiling.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Status Widget */}
                        {!loading && isSubscribed && (
                            <div className="flex items-center gap-4 shrink-0">
                                <div className={`flex flex-col items-center justify-center p-4 rounded-2xl border ${isDark ? 'border-white/10 bg-white/5' : 'border-black/5 bg-black/5'} min-w-[120px]`}>
                                    <span className="text-xs font-bold text-zinc-500 mb-1">MUDDAT</span>
                                    <span className="text-3xl font-black">{remainingDays}</span>
                                    <span className="text-[10px] font-bold text-zinc-400 mt-1 uppercase">Kun Qoldi</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {message && (
                    <div className={`mb-8 p-4 rounded-xl flex items-center gap-3 font-medium text-sm ${message.includes('❌') ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
                        {message.includes('❌') ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
                        {message}
                    </div>
                )}

                {/* Tiers Section */}
                <div className="mb-8">
                    <h2 className="text-2xl font-black tracking-tight mb-2">Yangi Obuna Xarid Qilish</h2>
                    <p className="text-zinc-500 mb-8">
                        Guruhingiz hajmidan kelib chiqqan holda mos tarifni tanlang. 
                        Xarid qilingan obuna bilan guruhingizdagi o'quvchilarga avtomatik PRO imtiyozlari taqdim etiladi.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {tiers.map((tier) => (
                            <div 
                                key={tier.id} 
                                className={`relative flex flex-col p-6 rounded-3xl border transition-transform hover:scale-[1.02] ${isDark ? `bg-zinc-900 ${tier.darkBorder}` : `bg-white ${tier.lightBorder} shadow-lg shadow-black/5`}`}
                            >
                                {tier.popular && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                        <span className="bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-[10px] font-black uppercase tracking-wider px-4 py-1.5 rounded-full shadow-lg">
                                            Eng Mashhur
                                        </span>
                                    </div>
                                )}

                                <div className="mb-6 mt-2 text-center">
                                    <h3 className="text-lg font-bold text-zinc-500">{tier.name}</h3>
                                    <div className="mt-4 flex items-baseline justify-center gap-1">
                                        <span className="text-4xl font-black tracking-tight">{tier.price}</span>
                                        <span className="text-sm font-bold text-zinc-500">so'm</span>
                                    </div>
                                    <p className="text-xs text-zinc-500 mt-2 font-medium">1 oy uchun</p>
                                </div>

                                <div className="flex-1 flex flex-col justify-between">
                                    <ul className="space-y-4 mb-8 text-sm">
                                        <li className="flex items-center gap-3">
                                            <div className={`p-1 rounded-full ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
                                                <Users size={14} />
                                            </div>
                                            <span className="font-bold">{tier.maxStudents} tagacha o'quvchi</span>
                                        </li>
                                        <li className="flex items-center gap-3">
                                            <div className={`p-1 rounded-full ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
                                                <Crown size={14} />
                                            </div>
                                            <span>Barcha o'quvchilarga <b className="text-emerald-500">PRO</b> status</span>
                                        </li>
                                        <li className="flex items-center gap-3">
                                            <div className={`p-1 rounded-full ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
                                                <Zap size={14} />
                                            </div>
                                            <span>O'qituvchi paneli orqali cheksiz nazorat</span>
                                        </li>
                                    </ul>

                                    <button 
                                        disabled={actionLoading}
                                        onClick={() => handleSubscribe(tier.id)}
                                        className={`w-full py-4 rounded-2xl font-bold text-white shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 
                                        bg-gradient-to-r ${tier.color} hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        <CreditCard size={18} />
                                        To'lov qilish
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={`p-6 rounded-2xl border ${isDark ? 'bg-blue-500/5 border-blue-500/10' : 'bg-blue-50 border-blue-100'}`}>
                    <h4 className="font-bold flex items-center gap-2 mb-2 text-blue-600 dark:text-blue-400">
                        <AlertCircle size={18} /> Ma'lumot
                    </h4>
                    <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'} leading-relaxed`}>
                        Siz tanlagan tarif faqatgina 1 oy davomida amal qiladi. Limitdan ortiq o'quvchini guruhingizga qo'shib bo'lmaydi. 
                        To'lov amalga oshirilgandan so'ng, pullar qaytarilmaydi. Texnik yordam uchun admin bilan bog'laning.
                    </p>
                </div>

            </div>
        </div>
    );
}
