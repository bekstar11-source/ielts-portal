import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Imtihon davomida tarmoq va audio holatini kuzatadi.
 *
 * Talaba interneti uzilganda audio jimgina to'xtab qolardi va nima bo'lganini
 * bilmasdi. Bu hook ikkita mustaqil signalni birlashtiradi:
 *
 *   1. `navigator.onLine` + online/offline hodisalari — javoblar Firestore'ga
 *      yozilmayotganini bilish uchun (audio blob'dan ijro etilayotgan bo'lsa ham).
 *   2. Faol <audio> elementining haqiqiy holati — `error`/`stalled`/`waiting`
 *      hodisalari va vaqt o'qi siljimayotganini aniqlaydigan watchdog. Brauzer
 *      ba'zan `stalled` ni umuman yubormaydi, shuning uchun poll SHART.
 *
 * @param {object}  opts
 * @param {boolean} opts.enabled     Kuzatuv yoqilganmi (faqat imtihon bosqichlarida).
 * @param {boolean} opts.watchAudio  Audio kuzatilsinmi (listening bosqichi).
 * @param {number}  opts.activePart  Faol part indeksi — `audio-part-${i}` id'si.
 * @param {(ms:number) => void} opts.onOfflineEnded
 *        Har bir uzilish tugaganda uning davomiyligi (ms) bilan chaqiriladi —
 *        chaqiruvchi buni sessiyaga yozib, keyin adminga ko'rsatishi mumkin.
 */
export default function useConnectionStatus({
    enabled = true,
    watchAudio = false,
    activePart = 0,
    onOfflineEnded,
} = {}) {
    const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine !== false));
    const [justReconnected, setJustReconnected] = useState(false);
    const [audioIssue, setAudioIssue] = useState(null); // null | 'buffering' | 'error'
    const [retrying, setRetrying] = useState(false);
    const [audioDeviceChanged, setAudioDeviceChanged] = useState(false);

    const wasOfflineRef = useRef(false);
    const offlineSinceRef = useRef(null);
    const reconnectTimerRef = useRef(null);

    const onOfflineEndedRef = useRef(onOfflineEnded);
    useEffect(() => { onOfflineEndedRef.current = onOfflineEnded; }, [onOfflineEnded]);

    const getAudioEl = useCallback(() => {
        if (typeof document === 'undefined') return null;
        // Ijro etilayotgan element ustuvor: part almashuvi paytida `activePart`
        // hali eski indeksni ko'rsatib turgan bo'lishi mumkin.
        const playing = Array.from(document.querySelectorAll('audio[id^="audio-part-"]')).find(a => !a.paused);
        return playing || document.getElementById(`audio-part-${activePart}`) || null;
    }, [activePart]);

    // ─── Tarmoq holati ───────────────────────────────────────────────────────
    useEffect(() => {
        if (!enabled) return;

        let cancelled = false;

        const goOffline = () => {
            if (cancelled) return;
            if (!wasOfflineRef.current) offlineSinceRef.current = Date.now();
            wasOfflineRef.current = true;
            setIsOnline(false);
            setJustReconnected(false);
        };
        const goOnline = () => {
            if (cancelled) return;
            setIsOnline(true);
            if (wasOfflineRef.current) {
                wasOfflineRef.current = false;
                // Uzilish qancha davom etganini xabar qilamiz: taymer bu vaqtda
                // ham ishlagani uchun talaba yo'qotgan vaqt shu.
                if (offlineSinceRef.current) {
                    onOfflineEndedRef.current?.(Date.now() - offlineSinceRef.current);
                    offlineSinceRef.current = null;
                }
                setJustReconnected(true);
                clearTimeout(reconnectTimerRef.current);
                reconnectTimerRef.current = setTimeout(() => setJustReconnected(false), 5000);
            }
        };

        window.addEventListener('offline', goOffline);
        window.addEventListener('online', goOnline);

        // `navigator.onLine` faqat "interfeys ulangan" degani — Wi-Fi bor, lekin
        // internet yo'q holatda u `true` qaytaradi (talabalarda eng ko'p uchraydigan
        // holat). Shuning uchun yengil ping bilan haqiqiy chiqishni tekshiramiz.
        // Bitta muvaffaqiyatsiz so'rov yetarli emas: imtihon o'rtasida yolg'on
        // ogohlantirish chiqmasligi uchun ketma-ket IKKI marta yiqilishi kerak.
        let failStreak = 0;
        const ping = async () => {
            if (document.hidden) return;
            try {
                const ctrl = new AbortController();
                const timeoutId = setTimeout(() => ctrl.abort(), 6000);
                await fetch(`/favicon.png?ping=${Date.now()}`, {
                    method: 'HEAD',
                    cache: 'no-store',
                    signal: ctrl.signal,
                });
                clearTimeout(timeoutId);
                failStreak = 0;
                goOnline();
            } catch {
                failStreak += 1;
                if (failStreak >= 2) goOffline();
            }
        };
        const pingId = setInterval(ping, 15000);

        return () => {
            cancelled = true;
            window.removeEventListener('offline', goOffline);
            window.removeEventListener('online', goOnline);
            clearInterval(pingId);
            clearTimeout(reconnectTimerRef.current);
        };
    }, [enabled]);

    // ─── Audio holati ────────────────────────────────────────────────────────
    useEffect(() => {
        if (!enabled || !watchAudio) {
            setAudioIssue(null);
            return;
        }

        let lastTime = -1;
        let stuckTicks = 0;
        let attached = null;

        const onError = () => setAudioIssue('error');
        const onWaiting = () => { stuckTicks = Math.max(stuckTicks, 2); };
        const onPlaying = () => { stuckTicks = 0; setAudioIssue(null); };

        const attach = (el) => {
            if (attached === el) return;
            if (attached) {
                attached.removeEventListener('error', onError);
                attached.removeEventListener('stalled', onWaiting);
                attached.removeEventListener('waiting', onWaiting);
                attached.removeEventListener('playing', onPlaying);
            }
            attached = el;
            if (!el) return;
            el.addEventListener('error', onError);
            el.addEventListener('stalled', onWaiting);
            el.addEventListener('waiting', onWaiting);
            el.addEventListener('playing', onPlaying);
        };

        // Watchdog: audio "play" holatida turib currentTime ~2s davomida
        // o'zgarmasa — bufer tugagan, ya'ni talaba hech narsa eshitmayapti.
        const tick = () => {
            const el = getAudioEl();
            attach(el);
            if (!el) return;

            if (el.error) {
                setAudioIssue('error');
                return;
            }
            if (el.paused || el.ended) {
                // Ataylab pauza (partlar orasidagi jimlik) — muammo emas.
                stuckTicks = 0;
                lastTime = el.currentTime;
                setAudioIssue(prev => (prev === 'error' ? prev : null));
                return;
            }

            if (Math.abs(el.currentTime - lastTime) < 0.01) {
                stuckTicks += 1;
            } else {
                stuckTicks = 0;
                setAudioIssue(prev => (prev === 'buffering' ? null : prev));
            }
            lastTime = el.currentTime;

            if (stuckTicks >= 3) setAudioIssue('buffering');
        };

        const id = setInterval(tick, 700);
        tick();

        return () => {
            clearInterval(id);
            attach(null);
        };
    }, [enabled, watchAudio, getAudioEl]);

    // ─── Audio chiqish qurilmasi almashuvi ───────────────────────────────────
    // Bluetooth naushnik uzilsa yoki quloqchin sug'urilsa brauzer audio'ni
    // pauza qiladi, `onPauseExam` esa uni darhol qayta yoqadi — ovoz endi
    // telefon dinamigidan chiqadi. Talaba buni sezmay, qismni boy berishi
    // mumkin, shuning uchun aniq ogohlantiramiz.
    useEffect(() => {
        if (!enabled || !watchAudio) return;
        const md = navigator.mediaDevices;
        if (!md?.addEventListener) return;

        let hideTimer = null;
        const onDeviceChange = () => {
            setAudioDeviceChanged(true);
            clearTimeout(hideTimer);
            hideTimer = setTimeout(() => setAudioDeviceChanged(false), 10000);
        };

        md.addEventListener('devicechange', onDeviceChange);
        return () => {
            clearTimeout(hideTimer);
            md.removeEventListener('devicechange', onDeviceChange);
        };
    }, [enabled, watchAudio]);

    /** Audio elementni qayta yuklab, to'xtagan joyidan davom ettiradi. */
    const retryAudio = useCallback(async () => {
        const el = getAudioEl();
        if (!el) return;
        setRetrying(true);
        const resumeAt = el.currentTime || 0;
        try {
            el.load();
            await new Promise((resolve) => {
                const done = () => { el.removeEventListener('loadeddata', done); resolve(); };
                el.addEventListener('loadeddata', done);
                setTimeout(done, 8000);
            });
            try { el.currentTime = resumeAt; } catch { /* seek qo'llab-quvvatlanmasligi mumkin */ }
            await el.play().catch(() => {});
            setAudioIssue(null);
        } finally {
            setRetrying(false);
        }
    }, [getAudioEl]);

    const dismissDeviceChange = useCallback(() => setAudioDeviceChanged(false), []);

    return {
        isOnline,
        justReconnected,
        audioIssue,
        audioDeviceChanged,
        dismissDeviceChange,
        retryAudio,
        retrying,
    };
}
