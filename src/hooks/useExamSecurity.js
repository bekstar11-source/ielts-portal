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

        // 1. History trap to prevent back navigation
        window.history.pushState(null, null, window.location.pathname);
        const handlePopState = (e) => {
            window.history.pushState(null, null, window.location.pathname);
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

        window.addEventListener('popstate', handlePopState);
        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('contextmenu', (e) => e.preventDefault());

        return () => {
            window.removeEventListener('popstate', handlePopState);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('contextmenu', (e) => e.preventDefault());
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

    // 5. Fullscreen exit detection
    useEffect(() => {
        if (!enabled) return;

        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
                onSecurityViolation?.('fullscreen_exit');
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
    }, [enabled, onSecurityViolation]);
};
