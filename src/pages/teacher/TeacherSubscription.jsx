import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { Users, Lightning, CheckCircle, WarningCircle, Crown, ShieldCheck, CreditCard } from '@phosphor-icons/react';
import { hasActiveTeacherSubscription, getTeacherSubscriptionDaysLeft, formatSom } from '../../utils/subscription';
import { TEACHER_TIERS, TEACHER_BILLING_DAYS, teacherPricePerStudent, teacherSavingsPercent } from '../../utils/pricing';
import { collectStudentIds } from '../../utils/teacherResults';
import { useTeacherWorkspace } from '../../hooks/useTeacherWorkspace';

export default function TeacherSubscription() {
    const { userData, user } = useAuth();
    const { theme } = useTheme();
    const { t, lang } = useTranslation();
    const isDark = theme === 'dark';

    const [actionLoading, setActionLoading] = useState(false);
    const [message, setMessage] = useState('');

    // O'quvchilar soni panelning umumiy keshidan keladi — bu sahifa ilgari
    // `groups` ni O'ZI qaytadan o'qirdi, ya'ni har ochilganda ortiqcha so'rov.
    const { groups, loading } = useTeacherWorkspace({ uid: userData?.uid });
    const studentCount = collectStudentIds(groups).length;

    const subscription = userData?.teacherSubscription;
    const isSubscribed = hasActiveTeacherSubscription(userData);

    const s = 'teacher.subscription';

    const handleSubscribe = (tierId) => {
        if (!user) return;
        setActionLoading(true);
        setMessage('');
        try {
            const params = `${user.uid}_teacher_${tierId.replace(/_/g, '-')}`;
            window.open(`https://t.me/ielts_portal_auth_bot?start=${params}`, '_blank');
            setMessage(t(`${s}.telegramBotOpened`) || (lang === 'uz'
                ? "💬 Telegram bot ochildi. To'lov chekini yuborganingizdan so'ng admin obunani faollashtiradi."
                : "💬 Telegram bot opened. After sending your payment receipt, the admin will activate your subscription."));
        } catch (error) {
            console.error('Subscription error:', error);
            setMessage(t(`${s}.errorMessage`) || (lang === 'uz'
                ? "❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring."
                : "❌ An error occurred. Please try again."));
        } finally {
            setActionLoading(false);
        }
    };

    // Tariflar `src/utils/pricing.js` dan — u `functions/pricing.js` bilan
    // sinxron yagona manba. Ilgari narx va limit shu faylda qo'lda yozilgan
    // edi va Telegram botdagi jadval bilan mustaqil ravishda o'zgarardi.
    const TIER_STYLES = {
        tier_10: { color: 'from-blue-500 to-cyan-500', darkBorder: 'border-blue-500/20', lightBorder: 'border-blue-200' },
        tier_20: { color: 'from-violet-500 to-indigo-500', darkBorder: 'border-violet-500/20', lightBorder: 'border-violet-200', popular: true },
        tier_30: { color: 'from-amber-500 to-orange-500', darkBorder: 'border-amber-500/20', lightBorder: 'border-amber-200' },
        tier_50: { color: 'from-emerald-500 to-teal-500', darkBorder: 'border-emerald-500/20', lightBorder: 'border-emerald-200' },
    };

    const TIER_NAME_KEYS = {
        tier_10: 'small',
        tier_20: 'medium',
        tier_30: 'large',
        tier_50: 'center',
    };

    const tiers = Object.entries(TEACHER_TIERS).map(([id, tier]) => ({
        id,
        name: t(`${s}.tiers.${TIER_NAME_KEYS[id]}`) || tier.name,
        maxStudents: tier.maxStudents,
        price: formatSom(tier.price),
        perStudent: formatSom(teacherPricePerStudent(tier)),
        savings: teacherSavingsPercent(tier),
        ...TIER_STYLES[id],
    }));

    const remainingDays = getTeacherSubscriptionDaysLeft(userData);

    return (
        <div className="font-sans animate-content-in">

            {/* Sarlavha — sahifaning o'z header'i yo'q, uni layout beradi. */}
            <h1 className="font-bold text-2xl tracking-tight mb-8">
                {t(`${s}.title`, lang === 'uz' ? 'Guruh Obunalari' : 'Group Subscriptions')}
            </h1>

            <div className="max-w-5xl mx-auto">

                {/* Current Status Section */}
                <div className={`p-6 rounded-3xl mb-10 border relative overflow-hidden ${isDark ? 'bg-zinc-900 border-white/10' : 'bg-white border-zinc-200 shadow-sm'}`}>
                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-violet-500/10 rounded-full blur-[80px]"></div>

                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex-1">
                            <h2 className="text-sm font-bold uppercase tracking-wider mb-2 flex items-center gap-2" style={{ color: isDark ? '#a1a1aa' : '#71717a' }}>
                                <ShieldCheck size={16} /> {t(`${s}.currentPlan`) || (lang === 'uz' ? 'Joriy Obuna Holati' : 'Current Subscription Status')}
                            </h2>

                            {loading ? (
                                <div className="h-10 w-48 bg-zinc-500/20 animate-pulse rounded-lg mt-4"></div>
                            ) : isSubscribed ? (
                                <div>
                                    <div className="flex items-end gap-3 mt-3">
                                        <h3 className="text-3xl font-black">{subscription.tier}</h3>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold mb-1 ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
                                            {t(`${s}.activeStatus`) || (lang === 'uz' ? 'Faol' : 'Active')}
                                        </span>
                                    </div>
                                    <p className="mt-2 text-sm text-zinc-500">
                                        {(t(`${s}.limitInfo`) || (lang === 'uz'
                                            ? "Limit: {max} ta o'quvchi. Guruhlaringizdagi jami o'quvchilar soni hozirda: {current} ta."
                                            : "Limit: {max} students. Your total student count is currently: {current}."))
                                            .replace('{max}', subscription.maxStudents)
                                            .replace('{current}', studentCount)}
                                    </p>
                                </div>
                            ) : (
                                <div>
                                    <div className="flex items-center gap-3 mt-3">
                                        <h3 className="text-2xl font-black">
                                            {t(`${s}.noSubTitle`) || (lang === 'uz' ? 'Obuna mavjud emas' : 'No Active Subscription')}
                                        </h3>
                                    </div>
                                    <p className="mt-2 text-sm text-zinc-500">
                                        {t(`${s}.noSubDesc`) || (lang === 'uz'
                                            ? "Sizda faol guruh obunasi yo'q. O'quvchilaringiz platformaning PRO imkoniyatlaridan foydalanishi uchun obuna xarid qiling."
                                            : "You don't have an active group subscription. Purchase a subscription to give your students access to PRO features.")}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Status Widget */}
                        {!loading && isSubscribed && (
                            <div className="flex items-center gap-4 shrink-0">
                                <div className={`flex flex-col items-center justify-center p-4 rounded-2xl border ${isDark ? 'border-white/10 bg-white/5' : 'border-black/5 bg-black/5'} min-w-[120px]`}>
                                    <span className="text-xs font-bold text-zinc-500 mb-1">
                                        {t(`${s}.period`) || (lang === 'uz' ? 'MUDDAT' : 'PERIOD')}
                                    </span>
                                    <span className="text-3xl font-black">{remainingDays}</span>
                                    <span className="text-[10px] font-bold text-zinc-400 mt-1 uppercase">
                                        {t(`${s}.daysLeft`) || (lang === 'uz' ? 'Kun Qoldi' : 'Days Left')}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {message && (
                    <div className={`mb-8 p-4 rounded-xl flex items-center gap-3 font-medium text-sm ${message.includes('❌') ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
                        {message.includes('❌') ? <WarningCircle size={20} /> : <CheckCircle size={20} />}
                        {message}
                    </div>
                )}

                {/* Tiers Section */}
                <div className="mb-8">
                    <h2 className="text-2xl font-black tracking-tight mb-2">
                        {t(`${s}.buyNewTitle`) || (lang === 'uz' ? 'Yangi Obuna Xarid Qilish' : 'Purchase New Subscription')}
                    </h2>
                    <p className="text-zinc-500 mb-8">
                        {t(`${s}.buyNewDesc`) || (lang === 'uz'
                            ? "Guruhingiz hajmidan kelib chiqqan holda mos tarifni tanlang. Xarid qilingan obuna bilan guruhingizdagi o'quvchilarga avtomatik PRO imtiyozlari taqdim etiladi."
                            : "Choose the plan that fits your group size. Your students automatically get PRO benefits with an active subscription.")}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {tiers.map((tier) => (
                            <div
                                key={tier.id}
                                className={`relative flex flex-col p-6 rounded-3xl border transition-transform hover:scale-[1.02] ${isDark ? `bg-zinc-900 ${tier.darkBorder}` : `bg-white ${tier.lightBorder} shadow-lg shadow-black/5`}`}
                            >
                                {tier.popular && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                        <span className="bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-[10px] font-black uppercase tracking-wider px-4 py-1.5 rounded-full shadow-lg">
                                            {t(`${s}.popular`) || (lang === 'uz' ? 'Eng Mashhur' : 'Most Popular')}
                                        </span>
                                    </div>
                                )}

                                <div className="mb-6 mt-2 text-center">
                                    <h3 className="text-lg font-bold text-zinc-500">{tier.name}</h3>
                                    <div className="mt-4 flex items-baseline justify-center gap-1">
                                        <span className="text-4xl font-black tracking-tight">{tier.price}</span>
                                        <span className="text-sm font-bold text-zinc-500">
                                            {t(`${s}.currency`) || (lang === 'uz' ? "so'm" : 'UZS')}
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-500 mt-2 font-medium">
                                        {t(`${s}.per1Month`) || (lang === 'uz' ? '1 oy uchun' : 'per month')}
                                    </p>
                                    {/* Asosiy sotuv argumenti: chakana Pro (49 000) bilan
                                        taqqoslaganda bir o'quvchi qancha turadi. */}
                                    <p className="text-xs font-bold text-emerald-500 mt-2">
                                        {(t(`${s}.perStudent`) || (lang === 'uz'
                                            ? "{price} so'm / o'quvchi — chakana narxdan {savings}% arzon"
                                            : '{price} UZS / student — {savings}% below retail'))
                                            .replace('{price}', tier.perStudent)
                                            .replace('{savings}', tier.savings)}
                                    </p>
                                </div>

                                <div className="flex-1 flex flex-col justify-between">
                                    <ul className="space-y-4 mb-8 text-sm">
                                        <li className="flex items-center gap-3">
                                            <div className={`p-1 rounded-full ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
                                                <Users size={14} />
                                            </div>
                                            <span className="font-bold">
                                                {(t(`${s}.upToStudents`) || (lang === 'uz' ? "{count} tagacha o'quvchi" : 'Up to {count} students')).replace('{count}', tier.maxStudents)}
                                            </span>
                                        </li>
                                        <li className="flex items-center gap-3">
                                            <div className={`p-1 rounded-full ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
                                                <Crown size={14} />
                                            </div>
                                            {/* Tarjima butun jumla sifatida saqlanadi; "PRO" so'zi
                                                shu yerda ajratib ko'rsatiladi. Ilgari jumla VA
                                                alohida "PRO" birga chizilib, "…PRO status PRO
                                                darajasi" ko'rinishida takrorlanib ketardi. */}
                                            <span>
                                                {(t(`${s}.allStudentsPro`) || '').split('PRO').map((chunk, i) => (
                                                    <React.Fragment key={i}>
                                                        {i > 0 && <b className="text-emerald-500">PRO</b>}
                                                        {chunk}
                                                    </React.Fragment>
                                                ))}
                                            </span>
                                        </li>
                                        <li className="flex items-center gap-3">
                                            <div className={`p-1 rounded-full ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
                                                <Lightning size={14} />
                                            </div>
                                            <span>
                                                {t(`${s}.teacherPanelControl`) || (lang === 'uz' ? "O'qituvchi paneli orqali cheksiz nazorat" : 'Full control via teacher panel')}
                                            </span>
                                        </li>
                                    </ul>

                                    <button
                                        disabled={actionLoading}
                                        onClick={() => handleSubscribe(tier.id)}
                                        className={`w-full py-4 rounded-2xl font-bold text-white shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 
                                        bg-gradient-to-r ${tier.color} hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        <CreditCard size={18} />
                                        {t(`${s}.payBtn`) || (lang === 'uz' ? "To'lov qilish" : 'Pay Now')}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={`p-6 rounded-2xl border ${isDark ? 'bg-blue-500/5 border-blue-500/10' : 'bg-blue-50 border-blue-100'}`}>
                    <h4 className="font-bold flex items-center gap-2 mb-2 text-blue-600 dark:text-blue-400">
                        <WarningCircle size={18} /> {t(`${s}.infoTitle`) || (lang === 'uz' ? "Ma'lumot" : 'Info')}
                    </h4>
                    <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'} leading-relaxed`}>
                        {t(`${s}.infoDesc`) || (lang === 'uz'
                            ? `Tarif ${TEACHER_BILLING_DAYS} kun davomida amal qiladi. Obuna faol bo'lgan davrda guruhingizdagi har bir o'quvchi PRO darajasini oladi — obuna tugagach bu huquq avtomatik to'xtaydi. Limit barcha guruhlaringizdagi jami o'quvchilar bo'yicha hisoblanadi va limitdan ortiq o'quvchi qo'shib bo'lmaydi. To'lov amalga oshirilgandan so'ng, pullar qaytarilmaydi. Texnik yordam uchun admin bilan bog'laning.`
                            : `The plan is valid for ${TEACHER_BILLING_DAYS} days. While it is active every student in your groups gets PRO access, which stops automatically when the plan expires. The limit counts unique students across all of your groups. Payments are non-refundable. Contact the admin for technical support.`)}
                    </p>
                </div>

            </div>
        </div>
    );
}
