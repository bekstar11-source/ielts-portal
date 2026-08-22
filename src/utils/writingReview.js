/**
 * Writing tekshiruvi uchun umumiy hisob-kitoblar.
 *
 * Bu mantiq ilgari sahifada (TeacherWritingReview) va `useWritingReview`
 * hook'ida ikki nusxada yotardi. Ommaviy (bulk) tekshiruv ikkalasini ham
 * chaqiradigan bo'lgani uchun bitta joyga yig'ildi.
 */

/** IELTS yarim-band yaxlitlash: .25–.74 → .5, .75+ → keyingi butun. */
export const roundToHalfBand = (raw) => {
    const integerPart = Math.floor(raw);
    const fractionalPart = raw - integerPart;
    if (fractionalPart >= 0.75) return integerPart + 1;
    if (fractionalPart >= 0.25) return integerPart + 0.5;
    return integerPart;
};

/**
 * Natija hujjatidan o'quvchi javoblarini oladi — hujjat shakli
 * (userAnswers / writingAnswers / attempts / details) bir xil emas.
 */
export const getWritingAnswers = (res) => {
    if (!res) return {};
    let source = res.userAnswers || res.writingAnswers || {};

    if (Array.isArray(res.attempts) && res.attempts.length > 0) {
        const lastAttempt = res.attempts[res.attempts.length - 1];
        source = lastAttempt.userAnswers || lastAttempt.writingAnswers || source;
    }
    if (res.details?.writingAnswers) {
        source = res.details.writingAnswers;
    }

    const ans = { ...source };
    if (!ans.task1 && res.task1) ans.task1 = res.task1;
    if (!ans.task1 && res.writingAnswer) ans.task1 = res.writingAnswer;
    if (!ans.task2 && res.task2) ans.task2 = res.task2;
    return ans;
};

/** To'rtta mezon o'rtachasidan task band. Mezon to'liq bo'lmasa — ''. */
export const calculateTaskBand = (details) => {
    if (!details) return '';
    const { ta, tr, cc, lr, gra } = details;
    const criteria = [ta ?? tr, cc, lr, gra].map(parseFloat).filter(n => !isNaN(n));
    if (criteria.length < 4) return '';
    const avg = criteria.reduce((sum, v) => sum + v, 0) / criteria.length;
    return roundToHalfBand(avg).toFixed(1);
};

/** Writing umumiy bandi: T1 va T2 bo'lsa (T1 + 2*T2) / 3. */
export const combineWritingBand = (t1, t2, hasT1, hasT2) => {
    const a = parseFloat(t1);
    const b = parseFloat(t2);
    if (hasT1 && hasT2) {
        if (isNaN(a) || isNaN(b)) return NaN;
        return roundToHalfBand((a + 2 * b) / 3);
    }
    if (hasT1) return a;
    if (hasT2) return b;
    return 0;
};

const AI_CRITERIA_MAP = {
    1: { taskAchievement: 'ta', coherence: 'cc', lexical: 'lr', grammar: 'gra' },
    2: { taskAchievement: 'tr', coherence: 'cc', lexical: 'lr', grammar: 'gra' },
};

const validBand = (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
};

/** AI tahlilidan bitta task uchun mezonlar obyekti (ta/tr, cc, lr, gra). */
export const aiTaskDetails = (aiTask, taskNum) => {
    if (!aiTask?.criteria) return null;
    const details = {};
    let filled = 0;
    Object.entries(AI_CRITERIA_MAP[taskNum]).forEach(([aiKey, critKey]) => {
        const band = validBand(aiTask.criteria[aiKey]?.band);
        if (band !== null) {
            details[critKey] = String(band);
            filled += 1;
        }
    });
    return filled > 0 ? details : null;
};

/**
 * AI tahlilini "Saqlash" tugmasi yuboradigan shaklga aylantiradi:
 * mezonlar, task bandlari va umumiy izoh.
 *
 * `existingFeedback` bo'lsa — ustoz izohi ustidan yozilmaydi.
 */
export const aiReviewToFeedback = (aiReview, { hasT1, hasT2, existingFeedback = '' } = {}) => {
    if (!aiReview) return null;

    const build = (taskNum, hasTask) => {
        if (!hasTask) return { details: null, band: '' };
        const aiTask = aiReview[`task${taskNum}`];
        const details = aiTaskDetails(aiTask, taskNum);
        const band = calculateTaskBand(details)
            || (validBand(aiTask?.criteria?.overall?.band) !== null
                ? roundToHalfBand(Number(aiTask.criteria.overall.band)).toFixed(1)
                : '');
        return { details, band };
    };

    const t1 = build(1, hasT1);
    const t2 = build(2, hasT2);

    if ((hasT1 && !t1.band) || (hasT2 && !t2.band)) return null;

    const aiFeedback = [1, 2]
        .map(n => aiReview[`task${n}`]?.criteria?.overall?.feedback)
        .filter(Boolean)
        .join('\n\n');

    return {
        task1Band: t1.band,
        task2Band: t2.band,
        task1Details: t1.details,
        task2Details: t2.details,
        feedback: existingFeedback || aiFeedback,
    };
};

/** Vazifalarni cheklangan parallellik bilan bajaradi (tartib saqlanadi). */
export const mapWithConcurrency = async (items, limit, worker) => {
    const results = new Array(items.length);
    let cursor = 0;
    const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (cursor < items.length) {
            const index = cursor++;
            results[index] = await worker(items[index], index);
        }
    });
    await Promise.all(runners);
    return results;
};
