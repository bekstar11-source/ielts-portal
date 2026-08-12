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
    const [slides, setSlides] = useState([]);
    const [loading, setLoading] = useState(enabled);
    const [error, setError] = useState(null);

    const fetchSlides = useCallback(async () => {
        if (!enabled) { setLoading(false); return; }
        setLoading(true);
        try {
            const snap = await getDocs(query(collection(db, SPOTLIGHTS_COLLECTION), orderBy('order', 'asc')));
            const all = snap.docs.map(d => normalizeSpotlight(d.id, d.data()));
            const visible = includeInactive ? all : all.filter(s => s.isActive);
            setSlides(visible.length === 0 && fallbackToStatic ? PROMO_SPOTLIGHTS : visible);
            setError(null);
        } catch (err) {
            console.error('Spotlightlarni yuklashda xatolik:', err);
            setError(err);
            setSlides(fallbackToStatic ? PROMO_SPOTLIGHTS : []);
        } finally {
            setLoading(false);
        }
    }, [includeInactive, fallbackToStatic, enabled]);

    useEffect(() => { fetchSlides(); }, [fetchSlides]);

    return { slides, loading, error, refresh: fetchSlides };
}
