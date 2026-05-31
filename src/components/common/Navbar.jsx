import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LanguageContext';

const LanguageSwitcher = ({ className = "" }) => {
  const { lang, setLang } = useTranslation();
  return (
    <div className={`flex items-center gap-1 bg-zinc-100 p-0.5 rounded-full border border-zinc-200 ${className}`}>
      <button
        onClick={() => setLang('uz')}
        className={`px-2.5 py-1 text-[10px] md:text-[11px] font-bold rounded-full transition-all ${lang === 'uz' ? 'bg-white text-black shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
      >
        UZ
      </button>
      <button
        onClick={() => setLang('en')}
        className={`px-2.5 py-1 text-[10px] md:text-[11px] font-bold rounded-full transition-all ${lang === 'en' ? 'bg-white text-black shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
      >
        EN
      </button>
    </div>
  );
};

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleFeaturesClick = (e) => {
    setIsOpen(false);
    if (window.location.pathname === '/') {
      e.preventDefault();
      document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/#features');
    }
  };

  return (
    <>
      <div
        className={`fixed z-50 top-0 left-0 right-0 w-full flex justify-center pointer-events-none transition-[padding] duration-500 ease-in-out ${
          isScrolled ? "pt-4 px-4" : "pt-0 px-0"
        }`}
      >
        <motion.nav
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.6, ease: "circOut" }}
          className={`pointer-events-auto flex items-center justify-between backdrop-blur-xl border w-full transition-[padding,max-width,border-radius,background-color,border-color,box-shadow] duration-500 ease-in-out ${
            isScrolled
              ? "max-w-6xl rounded-2xl border-gray-200/80 bg-white/95 shadow-[0_12px_30px_rgba(0,0,0,0.06)] py-2.5 px-6 md:px-8"
              : "max-w-full rounded-none border-transparent border-b-gray-100 bg-white/80 py-4 px-6 md:px-12"
          }`}
        >
          {/* Logo matching Figma */}
          <Link to="/" className="flex items-center gap-2 cursor-pointer z-50 transition-all hover:opacity-90 active:scale-95 select-none">
            <span className="text-3xl md:text-4xl tracking-tight text-zinc-900 font-sans">
              <span className="font-bold">eng</span>
              <span className="font-light">lev.</span>
            </span>
          </Link>

          {/* Center Links (Figma matching) */}
          <div className="hidden md:flex items-center gap-8 z-50">
            <a href="#features" onClick={handleFeaturesClick} className="text-sm font-medium text-gray-600 hover:text-black transition-colors">
              Features
            </a>
            <Link to="/pricing" className="text-sm font-medium text-gray-600 hover:text-black transition-colors">
              Pricing
            </Link>
            <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-black transition-colors">
              Teachers
            </Link>
            <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-black transition-colors">
              For Business
            </Link>
          </div>

          {/* Right Actions */}
          <div className="hidden md:flex items-center gap-6">
            <LanguageSwitcher />
            {!user ? (
              <Link to="/login" className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-md shadow-indigo-100/50 transition-all rounded-lg hover:scale-[1.02] active:scale-95">
                Sign in
              </Link>
            ) : (
              <Link to="/dashboard" className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-md shadow-indigo-100/50 transition-all rounded-lg hover:scale-[1.02] active:scale-95">
                {t('navbar.dashboard')}
              </Link>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex items-center gap-3 md:hidden">
            <LanguageSwitcher />
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-gray-600 z-50"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </motion.nav>
      </div>


      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-white/95 backdrop-blur-md md:hidden space-y-8"
          >
            <Link to="/" className="text-2xl font-semibold text-gray-900" onClick={() => setIsOpen(false)}>Home</Link>
            <a href="#features" className="text-2xl font-semibold text-gray-900" onClick={handleFeaturesClick}>Features</a>
            <Link to="/pricing" className="text-2xl font-semibold text-gray-900" onClick={() => setIsOpen(false)}>Pricing</Link>
            <Link to="/login" className="text-2xl font-semibold text-gray-900" onClick={() => setIsOpen(false)}>Teachers</Link>
            <Link to="/login" className="text-2xl font-semibold text-gray-900" onClick={() => setIsOpen(false)}>For Business</Link>
            
            <hr className="w-12 border-gray-300" />

            {!user ? (
              <Link to="/login" className="px-8 py-3 text-lg font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl shadow-md shadow-indigo-100/50" onClick={() => setIsOpen(false)}>
                Sign in
              </Link>
            ) : (
              <Link to="/dashboard" className="px-8 py-3 text-lg font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl shadow-md shadow-indigo-100/50" onClick={() => setIsOpen(false)}>
                {t('navbar.dashboard')}
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
