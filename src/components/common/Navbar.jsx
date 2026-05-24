import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LanguageContext';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { lang, setLang, t } = useTranslation();

  const LanguageSwitcher = ({ className = "" }) => (
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

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "circOut" }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 md:px-12 backdrop-blur-xl bg-white/80 border-b border-white/20 supports-[backdrop-filter]:bg-white/60"
      >
        <Link to="/" className="flex items-center cursor-pointer z-50 transition-all hover:opacity-90 active:scale-95">
          <img src="/englev-logo.png" alt="englev." className="h-8 md:h-9 w-auto object-contain" />
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-6">
          <LanguageSwitcher />
          {!user ? (
            <>
              <Link to="/login" className="text-sm font-medium text-gray-600 transition-colors hover:text-black">
                {t('navbar.signin')}
              </Link>
              <Link to="/login" className="px-5 py-2 text-sm font-medium text-white transition-transform bg-black rounded-full hover:scale-105 active:scale-95 shadow-lg shadow-black/10">
                {t('navbar.signup')}
              </Link>
            </>
          ) : (
            <Link to="/dashboard" className="px-5 py-2 text-sm font-bold text-white transition-transform bg-black rounded-full hover:scale-105 active:scale-95 shadow-lg shadow-black/10">
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

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-white/95 backdrop-blur-md md:hidden space-y-8"
          >
            <Link to="/" className="text-2xl font-medium text-gray-900" onClick={() => setIsOpen(false)}>{t('navbar.home')}</Link>
            <Link to="/#features" className="text-2xl font-medium text-gray-900" onClick={() => setIsOpen(false)}>{t('navbar.features')}</Link>
            <hr className="w-12 border-gray-300" />

            {!user ? (
              <>
                <Link to="/login" className="text-xl font-medium text-gray-600" onClick={() => setIsOpen(false)}>
                  {t('navbar.signin')}
                </Link>
                <Link to="/login" className="px-8 py-3 text-lg font-medium text-white bg-black rounded-full shadow-xl" onClick={() => setIsOpen(false)}>
                  {t('navbar.signup')}
                </Link>
              </>
            ) : (
              <Link to="/dashboard" className="px-8 py-3 text-lg font-bold text-white bg-black rounded-full shadow-xl" onClick={() => setIsOpen(false)}>
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
