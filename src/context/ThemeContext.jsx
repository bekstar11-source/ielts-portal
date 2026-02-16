import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    // Default to dark mode for admin dashboard as requested, or persis user preference
    const [theme, setTheme] = useState(() => {
        const savedTheme = localStorage.getItem('admin_theme');
        return savedTheme || 'dark';
    });

    useEffect(() => {
        const root = window.document.documentElement;

        // Remove old class
        root.classList.remove(theme === 'dark' ? 'light' : 'dark');

        // Add new class
        root.classList.add(theme);

        // Save to local storage
        localStorage.setItem('admin_theme', theme);

    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
