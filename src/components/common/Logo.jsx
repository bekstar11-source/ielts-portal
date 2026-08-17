import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Englev brend logotipi — butun platforma bo'ylab yagona manba.
 *
 * Etalon: "Englev Logo" brend guide, 2A — tanlangan belgi (Fold / ribbon E).
 * Geometriya guide'dagi SVG'dan aynan ko'chirilgan, o'zgartirilmaydi.
 *
 * Guide qoidalari:
 *  - Belgi atrofidagi bo'sh joy — belgi balandligining kamida 1/4 qismi.
 *  - Minimal o'lcham: ekranda 16px.
 *  - Terrakota faqat ikkita burma uchun; boshqa ranglarga o'zgartirilmaydi.
 *  - Belgi cho'zilmaydi, aylantirilmaydi, soya qo'shilmaydi.
 */

export const BRAND_INK = '#141413';
export const BRAND_PAPER = '#F0EEE6';
export const BRAND_ACCENT = '#D97757';

const SERIF_FONT = "'Source Serif 4', Georgia, serif";

// Belgi (mark) o'lchami px'da; so'z va oraliq shundan hosil qilinadi.
const SIZES = { xs: 24, sm: 26, md: 28, lg: 32, xl: 40 };

const TONES = {
  // Yorug' fonda siyoh, qorong'ida qog'oz — ikki rejimli sahifalar uchun.
  auto: 'text-[#141413] dark:text-[#F0EEE6]',
  ink: 'text-[#141413]',
  light: 'text-[#F0EEE6]',
  // Terrakota fonda: bar'lar qog'oz rangda, burmalar siyohda (guide 2A, "aksent fonda").
  accent: 'text-[#F0EEE6]',
};

/**
 * Belgi. Rang `currentColor` orqali keladi, burmalar esa alohida —
 * shuning uchun aksent fonda burma siyohga almashadi, qolgan hamma joyda terrakota.
 */
export const LogoMark = ({ size = 28, fold = BRAND_ACCENT, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 120 120"
    className={`shrink-0 block ${className}`}
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
  >
    <polygon points="34,12 108,12 86,34 12,34" fill="currentColor" />
    <polygon points="12,34 34,34 36,49 14,49" fill={fold} />
    <polygon points="36,49 92,49 70,71 14,71" fill="currentColor" />
    <polygon points="14,71 36,71 34,86 12,86" fill={fold} />
    <polygon points="34,86 108,86 86,108 12,108" fill="currentColor" />
  </svg>
);

const Logo = ({
  size = 'md',
  variant = 'full',      // 'full' | 'mark' | 'stacked'
  tone = 'auto',         // 'auto' | 'ink' | 'light' | 'accent'
  suffix,                // "Podcasts", "Articles", "Mock" — wordmark yonidagi ikkinchi so'z
  suffixClassName = '',
  tagline,              // odatda "Ingliz tili onlayn"
  to,
  onClick,
  className = '',
  title,
}) => {
  const markSize = typeof size === 'number' ? size : (SIZES[size] ?? SIZES.md);
  // Guide'da katta displey lokapida so'z belgining ~0.55 qismi, kichik UI
  // lokaplarida esa ~0.7 — interfeysda kichik serif o'qilmay qolmasligi uchun.
  const wordSize = Math.round(markSize * 0.71);
  const gap = Math.round(markSize * 0.3);
  const stacked = variant === 'stacked';
  const toneClass = TONES[tone] ?? TONES.auto;

  const word = (
    <span
      style={{
        font: `600 ${wordSize}px ${SERIF_FONT}`,
        letterSpacing: '-.02em',
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      englev
      {suffix && <span className={`opacity-55 ${suffixClassName}`}> {suffix}</span>}
    </span>
  );

  const content = (
    <>
      <LogoMark size={markSize} fold={tone === 'accent' ? BRAND_INK : BRAND_ACCENT} />
      {variant !== 'mark' && (
        <span className="flex flex-col" style={{ gap: `${Math.round(markSize * 0.1)}px` }}>
          {word}
          {tagline && (
            <span
              style={{
                fontSize: `${Math.max(10, Math.round(markSize * 0.3))}px`,
                letterSpacing: '.24em',
                textTransform: 'uppercase',
                opacity: 0.6,
                lineHeight: 1,
                whiteSpace: 'nowrap',
              }}
            >
              {tagline}
            </span>
          )}
        </span>
      )}
    </>
  );

  const shared = {
    className: `inline-flex select-none ${toneClass} ${
      stacked ? 'flex-col items-start' : 'flex-row items-center'
    } ${to || onClick ? 'cursor-pointer transition-opacity hover:opacity-80 active:scale-95' : ''} ${className}`,
    style: { gap: `${stacked ? Math.round(markSize * 0.38) : gap}px` },
    title,
  };

  if (to) {
    return (
      <Link to={to} onClick={onClick} {...shared}>
        {content}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} {...shared}>
        {content}
      </button>
    );
  }
  return <div {...shared}>{content}</div>;
};

export default Logo;
