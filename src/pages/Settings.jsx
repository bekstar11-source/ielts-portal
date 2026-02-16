import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { FaUser, FaBullseye, FaCalendarAlt, FaSave, FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '../components/dashboard/DashboardHeader';

export default function Settings() {
    const { user, userData } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        fullName: '',
        targetBand: '7.0',
        examDate: '',
        phoneNumber: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (userData) {
            setFormData({
                fullName: userData.fullName || '',
                targetBand: userData.targetBand || '7.0',
                examDate: userData.examDate || '',
                phoneNumber: userData.phoneNumber || ''
            });
        }
    }, [userData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        try {
            await updateDoc(doc(db, 'users', user.uid), {
                fullName: formData.fullName,
                targetBand: parseFloat(formData.targetBand),
                examDate: formData.examDate,
                phoneNumber: formData.phoneNumber
            });
            setMessage('Ma\'lumotlar muvaffaqiyatli saqlandi! ✅');
        } catch (error) {
            console.error(error);
            setMessage('Xatolik yuz berdi. ❌');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0F0F0F] text-white font-sans">
            <DashboardHeader />
            <div className="max-w-2xl mx-auto p-6 pt-24">
                <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-white/50 hover:text-white mb-6 transition">
                    <FaArrowLeft /> Bosh sahifa
                </button>

                <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-500">
                        <FaUser />
                    </div>
                    Profil Sozlamalari
                </h1>

                <div className="bg-[#1A1A1A] rounded-2xl p-8 border border-white/5 shadow-xl">
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Full Name */}
                        <div>
                            <label className="block text-sm font-bold text-white/60 mb-2 uppercase tracking-wide">Ism Familiya</label>
                            <div className="relative">
                                <FaUser className="absolute left-4 top-3.5 text-white/30" />
                                <input
                                    type="text"
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    className="w-full bg-[#111] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:border-orange-500 focus:outline-none transition"
                                    placeholder="Ismingiz"
                                />
                            </div>
                        </div>

                        {/* Target Band */}
                        <div>
                            <label className="block text-sm font-bold text-white/60 mb-2 uppercase tracking-wide">Target Band (Maqsad)</label>
                            <div className="relative">
                                <FaBullseye className="absolute left-4 top-3.5 text-white/30" />
                                <select
                                    name="targetBand"
                                    value={formData.targetBand}
                                    onChange={handleChange}
                                    className="w-full bg-[#111] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:border-orange-500 focus:outline-none transition appearance-none cursor-pointer"
                                >
                                    {['5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0', '8.5', '9.0'].map(band => (
                                        <option key={band} value={band}>{band}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Exam Date */}
                        <div>
                            <label className="block text-sm font-bold text-white/60 mb-2 uppercase tracking-wide">Imtihon Sanasi</label>
                            <div className="relative">
                                <FaCalendarAlt className="absolute left-4 top-3.5 text-white/30" />
                                <input
                                    type="date"
                                    name="examDate"
                                    value={formData.examDate}
                                    onChange={handleChange}
                                    className="w-full bg-[#111] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:border-orange-500 focus:outline-none transition [color-scheme:dark]"
                                />
                            </div>
                        </div>

                        {/* Message & Button */}
                        <div className="pt-4 flex items-center justify-between">
                            <span className={`text-sm font-medium ${message.includes('❌') ? 'text-red-500' : 'text-green-500'}`}>
                                {message}
                            </span>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-8 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 transition active:scale-95 disabled:opacity-50 flex items-center gap-2"
                            >
                                {loading ? 'Saqlanmoqda...' : <><FaSave /> Saqlash</>}
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
}
