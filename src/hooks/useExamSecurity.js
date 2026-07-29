import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Custom hook to handle exam security:
 * - Prevents back navigation (hash trap)
 * - Warns on page refresh/close
 * - Detects fullscreen exits
 * - Detects DevTools opening (basic)
 */
export const useExamSecurity = ({ enabled, onSecurityViolation }) => {
    const navigate = useNavigate();

    // Callback'ni ref orqali chaqiramiz: parent uni har renderda inline arrow sifatida
    // uzatadi, effektlar esa faqat `enabled` o'zgarganda qayta ishga tushadi — to'g'ridan-to'g'ri
    // chaqirilsa eskirgan closure qolib ketardi (va listener'lar har renderda qayta ulanardi).
    const violationRef = useRef(onSecurityViolation);
    useEffect(() => { violationRef.current = onSecurityViolation; }, [onSecurityViolation]);

    useEffect(() => {
        if (!enabled) return;

        // 1. History trap to prevent back navigation
        window.history.pushState(null, null, window.location.pathname);
        const handlePopState = (e) => {
            window.history.pushState(null, null, window.location.pathname);
            // Ilgari "Back" jimgina yutilardi va talaba nima bo'lganini tushunmasdi.
            // Endi chiqishni tasdiqlash modali ko'rsatiladi.
            violationRef.current?.('back_navigation');
        };

        // 2. Beforeunload warning
        const handleBeforeUnload = (e) => {
            e.preventDefault();
            e.returnValue = '';
            return '';
        };

        // 3. DevTools detection (basic check for window resizing or key combos)
        const handleKeyDown = (e) => {
            // Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
            if (
                e.keyCode === 123 || 
                (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) ||
                (e.metaKey && e.altKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67))
            ) {
                // Not blocking entirely to avoid accessibility issues, but could notify
            }
        };

        // MUHIM: add/remove ga AYNAN bir xil funksiya referensi berilishi shart.
        // Ilgari ikkalasiga alohida inline arrow uzatilardi, ya'ni contextmenu listener'i
        // hech qachon o'chirilmasdi — imtihondan chiqqandan keyin ham butun saytda
        // o'ng tugma bloklangan qolar va har `enabled` o'zgarishida yangisi qo'shilardi.
        const handleContextMenu = (e) => e.preventDefault();

        window.addEventListener('popstate', handlePopState);
        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('contextmenu', handleContextMenu);

        return () => {
            window.removeEventListener('popstate', handlePopState);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('contextmenu', handleContextMenu);
        };
    }, [enabled]);

    // 4. Tab switch / Visibility detection
    useEffect(() => {
        if (!enabled) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                violationRef.current?.('tab_switch');
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [enabled]);

    // 5. Fullscreen exit detection
    useEffect(() => {
        if (!enabled) return;

        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
                violationRef.current?.('fullscreen_exit');
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
        };
    }, [enabled]);
};
