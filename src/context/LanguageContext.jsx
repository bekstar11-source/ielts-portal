import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../locales/translations';

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('lang') || 'uz';
  });

  useEffect(() => {
    localStorage.setItem('lang', lang);
  }, [lang]);

  const t = (path) => {
    const keys = path.split('.');
    let current = translations[lang];
    for (const key of keys) {
      if (current && current[key] !== undefined) {
        current = current[key];
      } else {
        // Fallback to Uzbek if translation is missing in English
        let uzCurrent = translations['uz'];
        let foundUz = true;
        for (const uzKey of keys) {
          if (uzCurrent && uzCurrent[uzKey] !== undefined) {
            uzCurrent = uzCurrent[uzKey];
          } else {
            foundUz = false;
            break;
          }
        }
        return foundUz ? uzCurrent : path;
      }
    }
    return current;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
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
