import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Englev brend logotipi — butun platforma bo'ylab yagona manba.
 * Etalon: landing Navbar'dagi ko'rinish (#D97757 squircle + "E" + "Englev").
 *
 * Yangi joyda logo kerak bo'lsa shu komponentni ishlating, SVG'ni qayta yozmang.
 */

const DISPLAY_FONT = "'Space Grotesk', sans-serif";

export const LOGO_ORANGE = '#D97757';
export const LOGO_INK = '#1E1B16';
export const LOGO_CREAM = '#F7F4EE';

// Belgi (mark) o'lchami px'da; so'z o'lchami shundan hosil qilinadi.
const SIZES = { xs: 20, sm: 22, md: 24, lg: 28, xl: 34 };

const TONES = {
  // Yorug' fonda qora, qorong'ida oq — dashboard/articles kabi ikki rejimli sahifalar uchun.
  auto: 'text-[#1E1B16] dark:text-white',
  ink: 'text-[#1E1B16]',
  light: 'text-white',
};

export const LogoMark = ({ size = 24, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 block ${className}`}
    aria-hidden="true"
  >
    <rect width="32" height="32" rx="9" fill={LOGO_ORANGE} />
    <text
      x="16"
      y="16"
      textAnchor="middle"
      dominantBaseline="central"
      fill={LOGO_CREAM}
      style={{ font: `700 18px ${DISPLAY_FONT}` }}
    >
      E
    </text>
  </svg>
);

const Logo = ({
  size = 'md',
  variant = 'full',
  tone = 'auto',
  suffix,
  suffixClassName = '',
  to,
  onClick,
  className = '',
  title,
}) => {
  const markSize = typeof size === 'number' ? size : (SIZES[size] ?? SIZES.md);
  const wordSize = Math.round(markSize * 0.82);
  const gap = markSize <= 22 ? 6 : 8;

  const content = (
    <>
      <LogoMark size={markSize} />
      {variant === 'full' && (
        <span
          className={TONES[tone] ?? TONES.auto}
          style={{
            font: `700 ${wordSize}px ${DISPLAY_FONT}`,
            letterSpacing: '-.02em',
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          Englev
          {suffix && (
            <span className={`font-normal opacity-50 ${suffixClassName}`}> {suffix}</span>
          )}
        </span>
      )}
    </>
  );

  const shared = {
    className: `flex items-center select-none ${
      to || onClick ? 'cursor-pointer transition-opacity hover:opacity-80 active:scale-95' : ''
    } ${className}`,
    style: { gap: `${gap}px` },
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
