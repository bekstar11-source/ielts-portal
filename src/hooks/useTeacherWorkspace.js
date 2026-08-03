/**
 * O'qituvchi paneli uchun YAGONA ma'lumot manbai.
 *
 * Ilgari har bir sahifa (Dashboard, Tests, GroupStats, AllResults,
 * WritingReview) aynan bir xil zanjirni mustaqil ravishda qayta o'qirdi:
 *   groups → students → results (+ testSets, podcastAttempts)
 * Ya'ni bitta sessiyada sahifalar orasida yurgan o'qituvchi shu o'qishlarni
 * 5 marta to'lardi va har safar "loading" ko'rardi.
 *
 * Bu yerda ular BITTA react-query yozuviga birlashtirilgan:
 *   • bir sahifada yuklangan ma'lumot qolgan sahifalarda darhol ko'rinadi
 *     (staleTime ichida umuman o'qish bo'lmaydi);
 *   • bo'laklar (`in` so'rovi 30 tadan) ketma-ket emas, PARALLEL yuboriladi —
 *     kutish vaqti N × RTT emas, 2 × RTT;
 *   • `results` chegarasiz emas: `date desc` + `limit` bilan (composite indeks
 *     `userId ASC, date DESC` allaqachon mavjud), shuning uchun eski
 *     natijalar to'plami o'sib ketsa ham o'qish soni barqaror qoladi.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    collection, documentId, getDocs, limit as fsLimit, orderBy, query, where,
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { toDate } from '../utils/subscription';
import { collectStudentIds, chunkIds } from '../utils/teacherResults';

/**
 * Har bir 30 o'quvchilik bo'lak uchun olinadigan natijalar chegarasi.
 * 30 × 300 = bitta bo'lakda ~10 natija/o'quvchi — panelidagi barcha
 * hisob-kitoblar (trend, band o'rtachasi, bajarilish) uchun yetarli.
 */
export const RESULTS_CAP = 300;

/** "Barchasini ko'rish" bosilganda ishlatiladigan kengaytirilgan chegara. */
export const RESULTS_CAP_WIDE = 1000;

const STALE_MS = 1000 * 60 * 3;   // 3 daqiqa — panel ichida qayta o'qish yo'q
const GC_MS = 1000 * 60 * 30;     // 30 daqiqa keshda saqlanadi

export const teacherKeys = {
    all: ['teacher'],
    workspace: (uid, cap) => ['teacher', 'workspace', uid, cap],
    catalog: () => ['teacher', 'catalog'],
};

const flattenSnaps = (snaps) =>
    snaps.flatMap((snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() })));

/** `documentId() in` bilan bo'lak-bo'lak, parallel o'qish. */
async function fetchDocsByIds(collectionName, ids) {
    const unique = [...new Set((ids || []).map((id) => String(id).trim()).filter(Boolean))];
    if (!unique.length) return {};

    const snaps = await Promise.all(
        chunkIds(unique).map((chunk) =>
            getDocs(query(collection(db, collectionName), where(documentId(), 'in', chunk)))
                .catch((e) => {
                    console.warn(`fetchDocsByIds(${collectionName}):`, e);
                    return { docs: [] };
                })
        )
    );

    const map = {};
    snaps.forEach((snap) => snap.docs.forEach((d) => { map[d.id] = d.data(); }));
    return map;
}

/**
 * Butun panel uchun kerakli ma'lumotni ikki to'lqinda yig'adi:
 *   1-to'lqin: guruhlar (qolgan hamma narsa shundan kelib chiqadi)
 *   2-to'lqin: testSets + users + results + podcastAttempts — hammasi parallel
 */
async function fetchWorkspace(uid, cap) {
    const groupSnap = await getDocs(
        query(collection(db, 'groups'), where('teacherId', '==', uid))
    );
    const groups = groupSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const empty = {
        groups, students: [], results: [], podcastAttempts: [],
        testSetsMap: {}, resultsTruncated: false,
    };
    if (!groups.length) return empty;

    const setIds = [...new Set(
        groups.flatMap((g) => (g.assignedTests || [])
            .filter((t) => t?.type === 'set')
            .map((t) => t.id))
    )];

    const studentIds = collectStudentIds(groups);
    const chunks = chunkIds(studentIds);

    const [testSetsMap, studentSnaps, resultSnaps, podcastSnaps] = await Promise.all([
        fetchDocsByIds('testSets', setIds),
        Promise.all(chunks.map((chunk) =>
            getDocs(query(collection(db, 'users'), where(documentId(), 'in', chunk)))
        )),
        Promise.all(chunks.map((chunk) =>
            getDocs(query(
                collection(db, 'results'),
                where('userId', 'in', chunk),
                orderBy('date', 'desc'),
                fsLimit(cap)
            ))
        )),
        Promise.all(chunks.map((chunk) =>
            getDocs(query(collection(db, 'podcastAttempts'), where('userId', 'in', chunk)))
                .catch(() => ({ docs: [], size: 0 }))
        )),
    ]);

    // `set` turidagi tayinlovlar haqiqiy test soniga yoyiladi.
    groups.forEach((g) => {
        g.realTestCount = (g.assignedTests || []).reduce(
            (sum, t) => sum + (t?.type === 'set' ? (testSetsMap[t.id]?.testIds?.length || 0) : 1),
            0
        );
    });

    const results = flattenSnaps(resultSnaps);
    results.sort((a, b) => (toDate(b.date)?.getTime() || 0) - (toDate(a.date)?.getTime() || 0));

    return {
        groups,
        students: flattenSnaps(studentSnaps),
        results,
        podcastAttempts: flattenSnaps(podcastSnaps),
        testSetsMap,
        // Bo'laklardan biri chegaraga tegdi — demak yana ma'lumot bor.
        resultsTruncated: resultSnaps.some((snap) => snap.size >= cap),
    };
}

const EMPTY = {
    groups: [], students: [], results: [], podcastAttempts: [],
    testSetsMap: {}, resultsTruncated: false,
};

/**
 * @param {object}  opts
 * @param {string}  opts.uid         o'qituvchi uid
 * @param {number}  opts.resultsCap  bo'lakdagi natijalar chegarasi
 * @param {boolean} opts.enabled
 */
export function useTeacherWorkspace({ uid, resultsCap = RESULTS_CAP, enabled = true } = {}) {
    const queryClient = useQueryClient();
    const queryKey = teacherKeys.workspace(uid, resultsCap);

    const { data, isPending, isFetching, error } = useQuery({
        queryKey,
        enabled: Boolean(uid) && enabled,
        queryFn: () => fetchWorkspace(uid, resultsCap),
        staleTime: STALE_MS,
        gcTime: GC_MS,
        refetchOnWindowFocus: false,
        // Chegara o'zgarganda (masalan "ko'proq yuklash") eski ma'lumot
        // ekranda qoladi — skeleton qayta chaqnamaydi.
        placeholderData: (prev) => prev,
    });

    const ws = data || EMPTY;

    return {
        ...ws,
        /** Birinchi yuklash — ekranda hali hech narsa yo'q. */
        loading: Boolean(uid) && enabled && isPending,
        /** Fonda yangilanmoqda — ma'lumot bor, faqat nozik indikator kerak. */
        isRefreshing: isFetching && !isPending,
        error,
        refresh: () => queryClient.invalidateQueries({ queryKey: ['teacher', 'workspace', uid] }),
        /** Lokal (optimistik) o'zgarish — server javobini kutmasdan. */
        patch: (updater) => queryClient.setQueryData(queryKey, (prev) =>
            prev ? { ...prev, ...updater(prev) } : prev
        ),
    };
}

/**
 * Tayinlash oynasi uchun katalog: `tests_metadata`, `podcasts`, `articles`.
 *
 * Bu uchta TO'LIQ kolleksiya o'qishi — ilgari TeacherTests har ochilganda
 * (hatto tayinlash oynasi umuman ochilmasa ham) yuborilardi. Endi u faqat
 * oyna ochilganda ishga tushadi va 30 daqiqa keshda yashaydi: katalog
 * kuniga bir marta o'zgaradigan ma'lumot.
 */
export function useTeacherCatalog(enabled) {
    const { data, isPending, isFetching } = useQuery({
        queryKey: teacherKeys.catalog(),
        enabled: Boolean(enabled),
        staleTime: 1000 * 60 * 30,
        gcTime: 1000 * 60 * 60,
        refetchOnWindowFocus: false,
        queryFn: async () => {
            const [testsSnap, podcastsSnap, articlesSnap] = await Promise.all([
                getDocs(collection(db, 'tests_metadata')),
                getDocs(query(collection(db, 'podcasts'), where('status', '==', 'published'))),
                getDocs(collection(db, 'articles')),
            ]);
            return [
                ...testsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
                ...podcastsSnap.docs.map((d) => ({ id: d.id, ...d.data(), type: 'podcast' })),
                ...articlesSnap.docs.map((d) => ({ id: d.id, ...d.data(), type: 'article' })),
            ];
        },
    });

    return {
        availableTests: data || [],
        catalogLoading: Boolean(enabled) && isPending,
        catalogFetching: isFetching,
    };
}
