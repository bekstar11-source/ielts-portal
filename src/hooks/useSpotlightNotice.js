import { useCallback, useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { SPOTLIGHTS_COLLECTION, toMillis } from './usePromoSpotlights';

/**
 * "Bosh sahifada yangi e'lon bor" signali.
 *
 * `usePromoSpotlights`dan farqi: bu hook slaydlarning butun tarkibini emas,
 * faqat eng yangisining metama'lumotini oladi va natijani modul darajasida
 * keshlaydi — shuning uchun uni header, bottom nav va toast bir vaqtda
 * chaqirsa ham Firestore'ga bitta so'rov ketadi.
 */

const CACHE_TTL_MS = 10 * 60 * 1000;

let cache = null;      // { fetchedAt, latest }
let inflight = null;
const listeners = new Set();

const emit = () => listeners.forEach((l) => l());

export const seenKey = (uid) => `spotlight_seen_${uid}`;
export const toastKey = (uid) => `spotlight_toast_${uid}`;

const readStamp = (key) => {
    try { return Number(localStorage.getItem(key)) || 0; } catch { return 0; }
};

const writeStamp = (key, value) => {
    try { localStorage.setItem(key, String(value)); } catch { /* private mode */ }
};

async function fetchLatest() {
    if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache.latest;
    if (inflight) return inflight;

    inflight = (async () => {
        try {
            const snap = await getDocs(query(collection(db, SPOTLIGHTS_COLLECTION), orderBy('order', 'asc')));
            const active = snap.docs
                .map((d) => ({ id: d.id, ...d.data() }))
                .filter((d) => d.isActive !== false)
                .map((d) => ({
                    id: d.id,
                    title: d.title || d.preview?.statement || d.preview?.question || "Yangi e'lon",
                    tag: d.tag || 'Yangi',
                    // `publishedAt` yo'q eski hujjatlar 0 — hech qachon "yangi" emas.
                    publishedAt: toMillis(d.publishedAt),
                }))
                .sort((a, b) => b.publishedAt - a.publishedAt);

            cache = { fetchedAt: Date.now(), latest: active[0] || null };
            return cache.latest;
        } catch (err) {
            console.error('Spotlight bildirishnomasini yuklashda xatolik:', err);
            // Xatoda ham keshlaymiz — har sahifa almashganda qayta urinmaslik uchun.
            cache = { fetchedAt: Date.now(), latest: null };
            return null;
        } finally {
            inflight = null;
        }
    })();

    return inflight;
}

/** Admin panel slayd saqlaganda keshni majburan bekor qiladi. */
export function invalidateSpotlightNotice() {
    cache = null;
    emit();
}

/**
 * @param {object|null} user  Firebase user — `uid` "ko'rilgan" belgisini shaxsiylashtiradi.
 * @returns {{ latest: object|null, hasNew: boolean, markSeen: () => void }}
 */
export function useSpotlightNotice(user) {
    const uid = user?.uid || null;
    const [latest, setLatest] = useState(cache?.latest ?? null);
    const [seenAt, setSeenAt] = useState(() => (uid ? readStamp(seenKey(uid)) : 0));

    useEffect(() => {
        let alive = true;
        const sync = () => {
            if (!alive) return;
            setLatest(cache?.latest ?? null);
            setSeenAt(uid ? readStamp(seenKey(uid)) : 0);
        };

        listeners.add(sync);
        if (uid) fetchLatest().then(sync);

        return () => { alive = false; listeners.delete(sync); };
    }, [uid]);

    const markSeen = useCallback(() => {
        if (!uid || !latest?.publishedAt) return;
        if (readStamp(seenKey(uid)) >= latest.publishedAt) return;
        writeStamp(seenKey(uid), latest.publishedAt);
        emit();
    }, [uid, latest]);

    const hasNew = !!(uid && latest?.publishedAt && latest.publishedAt > seenAt);

    return { latest, hasNew, markSeen };
}
