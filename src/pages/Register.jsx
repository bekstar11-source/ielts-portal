// src/pages/Register.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2, AlertCircle, User, Mail, Lock, CheckCircle } from 'lucide-react';
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState(""); // 🔥 Yangi: Parolni tasdiqlash
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { signup } = useAuth(); // Haqiqiy AuthContext
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // 1. Validatsiya
    if (password !== confirmPassword) {
        return setError("Parollar mos kelmadi!");
    }
    if (password.length < 6) {
        return setError("Parol kamida 6 ta belgidan iborat bo'lishi kerak.");
    }

    setLoading(true);
    
    try {
      // 2. Firebasega yuborish
      await signup(email, password, fullName);
      navigate("/"); // Muvaffaqiyatli bo'lsa dashboardga
    } catch (err) {
      // Xatolarni ushlash
      if (err.code === 'auth/email-already-in-use') {
        setError("Bu email allaqachon ro'yxatdan o'tgan.");
      } else if (err.code === 'auth/invalid-email') {
        setError("Email noto'g'ri formatda.");
      } else {
        setError("Ro'yxatdan o'tishda xatolik yuz berdi: " + err.message);
      }
      console.error("Registration error:", err);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7] relative overflow-hidden font-sans selection:bg-[#0071e3] selection:text-white">
        
        {/* --- Background Animation --- */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
            <motion.div 
              animate={{ rotate: 360, scale: [1, 1.1, 1] }}
              transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
              className="absolute top-[-20%] right-[10%] w-[600px] h-[600px] bg-blue-200/40 rounded-full blur-[100px] mix-blend-multiply"
            />
            <motion.div 
              animate={{ rotate: -360, scale: [1, 1.2, 1] }}
              transition={{ duration: 55, repeat: Infinity, ease: "linear" }}
              className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-pink-200/40 rounded-full blur-[100px] mix-blend-multiply"
            />
        </div>

        {/* --- Register Card --- */}
        <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-[460px] relative z-10 px-6 py-10"
        >
            <div className="bg-white/80 backdrop-blur-2xl px-10 py-12 rounded-[24px] shadow-xl border border-white/60">
                
                {/* Header */}
                <div className="text-center mb-10">
                    <h2 className="text-[32px] leading-tight font-semibold tracking-tight text-[#1d1d1f] mb-3">
                      Ro'yxatdan o'tish
                    </h2>
                    <p className="text-[#86868b] text-[17px] leading-relaxed font-normal">
                      Yangi imkoniyatlar dunyosiga xush kelibsiz
                    </p>
                </div>
                
                {/* Error Message */}
                {error && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-red-50/80 text-red-600 text-[15px] font-medium p-3 rounded-xl mb-6 border border-red-100 flex items-center gap-2"
                    >
                        <AlertCircle size={18} /> {error}
                    </motion.div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    
                    {/* Full Name */}
                    <div className="space-y-1.5">
                        <label className="block text-[12px] font-medium text-[#86868b] uppercase tracking-wide ml-1">
                          To'liq ism
                        </label>
                        <div className="relative group">
                            <input 
                                type="text" 
                                className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-[#f5f5f7]/50 border border-[#d2d2d7] text-[#1d1d1f] text-[17px] placeholder-[#86868b] focus:outline-none focus:ring-4 focus:ring-[#0071e3]/10 focus:border-[#0071e3] transition-all duration-200"
                                placeholder="Ism Familiya"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required
                            />
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868b] group-focus-within:text-[#1d1d1f] transition-colors" size={20} strokeWidth={1.5} />
                        </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                        <label className="block text-[12px] font-medium text-[#86868b] uppercase tracking-wide ml-1">
                          Email
                        </label>
                        <div className="relative group">
                            <input 
                                type="email" 
                                className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-[#f5f5f7]/50 border border-[#d2d2d7] text-[#1d1d1f] text-[17px] placeholder-[#86868b] focus:outline-none focus:ring-4 focus:ring-[#0071e3]/10 focus:border-[#0071e3] transition-all duration-200"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868b] group-focus-within:text-[#1d1d1f] transition-colors" size={20} strokeWidth={1.5} />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                        <label className="block text-[12px] font-medium text-[#86868b] uppercase tracking-wide ml-1">
                          Parol
                        </label>
                        <div className="relative group">
                            <input 
                                type="password" 
                                className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-[#f5f5f7]/50 border border-[#d2d2d7] text-[#1d1d1f] text-[17px] placeholder-[#86868b] focus:outline-none focus:ring-4 focus:ring-[#0071e3]/10 focus:border-[#0071e3] transition-all duration-200"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868b] group-focus-within:text-[#1d1d1f] transition-colors" size={20} strokeWidth={1.5} />
                        </div>
                    </div>

                    {/* 🔥 NEW: Confirm Password */}
                    <div className="space-y-1.5">
                        <label className="block text-[12px] font-medium text-[#86868b] uppercase tracking-wide ml-1">
                          Parolni tasdiqlash
                        </label>
                        <div className="relative group">
                            <input 
                                type="password" 
                                className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-[#f5f5f7]/50 border border-[#d2d2d7] text-[#1d1d1f] text-[17px] placeholder-[#86868b] focus:outline-none focus:ring-4 focus:ring-[#0071e3]/10 focus:border-[#0071e3] transition-all duration-200"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                            {password && confirmPassword && password === confirmPassword ? (
                                <CheckCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 text-green-500 transition-colors" size={20} strokeWidth={1.5} />
                            ) : (
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868b] group-focus-within:text-[#1d1d1f] transition-colors" size={20} strokeWidth={1.5} />
                            )}
                        </div>
                    </div>
                    
                    <div className="pt-4">
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-[#1d1d1f] text-white py-[14px] rounded-full font-medium text-[17px] tracking-tight hover:bg-black hover:scale-[1.01] active:scale-[0.98] transition-all duration-200 shadow-md flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {loading ? (
                                <><Loader2 className="animate-spin" size={20} /> Yuklanmoqda...</>
                            ) : (
                                <>Ro'yxatdan o'tish <ArrowRight size={20} strokeWidth={2} /></>
                            )}
                        </button>
                    </div>
                </form>

                {/* Footer Link */}
                <p className="mt-10 text-center text-[#86868b] text-[15px] font-normal">
                    Akkauntingiz bormi?{" "}
                    <Link to="/login" className="text-[#0071e3] font-medium hover:underline transition-colors">
                        Kirish
                    </Link>
                </p>
            </div>
            
            {/* Simple Footer */}
            <div className="mt-8 text-center text-[12px] text-[#86868b] font-normal">
                Copyright © 2026 IELTS Portal. All rights reserved.
            </div>
        </motion.div>
    </div>
  );
}