import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { X, Save, Shield, Clock, BookOpen, AlertTriangle, User } from 'lucide-react';
import { doc, updateDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { logAction } from '../../utils/logger';
import { useAuth } from '../../context/AuthContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function UserDetailPanel({ user, isOpen, onClose, onUpdate }) {
    const { theme } = useTheme();
    const { user: adminUser } = useAuth();
    const isDark = theme === 'dark';

    const [formData, setFormData] = useState({
        fullName: '',
        phoneNumber: '',
        targetBand: '7.0',
        examDate: '',
        maxTestAttempts: 1
    });

    const [recentResults, setRecentResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({
                fullName: user.fullName || '',
                phoneNumber: user.phoneNumber || '',
                targetBand: user.targetBand || '7.0',
                examDate: user.examDate || '',
                maxTestAttempts: user.maxTestAttempts || 1
            });
            fetchRecentResults(user.id);
        }
    }, [user]);

    const fetchRecentResults = async (userId) => {
        setLoading(true);
        try {
            const q = query(
                collection(db, 'results'),
                where('userId', '==', userId),
                orderBy('date', 'asc'),
                limit(30)
            );
            const snap = await getDocs(q);
            setRecentResults(snap.docs.map(d => d.data()));
        } catch (error) {
            console.error("Error fetching results:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateDoc(doc(db, 'users', user.id), formData);
            onUpdate(user.id, formData);
            alert("Saqlandi!");
        } catch (error) {
            alert("Xatolik: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleBlockToggle = async () => {
        if (!window.confirm(user.isBlocked ? "Blokdan chiqarasizmi?" : "Bloklaysizmi?")) return;
        const action = user.isBlocked ? 'UNBLOCK_USER' : 'BLOCK_USER';
        try {
            await updateDoc(doc(db, 'users', user.id), { isBlocked: !user.isBlocked });
            logAction(adminUser.uid, action, { targetUserId: user.id, targetName: user.fullName });
            onUpdate(user.id, { isBlocked: !user.isBlocked });
        } catch (error) {
            alert("Xatolik: " + error.message);
        }
    };

    // Prepare chart data grouped by date & type
    const chartData = useMemo(() => {
        return recentResults.map((res, index) => {
            const point = { name: `T${index + 1}` };
            const type = (res.type || 'other').toLowerCase();
            const score = parseFloat(res.bandScore || res.score || 0);
            if (type === 'reading') point.reading = score;
            else if (type === 'listening') point.listening = score;
            else if (type === 'writing') point.writing = score;
            else if (type === 'speaking') point.speaking = score;
            else point.other = score;
            return point;
        });
    }, [recentResults]);

    const inputClass = `w-full p-2.5 rounded-xl border outline-none transition text-sm ${isDark ? 'bg-[#2C2C2C] border-white/5 text-white focus:border-blue-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500'}`;
    const labelClass = `text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`;
    const sectionTitle = `text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`;

    if (!isOpen || !user) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Centered Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                <div
                    className={`w-full max-w-6xl flex flex-col rounded-[32px] shadow-2xl transition-all duration-300 ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'} ${isDark ? 'bg-[#1E1E1E] border border-white/10' : 'bg-white border border-gray-100'}`}
                    style={{ maxHeight: 'calc(100vh - 48px)' }}
                >
                    {/* Header */}
                    <div className={`flex-shrink-0 h-16 px-6 flex items-center justify-between border-b ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                                {user.fullName ? user.fullName.charAt(0).toUpperCase() : <User size={16} />}
                            </div>
                            <div>
                                <h2 className={`font-bold text-base leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{user.fullName}</h2>
                                <p className="text-xs text-gray-500">{user.email}</p>
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold ml-2 ${user.isBlocked ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                                {user.isBlocked ? 'Bloklangan' : 'Faol'}
                            </span>
                        </div>
                        <button onClick={onClose} className={`p-2 rounded-xl transition ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                            <X size={20} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-1 lg:grid-cols-12">

                            {/* LEFT: Form */}
                            <div className={`lg:col-span-4 p-6 border-r ${isDark ? 'border-white/5' : 'border-gray-100'} space-y-6`}>
                                <div className="space-y-4">
                                    <h4 className={sectionTitle}>Shaxsiy Ma'lumotlar</h4>
                                    <div className="space-y-1">
                                        <label className={labelClass}>Telefon raqam</label>
                                        <input
                                            type="text"
                                            value={formData.phoneNumber}
                                            onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                                            className={inputClass}
                                            placeholder="+998..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className={labelClass}>Target Band</label>
                                            <select
                                                value={formData.targetBand}
                                                onChange={e => setFormData({ ...formData, targetBand: e.target.value })}
                                                className={inputClass}
                                            >
                                                {['5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0'].map(b => <option key={b} value={b}>{b}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className={labelClass}>Imtihon Sanasi</label>
                                            <input
                                                type="date"
                                                value={formData.examDate}
                                                onChange={e => setFormData({ ...formData, examDate: e.target.value })}
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className={labelClass}>Test urinishlari soni</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={formData.maxTestAttempts}
                                            onChange={e => setFormData({ ...formData, maxTestAttempts: parseInt(e.target.value) || 1 })}
                                            className={inputClass}
                                            placeholder="1 ta"
                                        />
                                    </div>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition active:scale-95 flex items-center justify-center gap-2 mt-2"
                                    >
                                        {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
                                        Saqlash
                                    </button>
                                </div>

                                {/* Recent Results List */}
                                <div className="space-y-3">
                                    <h4 className={sectionTitle}>So'nggi Natijalar</h4>
                                    {loading ? (
                                        <p className="text-sm text-gray-500">Yuklanmoqda...</p>
                                    ) : recentResults.length > 0 ? (
                                        <div className="space-y-2">
                                            {recentResults.slice().reverse().slice(0, 5).map((res, i) => (
                                                <div key={i} className={`flex justify-between items-center p-3 rounded-xl border ${isDark ? 'bg-[#2C2C2C] border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <div className={`p-2 rounded-lg flex-shrink-0 ${isDark ? 'bg-white/5 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                                                            <BookOpen size={14} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className={`text-xs font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{res.testTitle || 'Test'}</p>
                                                            <p className="text-[10px] text-gray-500 flex items-center gap-1">
                                                                <Clock size={9} />
                                                                {res.date ? new Date(res.date?.seconds ? res.date.seconds * 1000 : res.date).toLocaleDateString() : 'N/A'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <span className="font-bold text-base text-blue-500 ml-3 flex-shrink-0">{res.bandScore || res.score || '-'}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500 italic">Natijalar yo'q</p>
                                    )}
                                </div>

                                {/* Danger Zone */}
                                <div className={`p-4 rounded-2xl border border-red-500/20 ${isDark ? 'bg-red-500/5' : 'bg-red-50'}`}>
                                    <h4 className="text-red-500 font-bold text-xs uppercase mb-3 flex items-center gap-2">
                                        <AlertTriangle size={13} /> Xavfli Hudud
                                    </h4>
                                    <button
                                        onClick={handleBlockToggle}
                                        className={`w-full py-2 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${user.isBlocked ? 'border-green-500/40 text-green-500 hover:bg-green-500/10' : 'border-red-500/40 text-red-500 hover:bg-red-500/10'}`}
                                    >
                                        <Shield size={14} />
                                        {user.isBlocked ? "Blokdan chiqarish" : "Foydalanuvchini bloklash"}
                                    </button>
                                </div>
                            </div>

                            {/* RIGHT: Chart */}
                            <div className="lg:col-span-8 p-6 space-y-6">
                                <h4 className={sectionTitle}>O'sish Dinamikasi — Band Scores</h4>

                                <div className={`rounded-3xl border p-6 ${isDark ? 'border-white/5 bg-[#2C2C2C]' : 'border-gray-100 bg-gray-50'}`}>
                                    {loading ? (
                                        <div className="min-h-[340px] flex items-center justify-center">
                                            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                        </div>
                                    ) : chartData.length > 0 ? (
                                        <div style={{ height: 340 }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)"} vertical={false} />
                                                    <XAxis dataKey="name" stroke={isDark ? "#555" : "#ccc"} fontSize={12} tickMargin={10} />
                                                    <YAxis domain={[0, 9]} ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]} stroke={isDark ? "#555" : "#ccc"} fontSize={12} />
                                                    <Tooltip
                                                        contentStyle={{
                                                            backgroundColor: isDark ? '#1a1a1a' : '#fff',
                                                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                                                            borderRadius: '16px',
                                                            color: isDark ? '#fff' : '#111',
                                                            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                                                            fontSize: 13
                                                        }}
                                                        labelStyle={{ fontWeight: 'bold', marginBottom: '6px' }}
                                                    />
                                                    <Legend wrapperStyle={{ paddingTop: '20px', fontSize: 13 }} iconType="circle" />
                                                    <Line type="monotone" dataKey="reading" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 7 }} name="Reading" connectNulls />
                                                    <Line type="monotone" dataKey="listening" stroke="#a855f7" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 7 }} name="Listening" connectNulls />
                                                    <Line type="monotone" dataKey="writing" stroke="#f97316" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 7 }} name="Writing" connectNulls />
                                                    <Line type="monotone" dataKey="speaking" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 7 }} name="Speaking" connectNulls />
                                                    <Line type="monotone" dataKey="other" stroke="#94a3b8" strokeWidth={2} dot={{ r: 3 }} name="Boshqa" connectNulls />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    ) : (
                                        <div className="min-h-[340px] flex flex-col items-center justify-center text-gray-400 gap-3">
                                            <BookOpen size={40} className="opacity-20" />
                                            <p className="text-sm italic">Hali natijalar mavjud emas</p>
                                        </div>
                                    )}
                                </div>

                                {/* Stats summary */}
                                {recentResults.length > 0 && (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        {['reading', 'listening', 'writing', 'speaking'].map(type => {
                                            const typeResults = recentResults.filter(r => (r.type || '').toLowerCase() === type);
                                            const avg = typeResults.length > 0
                                                ? (typeResults.reduce((acc, r) => acc + parseFloat(r.bandScore || r.score || 0), 0) / typeResults.length).toFixed(1)
                                                : null;
                                            const colors = { reading: 'text-blue-400 border-blue-500/20 bg-blue-500/5', listening: 'text-purple-400 border-purple-500/20 bg-purple-500/5', writing: 'text-orange-400 border-orange-500/20 bg-orange-500/5', speaking: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' };
                                            return (
                                                <div key={type} className={`p-4 rounded-2xl border ${colors[type]} ${isDark ? '' : 'bg-opacity-30'}`}>
                                                    <p className="text-xs font-bold uppercase tracking-wider opacity-70 capitalize">{type}</p>
                                                    <p className="text-2xl font-bold mt-1">{avg ?? '—'}</p>
                                                    <p className="text-[10px] opacity-60 mt-0.5">{typeResults.length} ta natija</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
