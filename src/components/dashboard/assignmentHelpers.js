/**
 * Feed'dagi "ustoz vazifasi" kartasi uchun mantiq.
 *
 * Karta ilgari faqat `post` maydonlariga qarardi: muddat o'tgani tekshirilardi,
 * urinishlar soni esa umuman hisobga olinmasdi. Natijada o'quvchi limitini
 * ishlatib bo'lgan testga ham "Qaytadan topshirish" tugmasini bosib kirar,
 * `useTestFetch` esa uni `alert()` bilan dashboard'ga qaytarib yuborardi.
 * Shuning uchun holat endi shu yerda — `useStudentData` bergan tayinlov
 * yozuvlari asosida — hisoblanadi va tugma real holatni ko'rsatadi.
 */

/** Firestore Timestamp, ISO satr, son yoki Date — hammasi Date yoki null ga. */
export function toDate(value) {
    if (!value) return null;
    if (typeof value === 'object') {
        if (typeof value.toDate === 'function') {
            const fromTs = value.toDate();
            return Number.isNaN(fromTs.getTime()) ? null : fromTs;
        }
        if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
    }
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

/** Urinishlar limiti: 0, bo'sh yoki juda katta qiymat — cheksiz deb qaraladi. */
const UNLIMITED_FROM = 99;

export function isMockAssignment(entry) {
    if (!entry) return false;
    return (
        entry.type === 'mock_full' ||
        Boolean(entry.mockKey) ||
        String(entry.id || '').startsWith('MOCK_')
    );
}

/**
 * Bitta topshiriq uchun `useStudentData` tayyorlagan yozuvlar.
 * Listening "part" tayinlovlarida bitta id bo'yicha bir nechta yozuv bo'ladi,
 * shuning uchun ro'yxat qaytariladi.
 */
function entriesFor(assignments, testId) {
    if (!testId) return [];
    const wanted = String(testId).trim();
    return (assignments || []).filter(a => String(a?.id ?? '').trim() === wanted);
}

/**
 * Topshiriqning o'quvchiga ko'rinadigan holati.
 *
 * `status` qiymatlari:
 *   open      — topshirish mumkin
 *   completed — topshirilgan, lekin yana urinish qolgan
 *   done      — topshirilgan va urinishlar tugagan
 *   locked    — topshirilmagan, ammo urinishlar limiti tugagan
 *   expired   — muddat o'tgan va topshirilmagan
 */
export function getTaskState({ assignments, testId, fallbackMaxAttempts, isExpired }) {
    const entries = entriesFor(assignments, testId);
    const maxRaw = Number(
        entries.find(e => e.maxAttempts != null)?.maxAttempts ?? fallbackMaxAttempts ?? 1
    );
    const max = Number.isFinite(maxRaw) && maxRaw > 0 ? maxRaw : 1;
    const unlimited = max >= UNLIMITED_FROM;

    // Part'larga bo'lingan tayinlovda eng ko'p ishlatilgan urinish hal qiluvchi.
    const used = entries.reduce((acc, e) => Math.max(acc, Number(e.attemptsCount) || 0), 0);
    const completed = entries.length > 0 && entries.every(e => e.status === 'completed');
    const exhausted = !unlimited && used >= max;

    // Natijani ko'rish uchun ballari bor birinchi yozuv.
    const result = entries.map(e => e.result).find(Boolean) || null;
    const score = result ? (result.bandScore ?? result.score ?? null) : null;

    let status = 'open';
    if (completed) status = exhausted ? 'done' : 'completed';
    else if (exhausted) status = 'locked';
    else if (isExpired) status = 'expired';

    return {
        status,
        used,
        max,
        unlimited,
        completed,
        exhausted,
        result,
        score: score === null || score === '' ? null : Number(score),
        canStart: status === 'open' || status === 'completed',
        canReview: Boolean(result?.id),
        known: entries.length > 0,
    };
}

/** Ko'p topshiriqli vazifada nechtasi bajarilgani. */
export function getBundleProgress(tests, assignments, fallbackMaxAttempts, isExpired) {
    const states = (tests || []).map(test => ({
        test,
        state: getTaskState({
            assignments,
            testId: test.id,
            fallbackMaxAttempts,
            isExpired,
        }),
    }));
    const done = states.filter(s => s.state.completed).length;
    return { states, done, total: states.length };
}

/**
 * Muddat holati. Qolgan vaqt matni `t` orqali tarjima qilinadi —
 * ilgari matn ham, sana formati ham komponent ichida qotib qolgandi.
 */
export function getDeadlineState(deadline, t) {
    const date = toDate(deadline);
    if (!date) {
        return { date: null, isExpired: false, isUrgent: false, label: t('assignment.noDeadline') };
    }

    const diffMs = date.getTime() - Date.now();
    if (diffMs <= 0) {
        return { date, isExpired: true, isUrgent: false, label: t('assignment.expired') };
    }

    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);

    let label;
    if (days >= 1) label = t('assignment.daysLeft').replace('{count}', days);
    else if (hours >= 1) label = t('assignment.hoursLeft').replace('{count}', hours);
    else if (mins >= 1) label = t('assignment.minutesLeft').replace('{count}', mins);
    else label = t('assignment.endingNow');

    return { date, isExpired: false, isUrgent: diffMs <= 86400000, label };
}

/** Muddatning to'liq sanasi — tooltip uchun. */
export function formatDeadline(date, lang) {
    if (!date) return '';
    return date.toLocaleString(lang === 'uz' ? 'uz-UZ' : 'en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

const TYPE_KEYS = [
    ['listening', 'listening'],
    ['reading', 'reading'],
    ['writing', 'writing'],
    ['speaking', 'speaking'],
    ['podcast', 'podcast'],
    ['article', 'article'],
    ['mock', 'mock'],
    ['full', 'mock'],
];

/** Test turini o'qiladigan yorliqqa aylantiradi (rangli "pill" larsiz). */
export function getTypeLabel(type, t) {
    const value = String(type || '').toLowerCase();
    const match = TYPE_KEYS.find(([needle]) => value.includes(needle));
    return t(`assignment.types.${match ? match[1] : 'test'}`);
}

/**
 * Vazifa elementiga o'tish yo'li. Ilgari faqat `post.testType` ga qaralgani
 * uchun mock tayinlovlari `/test/MOCK_...` ga ketib, sahifa bo'sh ochilardi.
 */
export function getTaskRoute(entry) {
    const type = String(entry?.type || '').toLowerCase();
    if (isMockAssignment(entry)) {
        return { path: '/mock-exam', state: { mockData: { ...entry, type: 'mock_full' } } };
    }
    if (type === 'podcast') return { path: `/share/podcast/${entry.id}` };
    if (type === 'article') return { path: `/article/${entry.id}` };
    return { path: `/test/${entry.id}` };
}
