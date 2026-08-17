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
import Logo from '../../components/common/Logo';
import AuthShowcase from './AuthShowcase';
import {
  AUTH_FONT,
  AUTH_HEADING_FONT,
  authPage,
  authCard,
  authInput,
  authPrimaryBtn,
  authSecondaryBtn,
  authTelegramBtn,
  authGhostBtn,
  authError,
  authHint,
  authDivider,
  authDividerLine,
  authDividerLabel,
  authLink,
  authPanel,
} from './authTheme';

// Telegram deep-link'dagi `start` parametri 64 belgidan oshmasligi kerak,
// shuning uchun hash'ning dastlabki 40 ta hex belgisi olinadi (160 bit).
// Server tomonidagi juftligi: functions/telegramLogin.js → deriveSessionId
const SESSION_ID_LENGTH = 40;
const TELEGRAM_POLL_INTERVAL_MS = 2000;
const TELEGRAM_LOGIN_TIMEOUT_MS = 5 * 60 * 1000;

const sha256Hex = async (value) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

const deriveSessionId = async (pollKey) => (await sha256Hex(pollKey)).slice(0, SESSION_ID_LENGTH);

// Session fixation'ga qarshi tasdiqlash kodi. Bot ham AYNAN shu qiymatni
// sessionId'dan hisoblab ko'rsatadi (functions/telegramBot.js →
// derivePairingCode). Foydalanuvchi ikkalasini solishtiradi: begona odam
// yuborgan havolada kodlar mos kelmaydi.
const derivePairingCode = async (sessionId) =>
  (await sha256Hex(`pair|${sessionId}`)).slice(0, 4).toUpperCase();

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
  const [pairingCode, setPairingCode] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const { t } = useTranslation();

  const { login, signInWithGoogle, resetPassword, user, isGuest } = useAuth();
  const navigate = useNavigate();
  const unsubscribeRef = useRef(null);
  const telegramWindowRef = useRef(null);

  useEffect(() => {
    // Anonim (trial) sessiyada ham `user` bor — mehmonni login sahifasidan
    // `/dashboard` ga uloqtirmaymiz (u yerdan `ProtectedRoute` `/` ga qaytaradi).
    if (user && !isGuest) {
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
  }, [user, isGuest, navigate]);

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
    let code;
    try {
      pollKey = `${crypto.randomUUID()}${crypto.randomUUID()}`;
      sessionId = await deriveSessionId(pollKey);
      code = await derivePairingCode(sessionId);
    } catch (cryptoErr) {
      console.error("Web Crypto mavjud emas:", cryptoErr);
      setError(t('auth.errorGeneric'));
      return;
    }

    setTelegramSessionId(sessionId);
    setPairingCode(code);
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

  // 3-bosqich: telefon raqami. Endi u MAJBURIY — server kodni faqat shu raqam
  // bo'yicha qidiradi (ilgari kod butun baza bo'ylab qidirilib, brute-force
  // bilan begona hisobga kirish mumkin edi).
  const handlePhoneSubmit = (e) => {
    e.preventDefault();
    if (phone.replace(/\D/g, "").length < 9) {
      setError(t('auth.errorInvalidPhone'));
      return;
    }
    setError("");
    setStep(4);
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();

    if (!/^\d{6}$/.test(otp)) {
      setError(t('auth.errorInvalidOtp'));
      return;
    }

    setTelegramLoading(true);
    setError("");

    try {
      const verifyOTP = httpsCallable(functions, "verifyTelegramOTP");
      const result = await verifyOTP({ code: otp, phoneNumber: phone });
      const { token, isNewUser } = result.data;

      await signInWithCustomToken(auth, token);
      navigate(isNewUser ? '/onboarding' : '/dashboard');
    } catch (err) {
      // Server foydali xabar qaytaradi ("Yana 3 ta urinish qoldi" kabi).
      setError(err?.message || t('auth.errorInvalidOtp'));
      console.error(err);
    } finally {
      setTelegramLoading(false);
    }
  };

  // Har bosqichning o'z submit ishlovchisi.
  // ⚠️ Ilgari 3-bosqich (telefon) ham to'g'ridan-to'g'ri `handleVerifyOtp` ga
  // ketardi, ya'ni raqam kiritilgach bo'sh kod bilan tekshiruv chaqirilardi.
  const handleFormSubmit = (e) => {
    if (step === 6) return handleResetSubmit(e);
    if (step === 5) return e.preventDefault();
    if (step === 4) return handleVerifyOtp(e);
    if (step === 3) return handlePhoneSubmit(e);
    return handleSubmit(e);
  };

  const handleBackToManual = () => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    setError("");
    // Kod endi telefon raqami bo'yicha tekshiriladi, shuning uchun qo'lda
    // kiritishga o'tganda avval raqamni so'raymiz (ilgari to'g'ridan-to'g'ri
    // kod ekraniga o'tib, raqam bo'sh qolardi).
    setStep(phone.replace(/\D/g, "").length >= 9 ? 4 : 3);
  };

  const handleBackFromTelegram = () => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    setStep(1);
  };

  return (
    <div
      className={`${authPage} flex flex-col min-h-screen px-5 sm:px-8 py-6 sm:py-8`}
      style={AUTH_FONT}
    >
      {/* Logo — sahifa oqimida, absolute emas: kichik ekranda kartaga tegmaydi */}
      <header className="shrink-0">
        <Logo to="/" tone="ink" size="md" />
      </header>

      {/* Login Form + o'ng ustundagi vizual panel */}
      <main className="flex-1 w-full max-w-[1180px] mx-auto grid lg:grid-cols-2 items-center gap-12 xl:gap-16 py-10">
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="w-full max-w-[400px] mx-auto lg:mx-0 lg:justify-self-end"
        >

          <div className="text-center lg:text-left mb-7">
            <h1
              className="text-[27px] sm:text-[32px] font-bold text-[#1E1B16] tracking-[-0.025em] leading-[1.12] mb-2.5"
              style={AUTH_HEADING_FONT}
            >
              {t('auth.welcomeBack')}
            </h1>
            <p className={authHint}>
              {t('auth.signInSubtitle')}
            </p>
          </div>

          <div className={authCard}>

          {error && (
            <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`${authError} mb-5`}
            >
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          <div className="space-y-3">
            {/* Google Login */}
            {step === 1 && (
                <>
                    <button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className={authSecondaryBtn}
                    >
                        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        {t('auth.googleSignIn')}
                    </button>

                    <button
                        onClick={handleTelegramLogin}
                        disabled={loading}
                        className={authTelegramBtn}
                    >
                        <Send size={17} />
                        {t('auth.telegramSignIn')}
                    </button>

                    <div className={`${authDivider} !my-5`}>
                        <span className={authDividerLine} />
                        <span className={authDividerLabel}>{t('auth.or')}</span>
                        <span className={authDividerLine} />
                    </div>
                </>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-3.5">
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
                            className={authInput}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <button
                            type="submit"
                            className={authPrimaryBtn}
                        >
                            {t('auth.continue')}
                            <ArrowRight size={15} />
                        </button>
                        <button
                            type="button"
                            onClick={openResetStep}
                            className={`${authGhostBtn} !mt-4`}
                        >
                            {t('auth.forgotPassword')}
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
                                className={`${authInput} pr-16`}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoFocus
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 rounded-md text-[12px] font-semibold text-[#8A8577] hover:text-[#1E1B16] hover:bg-[#F7F4EE] transition-colors"
                            >
                                {showPassword ? t('auth.hide') : t('auth.show')}
                            </button>
                        </div>
                        <p className="text-[12.5px] text-[#938D80] font-medium truncate px-1">
                            {email}
                        </p>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`${authPrimaryBtn} !mt-5`}
                        >
                            {loading ? <Loader2 className="animate-spin w-4 h-4" /> : t('navbar.signin')}
                        </button>
                        <div className="flex items-center justify-center gap-3 !mt-4 text-[13px] font-semibold">
                            <button
                                type="button"
                                onClick={openResetStep}
                                className="text-[#8A8577] hover:text-[#1E1B16] transition-colors"
                            >
                                {t('auth.forgotPassword')}
                            </button>
                            <span className="w-px h-3 bg-[#E0D8C9]" />
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="text-[#8A8577] hover:text-[#1E1B16] transition-colors"
                            >
                                {t('auth.back')}
                            </button>
                        </div>
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
                                <div className={`${authPanel} flex flex-col items-center text-center gap-2.5`}>
                                    <div className="w-10 h-10 rounded-full bg-[#1E1B16] text-white flex items-center justify-center">
                                        <MailCheck size={18} />
                                    </div>
                                    <h3 className="text-[15px] font-bold text-[#1E1B16]">
                                        {t('auth.resetSentTitle')}
                                    </h3>
                                    <p className={authHint}>
                                        {t('auth.resetSentText')}
                                    </p>
                                </div>
                                <p className="text-[12.5px] text-[#938D80] font-medium leading-relaxed text-center">
                                    {t('auth.resetSpamHint')}
                                </p>
                            </div>
                        ) : (
                            <>
                                <p className={`${authHint} mb-2`}>
                                    {t('auth.resetSubtitle')}
                                </p>
                                <input
                                    type="email"
                                    placeholder={t('auth.emailPlaceholder')}
                                    className={authInput}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoFocus
                                    required
                                />
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`${authPrimaryBtn} !mt-4`}
                                >
                                    {loading ? <Loader2 className="animate-spin w-4 h-4" /> : t('auth.resetSendBtn')}
                                </button>
                                <p className="text-[12.5px] text-[#938D80] font-medium leading-relaxed !mt-4">
                                    {t('auth.resetSocialHint')}
                                </p>
                            </>
                        )}
                        <button
                            type="button"
                            onClick={() => { setError(""); setResetSent(false); setStep(1); }}
                            className={`${authGhostBtn} !mt-4`}
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
                                <p className={`${authHint} mb-2`}>
                                    {t('auth.telegramPhoneLabel')}
                                </p>
                                <input
                                    type="tel"
                                    placeholder="+998901234567"
                                    className={authInput}
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    autoFocus
                                    required
                                />
                                <button
                                    type="submit"
                                    className={`${authPrimaryBtn} !mt-4`}
                                >
                                    {t('auth.enterCode')} <ArrowRight size={14} />
                                </button>
                            </div>
                        ) : step === 4 ? (
                            <div className="space-y-3.5">
                                <p className={`${authHint} mb-2`}>
                                    {t('auth.telegramOtpLabel')}
                                </p>
                                <input
                                    type="text"
                                    maxLength={6}
                                    placeholder="000000"
                                    className={`${authInput} text-center tracking-[0.5em] font-mono text-lg`}
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                                    autoFocus
                                    required
                                />
                                <button
                                    type="submit"
                                    disabled={telegramLoading || otp.length < 6}
                                    className={`${authPrimaryBtn} !mt-4`}
                                >
                                    {telegramLoading ? <Loader2 className="animate-spin w-4 h-4" /> : t('common.confirm')}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className={`${authPanel} flex flex-col items-center text-center gap-3`}>
                                    <div className="relative flex items-center justify-center w-11 h-11">
                                        <div className="absolute inset-0 bg-[#229ED9]/15 rounded-full animate-ping"></div>
                                        <div className="relative w-11 h-11 rounded-full bg-[#229ED9] text-white flex items-center justify-center">
                                            <Send size={18} className="ml-0.5" />
                                        </div>
                                    </div>
                                    <h3 className="text-[15px] font-bold text-[#1E1B16]">
                                        {t('auth.telegramWaiting')}
                                    </h3>
                                    <p className={authHint}>
                                        {t('auth.telegramInstruction')}
                                    </p>
                                </div>

                                {/* Session fixation'ga qarshi: botdagi kod shu kod
                                    bilan mos kelmasa — havola begona qurilma uchun. */}
                                {pairingCode && (
                                    <div className="p-4 rounded-xl bg-[#D97757]/[0.07] border border-[#D97757]/20 text-center space-y-1.5">
                                        <p className="text-[11px] font-semibold text-[#A34A2A] uppercase tracking-[.12em]">
                                            {t('auth.pairingCodeLabel')}
                                        </p>
                                        <p className="text-[26px] font-bold font-mono tracking-[0.28em] text-[#1E1B16] pl-[0.28em] leading-tight">
                                            {pairingCode}
                                        </p>
                                        <p className="text-[12.5px] text-[#6B6559] font-medium leading-relaxed">
                                            {t('auth.pairingCodeHint')}
                                        </p>
                                    </div>
                                )}
                                <ol className={`${authPanel} space-y-2.5 text-[13px] leading-relaxed text-[#6B6559]`}>
                                    {[t('auth.telegramStep1'), t('auth.telegramStep2')].map((stepText, i) => (
                                        <li key={i} className="flex items-start gap-2.5">
                                            <span className="mt-px shrink-0 w-[18px] h-[18px] rounded-full bg-white border border-[#E0D8C9] text-[10px] font-bold text-[#1E1B16] flex items-center justify-center">
                                                {i + 1}
                                            </span>
                                            <span className="font-medium">{stepText}</span>
                                        </li>
                                    ))}
                                    <li className="text-[12.5px] text-[#938D80] font-medium pl-[28px]">
                                        {t('auth.telegramStep3')}
                                    </li>
                                </ol>

                                <div className="flex flex-col gap-2.5 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const win = window.open(`https://t.me/ielts_portal_auth_bot?start=login_${telegramSessionId}`, "_blank");
                                            telegramWindowRef.current = win;
                                        }}
                                        className={authTelegramBtn}
                                    >
                                        <Send size={16} />
                                        {t('auth.telegramReopen')}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleBackToManual}
                                        className={authGhostBtn}
                                    >
                                        {t('auth.telegramManualFallback')}
                                    </button>
                                </div>
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={handleBackFromTelegram}
                            className={authGhostBtn}
                        >
                            {t('auth.back')}
                        </button>
                    </motion.div>
                )}
              </AnimatePresence>
            </form>

          </div>
          </div>

          <p className="mt-6 text-center lg:text-left text-[13.5px] text-[#6B6559] font-medium">
            {t('auth.noAccount')}{" "}
            <Link to="/register" className={authLink}>
              {t('navbar.signup')}
            </Link>
          </p>
        </motion.div>

        {/* Kichik ekranda yashiriladi — forma pastga surilib ketmasligi uchun */}
        <div className="hidden lg:block w-full max-w-[460px]">
          <AuthShowcase />
        </div>
      </main>

      {/* Footer */}
      <footer className="shrink-0 flex flex-wrap justify-center items-center gap-x-5 gap-y-2 text-[12px] text-[#A9A395] font-medium">
          <a href="#" className="hover:text-[#6B6559] transition-colors">{t('footer.privacy')}</a>
          <a href="#" className="hover:text-[#6B6559] transition-colors">{t('footer.termsOfUse')}</a>
          <span>&copy; 2024 Englev</span>
      </footer>
    </div>
  );
}