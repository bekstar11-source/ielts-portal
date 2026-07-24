import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Loader2, Calendar, Clock, Sparkles } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, startOfWeek } from 'date-fns';
import { uz, enUS } from 'date-fns/locale';

export default function MockSuccessModal({
    t, lang, success, showCalendar, setShowCalendar, currentMock,
    viewDate, setViewDate, selectedDate, setSelectedDate,
    handleScheduleTest, handleStartTestNow, loading
}) {
    const calendarLocale = lang === 'uz' ? uz : enUS;
    
    // Calendar helpers
    const daysInMonth = eachDayOfInterval({
        start: startOfWeek(startOfMonth(viewDate), { weekStartsOn: 1 }),
        end: endOfMonth(viewDate)
    });
    
    const nextMonth = () => setViewDate(addMonths(viewDate, 1));
    const prevMonth = () => setViewDate(subMonths(viewDate, 1));
    
    return (
            <AnimatePresence>
                {success && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] bg-white/95 flex items-center justify-center p-6 backdrop-blur-sm">
                        {!showCalendar ? (
                            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-md bg-white border border-gray-300 rounded-md p-10 shadow-2xl">
                                <div className="text-center space-y-6">
                                    <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto">
                                        <Sparkles size={32} />
                                    </div>
                                    <div className="space-y-2">
                                        <h2 className="text-2xl font-bold text-gray-900">{t('mock.keyVerified')}</h2>
                                        <p className="text-gray-500 text-sm leading-relaxed">{t('mock.verifiedPrompt')}</p>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3 pt-4">
                                        <button onClick={() => {
                                            try { 
                                                const key = currentMock?.mockKey || currentMock?.id || 'default';
                                                localStorage.removeItem(`ielts_mock_session_${key}`); 
                                                localStorage.removeItem('ielts_mock_active_data');
                                            } catch(e) {}
                                            navigate('/mock-exam', { state: { mockData: currentMock } });
                                        }} className="w-full bg-[#e31b23] text-white py-4 rounded-xl font-bold text-sm hover:bg-[#c4151c] transition-all shadow-lg shadow-red-900/10">{t('mock.startNow')}</button>
                                        <button onClick={() => setShowCalendar(true)} className="w-full bg-gray-50 text-gray-600 py-4 rounded-xl font-bold text-sm hover:bg-gray-100 transition-all border border-gray-200">{t('mock.scheduleLater')}</button>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg">
                                {/* Calendar logic remains the same but with simplified Official IELTS styling */}
                                <div className="bg-white border border-gray-300 rounded-md p-10 shadow-2xl space-y-8">
                                    <div className="text-center">
                                        <h2 className="text-xl font-bold text-gray-900 tracking-tight">{t('mock.scheduleTitle')}</h2>
                                    </div>
                                    
                                    <div className="border border-gray-200 rounded-md p-6">
                                        <div className="flex items-center justify-between mb-8">
                                            <h3 className="font-bold text-[#e31b23]">
                                                {lang === 'uz' ? (
                                                    `${viewDate.getFullYear()}-yil ${['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'][viewDate.getMonth()]}`
                                                ) : (
                                                    `${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][viewDate.getMonth()]} ${viewDate.getFullYear()}`
                                                )}
                                            </h3>
                                            <div className="flex gap-2">
                                                <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="p-2 hover:bg-gray-50 rounded border border-gray-100"><ChevronRight className="rotate-180" size={16} /></button>
                                                <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="p-2 hover:bg-gray-50 rounded border border-gray-100"><ChevronRight size={16} /></button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-7 gap-1">
                                            {lang === 'uz' ? (
                                                ['Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan', 'Yak'].map(day => (
                                                    <div key={day} className="text-[10px] font-black text-gray-300 uppercase text-center py-2">{day}</div>
                                                ))
                                            ) : (
                                                ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                                    <div key={day} className="text-[10px] font-black text-gray-300 uppercase text-center py-2">{day}</div>
                                                ))
                                            )}

                                            {(() => {
                                                const days = [];
                                                const year = viewDate.getFullYear();
                                                const month = viewDate.getMonth();
                                                const firstDay = new Date(year, month, 1).getDay();
                                                const daysInMonth = new Date(year, month + 1, 0).getDate();
                                                const offset = firstDay === 0 ? 6 : firstDay - 1;
                                                for (let i = 0; i < offset; i++) days.push(<div key={`empty-${i}`} />);
                                                for (let d = 1; d <= daysInMonth; d++) {
                                                    const isSelected = selectedDate.getDate() === d && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;
                                                    days.push(
                                                        <button
                                                            key={`day-${d}`}
                                                            onClick={() => setSelectedDate(new Date(year, month, d))}
                                                            className={`aspect-square rounded flex items-center justify-center text-xs font-bold transition-all ${isSelected ? 'bg-[#e31b23] text-white' : 'text-gray-700 hover:bg-gray-50'}`}
                                                        >
                                                            {d}
                                                        </button>
                                                    );
                                                }
                                                return days;
                                            })()}
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <button onClick={() => setShowCalendar(false)} className="flex-1 py-4 border border-gray-200 rounded-xl font-bold text-sm text-gray-400 hover:bg-gray-50">{t('common.back')}</button>
                                        <button onClick={handleScheduleTest} disabled={loading} className="flex-[2] bg-[#e31b23] text-white py-4 rounded-xl font-bold text-sm hover:bg-[#c4151c] flex items-center justify-center gap-2">
                                            {loading ? <Loader2 className="animate-spin" size={16} /> : t('mock.confirmSchedule')}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
    );
}