import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ChevronRight, 
    ChevronLeft, 
    ChevronUp,
    ChevronDown,
    Check, 
    Target, 
    Calendar, 
    Globe, 
    Clock, 
    User, 
    Award, 
    BookOpen,
    Sparkles,
    TrendingUp,
    Loader2,
    CalendarDays
} from 'lucide-react';

const steps = [
    { id: 1, title: "Tanishuv" },
    { id: 2, title: "Daraja" },
    { id: 3, title: "Maqsad" },
    { id: 4, title: "Tayyor!" }
];

const StepTitle = ({ title, subtitle }) => (
    <div className="mb-4 text-center">
        <h2 className="text-2xl font-bold text-[#1a1a1a] tracking-tight mb-2">
            {title}
        </h2>
        <p className="text-[#666] text-sm font-medium">
            {subtitle}
        </p>
    </div>
);

const NumberStepper = ({ value, onChange, min = 0, max = 9, step = 0.5 }) => {
    const increment = () => {
        const current = parseFloat(value) || 4.0;
        if (current < max) onChange((current + step).toFixed(1));
    };
    const decrement = () => {
        const current = parseFloat(value) || 4.0;
        if (current > min) onChange((current - step).toFixed(1));
    };

    return (
        <div className="flex items-center bg-white border border-[#eee] rounded-lg overflow-hidden max-w-[85px] mx-auto shadow-sm">
            <div className="flex-1 text-center py-1 px-2 text-[15px] font-bold text-[#1a1a1a]">
                {value || "5.0"}
            </div>
            <div className="flex flex-col border-l border-[#eee]">
                <button 
                    onClick={increment}
                    className="p-1 hover:bg-[#f8f8f9] text-[#aaa] hover:text-[#000000] transition-colors border-b border-[#eee]"
                >
                    <ChevronUp size={10} />
                </button>
                <button 
                    onClick={decrement}
                    className="p-1 hover:bg-[#f8f8f9] text-[#aaa] hover:text-[#000000] transition-colors"
                >
                    <ChevronDown size={10} />
                </button>
            </div>
        </div>
    );
};

const CustomDatePicker = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());

    const months = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"];
    const days = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => {
        const day = new Date(year, month, 1).getDay();
        return day === 0 ? 6 : day - 1; // Adjust to Monday start
    };

    const handleDateSelect = (day) => {
        const selected = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        onChange(selected.toISOString().split('T')[0]);
        setIsOpen(false);
    };

    const changeMonth = (offset) => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
    };

    const daysInMonth = getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth());
    const firstDay = getFirstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth());
    const today = new Date();

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-[#f5f5f7] border-transparent border focus:border-black/10 focus:bg-white rounded-lg py-1.5 px-5 flex items-center justify-between text-[13px] font-medium text-[#1a1a1a] transition-all"
            >
                <div className="flex items-center gap-3">
                    <CalendarDays size={18} className="text-[#000000]" />
                    <span>{value ? new Date(value).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' }) : "Sanani tanlang"}</span>
                </div>
                <ChevronDown size={16} className={`text-[#aaa] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-20" onClick={() => setIsOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute bottom-full mb-2 left-0 right-0 bg-white rounded-lg shadow-2xl border border-[#eee] p-4 z-30"
                        >
                            <div className="flex justify-between items-center mb-4 px-2">
                                <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-[#f8f8f9] rounded-lg text-[#aaa]"><ChevronLeft size={18} /></button>
                                <span className="font-bold text-sm text-[#1a1a1a]">{months[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
                                <button onClick={() => changeMonth(1)} className="p-1 hover:bg-[#f8f8f9] rounded-lg text-[#aaa]"><ChevronRight size={18} /></button>
                            </div>
                            <div className="grid grid-cols-7 gap-1 mb-2">
                                {days.map(d => <div key={d} className="text-center text-[10px] font-bold text-[#ccc] uppercase">{d}</div>)}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                                {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
                                {Array.from({ length: daysInMonth }).map((_, i) => {
                                    const day = i + 1;
                                    const isSelected = value && new Date(value).getDate() === day && new Date(value).getMonth() === viewDate.getMonth() && new Date(value).getFullYear() === viewDate.getFullYear();
                                    const isToday = today.getDate() === day && today.getMonth() === viewDate.getMonth() && today.getFullYear() === viewDate.getFullYear();
                                    
                                    return (
                                        <button
                                            key={day}
                                            onClick={() => handleDateSelect(day)}
                                            className={`aspect-square rounded-lg text-[11px] font-bold transition-all flex items-center justify-center ${
                                                isSelected ? 'bg-[#000000] text-white shadow-lg shadow-black/10' : 
                                                isToday ? 'bg-[#000000]/10 text-[#000000]' : 
                                                'hover:bg-[#f8f8f9] text-[#1a1a1a]'
                                            }`}
                                        >
                                            {day}
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default function Onboarding() {
    const { user, refreshUserData } = useAuth();
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        currentLevel: "",
        hasTakenIELTS: null,
        previousIELTSScore: "",
        targetBand: "7.0",
        examDate: "",
        weakSkills: [],
        dailyStudyTime: ""
    });

    const { userData } = useAuth();

    React.useEffect(() => {
        if (userData) {
            const names = userData.fullName ? userData.fullName.split(' ') : [];
            setFormData(prev => ({
                ...prev,
                firstName: userData.firstName || names[0] || "",
                lastName: userData.lastName || names.slice(1).join(' ') || "",
                currentLevel: userData.currentLevel || "",
                targetBand: userData.targetBand || "7.0"
            }));
        }
    }, [userData]);

    const handleSkillToggle = (skill) => {
        setFormData(prev => ({
            ...prev,
            weakSkills: prev.weakSkills.includes(skill)
                ? prev.weakSkills.filter(s => s !== skill)
                : [...prev.weakSkills, skill]
        }));
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const nextStep = () => {
        if (currentStep === 1) {
            if (!formData.firstName.trim() || !formData.lastName.trim()) return;
        }
        if (currentStep < 4) setCurrentStep(c => c + 1);
    };

    const prevStep = () => {
        if (currentStep > 1) setCurrentStep(c => c - 1);
    };

    const finishOnboarding = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const safeFloat = (val, def = 0) => {
                const num = parseFloat(val);
                return isNaN(num) ? def : num;
            };

            const dataToSave = {
                ...formData,
                fullName: `${formData.firstName} ${formData.lastName}`.trim(),
                onboardingCompleted: true,
                currentBand: formData.previousIELTSScore ? safeFloat(formData.previousIELTSScore, 4.0) : 4.0,
                targetBand: safeFloat(formData.targetBand, 7.0),
            };

            await setDoc(doc(db, 'users', user.uid), dataToSave, { merge: true });
            
            // Local state'ni yangilash (App.jsx dagi redirect loop'ni oldini olish uchun)
            if (refreshUserData) await refreshUserData();
            
            navigate('/dashboard');
        } catch (error) {
            console.error("Onboarding error:", error);
        } finally {
            setLoading(false);
        }
    };

    const renderStep1 = () => (
        <div className="max-w-xs mx-auto">
            <StepTitle 
                title="Keling, tanishaylik" 
                subtitle="Sizga mos o'quv rejasini tuzish uchun ma'lumotlaringiz kerak." 
            />
            <div className="space-y-3 max-w-[260px] mx-auto mt-8">
                <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className="w-full bg-[#f5f5f7] border-transparent border focus:border-black/10 focus:bg-white rounded-lg py-1.5 px-5 text-[13px] font-medium text-[#1a1a1a] outline-none transition-all"
                    placeholder="Ism"
                />
                <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className="w-full bg-[#f5f5f7] border-transparent border focus:border-black/10 focus:bg-white rounded-lg py-1.5 px-5 text-[13px] font-medium text-[#1a1a1a] outline-none transition-all"
                    placeholder="Familiya"
                />
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="max-w-[400px] mx-auto">
            <StepTitle 
                title="Hozirgi darajangiz" 
                subtitle="Ingliz tili bilimingizni qanday baholaysiz?" 
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 mt-8">
                {[
                    { val: 'Beginner', label: 'Boshlang\'ich', desc: 'A1-A2 daraja' },
                    { val: 'Intermediate', label: 'O\'rta', desc: 'B1-B2 daraja' },
                    { val: 'Upper-Intermediate', label: 'Yuqori O\'rta', desc: 'B2+ daraja' },
                    { val: 'Advanced', label: 'Ilg\'or', desc: 'C1-C2 daraja' },
                ].map((level) => (
                    <button
                        key={level.val}
                        onClick={() => handleInputChange('currentLevel', level.val)}
                        className={`text-left px-5 py-1.5 rounded-lg border-2 transition-all group ${formData.currentLevel === level.val
                            ? 'border-[#000000] bg-white shadow-xl shadow-black/5'
                            : 'border-transparent bg-[#f8f8f9] hover:bg-[#ececf0]'
                        }`}
                    >
                        <div className="flex justify-between items-center mb-0.5">
                            <span className="font-bold text-[13px] text-[#1a1a1a]">{level.label}</span>
                            {formData.currentLevel === level.val && <Check className="text-[#000000]" size={18} />}
                        </div>
                        <p className="text-[#888] text-[11px] font-bold tracking-tight">{level.desc}</p>
                    </button>
                ))}
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="max-w-[400px] mx-auto">
            <StepTitle 
                title="Sizning maqsadingiz" 
                subtitle="Qanday natijaga erishmoqchisiz?" 
            />
            <div className="mt-8">
                <div className="grid grid-cols-7 gap-1.5">
                    {['6.0', '6.5', '7.0', '7.5', '8.0', '8.5', '9.0'].map(score => (
                        <button
                            key={score}
                            onClick={() => handleInputChange('targetBand', score)}
                            className={`aspect-square rounded-lg border-2 flex items-center justify-center text-[13px] font-bold transition-all ${formData.targetBand === score
                                ? 'border-[#000000] bg-white text-[#000000] shadow-xl shadow-black/10 scale-105'
                                : 'border-transparent bg-[#f8f8f9] text-[#aaa] hover:bg-[#ececf0]'
                            }`}
                        >
                            {score}
                        </button>
                    ))}
                </div>
            </div>

            <div className="max-w-xs mx-auto mt-7">
                <div className="space-y-2">
                    <label className="text-[12px] font-semibold text-[#888] ml-1">Imtihon sanasi (Taxminiy)</label>
                    <CustomDatePicker 
                        value={formData.examDate}
                        onChange={(val) => handleInputChange('examDate', val)}
                    />
                </div>
            </div>
        </div>
    );

    const renderStep4 = () => (
        <div className="max-w-lg mx-auto">
            <StepTitle 
                title="O'quv rejasi" 
                subtitle="Zaif tomonlaringiz va bo'sh vaqtingizni belgilang." 
            />
            
            <div className="grid grid-cols-2 gap-2 mb-4">
                {['Reading', 'Listening', 'Writing', 'Speaking'].map(skill => (
                    <button
                        key={skill}
                        onClick={() => handleSkillToggle(skill)}
                        className={`px-6 py-4 rounded-lg border-2 text-left transition-all relative ${formData.weakSkills.includes(skill)
                            ? 'border-[#000000] bg-white shadow-xl shadow-black/5'
                            : 'border-transparent bg-[#f8f8f9] hover:bg-[#ececf0]'
                        }`}
                    >
                        <span className={`font-bold text-sm ${formData.weakSkills.includes(skill) ? 'text-[#1a1a1a]' : 'text-[#aaa]'}`}>{skill}</span>
                        {formData.weakSkills.includes(skill) && <Check className="absolute top-4 right-5 text-[#000000]" size={16} />}
                    </button>
                ))}
            </div>

            <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#aaa] ml-1 mb-2 block">Kunlik ajratiladigan vaqt</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                        { val: '30m', label: '30 daqiqa' },
                        { val: '1h', label: '1 soat' },
                        { val: '2h', label: '2 soat' },
                        { val: '3h+', label: '3+ soat' }
                    ].map((time) => (
                        <button
                            key={time.val}
                            onClick={() => handleInputChange('dailyStudyTime', time.val)}
                            className={`py-1.5 rounded-lg text-[11px] font-bold transition-all ${formData.dailyStudyTime === time.val
                                ? 'bg-[#1a1a1a] text-white shadow-lg'
                                : 'bg-[#f8f8f9] text-[#777] hover:bg-[#ececf0]'
                            }`}
                        >
                            {time.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className="h-screen bg-white flex overflow-hidden font-sans selection:bg-black/10 selection:text-black">
            {/* Left Side: Onboarding Content (60%) */}
            <div className="w-full lg:w-[60%] flex flex-col relative bg-white">
                {/* Progress Bar Top */}
                <div className="absolute top-0 left-0 w-full h-1 bg-[#f0f0f0] z-50">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(currentStep / steps.length) * 100}%` }}
                        className="h-full bg-[#000000]"
                    />
                </div>

                {/* Header - Absolute Positioned */}
                <div className="absolute top-0 right-0 p-8 z-10">
                    <div className="text-[11px] font-bold text-[#aaa]">
                        Qadam {currentStep} / {steps.length}
                    </div>
                </div>

                {/* Main Step Content */}
                <div className="flex-1 flex items-center justify-center p-8 md:p-12">
                    <div className="w-full max-w-md">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentStep}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                            >
                                {currentStep === 1 && renderStep1()}
                                {currentStep === 2 && renderStep2()}
                                {currentStep === 3 && renderStep3()}
                                {currentStep === 4 && (
                                    <div className="text-center py-8 max-w-sm mx-auto">
                                        <motion.div 
                                            initial={{ scale: 0.5, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ type: "spring", damping: 12, stiffness: 200 }}
                                            className="w-20 h-20 bg-gradient-to-tr from-[#FF5520] to-[#FF8860] text-white rounded-[28px] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-[#000000]/30 rotate-3"
                                        >
                                            <Sparkles size={40} />
                                        </motion.div>
                                        
                                        <motion.h2 
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.2 }}
                                            className="text-3xl font-bold text-[#1a1a1a] mb-4 tracking-tight"
                                        >
                                            Hammasi tayyor!
                                        </motion.h2>
                                        
                                        <motion.p 
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.3 }}
                                            className="text-[#666] text-[15px] font-medium leading-relaxed mb-10"
                                        >
                                            Ma'lumotlaringiz tahlil qilindi.<br />
                                            Endi shaxsiy dashboard'ingizni<br />
                                            ko'rishingiz mumkin.
                                        </motion.p>
                                        
                                        <motion.button
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.4 }}
                                            onClick={finishOnboarding}
                                            disabled={loading}
                                            className="w-auto px-10 py-2.5 bg-[#1a1a1a] text-white rounded-lg font-bold text-[12px] hover:bg-black transition-all shadow-xl shadow-black/10 flex items-center justify-center gap-3 active:scale-95 group mx-auto"
                                        >
                                            {loading ? <Loader2 className="animate-spin" /> : "Platformaga kirish"}
                                            {!loading && <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />}
                                        </motion.button>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>

                        {currentStep < 4 && (
                            <div className="absolute bottom-0 left-0 w-full p-10 flex justify-between items-center border-t border-[#f0f0f0]/50 bg-white">
                                <button
                                    onClick={prevStep}
                                    className={`flex items-center gap-2 text-[12px] font-bold transition-all ${currentStep === 1 ? 'opacity-0 pointer-events-none' : 'text-[#aaa] hover:text-[#000000]'}`}
                                >
                                    <ChevronLeft size={16} /> Orqaga
                                </button>
                                
                                <button
                                    onClick={nextStep}
                                    className="px-6 py-2.5 bg-[#1a1a1a] text-white rounded-lg text-[12px] font-bold transition-all flex items-center gap-2 active:scale-95 shadow-xl shadow-black/5"
                                >
                                    Keyingi <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Side: Motivational Image (40%) */}
            <div className="hidden lg:block lg:w-[40%] relative h-full bg-[#f5f5f7] overflow-hidden">
                <img 
                    src="/onboarding-bg.png" 
                    alt="Motivation" 
                    className="w-full h-full object-cover opacity-10 grayscale hover:scale-105 transition-transform duration-[10s] ease-linear"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/[0.03] via-transparent to-transparent" />
                
                {/* Decorative Elements */}
                <div className="absolute top-20 right-20 w-[400px] h-[400px] bg-black/5 blur-[120px] rounded-full" />
                <div className="absolute bottom-20 left-20 w-[400px] h-[400px] bg-black/5 blur-[120px] rounded-full" />
                
                {/* Motivational Quote */}
                <div className="absolute bottom-20 left-20 right-20 max-w-2xl">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <div className="h-1.5 w-14 bg-black mb-8 rounded-full" />
                        <h3 className="text-black text-4xl font-bold leading-tight mb-6 tracking-tight">
                            Muvaffaqiyat — bu har kungi kichik g'alabalar yig'indisidir.
                        </h3>
                        <p className="text-black/40 text-lg font-medium max-w-lg">
                            IELTS natijangizni sun'iy intellektga asoslangan platforma orqali keyingi bosqichga olib chiqing.
                        </p>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
