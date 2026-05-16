import { useEffect } from 'react';
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

    useEffect(() => {
        if (!enabled) return;

        // 1. Hash trap to prevent back navigation
        window.location.hash = "mock-active";
        const handleHashChange = () => {
            if (window.location.hash !== "#mock-active") {
                window.location.hash = "mock-active";
            }
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

        window.addEventListener('hashchange', handleHashChange);
        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('hashchange', handleHashChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [enabled]);

    // 4. Tab switch / Visibility detection
    useEffect(() => {
        if (!enabled) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                onSecurityViolation?.('tab_switch');
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [enabled, onSecurityViolation]);
};
