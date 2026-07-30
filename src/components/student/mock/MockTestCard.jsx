import React, { useState } from 'react';
import { useTranslation } from '../../../context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Calendar, Clock, FileText, ChevronRight, 
    User, Fingerprint, Building2, Monitor, MapPin
} from 'lucide-react';
import { canAccessPremiumContent } from '../../../utils/subscription';

const MockTestCard = ({ test, tab, navigate, userData }) => {
    const { t, lang } = useTranslation();
    // Obuna muddatini ham hisobga oladi (utils/subscription)
    const isPremium = canAccessPremiumContent(userData);

    const handleReviewClick = () => {
        navigate(`/review/${test.resultId || test.id}`);
    };

    if (tab === 'past') {
        const isGraded = test.resultStatus === 'graded';
        const s = test.scores || {};
        
        // Helper to format score
        const fmt = (v) => {
            if (v === undefined || v === null || v === "") return "---";
            return Number(v).toFixed(1);
        };

        const testDate = test.startDate 
            ? new Date(test.startDate).toLocaleDateString(lang === 'uz' ? 'uz-UZ' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) 
            : '---';
        // TRF raqami natijaning ID sidan hosil qilinadi. Ilgari `Math.random()` render
        // ichida chaqirilardi va "rasmiy" sertifikat raqami har qayta chizilganda o'zgarardi.
        const trfSeed = String(test.resultId || test.id || test.mockKey || 'CANDIDATE');
        const trfHash = Array.from(trfSeed)
            .reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7)
            .toString(36)
            .toUpperCase()
            .padStart(6, '0')
            .slice(0, 6);
        const trfNumber = `26UZ${trfHash}${userData?.fullName?.slice(0, 3).toUpperCase() || 'CAN'}004A`;

        return (
            <article className="bg-gray-100/50 rounded-xl overflow-hidden border border-gray-200 shadow-sm mb-12">
                {/* Official Header Style */}
                <div className="bg-[#343a40] text-white px-6 py-3 flex justify-between items-center">
                    <h4 className="font-bold text-sm tracking-tight">IELTS on Computer Academic</h4>
                </div>

                {/* Candidate Info Bar */}
                <div className="bg-white border-b border-gray-200 px-6 py-6 grid grid-cols-2 md:grid-cols-5 gap-8">
                    <div className="space-y-3">
                        <User size={22} className="text-[#e31b23]" />
                        <div className="space-y-1">
                            <p className="text-[15px] font-black text-gray-900 leading-tight">{t('mock.testTakerName')}</p>
                            <p className="text-[13px] font-medium text-gray-600 truncate">{userData?.fullName || t('mock.candidate')}</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <Fingerprint size={22} className="text-gray-400" />
                        <div className="space-y-1">
                            <p className="text-[15px] font-black text-gray-900 leading-tight">{t('mock.testTakerId')}</p>
                            <p className="text-[13px] font-medium text-gray-600">501235</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <Building2 size={22} className="text-gray-400" />
                        <div className="space-y-1">
                            <p className="text-[15px] font-black text-gray-900 leading-tight">{t('mock.centreName')}</p>
                            <p className="text-[13px] font-medium text-gray-600">Englev</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <Calendar size={22} className="text-gray-400" />
                        <div className="space-y-1">
                            <p className="text-[15px] font-black text-gray-900 leading-tight">{t('mock.testDate')}</p>
                            <p className="text-[13px] font-medium text-gray-600">{testDate}</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <FileText size={22} className="text-gray-400" />
                        <div className="space-y-1">
                            <p className="text-[15px] font-black text-gray-900 leading-tight">{t('mock.trfNumber')}</p>
                            <p className="text-[13px] font-medium text-gray-600 truncate">{trfNumber}</p>
                        </div>
                    </div>
                </div>

                {/* Results Section */}
                <div className="p-8 space-y-8 bg-gray-50/30">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-[#e31b23] rounded-none"></div>
                            <h2 className="text-2xl font-bold text-gray-900">{t('mock.yourResult')}</h2>
                        </div>
                        <button
                            // Ilgari '/mock-exam' edi: mockData'siz imtihon ekranini ochib,
                            // eski zaxira ma'lumot bo'yicha BOSHQA imtihonni ishga tushirishi mumkin edi.
                            onClick={() => navigate('/mock-buy')}
                            className="flex items-center gap-2 text-sm font-bold text-[#e31b23] hover:underline"
                        >
                            <span>{t('mock.buyMockTest')}</span>
                        </button>
                    </div>

                    {!isGraded ? (
                        <div className="bg-orange-50 border border-orange-100 rounded-xl p-8 text-center space-y-3">
                            <Clock className="mx-auto text-orange-400 animate-pulse" size={32} />
                            <h3 className="font-bold text-orange-800 text-lg">{t('mock.processingResults')}</h3>
                            <p className="text-orange-600 text-sm max-w-md mx-auto">{t('mock.processingDesc')}</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Overall Band */}
                            <button 
                                onClick={handleReviewClick}
                                className="w-full bg-white hover:bg-gray-50 transition-all rounded-xl p-5 flex justify-between items-center group shadow-sm border border-gray-200"
                            >
                                <div className="text-left space-y-1">
                                    <span className="text-[18px] font-black text-gray-900">{t('mock.overall')}</span>
                                    <p className="text-[38px] font-black text-[#e31b23] leading-none tracking-tighter">{fmt(test.bandScore)}</p>
                                </div>
                                <ChevronRight size={24} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
                            </button>

                            {/* Skills Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { label: t('myResults.categories.listening'), key: 'listeningBand' },
                                    { label: t('myResults.categories.reading'), key: 'readingBand' },
                                    { label: t('myResults.categories.writing'), key: 'writingBand' },
                                    { label: t('myResults.categories.speaking'), key: 'speakingBand' }
                                ].map((skill) => {
                                    const baseKey = skill.key.replace('Band', '');
                                    const val = s[skill.key] ?? s[baseKey] ?? test[skill.key] ?? test[baseKey];
                                    
                                    return (
                                        <button 
                                            key={skill.label}
                                            onClick={handleReviewClick}
                                            className="bg-white hover:border-[#e31b23]/30 transition-all border border-gray-200 rounded-xl p-4 text-left space-y-3 group shadow-sm"
                                        >
                                            <div className="flex justify-between items-center">
                                                <span className="text-[16px] font-black text-gray-900">{skill.label}</span>
                                                <ChevronRight size={16} className="text-gray-300 group-hover:translate-x-0.5 transition-all" />
                                            </div>
                                            <p className="text-[28px] font-black text-[#e31b23] leading-none tracking-tighter">{fmt(val)}</p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="bg-white border-t border-gray-100 px-8 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4 text-gray-400">
                        <div className="flex items-center gap-2">
                            <Monitor size={14} />
                            <span className="text-[11px] font-bold uppercase tracking-wider">{t('mock.computer')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <MapPin size={14} />
                            <span className="text-[11px] font-bold uppercase tracking-wider">{t('mock.officialCenter')}</span>
                        </div>
                    </div>
                    <button 
                        onClick={handleReviewClick}
                        className="text-[#e31b23] text-sm font-bold hover:underline flex items-center gap-1 group"
                    >
                        {t('mock.viewFullReport')}
                        <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                    </button>
                </div>
            </article>
        );
    }

    return (
        <article className="border border-gray-300 rounded-md p-8 bg-white shadow-sm hover:border-[#e31b23]/30 transition-all group">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="space-y-4 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h4 className="text-xl font-bold text-gray-800">{test.title || "IELTS CD Academic Full Mock"}</h4>
                        <span className="text-[11px] font-bold text-[#e31b23] bg-red-50 px-2.5 py-1 rounded-full border border-red-100">{t('mock.unlocked')}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="flex items-center gap-3 text-gray-400">
                            <Calendar size={16} className="shrink-0" />
                            <div className="flex flex-col">
                                <span className="text-[11px] font-medium text-gray-400">{t('mock.scheduledDate')}</span>
                                <span className="text-sm font-semibold text-gray-700">{test.scheduledDate ? new Date(test.scheduledDate).toLocaleDateString(lang === 'uz' ? 'uz-UZ' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : t('mock.flexible')}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-gray-400">
                            <Monitor size={16} className="shrink-0" />
                            <div className="flex flex-col">
                                <span className="text-[11px] font-medium text-gray-400">{t('mock.testFormat')}</span>
                                <span className="text-sm font-semibold text-gray-700">{t('mock.officialComputer')}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-gray-400">
                            <MapPin size={16} className="shrink-0" />
                            <div className="flex flex-col">
                                <span className="text-[11px] font-medium text-gray-400">{t('mock.location')}</span>
                                <span className="text-sm font-semibold text-gray-700">{t('mock.onlineExamCenter')}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <button
                    onClick={() => {
                        // DIQQAT: bu yerda localStorage sessiyasini TOZALAMAYMIZ.
                        // Ilgari tozalanardi, lekin useMockExam tiklashda avval Firestore'ga
                        // qaraydi — ya'ni tozalash hech narsa bermasdi, faqat brauzer qulab
                        // tushgandan keyin qaytib kirgan talabaning zaxira nusxasini yo'q qilardi.
                        // Tugagan imtihon sessiyasi endi finishExam ichida o'chiriladi.
                        navigate('/mock-exam', { state: { mockData: test } });
                    }}
                    className="w-full md:w-auto px-10 py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 active:scale-95 bg-[#e31b23] text-white hover:bg-[#c4151c] shadow-lg shadow-red-900/20"
                >
                    {t('mock.startExam')}
                    <ChevronRight size={16} />
                </button>
            </div>
        </article>
    );
};

export default MockTestCard;
