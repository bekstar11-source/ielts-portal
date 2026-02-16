import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2, AlertCircle, User, Mail, Lock, Sparkles } from 'lucide-react';
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { db, auth } from "../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";
import PlanetBackground from '../components/dashboard/PlanetBackground';

export default function Register() {
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const { signup, signInWithGoogle } = useAuth();
    const navigate = useNavigate();

    const handleGoogleLogin = async () => {
        try {
            await signInWithGoogle();
            const user = auth.currentUser;
            if (user) {
                const docRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const userData = docSnap.data();
                    if (userData.role === 'admin') navigate('/admin');
                    else navigate('/dashboard');
                } else {
                    navigate('/dashboard');
                }
            }
        } catch (err) {
            setError("Google orqali ro'yxatdan o'tishda xatolik!");
            console.error(err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (password.length < 6) {
            return setError("Parol kamida 6 ta belgidan iborat bo'lishi kerak.");
        }

        setLoading(true);

        try {
            await signup(email, password, fullName);
            navigate("/");
        } catch (err) {
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
        <div className="min-h-screen flex items-center justify-center bg-[#050505] relative overflow-hidden font-sans selection:bg-[#FF5520] selection:text-white">
            <style>{`
            .glass-form {
                background: rgba(10, 10, 10, 0.6);
                backdrop-filter: blur(25px);
                -webkit-backdrop-filter: blur(25px);
                border: 1px solid rgba(255, 255, 255, 0.08);
                box-shadow: 0 20px 50px rgba(0,0,0,0.5);
            }

            .input-field {
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.08);
                color: white;
                transition: all 0.3s ease;
            }
            
            .input-field:focus {
                background: rgba(255, 255, 255, 0.05);
                border-color: #FF5520;
                box-shadow: 0 0 0 1px rgba(255, 85, 32, 0.2);
                outline: none;
            }

            .btn-primary {
                background: #FF5520;
                box-shadow: 0 0 20px rgba(255, 85, 32, 0.3);
                transition: all 0.3s ease;
            }
            
            .btn-primary:hover {
                background: #FF7A50;
                box-shadow: 0 0 30px rgba(255, 85, 32, 0.5);
                transform: translateY(-1px);
            }
        `}</style>

            <PlanetBackground />

            <div className="w-full max-w-md mx-4 relative z-10">

                <div className="text-center mb-8 animate-fade-in-up">
                    {/* Reusing the same header or similar */}
                    <h2 class="text-3xl font-bold tracking-tight text-white mb-2">Vetra<span className="text-[#FF5520]">IELTS</span></h2>
                    <p className="text-[#9CA3AF] text-sm">Yangi hisob yaratish</p>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="glass-form rounded-3xl p-8 md:p-10"
                >

                    {/* REGISTER VIEW */}
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-6">Ro'yxatdan o'tish</h2>

                        {error && (
                            <div className="bg-red-500/10 text-red-500 text-sm font-medium p-3 rounded-xl mb-6 border border-red-500/20 flex items-center gap-2">
                                <AlertCircle size={16} /> {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">

                            {/* Full Name */}
                            <div>
                                <label className="block text-xs font-medium text-[#9CA3AF] mb-1.5 uppercase tracking-wide">To'liq Ism</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                    <input
                                        type="text"
                                        placeholder="Aziza Abdullayeva"
                                        className="input-field w-full rounded-xl py-3.5 pl-12 pr-4 text-sm placeholder-gray-600"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-xs font-medium text-[#9CA3AF] mb-1.5 uppercase tracking-wide">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                    <input
                                        type="email"
                                        placeholder="student@example.com"
                                        className="input-field w-full rounded-xl py-3.5 pl-12 pr-4 text-sm placeholder-gray-600"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-xs font-medium text-[#9CA3AF] mb-1.5 uppercase tracking-wide">Parol</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        className="input-field w-full rounded-xl py-3.5 pl-12 pr-4 text-sm placeholder-gray-600"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : (
                                    <>
                                        Boshlash
                                        <Sparkles className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-8 text-center">
                            <p className="text-sm text-gray-500">
                                Akkauntingiz bormi?{" "}
                                <Link to="/login" className="text-white font-semibold hover:text-[#FF5520] transition-colors ml-1">
                                    Kirish
                                </Link>
                            </p>
                        </div>
                    </div>

                    {/* Social Login Divider */}
                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/10"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-[#0a0a0a] text-gray-500">Yoki</span>
                        </div>
                    </div>

                    {/* Social Buttons */}
                    <div className="grid grid-cols-1 gap-4">
                        <button
                            onClick={handleGoogleLogin}
                            className="flex items-center justify-center gap-2 py-3 border border-white/10 rounded-xl hover:bg-white/5 transition-colors text-sm font-medium text-white"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Google orqali ro'yxatdan o'tish
                        </button>
                    </div>

                </motion.div>
            </div>
        </div>
    );
}