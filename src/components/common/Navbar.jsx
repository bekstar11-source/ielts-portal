import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LanguageContext';
import Logo from './Logo';

const BODY_FONT = "'Public Sans', sans-serif";
const DISPLAY_FONT = "'Space Grotesk', sans-serif";

const LanguageSwitcher = ({ className = "" }) => {
  const { lang, setLang } = useTranslation();
  const btn = (active) => ({
    padding: '5px 11px',
    borderRadius: '999px',
    border: 'none',
    cursor: 'pointer',
    font: `700 11px ${BODY_FONT}`,
    letterSpacing: '.04em',
    transition: 'all .25s ease',
    background: active ? '#1E1B16' : 'transparent',
    color: active ? '#F7F4EE' : '#8a8577',
  });
  return (
    <div
      className={`flex items-center gap-0.5 ${className}`}
      style={{ background: '#EFEBE2', padding: '3px', borderRadius: '999px', border: '1px solid rgba(30,27,22,.08)' }}
    >
      <button onClick={() => setLang('uz')} style={btn(lang === 'uz')}>UZ</button>
      <button onClick={() => setLang('en')} style={btn(lang === 'en')}>EN</button>
    </div>
  );
};

const navLinkStyle = { font: `500 14px ${BODY_FONT}`, color: '#6b6559', textDecoration: 'none', transition: 'color .2s ease' };
const ctaStyle = {
  padding: '11px 24px',
  borderRadius: '999px',
  background: '#1E1B16',
  color: '#F7F4EE',
  font: `600 14px ${BODY_FONT}`,
  textDecoration: 'none',
  whiteSpace: 'nowrap',
};

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, isGuest } = useAuth();
  // Anonim (trial) sessiya "kirgan" hisoblanmaydi: mehmonga Dashboard havolasi
  // ko'rsatilsa, u profili yo'q sahifaga tushib xato ekranini ko'rardi.
  const isAuthed = Boolean(user) && !isGuest;
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
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
      <style>{`
        .nav-link:hover { color: #1E1B16 !important; }
        .nav-shell { --nav-pad-x: 24px; }
        @media (min-width: 768px) { .nav-shell { --nav-pad-x: 48px; } }
      `}</style>
      <div
        className={`fixed z-50 top-0 left-0 right-0 w-full flex justify-center pointer-events-none transition-[padding] duration-500 ease-in-out gpu-accelerated ${
          isScrolled ? "pt-4 px-4" : "pt-0 px-0"
        }`}
      >
        <motion.nav
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.6, ease: "circOut" }}
          className="nav-shell pointer-events-auto flex items-center justify-between backdrop-blur-xl w-full transition-[padding,max-width,border-radius,background-color,border-color,box-shadow] duration-500 ease-in-out gpu-accelerated"
          style={{
            maxWidth: isScrolled ? '1152px' : '100%',
            borderRadius: isScrolled ? '999px' : '0px',
            background: isScrolled ? 'rgba(247,244,238,.92)' : 'rgba(247,244,238,.85)',
            border: '1px solid',
            borderColor: isScrolled ? 'rgba(30,27,22,.08)' : 'transparent',
            borderBottomColor: isScrolled ? 'rgba(30,27,22,.08)' : 'rgba(30,27,22,.07)',
            boxShadow: isScrolled ? '0 12px 30px rgba(30,27,22,.07)' : 'none',
            padding: isScrolled ? '10px 14px 10px 22px' : '16px var(--nav-pad-x, 24px)',
          }}
        >
          <Logo to="/" tone="ink" className="z-50" />

          {/* Center Links */}
          <div className="hidden md:flex items-center gap-8 z-50">
            <a href="#features" onClick={handleFeaturesClick} style={navLinkStyle} className="nav-link">
              Imkoniyatlar
            </a>
            <Link to="/pricing" style={navLinkStyle} className="nav-link">
              Narxlar
            </Link>
            <Link to="/login" style={navLinkStyle} className="nav-link">
              O'qituvchilar
            </Link>
            <Link to="/login" style={navLinkStyle} className="nav-link">
              Biznes uchun
            </Link>
          </div>

          {/* Right Actions */}
          <div className="hidden md:flex items-center gap-4">
            <LanguageSwitcher />
            <Link
              to={isAuthed ? '/dashboard' : '/login'}
              style={ctaStyle}
              className="transition-transform hover:scale-[1.02] active:scale-95"
            >
              {isAuthed ? t('navbar.dashboard') : 'Kirish'}
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex items-center gap-3 md:hidden">
            <LanguageSwitcher />
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 z-50"
              style={{ color: '#1E1B16', background: 'none', border: 'none' }}
              aria-label="Menu"
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
            className="fixed inset-0 z-40 flex flex-col items-center justify-center backdrop-blur-md md:hidden space-y-7"
            style={{ background: 'rgba(247,244,238,.97)' }}
          >
            <Logo to="/" tone="ink" size="lg" onClick={() => setIsOpen(false)} className="z-50" />

            {[
              { label: 'Imkoniyatlar', href: '#features', onClick: handleFeaturesClick },
              { label: 'Narxlar', to: '/pricing' },
              { label: "O'qituvchilar", to: '/login' },
              { label: 'Biznes uchun', to: '/login' },
            ].map((item, i) =>
              item.to ? (
                <Link key={i} to={item.to} style={{ font: `600 22px ${DISPLAY_FONT}`, color: '#1E1B16', textDecoration: 'none' }} onClick={() => setIsOpen(false)}>
                  {item.label}
                </Link>
              ) : (
                <a key={i} href={item.href} style={{ font: `600 22px ${DISPLAY_FONT}`, color: '#1E1B16', textDecoration: 'none' }} onClick={item.onClick}>
                  {item.label}
                </a>
              )
            )}

            <hr style={{ width: '48px', border: 'none', borderTop: '1px solid rgba(30,27,22,.15)' }} />

            <Link
              to={isAuthed ? '/dashboard' : '/login'}
              style={{ ...ctaStyle, padding: '14px 32px', fontSize: '16px' }}
              onClick={() => setIsOpen(false)}
            >
              {isAuthed ? t('navbar.dashboard') : 'Kirish'}
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
