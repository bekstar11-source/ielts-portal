import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Ekran haqiqatan ham to'liq ekranmi?
 *
 * Fullscreen API (`document.fullscreenElement`) FAQAT JS orqali so'ralgan
 * fullscreen'ni biladi. Foydalanuvchi F11 bossa yoki OS darajasida oyna
 * to'liq ekranga o'tsa, API `null` qaytaradi — vizual jihatdan esa ekran
 * to'liq. Shu sababli o'lcham bo'yicha ham tekshiramiz, aks holda talaba
 * to'liq ekranda turib "Full Screen Required" oynasi ostida qolib ketadi.
 */
export const isFullscreenActive = () => {
    if (typeof document === 'undefined') return false;
    if (
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
    ) return true;

    // F11 / OS fullscreen: viewport ekran o'lchamiga teng bo'ladi.
    // DPI masshtabi va scrollbar uchun kichik tolerans qoldiramiz.
    try {
        if (window.matchMedia?.('(display-mode: fullscreen)')?.matches) return true;
        const TOLERANCE = 6;
        return (
            Math.abs(window.innerHeight - window.screen.height) <= TOLERANCE &&
            Math.abs(window.innerWidth - window.screen.width) <= TOLERANCE
        );
    } catch {
        return false;
    }
};

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

        // useMockExam'dagi hisoblagich bilan bir xil grace: qisqa muddatli
        // yopilish (bildirishnoma, oyna miltillashi) ogohlantirish bermaydi.
        const HIDDEN_GRACE_MS = 2000;
        let hiddenTimer = null;

        const handleVisibilityChange = () => {
            clearTimeout(hiddenTimer);
            if (document.hidden) {
                hiddenTimer = setTimeout(() => {
                    if (document.hidden) violationRef.current?.('tab_switch');
                }, HIDDEN_GRACE_MS);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            clearTimeout(hiddenTimer);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [enabled]);

    // 5. Fullscreen exit detection
    useEffect(() => {
        if (!enabled) return;

        let timer = null;

        // Har o'zgarishda holatni QAYTA baholaymiz va ikkala yo'nalishni ham
        // xabar qilamiz. Ilgari faqat 'fullscreen_exit' yuborilardi — overlay
        // ochilgach, talaba F11 bilan qaytsa ham hech narsa uni yopmasdi.
        const evaluate = (delay = 0) => {
            clearTimeout(timer);
            // Telegram/notification kabi oynalar qisqa muddat fokus olganda
            // brauzer bir lahzaga fullscreen'dan chiqishi mumkin — darhol
            // ogohlantirmasdan, holat barqarorlashishini kutamiz.
            timer = setTimeout(() => {
                violationRef.current?.(isFullscreenActive() ? 'fullscreen_restored' : 'fullscreen_exit');
            }, delay);
        };

        const handleFullscreenChange = () => evaluate(400);
        // F11 va OS-darajasidagi fullscreen 'fullscreenchange' hodisasini
        // umuman chiqarmaydi — faqat resize/focus orqali bilinadi.
        const handleResize = () => evaluate(300);
        const handleFocus = () => evaluate(300);

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);
        window.addEventListener('resize', handleResize);
        window.addEventListener('focus', handleFocus);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('focus', handleFocus);
        };
    }, [enabled]);
};
