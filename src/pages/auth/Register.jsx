import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence, motionValue, useAnimationFrame } from 'framer-motion';
import { Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { db } from "../../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from '../../context/LanguageContext';
import Logo from '../../components/common/Logo';

const ScrollingComments = () => {
    const [isHovered, setIsHovered] = useState(false);
    const y = useMemo(() => motionValue(0), []);
    const { t } = useTranslation();

    const testimonials = t('auth.testimonials') || [];
    
    useAnimationFrame((time, delta) => {
        // Normal speed is ~1px per 35ms, hover speed is much slower.
        // delta is in ms. speed = pixels per ms.
        const normalSpeed = 0.8; // px per frame approx
        const hoverSpeed = 0.15;
        const currentSpeed = isHovered ? hoverSpeed : normalSpeed;
        
        let nextY = y.get() - currentSpeed;
        if (nextY <= -1000) nextY = 0;
        y.set(nextY);
    });

    return (
        <div 
            className="relative h-[450px] overflow-hidden flex flex-col items-center"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <motion.div
                style={{ y, willChange: "transform", translateZ: 0 }}
                className="space-y-6 w-full"
            >
                {[...testimonials, ...testimonials, ...testimonials].map((item, i) => (
                    <motion.div 
                        key={i} 
                        whileHover={{ backgroundColor: "#fafafa" }}
                        className="p-5 bg-white border border-[#eee] rounded-3xl shadow-sm transition-colors duration-300"
                    >
                        <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center text-[10px] font-bold text-white">
                                    {item.name ? item.name[0] : ''}
                                </div>
                                <span className="text-black font-bold text-[13px] tracking-tight">{item.name}</span>
                            </div>
                            <span className="text-white text-[10px] font-extrabold bg-black px-2.5 py-0.5 rounded-full tracking-tighter uppercase font-mono">BAND {item.score}</span>
                        </div>
                        <p className="text-[#666] text-[13px] leading-[1.6] font-medium tracking-tight">
                            <span className="text-black opacity-20 text-lg leading-none mr-1">“</span>
                            {item.text}
                        </p>
                    </motion.div>
                ))}
            </motion.div>
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#f5f5f7] via-transparent to-[#f5f5f7]" />
        </div>
    );
};

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1); // 1: Name & Email, 2: Password
  const { t } = useTranslation();

  const { signup, signInWithGoogle, user, isGuest } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // ⚠️ Trialni yechgan mehmonda ham `user` to'ldirilgan (anonim sessiya).
    // `isGuest` ni tekshirmasak, u ro'yxatdan o'tish sahifasini umuman
    // ko'rmasdi: bu effekt darhol `/dashboard` ga uloqtirardi, `ProtectedRoute`
    // esa mehmonni `/` ga qaytarardi — ya'ni "registratsiya ochilmayapti".
    if (user && !isGuest) {
      const redirectAfterGoogleLogin = async () => {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && docSnap.data().role === 'admin') navigate('/admin');
          else navigate('/dashboard');
        } catch (err) {
          console.error("Error checking redirect after Google sign-in:", err);
          navigate('/dashboard');
        }
      };
      redirectAfterGoogleLogin();
    }
  }, [user, isGuest, navigate]);

  const handleGoogleLogin = async () => {
    try {
      setError("");
      setLoading(true);
      await signInWithGoogle();
      // The `user` effect above handles navigation once auth state propagates.
    } catch (err) {
      setError(t('auth.errorGoogle'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step === 1) {
        if (fullName.length < 3) return setError(t('auth.errorFullNameShort'));
        if (!email.includes('@')) return setError(t('auth.errorInvalidEmailFormat'));
        setError("");
        setStep(2);
        return;
    }

    if (password.length < 6) {
        return setError(t('auth.errorPasswordShort'));
    }

    setError("");
    setLoading(true);

    try {
      await signup(email, password, fullName);
      navigate("/dashboard");
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError(t('auth.errorEmailInUse'));
      } else {
        setError(t('auth.errorGeneric'));
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white font-sans selection:bg-black/10 selection:text-black">
      {/* Left Side - Register Form */}
      <div className="flex-[1.4] flex flex-col justify-center items-center px-6 py-12 md:px-24 bg-white relative z-10 border-r border-[#f0f0f0]">
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-[300px]"
        >

          <div className="text-center mb-8 flex flex-col items-center">
            <Logo to="/" tone="ink" size="lg" className="mb-6" />
            <h1 className="text-2xl font-bold text-[#1a1a1a] tracking-tight mb-2">
              {t('auth.registerTitle')}
            </h1>
            <p className="text-[#666] text-[14px] font-medium leading-relaxed">
              {t('auth.registerSubtitle')}
            </p>
          </div>

          {error && (
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-50 text-red-600 text-[12px] p-2.5 rounded-lg mb-5 flex items-center gap-2 border border-red-100"
            >
              <AlertCircle size={13} className="shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          <div className="space-y-3.5">
            {/* Google Login */}
            {step === 1 && (
                <>
                    <button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-[#1a1a1a] hover:bg-black text-white rounded-lg transition-all duration-200 text-[13px] font-bold active:scale-[0.98] disabled:opacity-50"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        {t('auth.googleStart')}
                    </button>

                    <div className="flex items-center gap-4 py-2">
                        <div className="flex-1 border-t border-[#f0f0f0]"></div>
                        <div className="text-[11px] font-bold text-[#666]">{t('auth.or')}</div>
                        <div className="flex-1 border-t border-[#f0f0f0]"></div>
                    </div>
                </>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <AnimatePresence mode="wait">
                {step === 1 ? (
                    <motion.div
                        key="fields"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="space-y-3"
                    >
                        <input
                            type="text"
                            placeholder={t('auth.fullNamePlaceholder')}
                            className="w-full px-5 py-2.5 bg-[#f5f5f7] border-transparent border focus:border-black/10 focus:bg-white rounded-lg outline-none transition-all duration-200 text-[13px] font-medium text-[#1a1a1a] placeholder-[#bbb]"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                        />
                        <input
                            type="email"
                            placeholder={t('auth.emailPlaceholder')}
                            className="w-full px-5 py-2.5 bg-[#f5f5f7] border-transparent border focus:border-black/10 focus:bg-white rounded-lg outline-none transition-all duration-200 text-[13px] font-medium text-[#1a1a1a] placeholder-[#bbb]"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <button
                            type="submit"
                            className="w-full !mt-8 py-2.5 bg-[#1a1a1a] hover:bg-black text-white rounded-lg text-[13px] font-bold transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98]"
                        >
                            {t('auth.continue')}
                            <ArrowRight size={14} />
                        </button>
                    </motion.div>
                ) : (
                    <motion.div
                        key="password"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="space-y-3.5"
                    >
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder={t('auth.passwordCreatePlaceholder')}
                                className="w-full px-5 py-2.5 bg-[#f5f5f7] border-transparent border focus:border-black/10 focus:bg-white rounded-lg outline-none transition-all duration-200 text-[13px] font-medium text-[#1a1a1a] placeholder-[#bbb]"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoFocus
                                required
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#aaa] hover:text-[#1a1a1a]"
                            >
                                {showPassword ? t('auth.hide') : t('auth.show')}
                            </button>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full !mt-8 py-2.5 bg-[#1a1a1a] hover:bg-black text-white rounded-lg text-[13px] font-bold transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98]"
                        >
                            {loading ? <Loader2 className="animate-spin w-4 h-4" /> : t('auth.createAccountBtn')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="w-full text-[12px] font-bold text-[#aaa] hover:text-[#1a1a1a]"
                        >
                            {t('auth.back')}
                        </button>
                    </motion.div>
                )}
              </AnimatePresence>
            </form>

            <div className="pt-4 text-center">
              <p className="text-[12px] text-[#aaa] font-medium">
                {t('auth.hasAccount')}{" "}
                <Link to="/login" className="text-[#888] font-bold hover:text-[#1a1a1a] transition-all underline underline-offset-4 decoration-[#FF5520]/20">
                  {t('auth.signInNow')}
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
        
        {/* Footer */}
        <div className="absolute bottom-6 text-[10px] text-[#ccc] font-medium tracking-wide flex gap-4 uppercase">
            <a href="#" className="hover:text-[#999]">{t('footer.privacy')}</a>
            <a href="#" className="hover:text-[#999]">{t('footer.termsOfUse')}</a>
            <span>&copy; 2024 ENGLEV</span>
        </div>
      </div>

      {/* Right Side - Animation */}
      <div className="hidden lg:flex flex-[0.8] bg-[#f5f5f7] relative items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-white/50" />
        
        {/* Animated Squares Grid */}
        <div className="relative z-10 w-full px-10">
            <div className="mb-10">
            <div className="mb-12">
                <motion.h2 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-3xl font-bold text-black leading-tight mb-4 tracking-[-0.03em]"
                >
                    {t('auth.testimonialsTitle')}
                </motion.h2>
            </div>

            <div className="relative w-full max-w-[340px]">
                <ScrollingComments />
            </div>
        </div>
        </div>

        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#FF5520]/5 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/5 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/3" />
      </div>
    </div>
  );
}
