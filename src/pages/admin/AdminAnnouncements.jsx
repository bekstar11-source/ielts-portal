import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase/firebase';
import {
    collection, getDocs, addDoc, deleteDoc, doc, query, orderBy, serverTimestamp
} from 'firebase/firestore';
import { FaArrowLeft, FaBullhorn, FaPlus, FaTrash, FaCheck, FaInfoCircle, FaExclamationTriangle, FaTimes } from 'react-icons/fa';
import { useTheme } from '../../context/ThemeContext';


export default function AdminAnnouncements() {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [announcements, setAnnouncements] = useState([]);

    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ title: '', message: '', type: 'info' });
    const [processing, setProcessing] = useState(false);

    const fetchAnnouncements = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
            const snap = await getDocs(q);
            setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            console.error("Error fetching announcements:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!formData.title || !formData.message) return alert("Sarlavha va matn kiritilishi shart!");

        setProcessing(true);
        try {
            await addDoc(collection(db, 'announcements'), {
                ...formData,
                createdAt: serverTimestamp(),
                isActive: true
            });
            setShowModal(false);
            setFormData({ title: '', message: '', type: 'info' });
            fetchAnnouncements();
            alert("E'lon yaratildi!");
        } catch (error) {
            alert("Xatolik: " + error.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Haqiqatan ham bu e'lonni o'chirmoqchimisiz?")) {
            try {
                await deleteDoc(doc(db, 'announcements', id));
                fetchAnnouncements();
            } catch (error) {
                alert("Xatolik: " + error.message);
            }
        }
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'warning': return <FaExclamationTriangle className="text-orange-500" />;
            case 'success': return <FaCheck className="text-green-500" />;
            case 'danger': return <FaExclamationTriangle className="text-red-500" />;
            default: return <FaInfoCircle className="text-blue-500" />;
        }
    };

    const getTypeLabel = (type) => {
        switch (type) {
            case 'warning': return { text: 'Ogohlantirish', bg: 'bg-orange-500/10 text-orange-500 border-orange-500/20' };
            case 'success': return { text: 'Muvaffaqiyat', bg: 'bg-green-500/10 text-green-500 border-green-500/20' };
            case 'danger': return { text: 'Muhim', bg: 'bg-red-500/10 text-red-500 border-red-500/20' };
            default: return { text: 'Ma\'lumot', bg: 'bg-blue-500/10 text-blue-500 border-blue-500/20' };
        }
    };

    return (
        <div className={`min-h-full font-sans p-4 md:p-6 transition-colors duration-200 ${isDark ? 'bg-[#181715] text-white' : 'bg-[#F5F5F7] text-gray-900'}`}>

            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-6 md:mb-8">
                    <div className="flex items-center gap-3 md:gap-4 min-w-0">
                        <button onClick={() => navigate('/admin')} className={`p-2 shrink-0 rounded-xl transition ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white border border-gray-200 hover:bg-gray-50'}`}>

                            <FaArrowLeft />
                        </button>
                        <div className="min-w-0">
                            <h1 className={`text-lg md:text-2xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                <FaBullhorn className="text-yellow-500" />

                                E'lonlar Boshqaruvi
                            </h1>
                            <p className={`${isDark ? 'text-white/40' : 'text-gray-500'} text-xs md:text-sm`}>O'quvchilar uchun yangiliklar va xabarlar</p>
                        </div>

                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="shrink-0 px-3 md:px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-2 transition text-sm"
                    >
                        <FaPlus /> <span className="hidden sm:inline">Yangi E'lon</span>
                    </button>
                </div>

                {/* List */}
                <div className="grid gap-4">
                    {loading ? (
                        <div className={`text-center py-10 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>Yuklanmoqda...</div>
                    ) : announcements.length === 0 ? (
                        <div className={`text-center py-20 rounded-3xl border border-dashed transition-colors ${isDark ? 'bg-[#1f1e1b] border-white/5 text-white/30' : 'bg-white border-gray-200 text-gray-400'}`}>
                            Hozircha e'lonlar mavjud emas.
                        </div>
                    ) : (
                        announcements.map((item) => {
                            const typeStyle = getTypeLabel(item.type);
                            return (
                                <div key={item.id} className={`p-4 sm:p-5 rounded-2xl border flex justify-between items-start gap-2 group transition ${isDark ? 'bg-[#1f1e1b] border-white/5 hover:border-white/10' : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'}`}>
                                    <div className="flex gap-3 sm:gap-4 min-w-0">
                                        <div className={`w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-xl flex items-center justify-center text-lg sm:text-xl transition-colors ${isDark ? 'bg-white/5' : 'bg-gray-50 border border-gray-100'}`}>
                                            {getTypeIcon(item.type)}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <h3 className={`font-bold text-base sm:text-lg break-words ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.title}</h3>
                                                <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-bold ${typeStyle.bg}`}>
                                                    {typeStyle.text}
                                                </span>
                                            </div>
                                            <p className={`text-sm whitespace-pre-wrap break-words ${isDark ? 'text-white/60' : 'text-gray-600'}`}>{item.message}</p>
                                            <p className={`text-xs mt-2 ${isDark ? 'text-white/20' : 'text-gray-400'}`}>
                                                {item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000).toLocaleString() : 'Sana yo\'q'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className={`p-2 shrink-0 rounded-lg transition opacity-100 md:opacity-0 md:group-hover:opacity-100 ${isDark ? 'text-white/20 hover:text-red-500 hover:bg-red-500/10' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}
                                    >
                                        <FaTrash />
                                    </button>
                                </div>
                            );
                        })

                    )}
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className={`w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-3xl p-5 sm:p-6 border relative transition-colors ${isDark ? 'bg-[#1f1e1b] border-white/10' : 'bg-white border-gray-100 shadow-2xl'}`}>
                        <button onClick={() => setShowModal(false)} className={`absolute top-4 right-4 hover:text-white transition-colors ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                            <FaTimes />
                        </button>
                        <h2 className={`text-lg sm:text-xl font-bold mb-5 sm:mb-6 pr-8 ${isDark ? 'text-white' : 'text-gray-900'}`}>Yangi E'lon Yaratish</h2>

                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className={`block text-xs font-bold uppercase mb-1 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Sarlavha</label>
                                <input
                                    type="text"
                                    className={`w-full border rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-all ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                                    placeholder="Masalan: Ertaga Mock Imtihon!"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className={`block text-xs font-bold uppercase mb-1 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Xabar Matni</label>
                                <textarea
                                    className={`w-full border rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-all h-32 resize-none ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                                    placeholder="Batafsil ma'lumot..."
                                    value={formData.message}
                                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className={`block text-xs font-bold uppercase mb-1 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Turi</label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {['info', 'success', 'warning', 'danger'].map(type => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, type })}
                                            className={`p-2 rounded-lg border text-xs font-bold capitalize transition-all ${formData.type === type 
                                                ? (isDark ? 'bg-white text-black border-white' : 'bg-blue-600 text-white border-blue-600') 
                                                : (isDark ? 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10' : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50')}`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl mt-4 transition disabled:opacity-50"
                            >
                                {processing ? "Saqlanmoqda..." : "E'lonni Chop Etish"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
