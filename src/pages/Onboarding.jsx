import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/firebase';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Check, Target, Calendar, Globe, Clock, User, Award, BookOpen } from 'lucide-react';

const steps = [
    { id: 1, title: "Tanishuv" },
    { id: 2, title: "Daraja" },
    { id: 3, title: "Maqsad" },
    { id: 4, title: "Reja" },
    { id: 5, title: "Tayyor!" }
];

export default function Onboarding() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        fullName: "",
        ageRange: "",
        currentLevel: "",
        hasTakenIELTS: "",
        previousIELTSScore: "",
        targetBand: "7.0",
        examDate: "",
        purpose: "",
        weakSkills: [],
        dailyStudyTime: ""
    });

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSkillToggle = (skill) => {
        setFormData(prev => {
            const skills = prev.weakSkills.includes(skill)
                ? prev.weakSkills.filter(s => s !== skill)
                : [...prev.weakSkills, skill];
            return { ...prev, weakSkills: skills };
        });
    };

    const nextStep = () => {
        if (currentStep < 5) setCurrentStep(c => c + 1);
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
                onboarding: {
                    completed: true,
                    completedAt: new Date().toISOString()
                },
                // Initial values for dashboard
                currentBand: formData.previousIELTSScore ? safeFloat(formData.previousIELTSScore, 4.0) : 4.0,
                targetBand: safeFloat(formData.targetBand, 7.0),
            };

            // Sanitize undefined
            Object.keys(dataToSave).forEach(key => dataToSave[key] === undefined && delete dataToSave[key]);

            // Use setDoc with merge for robustness
            await setDoc(doc(db, 'users', user.uid), dataToSave, { merge: true });

            navigate('/dashboard');
        } catch (error) {
            console.error("Onboarding error:", error);
            alert(`Xatolik yuz berdi: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // --- RENDER STEPS ---

    const renderStep1 = () => (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white mb-2">Keling, tanishib olaylik! 👋</h2>
            <p className="text-gray-400 mb-8">Sizga mos o'quv rejasini tuzishimiz uchun ma'lumotlaringiz kerak.</p>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Ism va Familiyangiz</label>
                    <div className="relative">
                        <User className="absolute left-4 top-3.5 w-5 h-5 text-gray-500" />
                        <input
                            type="text"
                            value={formData.fullName}
                            onChange={(e) => handleInputChange('fullName', e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                            placeholder="Aziza Karimova"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Yoshingiz</label>
                    <div className="grid grid-cols-3 gap-3">
                        {['16-18', '19-25', '26-35', '36-45', '46+'].map(age => (
                            <button
                                key={age}
                                onClick={() => handleInputChange('ageRange', age)}
                                className={`py-3 rounded-xl border transition-all ${formData.ageRange === age
                                    ? 'bg-orange-500 border-orange-500 text-white shadow-[0_0_20px_rgba(255,85,32,0.3)]'
                                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:border-white/20'
                                    }`}
                            >
                                {age}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white mb-2">Ingliz tili darajangiz 📊</h2>
            <p className="text-gray-400 mb-8">Hozirgi holatingizni qanday baholaysiz?</p>

            <div className="space-y-3">
                {[
                    { val: 'Beginner', label: 'Boshlang\'ich (A1-A2)' },
                    { val: 'Intermediate', label: 'O\'rta (B1-B2)' },
                    { val: 'Upper-Intermediate', label: 'Yuqori O\'rta (B2+)' },
                    { val: 'Advanced', label: 'Ilg\'or (C1-C2)' },
                    { val: 'Unknown', label: 'Bilmayman / Aniqlamoqchiman' }
                ].map((level) => (
                    <button
                        key={level.val}
                        onClick={() => handleInputChange('currentLevel', level.val)}
                        className={`w-full text-left px-6 py-4 rounded-2xl border transition-all flex justify-between items-center group ${formData.currentLevel === level.val
                            ? 'bg-gradient-to-r from-orange-500/20 to-orange-600/20 border-orange-500 text-white'
                            : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                            }`}
                    >
                        <span className="font-medium">{level.label}</span>
                        {formData.currentLevel === level.val && <Check className="w-5 h-5 text-orange-500" />}
                    </button>
                ))}
            </div>

            <div className="mt-8 pt-6 border-t border-white/10">
                <label className="block text-sm font-medium text-gray-400 mb-3">Oldin IELTS topshirganmisiz?</label>
                <div className="flex gap-4">
                    <button
                        onClick={() => handleInputChange('hasTakenIELTS', true)}
                        className={`flex-1 py-3 rounded-xl border transition-all ${formData.hasTakenIELTS === true ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-gray-400'}`}
                    >
                        Ha
                    </button>
                    <button
                        onClick={() => { handleInputChange('hasTakenIELTS', false); handleInputChange('previousIELTSScore', ''); }}
                        className={`flex-1 py-3 rounded-xl border transition-all ${formData.hasTakenIELTS === false ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-gray-400'}`}
                    >
                        Yo'q
                    </button>
                </div>

                {formData.hasTakenIELTS && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4">
                        <label className="block text-sm font-medium text-gray-400 mb-2">Oxirgi natijangiz</label>
                        <input
                            type="number" step="0.5" max="9"
                            value={formData.previousIELTSScore}
                            onChange={(e) => handleInputChange('previousIELTSScore', e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                            placeholder="Masalan: 6.0"
                        />
                    </motion.div>
                )}
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white mb-2">Maqsadingiz nima? 🎯</h2>
            <p className="text-gray-400 mb-8">Qanday natijaga erishmoqchisiz?</p>

            <div>
                <label className="block text-sm font-medium text-gray-400 mb-4">Target Band Score</label>
                <div className="grid grid-cols-5 gap-3">
                    {['5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0', '8.5', '9.0'].map(score => (
                        <button
                            key={score}
                            onClick={() => handleInputChange('targetBand', score)}
                            className={`py-3 rounded-xl border text-lg font-bold transition-all ${formData.targetBand === score
                                ? 'bg-orange-500 border-orange-500 text-white shadow-[0_0_20px_rgba(255,85,32,0.4)] scale-105'
                                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                }`}
                        >
                            {score}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-8">
                <label className="block text-sm font-medium text-gray-400 mb-2">Imtihon Sanasi (Taxminiy)</label>
                <div className="relative">
                    <Calendar className="absolute left-4 top-3.5 w-5 h-5 text-gray-500" />
                    <input
                        type="date"
                        value={formData.examDate}
                        onChange={(e) => handleInputChange('examDate', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all [color-scheme:dark]"
                    />
                </div>
            </div>

            <div className="mt-8">
                <label className="block text-sm font-medium text-gray-400 mb-3">Nima uchun IELTS kerak?</label>
                <div className="grid grid-cols-2 gap-3">
                    {[
                        { id: 'study', icon: <BookOpen size={18} />, label: "O'qish uchun" },
                        { id: 'work', icon: <Award size={18} />, label: "Ish uchun" },
                        { id: 'migration', icon: <Globe size={18} />, label: "Migratsiya" },
                        { id: 'self', icon: <Target size={18} />, label: "Rivojlanish" }
                    ].map(type => (
                        <button
                            key={type.id}
                            onClick={() => handleInputChange('purpose', type.id)}
                            className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all flex items-center gap-2 ${formData.purpose === type.id
                                ? 'bg-white text-black border-white'
                                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                }`}
                        >
                            {type.icon} {type.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderStep4 = () => (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white mb-2">O'quv rejasi 📅</h2>
            <p className="text-gray-400 mb-8">Zaif tomonlaringiz va vaqtingizni aniqlaymiz.</p>

            <div>
                <label className="block text-sm font-medium text-gray-400 mb-3">Qaysi ko'nikmada ko'proq yordam kerak?</label>
                <div className="grid grid-cols-2 gap-3">
                    {['Reading', 'Listening', 'Writing', 'Speaking'].map(skill => (
                        <button
                            key={skill}
                            onClick={() => handleSkillToggle(skill)}
                            className={`px-4 py-4 rounded-xl border text-left transition-all ${formData.weakSkills.includes(skill)
                                ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                }`}
                        >
                            <div className="flex justify-between items-center">
                                <span className="font-medium">{skill}</span>
                                {formData.weakSkills.includes(skill) && <Check size={18} />}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-8">
                <label className="block text-sm font-medium text-gray-400 mb-3">Kuniga qancha vaqt ajrata olasiz?</label>
                <div className="space-y-3">
                    {[
                        { val: '30m', label: '30 daqiqa (Minimal)' },
                        { val: '1h', label: '1 soat (O\'rtacha)' },
                        { val: '2h', label: '2 soat (Jiddiy)' },
                        { val: '3h+', label: '3+ soat (Intensiv)' }
                    ].map((time) => (
                        <button
                            key={time.val}
                            onClick={() => handleInputChange('dailyStudyTime', time.val)}
                            className={`w-full text-left px-6 py-4 rounded-xl border transition-all flex items-center gap-3 ${formData.dailyStudyTime === time.val
                                ? 'bg-white text-black border-white'
                                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                }`}
                        >
                            <Clock size={20} className={formData.dailyStudyTime === time.val ? 'text-black' : 'text-gray-500'} />
                            <span className="font-medium">{time.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4">
            <style>{`
                body { background-color: #050505; }
                .glass-panel {
                    background: rgba(15, 15, 15, 0.6);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    box-shadow: 0 0 0 1px rgba(0,0,0,0.2), 0 20px 40px rgba(0,0,0,0.4);
                }
            `}</style>

            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-orange-600/40 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '4s' }} />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-red-600/30 rounded-full blur-[100px] mix-blend-screen animate-pulse" style={{ animationDuration: '7s' }} />
                <div className="absolute top-[20%] right-[10%] w-[300px] h-[300px] bg-orange-500/20 rounded-full blur-[80px] animate-bounce" style={{ animationDuration: '10s' }} />
            </div>

            <div className="w-full max-w-2xl relative z-10">
                {/* Steps Indicator */}
                <div className="flex justify-between mb-8 px-2">
                    {steps.map((step) => (
                        <div key={step.id} className="flex flex-col items-center gap-2">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 font-bold ${currentStep >= step.id
                                ? 'bg-orange-500 border-orange-500 text-white shadow-[0_0_15px_rgba(255,85,32,0.4)]'
                                : 'bg-transparent border-white/10 text-gray-500'
                                }`}>
                                {currentStep > step.id ? <Check size={20} /> : step.id}
                            </div>
                            <span className={`text-xs font-medium uppercase tracking-wider ${currentStep >= step.id ? 'text-white' : 'text-gray-600'}`}>
                                {step.title}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Main Card */}
                <motion.div
                    className="glass-panel rounded-3xl p-8 md:p-12 relative overflow-hidden"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    {/* Background Glow */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-[100px] pointer-events-none"></div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            {currentStep === 1 && renderStep1()}
                            {currentStep === 2 && renderStep2()}
                            {currentStep === 3 && renderStep3()}
                            {currentStep === 4 && renderStep4()}
                            {currentStep === 5 && (
                                <div className="text-center py-12">
                                    <div className="w-24 h-24 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/30">
                                        <Check size={48} />
                                    </div>
                                    <h2 className="text-4xl font-bold text-white mb-4">Hammasi Tayyor! 🚀</h2>
                                    <p className="text-xl text-gray-400 max-w-md mx-auto">
                                        Ma'lumotlaringiz saqlandi. Endi siz uchun maxsus tayyorlangan dashboard'ga o'tamiz.
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {/* Footer Buttons */}
                    <div className="flex justify-between mt-12 pt-8 border-t border-white/10">
                        <button
                            onClick={prevStep}
                            disabled={currentStep === 1 || loading}
                            className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all ${currentStep === 1 ? 'opacity-0 cursor-default' : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <ChevronLeft size={20} /> Orqaga
                        </button>

                        <button
                            onClick={currentStep === 5 ? finishOnboarding : nextStep}
                            disabled={loading}
                            className="bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-gray-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Saqlanmoqda...' : currentStep === 5 ? "Boshlash" : "Keyingi"}
                            {!loading && <ChevronRight size={20} />}
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
