import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence, motionValue, useAnimationFrame } from 'framer-motion'; // eslint-disable-line no-unused-vars
import { Loader2, AlertCircle, ArrowRight, Gift } from 'lucide-react';
import { db } from "../../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from '../../context/LanguageContext';
import Logo from '../../components/common/Logo';
import {
  AUTH_FONT,
  AUTH_HEADING_FONT,
  authPage,
  authCard,
  authInput,
  authPrimaryBtn,
  authSecondaryBtn,
  authGhostBtn,
  authError,
  authHint,
  authDivider,
  authDividerLine,
  authDividerLabel,
  authLink,
} from './authTheme';

const ScrollingComments = () => {
    const [isHovered, setIsHovered] = useState(false);
    const y = useMemo(() => motionValue(0), []);
    const { t } = useTranslation();

    const testimonials = t('auth.testimonials') || [];

    useAnimationFrame(() => {
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
                className="space-y-4 w-full"
            >
                {[...testimonials, ...testimonials, ...testimonials].map((item, i) => (
                    <div
                        key={i}
                        className="p-5 bg-white border border-[#EAE3D6] rounded-2xl shadow-[0_10px_30px_-22px_rgba(30,27,22,0.35)]"
                    >
                        <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-[#1E1B16] flex items-center justify-center text-[11px] font-bold text-white">
                                    {item.name ? item.name[0] : ''}
                                </div>
                                <span className="text-[#1E1B16] font-semibold text-[13.5px]">{item.name}</span>
                            </div>
                            <span className="text-[11px] font-semibold bg-[#D97757]/10 text-[#A34A2A] px-2.5 py-0.5 rounded-full">
                                Band {item.score}
                            </span>
                        </div>
                        <p className="text-[13.5px] leading-[1.65] text-[#6B6559]">
                            {item.text}
                        </p>
                    </div>
                ))}
            </motion.div>
            {/* Yuqori/pastdagi so'nish — fon rangiga tenglashtirilgan, aks holda
                ro'yxat kesilgan joyda qattiq chiziq bo'lib ko'rinardi. */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#F7F4EE] via-transparent to-[#F7F4EE]" />
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

  // Trialni yechib kelgan mehmonda chegirma allaqachon "yutilgan" — buni
  // ro'yxatdan o'tish ekranida ESLATIB turish kerak, aks holda odam nima
  // uchun hisob ochayotganini yo'lda unutadi.
  const fromTrial = isGuest;

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
    <div
      className={`${authPage} flex flex-col min-h-screen px-5 sm:px-8 py-6 sm:py-8`}
      style={AUTH_FONT}
    >
      {/* Logo — Login bilan bir xil joyda, sahifa oqimida */}
      <header className="shrink-0">
        <Logo to="/" tone="ink" size="md" />
      </header>

      <main className="flex-1 w-full max-w-[1180px] mx-auto grid lg:grid-cols-2 items-center gap-12 xl:gap-16 py-10">
        {/* ── Chap: forma ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="w-full max-w-[400px] mx-auto lg:mx-0 lg:justify-self-end"
        >
          <div className="text-center lg:text-left mb-7">
            <h1
              className="text-[27px] sm:text-[32px] font-bold leading-[1.12] tracking-[-0.025em] text-[#1E1B16] mb-2.5"
              style={AUTH_HEADING_FONT}
            >
              {t('auth.registerTitle')}
            </h1>
            <p className={authHint}>
              {t('auth.registerSubtitle')}
            </p>
          </div>

          {/* Trialdan kelgan mehmon uchun chegirma eslatmasi. */}
          {fromTrial && (
            <div className="flex items-start gap-3 mb-5 px-4 py-3.5 rounded-xl bg-[#D97757]/[0.07] border border-[#D97757]/20">
              <Gift size={16} className="text-[#D97757] shrink-0 mt-0.5" />
              <p className="text-[13px] leading-relaxed text-[#1E1B16]">
                Test natijangiz va chegirmangiz shu hisobga biriktiriladi.
              </p>
            </div>
          )}

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
                    {t('auth.googleStart')}
                  </button>

                  <div className={`${authDivider} !my-5`}>
                    <span className={authDividerLine} />
                    <span className={authDividerLabel}>{t('auth.or')}</span>
                    <span className={authDividerLine} />
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
                      className="space-y-3.5"
                    >
                      <input
                        type="text"
                        placeholder={t('auth.fullNamePlaceholder')}
                        className={authInput}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                      />
                      <input
                        type="email"
                        placeholder={t('auth.emailPlaceholder')}
                        className={authInput}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                      <button type="submit" className={`${authPrimaryBtn} !mt-5`}>
                        {t('auth.continue')}
                        <ArrowRight size={15} />
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
                      <button type="submit" disabled={loading} className={`${authPrimaryBtn} !mt-5`}>
                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : t('auth.createAccountBtn')}
                      </button>
                      <button type="button" onClick={() => setStep(1)} className={`${authGhostBtn} !mt-4`}>
                        {t('auth.back')}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>

            </div>
          </div>

          <p className="mt-6 text-center lg:text-left text-[13.5px] text-[#6B6559] font-medium">
            {t('auth.hasAccount')}{" "}
            <Link to="/login" className={authLink}>
              {t('auth.signInNow')}
            </Link>
          </p>
        </motion.div>

        {/* ── O'ng: fikrlar (Login'dagi panel bilan bir xil o'lchamda) ── */}
        <div className="hidden lg:block w-full max-w-[460px]">
          <h2
            className="text-[22px] font-bold leading-tight tracking-[-0.02em] text-[#1E1B16] mb-5"
            style={AUTH_HEADING_FONT}
          >
            {t('auth.testimonialsTitle')}
          </h2>
          <ScrollingComments />
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
