// src/utils/podcastProgress.js
// Har bir epizod uchun tinglash progressini localStorage'da saqlaydi.
// Shu tufayli o'quvchi sahifadan chiqib ketsa ham qoldirgan joyidan davom etadi.

const PROGRESS_KEY = 'podcast_progress_v1';
const MAX_ENTRIES = 100;

// Boshidagi shu qadar soniya ichida to'xtatilgan bo'lsa — davom ettirishga arzimaydi
export const RESUME_MIN_SECONDS = 15;
// Oxiriga shu qadar yaqin bo'lsa — tugagan deb hisoblanadi, boshidan boshlanadi
export const RESUME_TAIL_SECONDS = 20;

const readAll = () => {
    try {
        const raw = localStorage.getItem(PROGRESS_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
};

export const getAllProgress = () => readAll();

export const getProgress = (podcastId) => {
    if (!podcastId) return null;
    const entry = readAll()[podcastId];
    if (!entry || typeof entry.time !== 'number') return null;
    return entry;
};

/**
 * Epizodning davom ettirish nuqtasi (yoki null — boshidan boshlansin).
 */
export const getResumeTime = (podcastId, duration) => {
    const entry = getProgress(podcastId);
    if (!entry || entry.completed) return null;
    const time = entry.time;
    if (!Number.isFinite(time) || time < RESUME_MIN_SECONDS) return null;
    if (Number.isFinite(duration) && duration > 0 && time > duration - RESUME_TAIL_SECONDS) return null;
    return time;
};

export const saveProgress = (podcastId, time, duration) => {
    if (!podcastId || !Number.isFinite(time)) return;
    try {
        const all = readAll();
        const completed =
            Number.isFinite(duration) && duration > 0 && time > duration - RESUME_TAIL_SECONDS;

        all[podcastId] = {
            time,
            duration: Number.isFinite(duration) && duration > 0 ? duration : (all[podcastId]?.duration || 0),
            completed,
            updatedAt: Date.now(),
        };

        // Ro'yxat cheksiz o'smasligi uchun eng eskilarini tozalaymiz
        const ids = Object.keys(all);
        if (ids.length > MAX_ENTRIES) {
            ids
                .sort((a, b) => (all[a].updatedAt || 0) - (all[b].updatedAt || 0))
                .slice(0, ids.length - MAX_ENTRIES)
                .forEach((id) => delete all[id]);
        }

        localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
    } catch {
        // localStorage to'lgan yoki bloklangan — progress kritik emas
    }
};

export const markCompleted = (podcastId, duration) => {
    if (!podcastId) return;
    try {
        const all = readAll();
        all[podcastId] = {
            time: 0,
            duration: Number.isFinite(duration) ? duration : (all[podcastId]?.duration || 0),
            completed: true,
            updatedAt: Date.now(),
        };
        localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
    } catch {
        // ignore
    }
};

export const clearProgress = (podcastId) => {
    if (!podcastId) return;
    try {
        const all = readAll();
        delete all[podcastId];
        localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
    } catch {
        // ignore
    }
};
