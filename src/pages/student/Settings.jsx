import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db, storage } from '../../firebase/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import {
    User,
    Save,
    ArrowLeft,
    Camera,
    CheckCircle2,
    AlertCircle,
    LogOut,
    Copy,
    Check,
    Sun,
    Moon,
    BarChart3
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import { useTheme } from '../../context/ThemeContext';
import BottomNav from '../../components/dashboard/BottomNav';
import SiteFooter from '../../components/common/SiteFooter';
import TelegramLink from '../../components/settings/TelegramLink';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../../context/LanguageContext';
import { getTier, getSubscriptionEnd, isGrouped } from '../../utils/subscription';
import { getSpeakingUsage, timeUntilReset } from '../../utils/aiUsage';

/* ─────────────────────────────────────────────────────────────
 * Yordamchi (pure) funksiyalar — komponentdan tashqarida, har
 * renderda qayta yaratilmasligi uchun.
 * ───────────────────────────────────────────────────────────── */

/** userAgent dan brauzer + OS nomini chiqaradi ("Chrome · macOS"). */
function describeDevice(ua = '') {
    const browser =
        /Edg\//.test(ua) ? 'Edge' :
        /OPR\/|Opera/.test(ua) ? 'Opera' :
        /Chrome\//.test(ua) ? 'Chrome' :
        /Firefox\//.test(ua) ? 'Firefox' :
        /Safari\//.test(ua) ? 'Safari' : 'Browser';

    const os =
        /Android/.test(ua) ? 'Android' :
        /iPhone|iPad|iPod/.test(ua) ? 'iOS' :
        /Mac OS X|Macintosh/.test(ua) ? 'macOS' :
        /Windows/.test(ua) ? 'Windows' :
        /Linux/.test(ua) ? 'Linux' : '—';

    return `${browser} · ${os}`;
}

function formatDateTime(value, lang) {
    if (!value) return '—';
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'uz-UZ', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

function fill(template, values) {
    return Object.entries(values).reduce(
        (acc, [key, value]) => acc.replace(`{${key}}`, value),
        String(template)
    );
}

/* ─────────────────────────────────────────────────────────────
 * UI bloklari — render ichida emas (aks holda har bosishda
 * remount bo'lib, input fokusi yo'qoladi).
 *
 * Dizayn qoidasi: yagona urg'u rangi — `warm-primary`. Kartalar
 * faqat hairline chegara bilan ajraladi (soya, gradient, rangli
 * ikonka fonlari yo'q), sarlavhalar bir xil o'lchamda.
 * ───────────────────────────────────────────────────────────── */

const Card = ({ isDark, className = '', children }) => (
    <section
        className={`rounded-2xl border ${
            isDark ? 'bg-warm-dark-elevated border-white/[0.07]' : 'bg-white border-warm-hairline'
        } ${className}`}
    >
        {children}
    </section>
);

const CardHead = ({ title, desc }) => (
    <header className="mb-lg">
        <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
        {desc && <p className="text-[13px] text-warm-muted mt-1">{desc}</p>}
    </header>
);

const Field = ({ label, hint, children }) => (
    <div className="space-y-1.5">
        <label className="block text-[12px] font-medium text-warm-muted">{label}</label>
        <div className="relative">{children}</div>
        {hint && <p className="text-[11px] text-warm-muted-soft">{hint}</p>}
    </div>
);

/** Nom — qiymat qatori (qurilma ma'lumotlari uchun). */
const DataRow = ({ label, value, badge }) => (
    <div className="flex items-center justify-between gap-md py-3">
        <span className="text-[13px] text-warm-muted shrink-0">{label}</span>
        <span className="flex items-center gap-xs min-w-0">
            <span className="text-[13px] font-medium truncate">{value}</span>
            {badge && (
                <span className="shrink-0 text-[10px] font-medium text-warm-muted border border-current/20 rounded-full px-1.5 py-0.5">
                    {badge}
                </span>
            )}
        </span>
    </div>
);

/** Limit ko'rsatkichi — sarlavha, ikki tomonlama izoh va yupqa chiziq. */
const UsageMeter = ({ isDark, title, used, limit, unlimited, leftLabel, rightLabel }) => {
    const pct = unlimited || !limit ? 100 : Math.min(100, Math.round((used / limit) * 100));
    const exhausted = !unlimited && limit > 0 && used >= limit;

    return (
        <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-md">
                <h3 className="text-[13px] font-medium">{title}</h3>
                <span className={`text-[12px] ${exhausted ? 'text-warm-error' : 'text-warm-muted'}`}>{rightLabel}</span>
            </div>
            <div className={`h-1 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-warm-card-strong'}`}>
                <div
                    className={`h-full rounded-full transition-all duration-500 ${exhausted ? 'bg-warm-error' : 'bg-warm-primary'} ${unlimited ? 'opacity-30' : ''}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <p className="text-[12px] text-warm-muted">{leftLabel}</p>
        </div>
    );
};

export default function Settings() {
    const { user, userData, logout } = useAuth();
    const { t, lang, setLang } = useTranslation();
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        targetBand: '7.0',
        examDate: '',
        phoneNumber: '',
        photoURL: ''
    });
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState('profile');
    const [speakingUsageDoc, setSpeakingUsageDoc] = useState(null);
    const [usageLoading, setUsageLoading] = useState(true);

    const tier = getTier(userData);
    const isPremium = tier !== 'free';
    const grouped = isGrouped(userData);

    const getRemainingDays = () => {
        const end = getSubscriptionEnd(userData);
        if (!end) return 0;
        const diffDays = Math.ceil((end.getTime() - Date.now()) / 86400000);
        return diffDays > 0 ? diffDays : 0;
    };

    /** Imtihon sanasigacha qolgan kunlar (o'tib ketgan bo'lsa null). */
    const examDaysLeft = useMemo(() => {
        if (!formData.examDate) return null;
        const exam = new Date(`${formData.examDate}T00:00:00`);
        if (isNaN(exam.getTime())) return null;
        const days = Math.ceil((exam.getTime() - Date.now()) / 86400000);
        return days >= 0 ? days : null;
    }, [formData.examDate]);

    useEffect(() => {
        if (!userData) return;
        // Eski hisoblarda faqat `fullName` bor — ism/familiyaga bo'lib ko'rsatamiz.
        const parts = (userData.fullName || '').trim().split(/\s+/).filter(Boolean);
        setFormData({
            firstName: userData.firstName || parts[0] || '',
            lastName: userData.lastName || parts.slice(1).join(' ') || '',
            targetBand: String(userData.targetBand || '7.0'),
            examDate: userData.examDate || '',
            phoneNumber: userData.phoneNumber || '',
            photoURL: userData.photoURL || ''
        });
        setImagePreview(userData.photoURL || null);
    }, [userData]);

    // Speaking AI kunlik sarfi — server `users/{uid}/usage/speaking` da yuritadi.
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            if (!user?.uid) return;
            setUsageLoading(true);
            try {
                const snap = await getDoc(doc(db, 'users', user.uid, 'usage', 'speaking'));
                if (!cancelled) setSpeakingUsageDoc(snap.exists() ? snap.data() : null);
            } catch (error) {
                console.error('Speaking usage read error:', error);
                if (!cancelled) setSpeakingUsageDoc(null);
            } finally {
                if (!cancelled) setUsageLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [user?.uid]);

    const speaking = useMemo(
        () => getSpeakingUsage(speakingUsageDoc, userData),
        [speakingUsageDoc, userData]
    );

    /**
     * Mock urinishlari — `userData.mockTests` dagi tayinlovlar.
     * `arrayUnion` bir xil kalitni takror qo'shishi mumkin, shuning uchun
     * `useStudentMocks` kabi id bo'yicha dublikatlarni tashlab yuboramiz.
     * Tugatilgan urinishni server `status: 'completed'` qilib belgilaydi.
     */
    const mockStats = useMemo(() => {
        const seen = new Set();
        const assignments = (userData?.mockTests || []).filter((m) => {
            const key = m?.id || m?.mockKey;
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
        const completed = assignments.filter(
            (m) => m.status === 'completed' || Boolean(m.resultId)
        ).length;
        return {
            total: assignments.length,
            completed,
            remaining: Math.max(assignments.length - completed, 0),
        };
    }, [userData?.mockTests]);

    const reset = timeUntilReset();
    const fullName = `${formData.firstName} ${formData.lastName}`.trim();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                setMessage(t('settings.imageSizeError'));
                return;
            }
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const copyEmail = useCallback(async () => {
        if (!user?.email) return;
        try {
            await navigator.clipboard.writeText(user.email);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            /* clipboard yopiq bo'lsa — jim o'tamiz */
        }
    }, [user?.email]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            let photoURL = formData.photoURL;

            if (imageFile) {
                const storageRef = ref(storage, `profile_pictures/${user.uid}`);
                await uploadBytes(storageRef, imageFile);
                photoURL = await getDownloadURL(storageRef);
            }

            await updateDoc(doc(db, 'users', user.uid), {
                fullName,
                firstName: formData.firstName,
                lastName: formData.lastName,
                targetBand: parseFloat(formData.targetBand),
                examDate: formData.examDate,
                phoneNumber: formData.phoneNumber,
                photoURL
            });

            // Header darhol yangilanishi uchun Auth profilini ham yozamiz.
            await updateProfile(user, { displayName: fullName, photoURL });

            setMessage(t('settings.saveSuccess'));
        } catch (error) {
            console.error('Settings save error:', error);
            setMessage(t('settings.saveError'));
        } finally {
            setLoading(false);
        }
    };

    /* ── Umumiy class'lar ── */
    const inputClass = `w-full py-2.5 px-3.5 rounded-xl outline-none border text-[13px] transition-colors ${
        isDark
            ? 'bg-warm-dark-soft border-white/[0.07] focus:border-white/25 text-warm-on-dark placeholder:text-warm-on-dark-soft/60'
            : 'bg-white border-warm-hairline focus:border-warm-muted-soft text-warm-ink placeholder:text-warm-muted-soft'
    }`;

    const subtleBtn = `px-4 py-2 rounded-xl text-[13px] font-medium border transition-colors ${
        isDark ? 'border-white/[0.12] hover:bg-white/5' : 'border-warm-hairline hover:bg-warm-card/60'
    }`;

    const primaryBtn = 'px-4 py-2 rounded-xl text-[13px] font-medium bg-warm-primary text-white hover:bg-warm-primary-active transition-colors';

    const dividerClass = isDark ? 'divide-white/[0.07]' : 'divide-warm-hairline';

    const tabs = [
        { id: 'profile', label: t('settings.profileInfo') },
        { id: 'exam', label: t('settings.examPrep') },
        { id: 'appearance', label: t('settings.appearance') },
        { id: 'subscription', label: t('settings.subscription') },
    ];

    const showSaveBar = activeTab === 'profile' || activeTab === 'exam';
    const tierLabel = tier === 'pro' ? 'PRO' : tier === 'standard' ? 'STANDARD' : 'FREE';

    const optionBtn = (selected) => `flex items-center gap-sm px-4 py-3 rounded-xl border text-[13px] font-medium transition-colors ${
        selected
            ? 'border-warm-primary text-warm-primary'
            : (isDark ? 'border-white/[0.07] text-warm-on-dark-soft hover:border-white/25' : 'border-warm-hairline text-warm-body hover:border-warm-muted-soft')
    }`;

    return (
        <div className={`min-h-screen transition-colors duration-500 ${isDark ? 'bg-warm-dark text-warm-on-dark' : 'bg-warm-canvas text-warm-ink'} font-sans selection:bg-warm-primary/20`}>
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

            <div className="max-w-5xl mx-auto px-4 md:px-6 py-lg md:py-xl">
                {userData?.role !== 'admin' && (
                    <button
                        type="button"
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center gap-xs mb-lg text-[13px] text-warm-muted hover:text-warm-primary transition-colors"
                    >
                        <ArrowLeft size={16} />
                        {t('roadmap.backToDashboard')}
                    </button>
                )}

                <div className="mb-lg">
                    <h1 className="text-xl font-semibold tracking-tight">{t('settings.title')}</h1>
                    <p className="text-[13px] text-warm-muted mt-1">{t('settings.subtitle')}</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-lg items-start">
                    {/* ── Asosiy ustun ── */}
                    <div className="flex-1 w-full min-w-0 space-y-md">
                        {/* Tab paneli — matn, ikonkasiz */}
                        <div className={`flex gap-1 p-1 rounded-xl overflow-x-auto ${isDark ? 'bg-warm-dark-soft' : 'bg-warm-card/70'}`}>
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`relative flex-1 min-w-[92px] px-3 py-2 rounded-lg text-[13px] transition-colors ${
                                        activeTab === tab.id
                                            ? (isDark ? 'text-warm-on-dark font-medium' : 'text-warm-ink font-medium')
                                            : 'text-warm-muted hover:text-warm-body'
                                    }`}
                                >
                                    {activeTab === tab.id && (
                                        <motion.span
                                            layoutId="settings-tab-pill"
                                            className={`absolute inset-0 rounded-lg ${isDark ? 'bg-warm-dark-elevated' : 'bg-white'}`}
                                            transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                                        />
                                    )}
                                    <span className="relative whitespace-nowrap">{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-md">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.25 }}
                                className="space-y-md"
                            >
                                {/* ─────────── PROFIL ─────────── */}
                                {activeTab === 'profile' && (
                                    <>
                                        <Card isDark={isDark} className="p-lg">
                                            <CardHead title={t('settings.profileInfo')} desc={t('settings.profileDesc')} />

                                            <div className="flex items-center gap-md mb-lg">
                                                <div className="relative shrink-0">
                                                    <div className={`w-16 h-16 rounded-full overflow-hidden ${isDark ? 'bg-warm-dark-soft' : 'bg-warm-card'}`}>
                                                        {imagePreview ? (
                                                            <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-warm-muted-soft text-xl font-medium">
                                                                {fullName ? fullName.charAt(0).toUpperCase() : <User size={22} />}
                                                            </div>
                                                        )}
                                                        {loading && (
                                                            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <label
                                                        htmlFor="profile-upload"
                                                        className={`absolute -bottom-0.5 -right-0.5 p-1.5 rounded-full cursor-pointer transition-colors border ${
                                                            isDark ? 'bg-warm-dark-elevated border-white/[0.12] hover:bg-white/10' : 'bg-white border-warm-hairline hover:bg-warm-card'
                                                        }`}
                                                    >
                                                        <Camera size={13} />
                                                    </label>
                                                    <input id="profile-upload" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[14px] font-medium truncate">{fullName || t('settings.defaultUser')}</p>
                                                    <p className="text-[12px] text-warm-muted mt-0.5">{t('settings.updatePhotoPrompt')}</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                                                <Field label={t('settings.firstName')}>
                                                    <input
                                                        type="text"
                                                        name="firstName"
                                                        value={formData.firstName}
                                                        onChange={handleChange}
                                                        className={inputClass}
                                                        placeholder={t('settings.firstNamePlaceholder')}
                                                    />
                                                </Field>

                                                <Field label={t('settings.lastName')}>
                                                    <input
                                                        type="text"
                                                        name="lastName"
                                                        value={formData.lastName}
                                                        onChange={handleChange}
                                                        className={inputClass}
                                                        placeholder={t('settings.lastNamePlaceholder')}
                                                    />
                                                </Field>

                                                <Field label={t('settings.phoneNumber')}>
                                                    <input
                                                        type="tel"
                                                        name="phoneNumber"
                                                        value={formData.phoneNumber}
                                                        onChange={handleChange}
                                                        className={inputClass}
                                                        placeholder="+998 90 123 45 67"
                                                    />
                                                </Field>

                                                <Field
                                                    label={t('settings.emailAddress')}
                                                    hint={copied ? t('settings.emailCopied') : t('settings.emailLocked')}
                                                >
                                                    <input
                                                        type="email"
                                                        value={user?.email || ''}
                                                        readOnly
                                                        className={`${inputClass} pr-10 text-warm-muted cursor-default`}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={copyEmail}
                                                        aria-label={t('settings.emailAddress')}
                                                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-warm-muted-soft hover:text-warm-primary transition-colors"
                                                    >
                                                        {copied ? <Check size={14} /> : <Copy size={14} />}
                                                    </button>
                                                </Field>
                                            </div>
                                        </Card>

                                        {/* Telegram bog'lanishi — haftalik tahlil xulosasi shu kanal
                                            orqali boradi. Telegram bilan kirganlarda u allaqachon bor,
                                            email bilan kirganlar esa shu yerdan bog'laydi. */}
                                        <Card isDark={isDark} className="p-lg">
                                            <CardHead
                                                title={t('settings.telegramTitle')}
                                                desc={t('settings.telegramDesc')}
                                            />
                                            <TelegramLink
                                                inputClass={inputClass}
                                                mutedClass={isDark ? 'text-warm-on-dark-soft' : 'text-warm-muted'}
                                            />
                                        </Card>

                                        {/* Qurilma va kirish — reference dizayndagi "Active sessions" o'rniga
                                            haqiqiy ma'lumot: Firebase Auth metadata + joriy brauzer. */}
                                        <Card isDark={isDark} className="p-lg">
                                            <CardHead title={t('settings.deviceSession')} desc={t('settings.deviceSessionDesc')} />

                                            <div className={`divide-y ${dividerClass} -mt-2`}>
                                                <DataRow
                                                    label={t('settings.currentDevice')}
                                                    value={describeDevice(typeof navigator !== 'undefined' ? navigator.userAgent : '')}
                                                    badge={t('settings.current')}
                                                />
                                                <DataRow
                                                    label={t('settings.lastSignIn')}
                                                    value={formatDateTime(user?.metadata?.lastSignInTime, lang)}
                                                />
                                                <DataRow
                                                    label={t('settings.memberSince')}
                                                    value={formatDateTime(user?.metadata?.creationTime, lang)}
                                                />
                                            </div>

                                            <button
                                                type="button"
                                                onClick={logout}
                                                className="mt-lg inline-flex items-center gap-xs text-[13px] font-medium text-warm-error hover:opacity-75 transition-opacity"
                                            >
                                                <LogOut size={15} />
                                                {t('settings.signOut')}
                                            </button>
                                        </Card>
                                    </>
                                )}

                                {/* ─────────── IMTIHON ─────────── */}
                                {activeTab === 'exam' && (
                                    <Card isDark={isDark} className="p-lg">
                                        <CardHead title={t('settings.examPrep')} desc={t('settings.examDesc')} />

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
                                            <Field label={t('settings.targetBand')}>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {['6.0', '6.5', '7.0', '7.5', '8.0', '9.0'].map(band => (
                                                        <button
                                                            key={band}
                                                            type="button"
                                                            onClick={() => setFormData(prev => ({ ...prev, targetBand: band }))}
                                                            className={`py-2 rounded-xl text-[13px] border transition-colors ${
                                                                formData.targetBand === band
                                                                    ? 'border-warm-primary text-warm-primary font-medium'
                                                                    : (isDark ? 'border-white/[0.07] text-warm-on-dark-soft hover:border-white/25' : 'border-warm-hairline text-warm-body hover:border-warm-muted-soft')
                                                            }`}
                                                        >
                                                            {band}
                                                        </button>
                                                    ))}
                                                </div>
                                            </Field>

                                            <div className="space-y-md">
                                                <Field label={t('settings.examDate')}>
                                                    <input
                                                        type="date"
                                                        name="examDate"
                                                        value={formData.examDate}
                                                        onChange={handleChange}
                                                        className={inputClass}
                                                    />
                                                </Field>

                                                {/* Imtihongacha qolgan kunlar — sana tanlanishi bilan yangilanadi. */}
                                                <div className={`rounded-xl px-4 py-3 flex items-baseline justify-between ${isDark ? 'bg-warm-dark-soft' : 'bg-warm-card/60'}`}>
                                                    <span className="text-[12px] text-warm-muted">{t('settings.examCountdown')}</span>
                                                    {examDaysLeft === null ? (
                                                        <span className="text-[12px] text-warm-muted-soft">{t('settings.examCountdownEmpty')}</span>
                                                    ) : (
                                                        <span className="text-[15px] font-medium">
                                                            {examDaysLeft} <span className="text-[12px] text-warm-muted font-normal">{t('settings.days')}</span>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                )}

                                {/* ─────────── KO'RINISH ─────────── */}
                                {activeTab === 'appearance' && (
                                    <Card isDark={isDark} className="p-lg">
                                        <CardHead title={t('settings.appearance')} desc={t('settings.appearanceDesc')} />

                                        <div className="space-y-lg">
                                            <Field label={t('settings.theme')}>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {[
                                                        { id: 'light', label: t('settings.themeLight'), icon: Sun },
                                                        { id: 'dark', label: t('settings.themeDark'), icon: Moon },
                                                    ].map((option) => (
                                                        <button
                                                            key={option.id}
                                                            type="button"
                                                            onClick={() => { if (theme !== option.id) toggleTheme(); }}
                                                            className={optionBtn(theme === option.id)}
                                                        >
                                                            <option.icon size={15} />
                                                            {option.label}
                                                            {theme === option.id && <Check size={14} className="ml-auto" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </Field>

                                            <Field label={t('settings.language')} hint={t('settings.previewNote')}>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {[
                                                        { id: 'uz', label: "O'zbekcha" },
                                                        { id: 'en', label: 'English' },
                                                    ].map((option) => (
                                                        <button
                                                            key={option.id}
                                                            type="button"
                                                            onClick={() => setLang(option.id)}
                                                            className={optionBtn(lang === option.id)}
                                                        >
                                                            {option.label}
                                                            {lang === option.id && <Check size={14} className="ml-auto" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </Field>
                                        </div>
                                    </Card>
                                )}

                                {/* ─────────── OBUNA ─────────── */}
                                {activeTab === 'subscription' && (
                                    <>
                                        {/* Joriy tarif */}
                                        <Card isDark={isDark} className="p-lg">
                                            <CardHead title={t('settings.currentPlan')} />

                                            <div className="flex flex-wrap items-start justify-between gap-md">
                                                <div className="max-w-md">
                                                    <div className="flex items-center gap-xs">
                                                        <span className="text-[17px] font-semibold tracking-tight">{tierLabel}</span>
                                                        {isPremium && (
                                                            <span className="text-[11px] font-medium text-warm-primary border border-warm-primary/30 rounded-full px-2 py-0.5">
                                                                {t('settings.activeSubscription')}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[13px] text-warm-muted mt-1.5 leading-relaxed">
                                                        {isPremium
                                                            ? (grouped
                                                                ? "Siz o'quv guruhi a'zosisiz — obunangiz o'qituvchingiz tomonidan faollashtirilgan."
                                                                : "Barcha premium testlar va mock imtihonlar ochiq.")
                                                            : "IELTS tayyorgarligi uchun cheklangan bepul hisob."}
                                                    </p>
                                                </div>

                                                <div className="text-right">
                                                    <p className="text-[12px] text-warm-muted">{t('settings.daysRemaining')}</p>
                                                    <p className="text-[20px] font-semibold mt-0.5">
                                                        {grouped ? '∞' : (isPremium ? getRemainingDays() : 0)}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-2 mt-lg">
                                                <button type="button" onClick={() => navigate('/pricing')} className={subtleBtn}>
                                                    {t('settings.viewPlans')}
                                                </button>
                                                {tier !== 'pro' && (
                                                    <button type="button" onClick={() => navigate('/pricing')} className={primaryBtn}>
                                                        {t('settings.upgradeNow')}
                                                    </button>
                                                )}
                                            </div>
                                        </Card>

                                        {/* AI limitlari */}
                                        <Card isDark={isDark} className="p-lg">
                                            <CardHead title={t('settings.aiUsage')} desc={t('settings.aiUsageDesc')} />

                                            {usageLoading ? (
                                                <p className="text-[13px] text-warm-muted">{t('settings.loading')}</p>
                                            ) : (
                                                <div className="space-y-lg">
                                                    <UsageMeter
                                                        isDark={isDark}
                                                        title={t('settings.speakingCheck')}
                                                        used={speaking.used}
                                                        limit={speaking.limit}
                                                        leftLabel={fill(t('settings.usedOf'), { used: speaking.used, limit: speaking.limit })}
                                                        rightLabel={
                                                            speaking.remaining === 0
                                                                ? fill(t('settings.resetsIn'), { hours: reset.hours, minutes: reset.minutes })
                                                                : fill(t('settings.remainingCount'), { count: speaking.remaining })
                                                        }
                                                    />

                                                    <UsageMeter
                                                        isDark={isDark}
                                                        title={t('settings.writingCheck')}
                                                        used={0}
                                                        limit={0}
                                                        unlimited
                                                        leftLabel={t('settings.noLimit')}
                                                        rightLabel={t('settings.unlimited')}
                                                    />

                                                    {speaking.total > 0 && (
                                                        <p className="text-[12px] text-warm-muted-soft">
                                                            {fill(t('settings.totalChecks'), { count: speaking.total })}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </Card>

                                        {/* Mock urinishlari — `mockTests` tayinlovlaridan hisoblanadi */}
                                        <Card isDark={isDark} className="p-lg">
                                            <CardHead title={t('settings.mockAttempts')} desc={t('settings.mockAttemptsDesc')} />

                                            {mockStats.total === 0 ? (
                                                <div className="flex flex-wrap items-center justify-between gap-md">
                                                    <p className="text-[13px] text-warm-muted">{t('settings.mockNone')}</p>
                                                    <button type="button" onClick={() => navigate('/mock-buy')} className={primaryBtn}>
                                                        {t('settings.buyMock')}
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="space-y-lg">
                                                    <UsageMeter
                                                        isDark={isDark}
                                                        title={t('settings.mockShort')}
                                                        used={mockStats.completed}
                                                        limit={mockStats.total}
                                                        leftLabel={fill(t('settings.mockUsed'), { used: mockStats.completed, total: mockStats.total })}
                                                        rightLabel={
                                                            mockStats.remaining === 0
                                                                ? t('settings.mockAllUsed')
                                                                : fill(t('settings.mockRemaining'), { count: mockStats.remaining })
                                                        }
                                                    />

                                                    <div className="flex flex-wrap gap-2">
                                                        <button type="button" onClick={() => navigate('/mock')} className={subtleBtn}>
                                                            {t('settings.openMocks')}
                                                        </button>
                                                        <button type="button" onClick={() => navigate('/mock-buy')} className={subtleBtn}>
                                                            {t('settings.buyMock')}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </Card>

                                        {/* Bepul tarif uchun bitta, sokin taklif bloki */}
                                        {!isPremium && (
                                            <Card isDark={isDark} className="p-lg">
                                                <CardHead
                                                    title="Premium nima beradi?"
                                                    desc="Bepul tarifda mock imtihonlar va AI tahlili cheklangan."
                                                />
                                                <ul className={`divide-y ${dividerClass} -mt-2`}>
                                                    {[
                                                        "50+ to'liq Listening & Reading amaliyot testlari",
                                                        "Writing insholaringizni soniyalar ichida tahlil qilish",
                                                        "Speaking simulator: AI imtihon oluvchi bilan mashg'ulot",
                                                        "Xatolaringizning batafsil tushuntirishlari",
                                                    ].map((benefit) => (
                                                        <li key={benefit} className="flex items-start gap-sm py-3 text-[13px] text-warm-muted">
                                                            <Check size={14} className="mt-0.5 shrink-0 text-warm-primary" />
                                                            <span>{benefit}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                                <button
                                                    type="button"
                                                    onClick={() => navigate('/pricing')}
                                                    className={`${primaryBtn} mt-lg`}
                                                >
                                                    {t('settings.viewPlans')}
                                                </button>
                                            </Card>
                                        )}

                                        {tier === 'standard' && (
                                            <Card isDark={isDark} className="p-lg">
                                                <p className="text-[13px] text-warm-muted leading-relaxed">
                                                    PRO tarifida to'liq shaxsiy Roadmap, ko'proq Mock testlar va kuniga 50 tagacha
                                                    Speaking AI baholashi ochiladi.
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => navigate('/pricing')}
                                                    className={`${primaryBtn} mt-md`}
                                                >
                                                    {t('settings.upgradeNow')}
                                                </button>
                                            </Card>
                                        )}
                                    </>
                                )}
                            </motion.div>

                            {/* Saqlash paneli — faqat tahrirlanadigan tablarda */}
                            {showSaveBar && (
                                <div className="flex items-center justify-end gap-md pt-1">
                                    <AnimatePresence>
                                        {message && (
                                            <motion.span
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className={`flex items-center gap-xs text-[13px] ${message.includes('❌') ? 'text-warm-error' : 'text-warm-success'}`}
                                            >
                                                {message.includes('❌') ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
                                                {message}
                                            </motion.span>
                                        )}
                                    </AnimatePresence>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className={`${primaryBtn} flex items-center gap-xs ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
                                    >
                                        {loading ? (
                                            <>
                                                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                                {t('settings.saving')}
                                            </>
                                        ) : (
                                            <>
                                                <Save size={15} />
                                                {t('settings.saveChanges')}
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </form>
                    </div>

                    {/* ── O'ng ustun: profil kartasi + qisqa ko'rsatkichlar ── */}
                    <aside className="w-full lg:w-[280px] shrink-0 lg:sticky lg:top-24">
                        <Card isDark={isDark} className="p-lg">
                            <div className="flex flex-col items-center text-center">
                                <div className={`w-16 h-16 rounded-full overflow-hidden ${isDark ? 'bg-warm-dark-soft' : 'bg-warm-card'}`}>
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-warm-muted-soft text-xl font-medium">
                                            {fullName ? fullName.charAt(0).toUpperCase() : <User size={22} />}
                                        </div>
                                    )}
                                </div>

                                <p className="mt-sm text-[14px] font-medium">{fullName || t('settings.defaultUser')}</p>
                                <p className="text-[12px] text-warm-muted mt-0.5 truncate max-w-full">{user?.email}</p>
                                <span className="mt-2 text-[11px] font-medium text-warm-muted border border-current/20 rounded-full px-2 py-0.5">
                                    {tierLabel}
                                </span>
                            </div>

                            <div className={`divide-y ${dividerClass} mt-lg`}>
                                <DataRow label={t('settings.targetBandShort')} value={formData.targetBand} />
                                <DataRow
                                    label={t('settings.examCountdown')}
                                    value={examDaysLeft === null ? '—' : `${examDaysLeft} ${t('settings.days')}`}
                                />
                                <DataRow
                                    label={t('settings.mockShort')}
                                    value={`${mockStats.completed} / ${mockStats.total}`}
                                />
                                {!usageLoading && (
                                    <DataRow
                                        label={t('settings.speakingCheck')}
                                        value={`${speaking.used} / ${speaking.limit}`}
                                    />
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => navigate('/statistics')}
                                className={`${subtleBtn} mt-lg w-full flex items-center justify-center gap-xs`}
                            >
                                <BarChart3 size={15} />
                                {t('settings.viewStatistics')}
                            </button>
                        </Card>
                    </aside>
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
