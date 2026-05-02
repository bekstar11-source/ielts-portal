import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "circOut" }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 md:px-12 backdrop-blur-xl bg-white/80 border-b border-white/20 supports-[backdrop-filter]:bg-white/60"
      >
        <Link to="/" className="flex items-center gap-2 cursor-pointer z-50">
          <img src="/englev-logo.png" alt="ENGLEV" className="h-8 w-auto object-contain" />
          <span
            style={{ fontFamily: "'Orbitron', sans-serif", letterSpacing: '0.12em' }}
            className="font-black text-lg text-gray-900"
          >
            ENGLEV
          </span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-6">
          {!user ? (
            <>
              <Link to="/login" className="text-sm font-medium text-gray-600 transition-colors hover:text-black">
                Kirish
              </Link>
              <Link to="/login" className="px-5 py-2 text-sm font-medium text-white transition-transform bg-black rounded-full hover:scale-105 active:scale-95 shadow-lg shadow-black/10">
                Ro'yxatdan o'tish
              </Link>
            </>
          ) : (
            <Link to="/dashboard" className="px-5 py-2 text-sm font-bold text-white transition-transform bg-black rounded-full hover:scale-105 active:scale-95 shadow-lg shadow-black/10">
              Dashboard
            </Link>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden p-2 text-gray-600 z-50"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
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
            <Link to="/" className="text-2xl font-medium text-gray-900" onClick={() => setIsOpen(false)}>Asosiy</Link>
            <Link to="/#features" className="text-2xl font-medium text-gray-900" onClick={() => setIsOpen(false)}>Xususiyatlar</Link>
            <hr className="w-12 border-gray-300" />

            {!user ? (
              <>
                <Link to="/login" className="text-xl font-medium text-gray-600" onClick={() => setIsOpen(false)}>
                  Kirish
                </Link>
                <Link to="/login" className="px-8 py-3 text-lg font-medium text-white bg-black rounded-full shadow-xl" onClick={() => setIsOpen(false)}>
                  Ro'yxatdan o'tish
                </Link>
              </>
            ) : (
              <Link to="/dashboard" className="px-8 py-3 text-lg font-bold text-white bg-black rounded-full shadow-xl" onClick={() => setIsOpen(false)}>
                Dashboard
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
