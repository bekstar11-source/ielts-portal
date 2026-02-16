import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase/firebase';
import {
    collection, getDocs, addDoc, deleteDoc, doc, query, orderBy, serverTimestamp
} from 'firebase/firestore';
import { FaArrowLeft, FaBullhorn, FaPlus, FaTrash, FaCheck, FaInfoCircle, FaExclamationTriangle, FaTimes } from 'react-icons/fa';

export default function AdminAnnouncements() {
    const navigate = useNavigate();
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
        <div className="min-h-screen bg-[#1E1E1E] font-sans text-white p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/admin')} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition">
                            <FaArrowLeft />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                <FaBullhorn className="text-yellow-500" />
                                E'lonlar Boshqaruvi
                            </h1>
                            <p className="text-white/40 text-sm">O'quvchilar uchun yangiliklar va xabarlar</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-2 transition"
                    >
                        <FaPlus /> Yangi E'lon
                    </button>
                </div>

                {/* List */}
                <div className="grid gap-4">
                    {loading ? (
                        <div className="text-center py-10 text-white/40">Yuklanmoqda...</div>
                    ) : announcements.length === 0 ? (
                        <div className="text-center py-20 bg-[#272727] rounded-3xl border border-white/5 border-dashed text-white/30">
                            Hozircha e'lonlar mavjud emas.
                        </div>
                    ) : (
                        announcements.map((item) => {
                            const typeStyle = getTypeLabel(item.type);
                            return (
                                <div key={item.id} className="bg-[#272727] p-5 rounded-2xl border border-white/5 flex justify-between items-start group hover:border-white/10 transition">
                                    <div className="flex gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl bg-[#333]`}>
                                            {getTypeIcon(item.type)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-bold text-lg">{item.title}</h3>
                                                <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-bold ${typeStyle.bg}`}>
                                                    {typeStyle.text}
                                                </span>
                                            </div>
                                            <p className="text-white/60 text-sm whitespace-pre-wrap">{item.message}</p>
                                            <p className="text-white/20 text-xs mt-2">
                                                {item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000).toLocaleString() : 'Sana yo\'q'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="p-2 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition opacity-0 group-hover:opacity-100"
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
                    <div className="bg-[#2C2C2C] w-full max-w-md rounded-3xl p-6 border border-white/10 relative">
                        <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-white/40 hover:text-white">
                            <FaTimes />
                        </button>
                        <h2 className="text-xl font-bold mb-6">Yangi E'lon Yaratish</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-white/40 uppercase mb-1">Sarlavha</label>
                                <input
                                    type="text"
                                    className="w-full bg-[#222] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition"
                                    placeholder="Masalan: Ertaga Mock Imtihon!"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-white/40 uppercase mb-1">Xabar Matni</label>
                                <textarea
                                    className="w-full bg-[#222] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition h-32 resize-none"
                                    placeholder="Batafsil ma'lumot..."
                                    value={formData.message}
                                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-white/40 uppercase mb-1">Turi</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {['info', 'success', 'warning', 'danger'].map(type => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, type })}
                                            className={`p-2 rounded-lg border text-xs font-bold capitalize transition ${formData.type === type ? 'bg-white text-black border-white' : 'bg-[#222] text-white/40 border-white/5 hover:bg-[#333]'}`}
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
