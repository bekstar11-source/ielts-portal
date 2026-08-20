import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translations } from '../locales/translations';

const LanguageContext = createContext(null);

/** `a.b.c` yo'li bo'yicha qiymat; topilmasa `undefined`. */
const resolvePath = (root, keys) => {
  let current = root;
  for (const key of keys) {
    if (current === null || current === undefined || current[key] === undefined) return undefined;
    current = current[key];
  }
  return current;
};

/** `{name}` o'rin egallarini `params` qiymatlari bilan almashtiradi. */
const interpolate = (text, params) => {
  if (!params || typeof text !== 'string') return text;
  return text.replace(/\{(\w+)\}/g, (match, key) =>
    params[key] === undefined || params[key] === null ? match : String(params[key])
  );
};

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('lang') || 'uz';
  });

  useEffect(() => {
    localStorage.setItem('lang', lang);
  }, [lang]);

  /**
   * Tarjimani oladi.
   *
   *   t('a.b')                          → tarjima; topilmasa kalit yo'lining o'zi
   *   t('a.b', 'Zaxira')                → topilmasa "Zaxira"
   *   t('a.b', { count: 3 })            → "{count}" o'rin egallari to'ldiriladi
   *   t('a.b', 'Zaxira {n}', { n: 3 })  → ikkalasi birga
   *
   * NEGA: ilgari `t` faqat bitta argument qabul qilardi va topilmagan kalit
   * uchun YO'LNING O'ZINI (truthy string) qaytarardi. Shuning uchun kodda keng
   * tarqalgan ikkala naqsh ham jimgina ishlamasdi —
   *   `t('kalit') || 'Zaxira'`      → `||` hech qachon ishlamas edi,
   *   `t('kalit', 'Zaxira')`        → 2-argument e'tiborsiz qolardi,
   *   `t('kalit', { count: 5 })`    → ekranda literal "{count}" chiqardi —
   * va foydalanuvchi tarjima o'rniga "teacher.results.colDate" ni ko'rardi.
   *
   * Massiv/obyekt qiymatlar (masalan `landing.faqs`) o'zgarishsiz qaytariladi.
   */
  const t = useCallback((path, fallbackOrParams, maybeParams) => {
    const hasFallback = typeof fallbackOrParams === 'string';
    const fallback = hasFallback ? fallbackOrParams : undefined;
    const params = hasFallback ? maybeParams : fallbackOrParams;

    const keys = String(path).split('.');
    // Joriy til → o'zbekcha (to'liq bo'lmagan tarjimalar uchun) → zaxira.
    const value = resolvePath(translations[lang], keys) ?? resolvePath(translations.uz, keys);

    if (value === undefined) return interpolate(fallback ?? path, params);
    if (typeof value !== 'string') return value;
    return interpolate(value, params);
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
