/**
 * Guruh statistikasi uchun SOF hisob-kitoblar (React'siz).
 *
 * Sahifa (`TeacherGroupStats`) faqat ko'rsatish bilan shug'ullanadi —
 * o'rtachalar, tendensiya, taqsimot va "e'tibor talab qiladi" belgilari
 * shu yerda, bitta joyda hisoblanadi.
 *
 * Band qiymati doim `getBandValue` orqali olinadi: `score` maydoni "32/40"
 * kabi xom ball bo'lishi mumkin va u band emas.
 */

import { toDate } from './subscription';
import { getBandValue } from './teacherResults';

export const SKILLS = ['reading', 'listening', 'writing', 'speaking'];

/** Faollik chegarasi — shu kundan beri natija bermagan o'quvchi "passiv". */
export const INACTIVE_DAYS = 14;

/** Shu banddan past o'rtacha — "past natija". */
export const LOW_BAND = 5.5;

const DAY_MS = 24 * 60 * 60 * 1000;

const avg = (nums) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null);
const round1 = (n) => (n === null || n === undefined ? null : Math.round(n * 10) / 10);

/** O'qituvchi qo'lda kiritgan natijalar statistikaga kirmaydi. */
const isStudentResult = (r) => r?.submittedBy !== 'teacher';

/**
 * Guruhga tayinlangan testlarning haqiqiy ID lari.
 * `set` turidagi tayinlov ichida bir nechta test bo'ladi, shuning uchun
 * `testSetsMap` orqali yoyib chiqiladi.
 */
export function collectAssignedTestIds(group, testSetsMap = {}) {
    const ids = new Set();
    (group?.assignedTests || []).forEach((t) => {
        if (t?.type === 'set') {
            (testSetsMap[t.id]?.testIds || []).forEach((id) => ids.add(id));
        } else if (t?.id) {
            ids.add(t.id);
        }
    });
    return ids;
}

/** Natijalarni vaqt oralig'i bo'yicha filtrlaydi. `days === null` — butun davr. */
export function filterByRange(results, days, now = Date.now()) {
    if (!days) return results;
    const from = now - days * DAY_MS;
    return results.filter((r) => {
        const d = toDate(r.date);
        return d ? d.getTime() >= from : false;
    });
}

/**
 * Har bir o'quvchi uchun statistika — natijalar ustidan BIR marta yuriladi.
 *
 * @param {Array} results   guruh a'zolarining natijalari (yangisi birinchi)
 * @param {Set}   assignedTestIds  guruhga tayinlangan test ID lari
 */
export function buildStudentStats(results, assignedTestIds = new Set(), now = Date.now()) {
    const byStudent = new Map();
    for (const r of results) {
        if (!isStudentResult(r)) continue;
        if (!byStudent.has(r.userId)) byStudent.set(r.userId, []);
        byStudent.get(r.userId).push(r);
    }

    const out = new Map();
    for (const [studentId, list] of byStudent) {
        // Yangisi birinchi bo'lishiga tayanmaymiz — o'zimiz saralaymiz.
        const sorted = [...list].sort(
            (a, b) => (toDate(b.date)?.getTime() || 0) - (toDate(a.date)?.getTime() || 0)
        );

        const bands = [];
        const byType = {};
        const completedAssigned = new Set();
        let lastActiveAt = null;

        for (const r of sorted) {
            const band = getBandValue(r);
            const date = toDate(r.date);
            if (date && (!lastActiveAt || date > lastActiveAt)) lastActiveAt = date;
            if (r.testId && assignedTestIds.has(r.testId)) completedAssigned.add(r.testId);
            if (band === null) continue;
            bands.push(band);
            const type = (r.type || 'other').toLowerCase();
            (byType[type] = byType[type] || []).push(band);
        }

        // O'sish: so'nggi 3 ta bandning o'rtachasi vs undan oldingi 3 ta.
        const recentBands = bands.slice(0, 3);
        const priorBands = bands.slice(3, 6);
        const delta =
            recentBands.length && priorBands.length
                ? round1(avg(recentBands) - avg(priorBands))
                : null;

        const skills = {};
        for (const skill of SKILLS) {
            const values = byType[skill] || [];
            skills[skill] = {
                avg: round1(avg(values)),
                best: values.length ? Math.max(...values) : null,
                count: values.length,
            };
        }

        const daysSinceActive = lastActiveAt
            ? Math.floor((now - lastActiveAt.getTime()) / DAY_MS)
            : null;
        const avgBand = round1(avg(bands));

        out.set(studentId, {
            count: sorted.length,
            gradedCount: bands.length,
            avgBand,
            bestBand: bands.length ? Math.max(...bands) : null,
            skills,
            delta,
            lastActiveAt,
            daysSinceActive,
            isInactive: daysSinceActive === null || daysSinceActive > INACTIVE_DAYS,
            isLow: avgBand !== null && avgBand < LOW_BAND,
            completedAssigned: completedAssigned.size,
            completionRate: assignedTestIds.size
                ? Math.round((completedAssigned.size / assignedTestIds.size) * 100)
                : null,
            recentResults: sorted.slice(0, 5),
        });
    }
    return out;
}

export const EMPTY_STUDENT_STATS = {
    count: 0,
    gradedCount: 0,
    avgBand: null,
    bestBand: null,
    skills: SKILLS.reduce((acc, s) => ({ ...acc, [s]: { avg: null, best: null, count: 0 } }), {}),
    delta: null,
    lastActiveAt: null,
    daysSinceActive: null,
    isInactive: true,
    isLow: false,
    completedAssigned: 0,
    completionRate: null,
    recentResults: [],
};

/** Guruh bo'yicha umumiy ko'rsatkichlar. */
export function buildGroupSummary(students, statsMap, assignedCount = 0) {
    const perStudent = students.map((s) => statsMap.get(s.id) || EMPTY_STUDENT_STATS);
    const bands = perStudent.map((s) => s.avgBand).filter((b) => b !== null);

    // Hech narsa topshirmagan o'quvchi ham 0% bilan hisobga kiradi — aks holda
    // guruh bajarilishi sun'iy ravishda yuqori chiqadi.
    const rates = assignedCount
        ? perStudent.map((s) => Math.round((s.completedAssigned / assignedCount) * 100))
        : [];

    return {
        studentCount: students.length,
        avgBand: round1(avg(bands)),
        totalResults: perStudent.reduce((sum, s) => sum + s.count, 0),
        assignedCount,
        completionRate: rates.length ? Math.round(avg(rates)) : null,
        activeCount: perStudent.filter((s) => !s.isInactive).length,
        attentionCount: perStudent.filter((s) => s.isLow || (s.isInactive && s.count > 0)).length,
        untestedCount: perStudent.filter((s) => s.count === 0).length,
    };
}

/** Guruhning skill'lar kesimidagi o'rtachasi. */
export function buildSkillAverages(students, statsMap) {
    return SKILLS.map((skill) => {
        const values = [];
        let count = 0;
        students.forEach((s) => {
            const stats = statsMap.get(s.id);
            const skillStats = stats?.skills?.[skill];
            if (skillStats?.avg !== null && skillStats?.avg !== undefined) values.push(skillStats.avg);
            count += skillStats?.count || 0;
        });
        return { skill, avg: round1(avg(values)), count };
    });
}

/**
 * Kunlar bo'yicha o'rtacha band tendensiyasi.
 * Bir kunda bir nechta natija bo'lsa — o'sha kunning o'rtachasi olinadi.
 */
export function buildTrendSeries(results, memberIds, maxPoints = 14) {
    const members = memberIds instanceof Set ? memberIds : new Set(memberIds);
    const byDay = new Map();

    for (const r of results) {
        if (!members.has(r.userId) || !isStudentResult(r)) continue;
        const band = getBandValue(r);
        const date = toDate(r.date);
        if (band === null || !date) continue;
        const key = date.toISOString().slice(0, 10);
        if (!byDay.has(key)) byDay.set(key, []);
        byDay.get(key).push(band);
    }

    return [...byDay.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-maxPoints)
        .map(([key, bands]) => ({
            key,
            date: new Date(key).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
            band: round1(avg(bands)),
            count: bands.length,
        }));
}

/**
 * Kunlar kesimidagi faollik — nechta natija topshirilgani.
 * `buildTrendSeries` dan farqi: natijasiz kunlar ham 0 bilan qaytadi,
 * shuning uchun uzilishlar ko'rinib turadi.
 */
export function buildActivitySeries(results, days = 14, now = Date.now()) {
    const counts = new Map();
    for (const r of results) {
        if (!isStudentResult(r)) continue;
        const date = toDate(r.date);
        if (!date) continue;
        const key = date.toISOString().slice(0, 10);
        counts.set(key, (counts.get(key) || 0) + 1);
    }

    const series = [];
    for (let i = days - 1; i >= 0; i--) {
        const day = new Date(now - i * DAY_MS);
        const key = day.toISOString().slice(0, 10);
        series.push({
            key,
            count: counts.get(key) || 0,
            label: String(day.getDate()),
        });
    }
    return series;
}

/**
 * Natijalardan o'quvchilar ro'yxatini tiklaydi.
 * O'qituvchi paneli natijalar bilan birga ismni ham saqlaydi, shuning uchun
 * `users` kolleksiyasiga qo'shimcha so'rov yubormaymiz.
 */
export function collectStudentsFromResults(results, allowedIds = null) {
    const byId = new Map();
    for (const r of results) {
        if (!r?.userId || !isStudentResult(r)) continue;
        if (allowedIds && !allowedIds.has(r.userId)) continue;
        if (!byId.has(r.userId)) byId.set(r.userId, { id: r.userId, fullName: r.userName || null });
        else if (!byId.get(r.userId).fullName && r.userName) byId.get(r.userId).fullName = r.userName;
    }
    return [...byId.values()];
}

/**
 * "E'tibor talab qiladi" ro'yxati — bali past, uzoq vaqt faolsiz yoki
 * umuman test topshirmagan o'quvchilar. Eng og'ir holat birinchi turadi.
 *
 * Umuman topshirmaganlar ham kiradi: aynan ular ko'zdan qochadi, chunki
 * natijalar ro'yxatida hech qachon ko'rinmaydi.
 */
export function buildAttentionList(students, statsMap, size = 5) {
    return students
        .map((student) => ({ student, stats: statsMap.get(student.id) || EMPTY_STUDENT_STATS }))
        .filter((x) => x.stats.count === 0 || x.stats.isLow || x.stats.isInactive)
        .map((x) => {
            const { stats } = x;
            const untested = stats.count === 0;
            return {
                ...x,
                untested,
                reason: untested
                    ? "Hali test topshirmagan"
                    : stats.isLow
                      ? `O'rtacha ${stats.avgBand?.toFixed(1)} band`
                      : `${formatRelativeDays(stats.daysSinceActive)} faol edi`,
                // Past ball eng jiddiy belgi, keyin — umuman topshirmaganlar.
                weight: stats.isLow ? 200 : untested ? 100 : stats.daysSinceActive || 0,
            };
        })
        .sort((a, b) => b.weight - a.weight)
        .slice(0, size);
}

/** Band taqsimoti — o'quvchilarning o'rtacha bandi bo'yicha. */
export const BAND_BUCKETS = [
    { label: '< 4.5', min: 0, max: 4.5 },
    { label: '4.5–5.5', min: 4.5, max: 5.5 },
    { label: '5.5–6.5', min: 5.5, max: 6.5 },
    { label: '6.5–7.5', min: 6.5, max: 7.5 },
    { label: '7.5+', min: 7.5, max: 10 },
];

export function buildBandDistribution(students, statsMap) {
    const buckets = BAND_BUCKETS.map((b) => ({ ...b, count: 0 }));
    students.forEach((s) => {
        const band = statsMap.get(s.id)?.avgBand;
        if (band === null || band === undefined) return;
        const bucket = buckets.find((b, i) => band >= b.min && (band < b.max || i === buckets.length - 1));
        if (bucket) bucket.count += 1;
    });
    return buckets;
}

/** Reyting: eng yuqori band va eng ko'p o'sgan o'quvchilar. */
export function buildLeaderboards(students, statsMap, size = 3) {
    const withStats = students
        .map((s) => ({ student: s, stats: statsMap.get(s.id) || EMPTY_STUDENT_STATS }))
        .filter((x) => x.stats.avgBand !== null);

    const top = [...withStats].sort((a, b) => b.stats.avgBand - a.stats.avgBand).slice(0, size);
    const improved = withStats
        .filter((x) => x.stats.delta !== null && x.stats.delta > 0)
        .sort((a, b) => b.stats.delta - a.stats.delta)
        .slice(0, size);

    return { top, improved };
}

/** "3 kun oldin" ko'rinishidagi qisqa matn. */
export function formatRelativeDays(days) {
    if (days === null || days === undefined) return "natija yo'q";
    if (days <= 0) return 'bugun';
    if (days === 1) return 'kecha';
    if (days < 30) return `${days} kun oldin`;
    const months = Math.floor(days / 30);
    return `${months} oy oldin`;
}
