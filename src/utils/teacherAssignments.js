/**
 * Tayinlovlar ustidagi barcha yozuv amallari — YAGONA joyda.
 *
 * Ilgari tayinlash, tahrirlash, nusxalash va o'chirish `TeacherTests.jsx`
 * ichida alohida-alohida yozilgan edi va ular bir-biridan chetga chiqib
 * ketgandi:
 *   • tayinlash feed post YARATARDI, o'chirish uni tozalardi,
 *     TAHRIRLASH esa umuman tegmasdi — ustoz muddatni o'zgartirsa,
 *     o'quvchi feed'da eski muddatni ko'rib turaverardi;
 *   • o'chirish `arrayRemove(obyekt)` ga tayanardi, ya'ni hujjatdagi obyekt
 *     bir chimdim farq qilsa jimgina bajarilmasdi (UI esa uni ro'yxatdan
 *     olib tashlab qo'yardi va u refresh'dan keyin qaytib kelardi);
 *   • ommaviy o'chirish har element uchun alohida feed so'rovi yuborardi.
 *
 * Bu yerda ular bitta modelga keltirilgan: guruhning `assignedTests` massivi
 * har doim TO'LIQ qayta yoziladi, feed postlar esa `assignDate` bo'yicha
 * topiladi.
 */

import {
    addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, updateDoc, where,
} from 'firebase/firestore';
import { db } from '../firebase/firebase';

/** Bitta tayinlovni ajratuvchi kalit — test + tayinlangan payt. */
export const assignmentKey = (assignment) => `${assignment.id}__${assignment.date}`;

/** Feed postdagi qisqa test yozuvlari. */
const toFeedEntries = (assignments) =>
    assignments.map((a) => ({ id: a.id, title: a.title, type: a.type }));

/** Feed postning matni — bitta vazifa bo'lsa nomi, ko'p bo'lsa soni. */
const feedContent = (entries) =>
    entries.length === 1
        ? entries[0].title
        : `Ustozingiz sizga ${entries.length} ta yangi vazifa tayinladi`;

/** Guruhning tayinlovlar ro'yxatini butunlay qayta yozadi. */
const writeAssignedTests = (groupId, assignedTests) =>
    updateDoc(doc(db, 'groups', groupId), { assignedTests });

/**
 * Guruhning `teacher_test` postlari.
 *
 * Ikkala tenglik filtri ham bitta maydonga tegishli emas, lekin Firestore
 * bunday so'rovni indekslarni birlashtirib bajaradi — qo'shimcha composite
 * indeks kerak emas (bu naqsh ilgari ham ishlab turgan).
 */
async function fetchGroupFeedPosts(groupId) {
    const snap = await getDocs(query(
        collection(db, 'feed_posts'),
        where('type', '==', 'teacher_test'),
        where('groupId', '==', groupId)
    ));
    return snap.docs;
}

/**
 * Tayinlov paytiga (`assignDate`) tegishli postlar.
 * Eski postlarda bu maydon yo'q — ular test ID lari bo'yicha topiladi.
 */
function matchPosts(docs, date, testIds) {
    const exact = docs.filter((d) => d.data().assignDate === date);
    if (exact.length) return exact;
    const ids = new Set(testIds);
    return docs.filter((d) => {
        const data = d.data();
        if (data.assignDate) return false;
        const posted = Array.isArray(data.tests) ? data.tests.map((t) => t.id) : [data.testId];
        return posted.some((id) => ids.has(id));
    });
}

/** Postni yangi test ro'yxatiga moslaydi; ro'yxat bo'shasa — postni o'chiradi. */
async function applyTestsToPost(postDoc, entries, extra = {}) {
    if (!entries.length) {
        await deleteDoc(postDoc.ref);
        return;
    }
    await updateDoc(postDoc.ref, {
        tests: entries,
        content: feedContent(entries),
        testId: entries[0].id,
        testType: entries[0].type,
        ...extra,
    });
}

// ── Tayinlash / nusxalash ───────────────────────────────────────────────────

/**
 * Tayyor tayinlovlarni guruhlarga yozadi va har biriga feed post yaratadi.
 * Yangi tayinlash ham, nusxalash ham shu funksiyadan o'tadi.
 *
 * @param {object[]} groups      joriy guruhlar (assignedTests bilan)
 * @param {string[]} groupIds    qaysi guruhlarga
 * @param {object[]} assignments yoziladigan tayinlov obyektlari
 * @param {{uid: string, name: string}} teacher
 * @returns {object[]} yangilangan guruhlar ro'yxati (optimistik holat uchun)
 */
export async function commitAssignments({ groups, groupIds, assignments, teacher }) {
    const entries = toFeedEntries(assignments);
    const first = assignments[0];
    const targets = new Set(groupIds);

    const nextGroups = groups.map((g) => (
        targets.has(g.id)
            ? { ...g, assignedTests: [...(g.assignedTests || []), ...assignments] }
            : g
    ));

    await Promise.all(nextGroups
        .filter((g) => targets.has(g.id))
        .map((g) => writeAssignedTests(g.id, g.assignedTests)));

    await Promise.all(groupIds.map(async (groupId) => {
        try {
            await addDoc(collection(db, 'feed_posts'), {
                type: 'teacher_test',
                title: 'Sizning ustozingiz vazifa tayinladi',
                content: feedContent(entries),
                groupId,
                deadline: first.deadline,
                maxAttempts: first.maxAttempts,
                priority: first.priority,
                teacherNote: first.teacherNote,
                teacherId: teacher.uid,
                teacherName: teacher.name || 'Ustoz',
                likes: [],
                commentsCount: 0,
                createdAt: serverTimestamp(),
                tests: entries,
                testId: entries[0].id,
                testType: entries[0].type,
                assignDate: first.date,
            });
        } catch (err) {
            // Feed post — ikkilamchi; tayinlovning o'zi allaqachon yozilgan.
            console.error('Feed post yaratishda xato:', err);
        }
    }));

    return nextGroups;
}

// ── Tahrirlash ──────────────────────────────────────────────────────────────

/**
 * Bitta tayinlov blokini (guruh + sana) to'liq almashtiradi va o'quvchilar
 * ko'radigan feed postni ham SHU o'zgarishga moslaydi.
 *
 * @returns {object[]} yangilangan guruhlar ro'yxati
 */
export async function updateAssignment({ groups, groupId, date, assignments }) {
    const group = groups.find((g) => g.id === groupId);
    if (!group) throw new Error('Guruh topilmadi');

    const previous = (group.assignedTests || []).filter((a) => a.date === date);
    const kept = (group.assignedTests || []).filter((a) => a.date !== date);
    const nextAssignedTests = [...kept, ...assignments];

    await writeAssignedTests(groupId, nextAssignedTests);

    try {
        const posts = await fetchGroupFeedPosts(groupId);
        const entries = toFeedEntries(assignments);
        const first = assignments[0];
        await Promise.all(
            matchPosts(posts, date, previous.map((a) => a.id))
                .map((postDoc) => applyTestsToPost(postDoc, entries, {
                    deadline: first.deadline,
                    maxAttempts: first.maxAttempts,
                    priority: first.priority,
                    teacherNote: first.teacherNote,
                }))
        );
    } catch (err) {
        console.error('Feed postni yangilashda xato:', err);
    }

    return groups.map((g) => (g.id === groupId ? { ...g, assignedTests: nextAssignedTests } : g));
}

// ── O'chirish ───────────────────────────────────────────────────────────────

/**
 * Bir yoki bir nechta tayinlovni olib tashlaydi.
 *
 * Guruh bo'yicha guruhlanadi: har bir guruhga BITTA yozuv va bitta feed
 * so'rovi to'g'ri keladi (ilgari har bir element uchun alohida edi).
 *
 * @param {object[]} groups
 * @param {{groupId: string, id: string, date: string}[]} targets
 * @returns {Promise<{groups: object[], removed: number, failed: number}>}
 *          `removed` — HAQIQATDA o'chirilganlar soni (ilgari bu son
 *          xatolardan qat'i nazar oshaverardi va ustozga yolg'on hisobot
 *          ko'rsatilardi).
 */
export async function removeAssignments({ groups, targets }) {
    const byGroup = new Map();
    for (const target of targets) {
        if (!byGroup.has(target.groupId)) byGroup.set(target.groupId, new Set());
        byGroup.get(target.groupId).add(assignmentKey(target));
    }

    let removed = 0;
    let failed = 0;
    const nextGroups = [...groups];

    for (const [groupId, keys] of byGroup) {
        const index = nextGroups.findIndex((g) => g.id === groupId);
        const group = nextGroups[index];
        if (!group) { failed += keys.size; continue; }

        const current = group.assignedTests || [];
        const dropped = current.filter((a) => keys.has(assignmentKey(a)));
        const nextAssignedTests = current.filter((a) => !keys.has(assignmentKey(a)));

        if (!dropped.length) { failed += keys.size; continue; }

        try {
            await writeAssignedTests(groupId, nextAssignedTests);
        } catch (err) {
            console.error('Tayinlovni o\'chirishda xato:', err);
            failed += keys.size;
            continue;
        }

        removed += dropped.length;
        failed += keys.size - dropped.length;
        nextGroups[index] = { ...group, assignedTests: nextAssignedTests };

        try {
            const posts = await fetchGroupFeedPosts(groupId);
            const droppedIds = new Set(dropped.map((a) => a.id));
            const dates = [...new Set(dropped.map((a) => a.date))];

            await Promise.all(dates.flatMap((date) => {
                const survivors = nextAssignedTests.filter((a) => a.date === date);
                return matchPosts(posts, date, [...droppedIds]).map((postDoc) =>
                    applyTestsToPost(postDoc, toFeedEntries(survivors))
                );
            }));
        } catch (err) {
            console.error('Feed postni tozalashda xato:', err);
        }
    }

    return { groups: nextGroups, removed, failed };
}
