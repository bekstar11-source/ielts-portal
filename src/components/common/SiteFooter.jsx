import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Send, Phone } from 'lucide-react';
import { useTranslation } from '../../context/LanguageContext';

const SiteFooter = () => {
  const { t, lang, setLang } = useTranslation();

  const links = [
    { to: '/reading', label: 'Reading' },
    { to: '/listening', label: 'Listening' },
    { to: '/practice?tab=writing', label: 'Writing' },
    { to: '/practice?tab=speaking', label: 'Speaking' },
    { to: '/vocabulary', label: 'WordBank' },
    { to: '/practice?tab=mock', label: 'Mock Exams' },
    { to: '/my-results', label: t('footer.myResults') },
    { to: '/settings', label: t('footer.settings') },
    { to: '/pricing', label: t('footer.pricing') },
    { to: '/teacher', label: t('footer.teacherPortal') },
  ];

  return (
    <footer className="bg-warm-surface dark:bg-warm-dark border-t border-warm-hairline dark:border-white/5 text-warm-body dark:text-warm-on-dark-soft text-[12px] font-sans py-5 w-full transition-colors duration-200">
      <div className="max-w-[980px] mx-auto px-4 md:px-6 flex flex-col gap-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="hover:text-warm-ink dark:hover:text-warm-on-dark hover:underline text-warm-muted dark:text-warm-on-dark-soft"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://t.me/englevuz"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Telegram"
              className="text-warm-muted dark:text-warm-on-dark-soft hover:text-warm-ink dark:hover:text-warm-on-dark"
            >
              <Send size={16} />
            </a>
            <a
              href="https://instagram.com/englev"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="text-warm-muted dark:text-warm-on-dark-soft hover:text-warm-ink dark:hover:text-warm-on-dark"
            >
              <Instagram size={16} />
            </a>
            <a
              href="tel:+998915181844"
              aria-label="Phone"
              className="flex items-center gap-1 text-warm-muted dark:text-warm-on-dark-soft hover:text-warm-ink dark:hover:text-warm-on-dark whitespace-nowrap"
            >
              <Phone size={14} />
              +998 91 518 18 44
            </a>
          </div>
        </div>

        <div className="pt-3 border-t border-warm-hairline dark:border-white/5 flex items-center justify-between gap-3 text-warm-muted dark:text-warm-on-dark-soft whitespace-nowrap">
          <p>© 2026 Englev. {t('footer.rightsReserved')}</p>
          <button
            onClick={() => setLang(lang === 'uz' ? 'en' : 'uz')}
            className="hover:text-warm-ink dark:hover:text-warm-on-dark hover:underline font-semibold"
          >
            {lang === 'uz' ? 'English' : "O'zbekcha"}
          </button>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
