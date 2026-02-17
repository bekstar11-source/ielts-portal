import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../firebase/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth'; // Import updateProfile
import { FaUser, FaBullseye, FaCalendarAlt, FaSave, FaArrowLeft, FaCamera, FaPhone } from 'react-icons/fa'; // Added FaCamera, FaPhone
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '../components/dashboard/DashboardHeader';

import PlanetBackground from '../components/dashboard/PlanetBackground'; // Import PlanetBackground

export default function Settings() {
    const { user, userData, logout } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        fullName: '',
        targetBand: '7.0',
        examDate: '',
        phoneNumber: '',
        photoURL: ''
    });
    const [imageFile, setImageFile] = useState(null); // File upload state
    const [imagePreview, setImagePreview] = useState(null); // Preview state
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (userData) {
            setFormData({
                fullName: userData.fullName || '',
                targetBand: userData.targetBand || '7.0',
                examDate: userData.examDate || '',
                phoneNumber: userData.phoneNumber || '',
                photoURL: userData.photoURL || ''
            });
            setImagePreview(userData.photoURL || null);
        }
    }, [userData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            let photoURL = formData.photoURL;

            // 1. Upload Image if Logic exists (agar yangi rasm tanlangan bo'lsa)
            if (imageFile) {
                const storageRef = ref(storage, `profile_pictures/${user.uid}`);
                await uploadBytes(storageRef, imageFile);
                photoURL = await getDownloadURL(storageRef);
            }

            // 2. Update Firestore
            await updateDoc(doc(db, 'users', user.uid), {
                fullName: formData.fullName,
                targetBand: parseFloat(formData.targetBand),
                examDate: formData.examDate,
                phoneNumber: formData.phoneNumber,
                photoURL: photoURL
            });

            // 3. Update Auth Profile (Muhim: Headerda darhol o'zgarishi uchun)
            await updateProfile(user, {
                displayName: formData.fullName,
                photoURL: photoURL
            });

            setMessage('Ma\'lumotlar muvaffaqiyatli saqlandi! ✅');
        } catch (error) {
            console.error("Settings save error:", error);
            setMessage('Xatolik yuz berdi. ❌');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`min-h-screen ${userData?.role === 'admin' ? '' : 'bg-[#050505]'} text-white font-sans selection:bg-orange-500/20`}>
            <style>{`
                body { 
                    background-color: ${userData?.role === 'admin' ? 'inherit' : '#050505'};
                }
            `}</style>

            {/* Show Header only for Students */}
            {userData?.role !== 'admin' && (
                <>
                    <DashboardHeader
                        user={user}
                        userData={userData}
                        activeTab="settings"
                        setActiveTab={() => { }}
                        onKeyClick={() => navigate('/dashboard')}
                        onLogoutClick={logout} // Enable Logout
                    />
                    <PlanetBackground />
                </>
            )}

            <div className={`max-w-3xl mx-auto p-6 ${userData?.role === 'admin' ? '' : 'relative z-10'}`}>
                {userData?.role !== 'admin' && (
                    <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-white/50 hover:text-white mb-6 transition">
                        <FaArrowLeft /> Bosh sahifa
                    </button>
                )}

                <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-500">
                        <FaUser />
                    </div>
                    {userData?.role === 'admin' ? 'Admin Profil Sozlamalari' : 'Profil Sozlamalari'}
                </h1>

                <div className={`${userData?.role === 'admin' ? 'bg-[#2C2C2C]' : 'bg-[#1A1A1A]'} rounded-3xl p-8 border border-white/5 shadow-2xl`}>
                    <form onSubmit={handleSubmit} className="space-y-8">

                        {/* --- AVATAR UPLOAD SECTION --- */}
                        <div className="flex flex-col items-center justify-center mb-8">
                            <div className="relative group cursor-pointer">
                                <div className={`w-32 h-32 rounded-full overflow-hidden border-4 ${loading ? 'border-orange-500/50 animate-pulse' : 'border-orange-500'} shadow-2xl transition-transform hover:scale-105`}>
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-[#333] flex items-center justify-center text-4xl text-white/20 font-bold">
                                            {formData.fullName ? formData.fullName.charAt(0).toUpperCase() : <FaUser />}
                                        </div>
                                    )}
                                </div>
                                <label htmlFor="profile-upload" className="absolute bottom-0 right-0 p-3 bg-white text-orange-600 rounded-full shadow-lg cursor-pointer hover:bg-gray-100 transition-colors">
                                    <FaCamera />
                                </label>
                                <input
                                    id="profile-upload"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageChange}
                                />
                            </div>
                            <p className="text-white/40 text-sm mt-4">Rasm yuklash uchun kamerani bosing</p>
                        </div>

                        {/* --- FORM FIELDS GRID --- */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Full Name */}
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-bold text-white/60 mb-2 uppercase tracking-wide">Ism Familiya</label>
                                <div className="relative">
                                    <FaUser className="absolute left-4 top-3.5 text-white/30" />
                                    <input
                                        type="text"
                                        name="fullName"
                                        value={formData.fullName}
                                        onChange={handleChange}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:border-orange-500 focus:outline-none transition"
                                        placeholder="Ismingiz"
                                    />
                                </div>
                            </div>

                            {/* Phone Number */}
                            <div>
                                <label className="block text-sm font-bold text-white/60 mb-2 uppercase tracking-wide">Telefon Raqam</label>
                                <div className="relative">
                                    <FaPhone className="absolute left-4 top-3.5 text-white/30" />
                                    <input
                                        type="tel"
                                        name="phoneNumber"
                                        value={formData.phoneNumber}
                                        onChange={handleChange}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:border-orange-500 focus:outline-none transition"
                                        placeholder="+998 90 123 45 67"
                                    />
                                </div>
                            </div>

                            {/* Target Band */}
                            <div>
                                <label className="block text-sm font-bold text-white/60 mb-2 uppercase tracking-wide">Target Band</label>
                                <div className="relative">
                                    <FaBullseye className="absolute left-4 top-3.5 text-white/30" />
                                    <select
                                        name="targetBand"
                                        value={formData.targetBand}
                                        onChange={handleChange}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:border-orange-500 focus:outline-none transition appearance-none cursor-pointer"
                                    >
                                        {['5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0', '8.5', '9.0'].map(band => (
                                            <option key={band} value={band}>{band}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Exam Date */}
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-bold text-white/60 mb-2 uppercase tracking-wide">Imtihon Sanasi</label>
                                <div className="relative">
                                    <FaCalendarAlt className="absolute left-4 top-3.5 text-white/30" />
                                    <input
                                        type="date"
                                        name="examDate"
                                        value={formData.examDate}
                                        onChange={handleChange}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:border-orange-500 focus:outline-none transition [color-scheme:dark]"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Message & Button */}
                        <div className="pt-6 flex items-center justify-between border-t border-white/5 mt-6">
                            <span className={`text-sm font-medium ${message.includes('❌') ? 'text-red-500' : 'text-green-500'}`}>
                                {message}
                            </span>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-8 py-3 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 transition active:scale-95 disabled:opacity-50 flex items-center gap-2"
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
