import { useCallback, useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { PROMO_SPOTLIGHTS } from '../data/promoSpotlights';

export const SPOTLIGHTS_COLLECTION = 'promo_spotlights';

/** Firestore Timestamp / raqam / `{seconds}` — hammasini millisekundga keltiradi. */
export function toMillis(value) {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.seconds === 'number') return value.seconds * 1000;
    return 0;
}

/**
 * Firestore hujjatini `PromoSpotlight` kutayotgan shaklga keltiradi.
 * Admin formasi maydonlarni tekis (flat) saqlaydi — bu yerda ular
 * `cta` / `secondary` / `preview` obyektlariga yig'iladi.
 */
export function normalizeSpotlight(id, data = {}) {
    const preview = data.preview || {};
    const options = Array.isArray(preview.options)
        ? preview.options.filter(o => String(o).trim() !== '')
        : [];

    // `mode` maydoni keyinroq qo'shilgan — eski hujjatlarda uni tarkibdan
    // taxmin qilamiz: savol matni bormi, sarlavha bormi.
    const hasQuestionContent = !!(preview.statement || preview.question || preview.before);
    const mode = ['promo', 'question', 'both'].includes(data.mode)
        ? data.mode
        : hasQuestionContent
        ? (data.title ? 'both' : 'question')
        : 'promo';

    return {
        id,
        mode,
        tag: data.tag || 'Yangi',
        accent: data.accent || '#cc785c',
        title: data.title || '',
        description: data.description || '',
        order: typeof data.order === 'number' ? data.order : 0,
        isActive: data.isActive !== false,
        // "Yangi" belgisi shu vaqtga qarab hisoblanadi: admin e'lonni nashr
        // qilganda `publishedAt` yoziladi. Bu maydon paydo bo'lishidan oldin
        // yaratilgan hujjatlar 0 bo'lib qoladi — ya'ni jim, hech kimga
        // bildirishnoma yubormaydi (`createdAt`ga qaytmaymiz, aks holda
        // deploy'dan keyin hamma eski e'lon "yangi" bo'lib ko'rinardi).
        publishedAt: toMillis(data.publishedAt),
        cta: { label: data.ctaLabel || "Ko'rish", to: data.ctaTo || '/practice' },
        secondary: data.secondaryLabel ? { label: data.secondaryLabel, to: data.secondaryTo || '/practice' } : null,
        preview: {
            kind: preview.kind || 'tfng',
            label: preview.label || '',
            passage: preview.passage || '',
            statement: preview.statement || '',
            question: preview.question || '',
            audioLine: preview.audioLine || '',
            transcriptHint: preview.transcriptHint || '',
            before: preview.before || '',
            after: preview.after || '',
            options: options.length ? options : ['True', 'False', 'Not Given'],
            answer: preview.answer || '',
            explanation: preview.explanation || '',
        },
    };
}

/**
 * Yuklangan slaydlar modul darajasida keshlanadi — shunda sahifadan sahifaga
 * o'tganda komponent qayta o'rnatilsa ham "loading" holati takrorlanmaydi
 * (aks holda spotlight bo'lmaganda ham har safar skelet karta chaqnab o'tardi).
 *
 * Kesh ikkita ko'rinish uchun alohida: o'quvchi (faqat aktiv) va admin (hammasi).
 */
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = { public: null, admin: null }; // { fetchedAt, all }

// Kesh sahifa yangilanganda yo'qoladi, shuning uchun "aktiv slayd yo'q" holatini
// sessiyada alohida eslab qolamiz: shunda bo'sh kolleksiyada skelet karta
// birinchi yuklashda ham chaqnamaydi.
const EMPTY_FLAG = 'promo_spotlights_empty';

const readEmptyFlag = () => {
    try { return sessionStorage.getItem(EMPTY_FLAG) === '1'; } catch { return false; }
};

const writeEmptyFlag = (isEmpty) => {
    try {
        if (isEmpty) sessionStorage.setItem(EMPTY_FLAG, '1');
        else sessionStorage.removeItem(EMPTY_FLAG);
    } catch { /* private mode */ }
};

/** Admin slayd saqlagach keshni bekor qiladi. */
export function invalidatePromoSpotlights() {
    cache.public = null;
    cache.admin = null;
    writeEmptyFlag(false);
}

/**
 * Bosh sahifadagi spotlight slaydlari.
 *
 * `isActive` filtri klientda bajariladi — shunda Firestore'da qo'shimcha
 * kompozit indeks (isActive + order) talab qilinmaydi.
 *
 * @param {object}  opts
 * @param {boolean} opts.includeInactive  Admin panel uchun: o'chirilganlari ham.
 * @param {boolean} opts.fallbackToStatic Kolleksiya bo'sh bo'lsa statik namunalar.
 * @param {boolean} opts.enabled          false bo'lsa — so'rov yuborilmaydi.
 */
export function usePromoSpotlights({ includeInactive = false, fallbackToStatic = false, enabled = true } = {}) {
    const scope = includeInactive ? 'admin' : 'public';

    const select = useCallback((all) => {
        const visible = includeInactive ? all : all.filter(s => s.isActive);
        return visible.length === 0 && fallbackToStatic ? PROMO_SPOTLIGHTS : visible;
    }, [includeInactive, fallbackToStatic]);

    const cached = enabled && cache[scope] && Date.now() - cache[scope].fetchedAt < CACHE_TTL_MS
        ? cache[scope]
        : null;

    const [slides, setSlides] = useState(() => (cached ? select(cached.all) : []));
    // Oldingi so'rov bo'sh natija bergan bo'lsa — skelet ko'rsatmaymiz.
    const [loading, setLoading] = useState(
        enabled && !cached && !(scope === 'public' && !fallbackToStatic && readEmptyFlag())
    );
    const [error, setError] = useState(null);

    const fetchSlides = useCallback(async ({ force = false } = {}) => {
        if (!enabled) { setLoading(false); return; }

        const hit = !force && cache[scope] && Date.now() - cache[scope].fetchedAt < CACHE_TTL_MS
            ? cache[scope]
            : null;
        if (hit) { setSlides(select(hit.all)); setError(null); setLoading(false); return; }

        // "Bo'sh" deb belgilangan holatda jim yuklaymiz — skelet chaqnamasin.
        const quiet = scope === 'public' && !fallbackToStatic && readEmptyFlag();
        if (!quiet) setLoading(true);
        try {
            const snap = await getDocs(query(collection(db, SPOTLIGHTS_COLLECTION), orderBy('order', 'asc')));
            const all = snap.docs.map(d => normalizeSpotlight(d.id, d.data()));
            cache[scope] = { fetchedAt: Date.now(), all };
            if (scope === 'public') writeEmptyFlag(all.filter(s => s.isActive).length === 0);
            setSlides(select(all));
            setError(null);
        } catch (err) {
            console.error('Spotlightlarni yuklashda xatolik:', err);
            setError(err);
            setSlides(fallbackToStatic ? PROMO_SPOTLIGHTS : []);
        } finally {
            setLoading(false);
        }
    }, [enabled, scope, select, fallbackToStatic]);

    useEffect(() => { fetchSlides(); }, [fetchSlides]);

    const refresh = useCallback(() => fetchSlides({ force: true }), [fetchSlides]);

    return { slides, loading, error, refresh };
}
