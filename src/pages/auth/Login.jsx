import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; // eslint-disable-line no-unused-vars
import { Loader2, AlertCircle, ArrowRight, MailCheck } from 'lucide-react';
import { db, auth } from "../../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../firebase/firebase";
import { signInWithCustomToken } from "firebase/auth";
import { Send } from 'lucide-react';
import { useTranslation } from '../../context/LanguageContext';

// Telegram deep-link'dagi `start` parametri 64 belgidan oshmasligi kerak,
// shuning uchun hash'ning dastlabki 40 ta hex belgisi olinadi (160 bit).
// Server tomonidagi juftligi: functions/telegramLogin.js → deriveSessionId
const SESSION_ID_LENGTH = 40;
const TELEGRAM_POLL_INTERVAL_MS = 2000;
const TELEGRAM_LOGIN_TIMEOUT_MS = 5 * 60 * 1000;

const deriveSessionId = async (pollKey) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pollKey));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, SESSION_ID_LENGTH);
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1); // 1: Email, 2: Password, 3: Telegram Phone, 4: Telegram OTP, 5: Telegram Auto-Auth, 6: Parolni tiklash
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [telegramSessionId, setTelegramSessionId] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const { t } = useTranslation();

  const { login, signInWithGoogle, resetPassword, user } = useAuth();
  const navigate = useNavigate();
  const unsubscribeRef = useRef(null);
  const telegramWindowRef = useRef(null);

  useEffect(() => {
    if (user) {
      const checkOnboardingAndRedirect = async () => {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const userData = docSnap.data();
            if (userData.role === 'admin') navigate('/admin');
            else if (userData.onboardingCompleted === false) navigate('/onboarding');
            else navigate('/dashboard');
          } else {
            navigate('/dashboard');
          }
        } catch (err) {
          console.error("Error checking onboarding redirect:", err);
          navigate('/dashboard');
        }
      };
      checkOnboardingAndRedirect();
    }
  }, [user, navigate]);

  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setError("");
      setLoading(true);
      const result = await signInWithGoogle();
      if (!result) return; // user closed the popup — nothing to do
      // Google popup resolves synchronously; the `user` effect above also
      // handles navigation once auth state propagates.
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
        if (email.includes('@')) setStep(2);
        else setError(t('auth.errorInvalidEmail'));
        return;
    }

    setError("");
    setLoading(true);

    try {
      await login(email, password);
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
      setError(t('auth.errorInvalidCredentials'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!email.includes('@')) {
      setError(t('auth.errorInvalidEmail'));
      return;
    }

    setError("");
    setLoading(true);
    try {
      await resetPassword(email);
      setResetSent(true);
    } catch (err) {
      console.error("Password reset error:", err);
      if (err.code === 'auth/invalid-email') {
        setError(t('auth.errorInvalidEmail'));
      } else if (err.code === 'auth/too-many-requests') {
        setError(t('auth.resetErrorTooMany'));
      } else if (err.code === 'auth/user-not-found') {
        // Email enumeration'ni oshkor qilmaslik uchun muvaffaqiyat deb ko'rsatamiz.
        setResetSent(true);
      } else {
        setError(t('auth.errorGeneric'));
      }
    } finally {
      setLoading(false);
    }
  };

  const openResetStep = () => {
    setError("");
    setResetSent(false);
    setStep(6);
  };

  const handleTelegramLogin = async () => {
    // Avvalgi kuzatuvchini to'xtatamiz
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    // `pollKey` — maxfiy, faqat SHU brauzerda qoladi va hech qayerga
    // yuborilmaydi (Telegram'ga ham, havolaga ham). Deep link'ka esa uning
    // sha256 hash'i tushadi. Shu sababli havolani ko'rgan odam (Telegram
    // serverlari, chatdagi xabar, brauzer tarixi) tokenni ololmaydi.
    // Serverdagi juftligi: functions/telegramLogin.js
    let pollKey;
    let sessionId;
    try {
      pollKey = `${crypto.randomUUID()}${crypto.randomUUID()}`;
      sessionId = await deriveSessionId(pollKey);
    } catch (cryptoErr) {
      console.error("Web Crypto mavjud emas:", cryptoErr);
      setError(t('auth.errorGeneric'));
      return;
    }

    setTelegramSessionId(sessionId);
    setError("");

    // Open telegram bot with deep link to trigger /start immediately
    const telegramUrl = `https://t.me/ielts_portal_auth_bot?start=login_${sessionId}`;
    const win = window.open(telegramUrl, "_blank");
    telegramWindowRef.current = win;
    setStep(5); // Go to new auto-auth screen

    // Tokenni Firestore'dan EMAS, `claimTelegramLogin` callable'dan olamiz:
    // `login_sessions` endi klientga umuman ochiq emas.
    const claimLogin = httpsCallable(functions, "claimTelegramLogin");
    const startedAt = Date.now();
    let stopped = false;
    let timerId = null;

    const stop = () => {
      stopped = true;
      if (timerId) clearTimeout(timerId);
      timerId = null;
    };
    unsubscribeRef.current = stop;

    const poll = async () => {
      if (stopped) return;

      if (Date.now() - startedAt > TELEGRAM_LOGIN_TIMEOUT_MS) {
        stop();
        unsubscribeRef.current = null;
        setError(t('auth.errorTelegramTimeout'));
        return;
      }

      try {
        const res = await claimLogin({ pollKey });
        if (stopped) return;

        if (res.data?.status === "authenticated" && res.data.token) {
          stop();
          unsubscribeRef.current = null;
          setTelegramLoading(true);

          // Close the opened Telegram tab automatically
          if (telegramWindowRef.current && !telegramWindowRef.current.closed) {
            try {
              telegramWindowRef.current.close();
            } catch (closeErr) {
              console.warn("Could not close Telegram tab automatically:", closeErr);
            }
          }

          try {
            await signInWithCustomToken(auth, res.data.token);
            navigate(res.data.isNewUser ? '/onboarding' : '/dashboard');
          } catch (signInErr) {
            console.error(signInErr);
            setError(t('auth.errorInvalidOtp'));
          } finally {
            setTelegramLoading(false);
          }
          return;
        }
      } catch (err) {
        // Sessiya eskirgan — qaytadan boshlash kerak.
        if (err.code === "functions/deadline-exceeded") {
          stop();
          unsubscribeRef.current = null;
          setError(t('auth.errorTelegramTimeout'));
          return;
        }
        // Vaqtinchalik tarmoq xatosi — keyingi urinishda o'tib ketadi.
        console.warn("claimTelegramLogin:", err);
      }

      if (!stopped) timerId = setTimeout(poll, TELEGRAM_POLL_INTERVAL_MS);
    };

    timerId = setTimeout(poll, TELEGRAM_POLL_INTERVAL_MS);
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    
    setTelegramLoading(true);
    setError("");

    try {
      const verifyOTP = httpsCallable(functions, "verifyTelegramOTP");
      const result = await verifyOTP({ code: otp });
      const { token, isNewUser } = result.data;
      
      await signInWithCustomToken(auth, token);
      navigate(isNewUser ? '/onboarding' : '/dashboard');
    } catch (err) {
      setError(t('auth.errorInvalidOtp'));
      console.error(err);
    } finally {
      setTelegramLoading(false);
    }
  };

  const handleBackToManual = () => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    setStep(4);
  };

  const handleBackFromTelegram = () => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    setStep(1);
  };

  return (
    <div className="min-h-screen flex bg-white font-sans selection:bg-black/10 selection:text-black justify-center items-center relative px-6 py-20">
      {/* Top-Left Logo */}
      <div className="absolute top-6 left-6 md:top-10 md:left-12 z-20">
        <Link to="/" className="block transition-transform hover:scale-105 active:scale-95 select-none">
          <span className="text-3xl md:text-4xl font-sans tracking-tight text-black lowercase">
            <span className="font-normal">eng</span>
            <span className="font-bold">lev.</span>
          </span>
        </Link>
      </div>

      {/* Login Form */}
      <div className="w-full max-w-[360px] flex flex-col justify-center items-center bg-white relative z-10">
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
        >

          <div className="text-center mb-8 flex flex-col items-center">
            <h1 className="text-2xl font-bold text-[#1a1a1a] tracking-tight mb-2">
              {t('auth.welcomeBack')}
            </h1>
            <p className="text-[#666] text-[14px] font-medium leading-relaxed">
              {t('auth.signInSubtitle')}
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
                        className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white border border-[#eee] hover:bg-[#f9f9f9] text-black rounded-lg transition-all duration-200 text-[13px] font-bold active:scale-[0.98] disabled:opacity-50"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        {t('auth.googleSignIn')}
                    </button>

                    <button
                        onClick={handleTelegramLogin}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-[#24A1DE] hover:bg-[#208fba] text-white rounded-lg transition-all duration-200 text-[13px] font-bold active:scale-[0.98] disabled:opacity-50"
                    >
                        <Send size={16} />
                        {t('auth.telegramSignIn')}
                    </button>

                    <div className="flex items-center gap-4 py-2">
                        <div className="flex-1 border-t border-[#f0f0f0]"></div>
                        <div className="text-[11px] font-bold text-[#666]">{t('auth.or')}</div>
                        <div className="flex-1 border-t border-[#f0f0f0]"></div>
                    </div>
                </>
            )}

            <form onSubmit={step === 6 ? handleResetSubmit : step < 3 ? handleSubmit : handleVerifyOtp} className="space-y-3.5">
              <AnimatePresence mode="wait">
                {step === 1 ? (
                    <motion.div
                        key="email"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="space-y-3.5"
                    >
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
                ) : step === 2 ? (
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
                                placeholder={t('auth.passwordPlaceholder')}
                                className="w-full px-5 py-2.5 bg-[#f5f5f7] border-transparent border focus:border-[#000000]/20 focus:bg-white rounded-lg outline-none transition-all duration-200 text-[13px] font-medium text-[#1a1a1a] placeholder-[#bbb]"
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
                            className="w-full !mt-8 py-2.5 bg-[#1a1a1a] hover:bg-black text-white rounded-lg text-[13px] font-bold transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin w-4 h-4" /> : t('navbar.signin')}
                        </button>
                        <button
                            type="button"
                            onClick={openResetStep}
                            className="w-full text-[12px] font-bold text-[#888] hover:text-[#1a1a1a] underline underline-offset-4 decoration-[#ddd]"
                        >
                            {t('auth.forgotPassword')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="w-full text-[12px] font-bold text-[#aaa] hover:text-[#1a1a1a]"
                        >
                            {t('auth.back')}
                        </button>
                    </motion.div>
                ) : step === 6 ? (
                    <motion.div
                        key="reset"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="space-y-3.5"
                    >
                        {resetSent ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-green-50 border border-green-100 rounded-xl flex flex-col items-center text-center space-y-2">
                                    <div className="bg-green-500 text-white p-2.5 rounded-full">
                                        <MailCheck size={18} />
                                    </div>
                                    <h3 className="text-[14px] font-bold text-black">
                                        {t('auth.resetSentTitle')}
                                    </h3>
                                    <p className="text-[12px] text-[#666] leading-relaxed font-medium">
                                        {t('auth.resetSentText')}
                                    </p>
                                </div>
                                <p className="text-[11px] text-[#999] font-medium leading-relaxed text-center">
                                    {t('auth.resetSpamHint')}
                                </p>
                            </div>
                        ) : (
                            <>
                                <p className="text-[12px] text-[#666] font-medium mb-2">
                                    {t('auth.resetSubtitle')}
                                </p>
                                <input
                                    type="email"
                                    placeholder={t('auth.emailPlaceholder')}
                                    className="w-full px-5 py-2.5 bg-[#f5f5f7] border-transparent border focus:border-black/10 focus:bg-white rounded-lg outline-none transition-all duration-200 text-[13px] font-medium text-[#1a1a1a] placeholder-[#bbb]"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoFocus
                                    required
                                />
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full !mt-4 py-2.5 bg-[#1a1a1a] hover:bg-black text-white rounded-lg text-[13px] font-bold transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="animate-spin w-4 h-4" /> : t('auth.resetSendBtn')}
                                </button>
                                <p className="text-[11px] text-[#999] font-medium leading-relaxed !mt-4">
                                    {t('auth.resetSocialHint')}
                                </p>
                            </>
                        )}
                        <button
                            type="button"
                            onClick={() => { setError(""); setResetSent(false); setStep(1); }}
                            className="w-full !mt-4 text-[12px] font-bold text-[#aaa] hover:text-[#1a1a1a]"
                        >
                            {t('auth.back')}
                        </button>
                    </motion.div>
                ) : (
                    <motion.div
                        key="telegram"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-3.5"
                    >
                        {step === 3 ? (
                            <div className="space-y-3.5">
                                <p className="text-[12px] text-[#666] font-medium mb-2">
                                    {t('auth.telegramPhoneLabel')}
                                </p>
                                <input
                                    type="tel"
                                    placeholder="+998901234567"
                                    className="w-full px-5 py-2.5 bg-[#f5f5f7] border-transparent border focus:border-black/10 focus:bg-white rounded-lg outline-none transition-all duration-200 text-[13px] font-medium text-[#1a1a1a] placeholder-[#bbb]"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    autoFocus
                                    required
                                />
                                <button
                                    type="submit"
                                    className="w-full !mt-4 py-2.5 bg-black text-white rounded-lg text-[13px] font-bold flex items-center justify-center gap-2"
                                >
                                    {t('auth.enterCode')} <ArrowRight size={14} />
                                </button>
                            </div>
                        ) : step === 4 ? (
                            <div className="space-y-3.5">
                                <p className="text-[12px] text-[#666] font-medium mb-2">
                                    {t('auth.telegramOtpLabel')}
                                </p>
                                <input
                                    type="text"
                                    maxLength={6}
                                    placeholder="000000"
                                    className="w-full px-5 py-2.5 bg-[#f5f5f7] border-transparent border focus:border-black/10 focus:bg-white rounded-lg outline-none transition-all duration-200 text-[13px] font-medium text-[#1a1a1a] placeholder-[#bbb] text-center tracking-[0.5em] font-mono text-lg"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                                    autoFocus
                                    required
                                />
                                <button
                                    type="submit"
                                    disabled={telegramLoading || otp.length < 6}
                                    className="w-full !mt-4 py-2.5 bg-black text-white rounded-lg text-[13px] font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {telegramLoading ? <Loader2 className="animate-spin w-4 h-4" /> : t('common.confirm')}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl flex flex-col items-center text-center space-y-3">
                                    <div className="relative flex items-center justify-center w-12 h-12">
                                        <div className="absolute inset-0 bg-[#24A1DE]/20 rounded-full animate-ping"></div>
                                        <div className="relative bg-[#24A1DE] text-white p-3 rounded-full">
                                            <Send size={20} className="ml-0.5" />
                                        </div>
                                    </div>
                                    <h3 className="text-[14px] font-bold text-black">
                                        {t('auth.telegramWaiting')}
                                    </h3>
                                    <p className="text-[12px] text-[#666] leading-relaxed font-medium">
                                        {t('auth.telegramInstruction')}
                                    </p>
                                </div>
                                <div className="space-y-2 text-[12px] font-semibold text-gray-700 bg-gray-50/50 p-4 rounded-xl border border-dashed border-gray-200">
                                    <p className="flex items-start gap-2">
                                        <span className="text-[#24A1DE]">✦</span>
                                        <span>{t('auth.telegramStep1')}</span>
                                    </p>
                                    <p className="flex items-start gap-2">
                                        <span className="text-[#24A1DE]">✦</span>
                                        <span>{t('auth.telegramStep2')}</span>
                                    </p>
                                    <p className="flex items-start gap-2 text-gray-500 font-medium italic">
                                        <span className="text-gray-400">✦</span>
                                        <span>{t('auth.telegramStep3')}</span>
                                    </p>
                                </div>

                                <div className="flex flex-col gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const win = window.open(`https://t.me/ielts_portal_auth_bot?start=login_${telegramSessionId}`, "_blank");
                                            telegramWindowRef.current = win;
                                        }}
                                        className="w-full py-2.5 bg-[#24A1DE] hover:bg-[#208fba] text-white rounded-lg text-[13px] font-bold transition-all flex items-center justify-center gap-2"
                                    >
                                        <Send size={14} />
                                        {t('auth.telegramReopen')}
                                    </button>
                                    
                                    <button
                                        type="button"
                                        onClick={handleBackToManual}
                                        className="w-full py-2 bg-transparent hover:bg-gray-50 text-gray-500 hover:text-black rounded-lg text-[12px] font-bold transition-all border border-gray-200"
                                    >
                                        {t('auth.telegramManualFallback')}
                                    </button>
                                </div>
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={handleBackFromTelegram}
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
                {t('auth.noAccount')}{" "}
                <Link to="/register" className="text-[#888] font-bold hover:text-[#1a1a1a] transition-all underline underline-offset-4 decoration-[#FF5520]/20">
                  {t('navbar.signup')}
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-[#ccc] font-medium tracking-wide flex gap-4 uppercase whitespace-nowrap z-20">
          <a href="#" className="hover:text-[#999]">{t('footer.privacy')}</a>
          <a href="#" className="hover:text-[#999]">{t('footer.termsOfUse')}</a>
          <span>&copy; 2024 ENGLEV</span>
      </div>
    </div>
  );
}