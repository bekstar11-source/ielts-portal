import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { X, Save, Shield, Clock, BookOpen, AlertTriangle, User } from 'lucide-react';
import { doc, updateDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { logAction } from '../../utils/logger';
import { useAuth } from '../../context/AuthContext';

export default function UserDetailPanel({ user, isOpen, onClose, onUpdate }) {
    const { theme } = useTheme();
    const { user: adminUser } = useAuth(); // Get current admin
    const isDark = theme === 'dark';

    const [formData, setFormData] = useState({
        fullName: '',
        phoneNumber: '',
        targetBand: '7.0',
        examDate: ''
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
                examDate: user.examDate || ''
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
                orderBy('date', 'desc'),
                limit(5)
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

    if (!isOpen || !user) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Panel */}
            <div className={`
                fixed inset-y-0 right-0 z-50 w-full md:w-[480px] shadow-2xl transform transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : 'translate-x-full'}
                ${isDark ? 'bg-[#1E1E1E] border-l border-white/10' : 'bg-white border-l border-gray-200'}
            `}>
                {/* Header */}
                <div className={`h-16 px-6 flex items-center justify-between border-b ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                    <h2 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>O'quvchi Ma'lumotlari</h2>
                    <button onClick={onClose} className={`p-2 rounded-lg transition ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="h-[calc(100vh-64px)] overflow-y-auto p-6 space-y-8 custom-scrollbar">

                    {/* Profile Header */}
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                            {user.fullName ? user.fullName.charAt(0).toUpperCase() : <User />}
                        </div>
                        <div>
                            <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{user.fullName}</h3>
                            <p className="text-gray-500 text-sm">{user.email}</p>
                            <div className="flex gap-2 mt-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${user.role === 'admin' ? 'bg-purple-500/10 text-purple-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                    {user.role || 'Student'}
                                </span>
                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${user.isBlocked ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                                    {user.isBlocked ? 'Blocked' : 'Active'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Form Fields */}
                    <div className="space-y-4">
                        <h4 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Shaxsiy Ma'lumotlar</h4>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Telefon raqam</label>
                                <input
                                    type="text"
                                    value={formData.phoneNumber}
                                    onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                                    className={`w-full p-2.5 rounded-xl border outline-none transition text-sm ${isDark ? 'bg-[#2C2C2C] border-white/5 text-white focus:border-blue-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500'}`}
                                    placeholder="+998..."
                                />
                            </div>
                            <div className="space-y-1">
                                <label className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Target Band</label>
                                <select
                                    value={formData.targetBand}
                                    onChange={e => setFormData({ ...formData, targetBand: e.target.value })}
                                    className={`w-full p-2.5 rounded-xl border outline-none transition text-sm ${isDark ? 'bg-[#2C2C2C] border-white/5 text-white focus:border-blue-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500'}`}
                                >
                                    {['5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0'].map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>
                            <div className="col-span-2 space-y-1">
                                <label className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Imtihon Sanasi</label>
                                <input
                                    type="date"
                                    value={formData.examDate}
                                    onChange={e => setFormData({ ...formData, examDate: e.target.value })}
                                    className={`w-full p-2.5 rounded-xl border outline-none transition text-sm ${isDark ? 'bg-[#2C2C2C] border-white/5 text-white/50 focus:border-blue-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500'}`}
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition active:scale-95 flex items-center justify-center gap-2"
                        >
                            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
                            Saqlash
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="space-y-4">
                        <h4 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Statistika & Natijalar</h4>

                        {loading ? (
                            <p className="text-sm text-gray-500">Yuklanmoqda...</p>
                        ) : recentResults.length > 0 ? (
                            <div className="space-y-2">
                                {recentResults.map((res, i) => (
                                    <div key={i} className={`flex justify-between items-center p-3 rounded-xl border ${isDark ? 'bg-[#2C2C2C] border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${isDark ? 'bg-white/5 text-blue-400' : 'bg-white text-blue-600'}`}>
                                                <BookOpen size={16} />
                                            </div>
                                            <div>
                                                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{res.testTitle || 'Test'}</p>
                                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                                    <Clock size={10} />
                                                    {res.date ? new Date(res.date.seconds * 1000).toLocaleDateString() : 'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="font-bold text-lg text-blue-500">{res.score || '-'}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 italic">Natijalar yo'q</p>
                        )}
                    </div>

                    {/* Danger Zone */}
                    <div className={`p-4 rounded-xl border border-red-500/20 ${isDark ? 'bg-red-500/5' : 'bg-red-50'}`}>
                        <h4 className="text-red-500 font-bold text-xs uppercase mb-2 flex items-center gap-2">
                            <AlertTriangle size={14} /> Xavfli Hudud
                        </h4>
                        <button
                            onClick={handleBlockToggle}
                            className={`w-full py-2 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-2
                                ${user.isBlocked
                                    ? 'border-green-500/30 text-green-500 hover:bg-green-500/10'
                                    : 'border-red-500/30 text-red-500 hover:bg-red-500/10'}
                            `}
                        >
                            <Shield size={14} />
                            {user.isBlocked ? "Blokdan chiqarish" : "Foydalanuvchini bloklash"}
                        </button>
                    </div>

                </div>
            </div>
        </>
    );
}
