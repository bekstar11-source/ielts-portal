// src/pages/Login.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2, AlertCircle } from 'lucide-react';
// 🔥 Haqiqiy importlar
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      await login(email, password);
      navigate("/dashboard"); // Muvaffaqiyatli bo'lsa dashboardga
    } catch (err) {
      setError("Email yoki parol noto'g'ri!");
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7] relative overflow-hidden font-sans selection:bg-black selection:text-white">
        
        {/* Background Animation */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
            <motion.div 
              animate={{ rotate: 360, scale: [1, 1.1, 1] }}
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
              className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-teal-200/40 rounded-full blur-[100px] mix-blend-multiply"
            />
            <motion.div 
              animate={{ rotate: -360, scale: [1, 1.2, 1] }}
              transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
              className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-200/40 rounded-full blur-[100px] mix-blend-multiply"
            />
        </div>

        {/* Login Card */}
        <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md relative z-10 px-6"
        >
            <div className="bg-white/70 backdrop-blur-2xl p-8 md:p-10 rounded-[2rem] shadow-2xl border border-white/50">
                
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold tracking-tight text-[#1D1D1F] mb-2">Xush kelibsiz</h2>
                    <p className="text-gray-500 font-medium text-sm">IELTS Portal hisobingizga kiring</p>
                </div>
                
                {error && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-red-50 text-red-600 text-sm font-medium p-3 rounded-xl mb-6 border border-red-100 flex items-center gap-2"
                    >
                        <AlertCircle size={16} /> {error}
                    </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Email</label>
                        <input 
                            type="email" 
                            className="w-full px-4 py-3.5 rounded-2xl bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                            placeholder="name@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Parol</label>
                        <input 
                            type="password" 
                            className="w-full px-4 py-3.5 rounded-2xl bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    
                    <div className="pt-2">
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-[#1D1D1F] text-white py-4 rounded-full font-semibold text-lg hover:bg-black hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-xl shadow-black/10 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {loading ? (
                                <><Loader2 className="animate-spin" size={20} /> Kirilmoqda...</>
                            ) : (
                                <>Kirish <ArrowRight size={20} /></>
                            )}
                        </button>
                    </div>
                </form>

                <p className="mt-8 text-center text-gray-500 font-medium text-sm">
                    Hali a'zo emasmisiz?{" "}
                    {/* 🔥 Registerga havola */}
                    <Link to="/register" className="text-blue-600 font-bold hover:text-blue-700 transition-colors">
                        Ro'yxatdan o'tish
                    </Link>
                </p>
            </div>
            
            <div className="mt-8 text-center text-xs text-gray-400 font-medium">
                &copy; 2026 IELTS Portal. Secure Login.
            </div>
        </motion.div>
    </div>
  );
}